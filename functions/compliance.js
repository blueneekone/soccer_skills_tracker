'use strict';

/**
 * Epic 14: Vanguard Clearance Protocol — Checkr Native Embed
 * ────────────────────────────────────────────────────────────
 * Background screening via Checkr Embed SDK.  PII and payment processing
 * are handled entirely inside Checkr's iframe — Firebase only stores the
 * resulting status flag and a Checkr candidate/report reference.
 *
 * Zero-Trust contract:
 *   • No SSNs, criminal records, or payment data ever enter Firebase.
 *   • Stored fields: status, checkrCandidateId, lastVerified timestamp only.
 *   • The `isCleared` JWT claim is the enforcement boundary — Firestore rules
 *     reject coach reads on player data unless isCleared == true.
 *
 * Clearance schema on users/{email}.clearance:
 *   { status: 'pending'|'cleared'|'flagged', checkrCandidateId: string, lastVerified: Timestamp }
 *
 * Functions exported:
 *   generateCheckrEmbedToken — onCall  (preflight + Web SDK session token)
 *   checkrSessionTokens      — HTTP   (embed sessionTokenPath + auto-renewal)
 *   backgroundCheckCallback  — HTTP webhook (Checkr report.completed webhook)
 *   getComplianceRoster      — onCall  (Directors & Registrars)
 *   requestManualOverride    — onCall  (Directors only)
 *   revokeCoachClearance     — onCall  (Directors only)
 *   simulateClearance        — onCall  (Director / platform admin — Alpha simulation, no live keys needed)
 *   directorInitiateCoachClearance — onCall (Director — club-paid Checkr invitation)
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

const REGION = 'us-east1';

/**
 * Checkr API key (secret tier) — used for embed token generation.
 * Set via: firebase functions:secrets:set CHECKR_API_KEY
 */
const CHECKR_API_KEY = defineSecret('CHECKR_API_KEY');

/**
 * Checkr API environment — production (default) or staging.
 * Set via: firebase functions:config or .env CHECKR_API_ENV=staging
 */
const CHECKR_API_ENV = defineString('CHECKR_API_ENV', { default: 'production' });

/** Dev / platform fallback when club doc fields are unset. */
const CHECKR_PACKAGE_SLUG = defineString('CHECKR_PACKAGE_SLUG', { default: '' });
const CHECKR_WORK_STATE = defineString('CHECKR_WORK_STATE', { default: '' });
const CHECKR_WORK_CITY = defineString('CHECKR_WORK_CITY', { default: '' });
const CHECKR_NODE = defineString('CHECKR_NODE', { default: '' });

/** Adult roles that require a background check before minor PII access. */
const CLEARANCE_ROLES = ['coach', 'recruiter', 'director', 'tutor'];

/**
 * @returns {'production'|'staging'}
 */
function resolveCheckrEnv() {
  const raw = String(CHECKR_API_ENV.value() || 'production').toLowerCase().trim();
  return raw === 'staging' ? 'staging' : 'production';
}

/** @returns {string} Checkr API host base including /v1 */
function checkrApiHost() {
  return resolveCheckrEnv() === 'staging'
    ? 'https://api.checkr-staging.com/v1'
    : 'https://api.checkr.com/v1';
}

/**
 * Turn a Checkr API error body into an actionable operator message.
 * @param {number} status
 * @param {string} rawBody
 * @returns {string}
 */
function formatCheckrApiError(status, rawBody) {
  /** @type {Record<string, unknown>|null} */
  let parsed = null;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    parsed = null;
  }

  const parts = [];
  if (parsed && typeof parsed.error === 'string') parts.push(parsed.error);
  if (parsed && typeof parsed.message === 'string') parts.push(parsed.message);
  if (parsed && parsed.errors && typeof parsed.errors === 'object') {
    for (const [key, val] of Object.entries(parsed.errors)) {
      if (Array.isArray(val)) {
        parts.push(`${key}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}: ${val}`);
      }
    }
  }

  const detail = parts.length > 0
    ? parts.join(' — ')
    : (typeof rawBody === 'string' && rawBody.trim()
      ? rawBody.trim().slice(0, 400)
      : `HTTP ${status}`);

  if (status === 401 || status === 403) {
    return `Checkr rejected the API key (${status}). Verify CHECKR_API_KEY in Secret Manager matches ${resolveCheckrEnv()} — ${detail}`;
  }
  if (status === 422) {
    return `Checkr account not credentialed for embed invitations (${status}). Contact Checkr AE to approve your account — ${detail}`;
  }
  if (status === 404 && /package/i.test(detail)) {
    return `Checkr package not found (${status}). Verify checkrPackageSlug on the club document — ${detail}`;
  }

  return `Checkr session token failed (${status}): ${detail}`;
}

/**
 * Coach-readable messages for embed / compliance UI (no operator jargon).
 * @param {number} status
 * @param {string} rawBody
 * @returns {string}
 */
function mapCheckrErrorForCoach(status, rawBody) {
  const operatorMsg = formatCheckrApiError(status, rawBody).toLowerCase();

  if (status === 401 || status === 403) {
    return 'Screening is temporarily unavailable. Contact your club administrator — Checkr API key or environment may be misconfigured.';
  }
  if (
    status === 422 ||
    operatorMsg.includes('credentialed') ||
    operatorMsg.includes('not approved') ||
    operatorMsg.includes('pending approval')
  ) {
    return 'Contact your club administrator — Checkr account pending approval.';
  }
  if (operatorMsg.includes('package') && (operatorMsg.includes('not found') || operatorMsg.includes('invalid'))) {
    return 'Your club\'s screening package is not configured correctly. Contact your club administrator.';
  }

  return 'Unable to connect to screening services. Contact your club administrator for help.';
}

/**
 * Club-paid Checkr package + work location from Firestore with env fallback.
 * Fields on `clubs/{clubId}`: checkrPackageSlug, checkrWorkState, checkrWorkCity, checkrNode.
 *
 * @param {string} clubId
 * @returns {Promise<{ packageSlug: string, workState: string, workCity: string, node: string, clubName: string }>}
 */
async function readClubCheckrConfig(clubId) {
  const envFallback = {
    packageSlug: String(CHECKR_PACKAGE_SLUG.value() || '').trim(),
    workState: String(CHECKR_WORK_STATE.value() || '').trim(),
    workCity: String(CHECKR_WORK_CITY.value() || '').trim(),
    node: String(CHECKR_NODE.value() || '').trim(),
    clubName: '',
  };

  const id = String(clubId || '').trim();
  if (!id) return envFallback;

  const snap = await db().collection('clubs').doc(id).get();
  if (!snap.exists) return envFallback;

  const d = snap.data() || {};
  return {
    packageSlug: String(d.checkrPackageSlug || envFallback.packageSlug || '').trim(),
    workState: String(d.checkrWorkState || envFallback.workState || '').trim(),
    workCity: String(d.checkrWorkCity || envFallback.workCity || '').trim(),
    node: String(d.checkrNode || envFallback.node || '').trim(),
    clubName: String(d.name || '').trim(),
  };
}

/**
 * @param {string} apiKey
 * @param {string} method
 * @param {string} path
 * @param {Record<string, unknown> | null} [body]
 * @returns {Promise<Record<string, unknown>>}
 */
async function checkrApiRequest(apiKey, method, path, body = null) {
  const b64Key = Buffer.from(`${apiKey}:`).toString('base64');
  const url = `${checkrApiHost()}${path.startsWith('/') ? path : `/${path}`}`;

  /** @type {RequestInit} */
  const opts = {
    method,
    headers: {
      Authorization: `Basic ${b64Key}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const rawBody = await res.text().catch(() => String(res.status));
  if (!res.ok) {
    const message = formatCheckrApiError(res.status, rawBody);
    logger.error('[compliance] Checkr API request failed', {
      method,
      path,
      status: res.status,
      host: checkrApiHost(),
      body: rawBody.slice(0, 500),
    });
    const err = new Error(message);
    err.status = res.status;
    err.rawBody = rawBody;
    throw err;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error('Checkr returned a non-JSON response.');
  }
}

/**
 * @param {import('firebase-admin/auth').DecodedIdToken} claims
 * @returns {{ email: string, role: string }}
 */
function resolveClearanceCaller(claims) {
  const role = String(claims.role || '');
  if (!CLEARANCE_ROLES.includes(role)) {
    throw new HttpsError(
      'permission-denied',
      'Only coaches, recruiters, directors, and tutors require a background check.',
    );
  }

  const email = String(claims.email || '').toLowerCase().trim();
  if (!email) throw new HttpsError('unauthenticated', 'Cannot resolve caller email.');

  return { email, role };
}

/**
 * Org-level Compliance Vault upstream deduplication.
 * @param {string} email
 * @returns {Promise<boolean>} true when vault already cleared this user
 */
async function tryOrgVaultPropagation(email) {
  try {
    const userSnap = await db().collection('users').doc(email).get();
    const orgId = userSnap.exists ? (userSnap.data()?.orgId || '') : '';
    if (!orgId) return false;

    const vaultSnap = await db()
      .collection('orgs').doc(orgId)
      .collection('compliance_vault').doc(email)
      .get();
    if (!vaultSnap.exists) return false;

    const vault = vaultSnap.data() || {};
    if (vault.status !== 'cleared') return false;

    logger.info('[compliance] Org-vault hit — propagating clearance', { email, orgId });
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db().collection('users').doc(email).set(
      { clearance: { status: 'cleared', source: 'org_vault_propagation', orgId, lastVerified: now } },
      { merge: true },
    );
    const userRecord = await auth().getUserByEmail(email).catch(() => null);
    if (userRecord) await stampClearanceClaim(userRecord.uid, email);
    return true;
  } catch (vaultErr) {
    logger.warn('[compliance] Org-vault upstream check failed (non-fatal)', vaultErr);
    return false;
  }
}

/**
 * Exchange the Checkr API key for a short-lived Web SDK session token.
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
async function fetchCheckrSessionToken(apiKey) {
  const b64Key = Buffer.from(`${apiKey}:`).toString('base64');
  const url = `${checkrApiHost()}/web_sdk/session_tokens`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${b64Key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scopes: ['order'], direct: true }),
  });

  const rawBody = await res.text().catch(() => String(res.status));
  if (!res.ok) {
    const message = formatCheckrApiError(res.status, rawBody);
    logger.error('[compliance] Checkr session token request failed', {
      status: res.status,
      host: checkrApiHost(),
      body: rawBody.slice(0, 500),
    });
    const err = new Error(message);
    err.status = res.status;
    err.rawBody = rawBody;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    logger.error('[compliance] Checkr session token response was not JSON', { rawBody: rawBody.slice(0, 200) });
    throw new Error('Checkr returned a non-JSON session token response.');
  }

  const token = data.token || null;
  if (!token) {
    logger.error('[compliance] Checkr response missing token field', { data });
    throw new Error('Checkr returned no session token.');
  }

  return token;
}

/** @param {string} email */
async function markClearancePending(email) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db().collection('users').doc(email).set(
    { clearance: { status: 'pending', lastVerified: now } },
    { merge: true },
  );
}

/**
 * @param {import('firebase-functions/v2/https').Request} req
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>}
 */
async function verifyBearerFromRequest(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || '');
  if (!header.startsWith('Bearer ')) {
    const err = new Error('Missing bearer token.');
    err.status = 401;
    throw err;
  }
  try {
    return await auth().verifyIdToken(header.slice(7).trim());
  } catch {
    const err = new Error('Invalid bearer token.');
    err.status = 401;
    throw err;
  }
}

/**
 * HMAC secret shared with Checkr for webhook signature verification.
 * Set via: firebase functions:secrets:set BGC_WEBHOOK_SECRET
 * If the secret is unset in development, signature verification is skipped.
 */
const BGC_WEBHOOK_SECRET = defineSecret('BGC_WEBHOOK_SECRET');

// ── Lazy singletons ──────────────────────────────────────────────────────────
const db = () => admin.firestore();
const auth = () => admin.auth();

/**
 * Recompute and stamp the `isCleared` custom claim on a Firebase Auth user.
 * Called after any write that changes clearance.status.
 *
 * @param {string} uid   Firebase Auth UID
 * @param {string} email User email (lower-case) — Firestore doc key
 */
async function stampClearanceClaim(uid, email) {
  const snap = await db().collection('users').doc(email).get();
  const data = snap.data() || {};
  const cl = (typeof data.clearance === 'object' && data.clearance !== null)
    ? data.clearance : {};

  const clearanceStatus = typeof cl.status === 'string' ? cl.status : 'pending';
  const isCleared = clearanceStatus === 'cleared';

  const existing = (await auth().getUser(uid)).customClaims || {};
  await auth().setCustomUserClaims(uid, {
    ...existing,
    isCleared,
    // checkrCandidateId is the canonical ref; fall back to legacy fields
    clearanceRef: cl.checkrCandidateId || cl.ankoredId || cl.thirdPartyRef || null,
  });

  logger.info('[compliance] stampClearanceClaim', { uid, email, isCleared });
  return isCleared;
}

// ── 0. generateCheckrEmbedToken ──────────────────────────────────────────────
/**
 * Exchange the caller's identity for a short-lived Checkr Web SDK session token.
 * Used for preflight (alpha / org-vault) and direct token fetch when needed.
 *
 * Checkr API reference: POST {host}/v1/web_sdk/session_tokens
 *   Auth: Basic <base64(API_KEY:)>
 *   Body: { scopes: ["order"], direct: true }
 *   Response: { token: "<session_token>" }
 *
 * The live embed also POSTs to `checkrSessionTokens` (HTTP) for token renewal.
 */
exports.generateCheckrEmbedToken = onCall(
  { region: REGION, secrets: [CHECKR_API_KEY], enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Login required.');

    const claims = reqAuth.token || {};
    const { email } = resolveClearanceCaller(claims);
    const preflight = request.data?.preflight === true;

    if (await tryOrgVaultPropagation(email)) {
      return { embedToken: null, orgVaultCleared: true, checkrEnv: resolveCheckrEnv() };
    }

    const apiKey = CHECKR_API_KEY.value();
    if (!apiKey) {
      logger.warn('[compliance] CHECKR_API_KEY not set — Alpha mode');
      return { embedToken: null, alphaMode: true, checkrEnv: resolveCheckrEnv() };
    }

    if (preflight) {
      return { alphaMode: false, checkrEnv: resolveCheckrEnv() };
    }

    try {
      const embedToken = await fetchCheckrSessionToken(apiKey);
      await markClearancePending(email);
      logger.info('[compliance] Checkr session token issued', { email, checkrEnv: resolveCheckrEnv() });
      return { embedToken, checkrEnv: resolveCheckrEnv() };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkr session token request failed.';
      throw new HttpsError('internal', message);
    }
  },
);

// ── 0b. checkrSessionTokens — HTTP endpoint for Checkr embed sessionTokenPath ─
/**
 * POST /api/compliance/checkr/session-tokens (Firebase Hosting rewrite)
 *
 * The Checkr Web SDK NewInvitation embed POSTs here for session tokens and
 * auto-renews on expiry.  Forwards Checkr API error bodies so the embed UI
 * can surface actionable messages (per docs.checkr.com/embeds troubleshooting).
 */
exports.checkrSessionTokens = onRequest(
  { region: REGION, secrets: [CHECKR_API_KEY], enforceAppCheck: false },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed', message: 'POST required.' });
      return;
    }

    try {
      const decoded = await verifyBearerFromRequest(req);
      const { email } = resolveClearanceCaller(decoded);

      if (await tryOrgVaultPropagation(email)) {
        res.status(200).json({ token: null, orgVaultCleared: true });
        return;
      }

      const apiKey = CHECKR_API_KEY.value();
      if (!apiKey) {
        res.status(503).json({
          error: 'alpha_mode',
          message: 'CHECKR_API_KEY not configured. Use Director simulateClearance for QA.',
        });
        return;
      }

      const token = await fetchCheckrSessionToken(apiKey);
      await markClearancePending(email);
      res.status(200).json({ token });
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        const status = Number(err.status) || 500;
        if (status === 401) {
          res.status(401).json({ error: 'unauthenticated', message: err.message || 'Unauthorized.' });
          return;
        }
      }

      if (err instanceof HttpsError) {
        const code = err.code === 'permission-denied' ? 403 : 400;
        res.status(code).json({ error: err.code, message: err.message });
        return;
      }

      const httpStatus = err && typeof err.status === 'number' ? err.status : 500;
      const rawBody = err && typeof err.rawBody === 'string' ? err.rawBody : null;

      if (rawBody) {
        try {
          const parsed = JSON.parse(rawBody);
          res.status(httpStatus).json({
            ...parsed,
            message: mapCheckrErrorForCoach(httpStatus, rawBody),
            coachMessage: mapCheckrErrorForCoach(httpStatus, rawBody),
          });
          return;
        } catch {
          res.status(httpStatus).json({
            error: 'checkr_api_error',
            message: mapCheckrErrorForCoach(httpStatus, rawBody),
            coachMessage: mapCheckrErrorForCoach(httpStatus, rawBody),
          });
          return;
        }
      }

      logger.error('[compliance] checkrSessionTokens unexpected error', err);
      res.status(500).json({
        error: 'internal',
        message: err instanceof Error ? err.message : 'Checkr session token failed.',
      });
    }
  },
);

// ── 1. backgroundCheckCallback / checkrWebhook ───────────────────────────────
/**
 * HTTP webhook consumed by Checkr.
 * Expected POST body shape:
 *   { type: 'report.completed', data: { email, status, reportId } }
 *
 * Checkr status → Vanguard status mapping:
 *   'clear'     → 'cleared'
 *   'consider'  → 'flagged'
 *   'suspended' → 'flagged'
 *   anything else → 'pending'
 *
 * Signature verification uses HMAC-SHA256 with the BGC_WEBHOOK_SECRET.
 * Header expected: X-Checkr-Signature (or X-Bgc-Signature as fallback).
 *
 * Exported as both `backgroundCheckCallback` (legacy) and `checkrWebhook`
 * (canonical Checkr dashboard URL).
 */
async function _checkrWebhookHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // ── Signature verification ────────────────────────────────────────────
    const secret = BGC_WEBHOOK_SECRET.value();
    if (secret) {
      const sig = String(
        req.headers['x-checkr-signature'] ||
        req.headers['x-bgc-signature'] ||
        '',
      );
      const rawBody = typeof req.rawBody === 'string' || Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : JSON.stringify(req.body);
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      if (!sig || sig !== expected) {
        logger.warn('[compliance] HMAC mismatch on BGC callback', { sig });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const { type, data } = req.body || {};
    if (!type || !data) {
      res.status(400).json({ error: 'Missing type or data' });
      return;
    }

    // ── Payload extraction ────────────────────────────────────────────────
    const { email, status, reportId } = data;
    if (typeof email !== 'string' || !email) {
      res.status(400).json({ error: 'data.email is required' });
      return;
    }
    if (typeof status !== 'string' || !status) {
      res.status(400).json({ error: 'data.status is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Status normalisation ──────────────────────────────────────────────
    const clearanceStatus =
      status === 'clear' ? 'cleared' :
      status === 'consider' || status === 'suspended' ? 'flagged' :
      'pending';

    // ── Firestore write (status + Checkr reference only — Zero-Trust) ───
    try {
      const userRef = db().collection('users').doc(normalizedEmail);
      await userRef.set(
        {
          clearance: {
            status: clearanceStatus,
            checkrCandidateId: reportId || null,
            lastVerified: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );

      // ── Re-stamp JWT claim ──────────────────────────────────────────────
      const userRecord = await auth().getUserByEmail(normalizedEmail).catch(() => null);
      if (userRecord) {
        await stampClearanceClaim(userRecord.uid, normalizedEmail);
      }

      // ── Org-level Compliance Vault write ────────────────────────────────
      // Attach the BGC receipt to the parent-org boundary so sibling
      // divisions can query upstream and avoid duplicate screening fees.
      try {
        const freshUserSnap = await db().collection('users').doc(normalizedEmail).get();
        const orgId = freshUserSnap.exists ? (freshUserSnap.data()?.orgId || '') : '';
        if (orgId) {
          await db()
            .collection('orgs').doc(orgId)
            .collection('compliance_vault').doc(normalizedEmail)
            .set({
              status:     clearanceStatus,
              userId:     normalizedEmail,
              clubId:     freshUserSnap.data()?.clubId || null,
              reportId:   reportId || null,
              source:     'checkr',
              lastVerified: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          logger.info('[compliance] Org-vault updated', { orgId, email: normalizedEmail, clearanceStatus });
        }
      } catch (vaultWriteErr) {
        // Non-fatal: vault write failure must not roll back the user clearance.
        logger.warn('[compliance] Org-vault write failed (non-fatal)', vaultWriteErr);
      }

      // ── Audit log ───────────────────────────────────────────────────────
      await db().collection('audit_logs').add({
        action: 'background_check_callback',
        targetEmail: normalizedEmail,
        clearanceStatus,
        reportId: reportId || null,
        source: 'checkr_webhook',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('[compliance] BGC callback processed', {
        email: normalizedEmail,
        clearanceStatus,
        reportId,
      });

      res.status(200).json({ ok: true, status: clearanceStatus });
    } catch (err) {
      logger.error('[compliance] BGC callback error', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
}

const _checkrWebhookOpts = { region: REGION, secrets: [BGC_WEBHOOK_SECRET] };
exports.backgroundCheckCallback = onRequest(_checkrWebhookOpts, _checkrWebhookHandler);
exports.checkrWebhook           = onRequest(_checkrWebhookOpts, _checkrWebhookHandler);

// ── 2. getComplianceRoster ───────────────────────────────────────────────────
/**
 * Returns all coaches and recruiters in the caller's club with their
 * clearance status. Accessible to Directors and Registrars only.
 *
 * Response shape: { roster: ComplianceRow[] }
 * ComplianceRow: {
 *   email, displayName, role, teamId?,
 *   clearanceStatus, clearanceRef?, expiresAt?, updatedAt?,
 *   source?, isManualOverride
 * }
 */
exports.getComplianceRoster = onCall(
  { region: REGION },
  async (request) => {
    const { auth: reqAuth } = request;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { role, clubId } = reqAuth.token;
    const isComplianceManager =
      role === 'director' ||
      role === 'registrar' ||
      role === 'super_admin' ||
      role === 'global_admin';

    if (!isComplianceManager) {
      throw new HttpsError('permission-denied', 'Director or Registrar role required.');
    }
    if (!clubId && role !== 'super_admin' && role !== 'global_admin') {
      throw new HttpsError('failed-precondition', 'No club scope on token.');
    }

    const usersRef = db().collection('users');
    /** @type {Array<object>} */
    const rows = [];

    for (const targetRole of ['coach', 'recruiter']) {
      const q = clubId
        ? usersRef.where('role', '==', targetRole).where('clubId', '==', clubId)
        : usersRef.where('role', '==', targetRole);
      const snap = await q.get();
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const cl = (typeof d.clearance === 'object' && d.clearance !== null)
          ? d.clearance : {};
        rows.push({
          email: docSnap.id,
          displayName: d.displayName || d.playerName || docSnap.id,
          role: d.role,
          teamId: d.teamId || null,
          clearanceStatus: cl.status || 'pending',
          clearanceRef: cl.thirdPartyRef || null,
          expiresAt: cl.expiresAt?.toMillis?.() || null,
          updatedAt: cl.updatedAt?.toMillis?.() || null,
          source: cl.source || null,
          isManualOverride: cl.manualOverride === true,
        });
      });
    }

    // Sort: flagged first (highest priority), then pending, then cleared.
    const ORDER = { flagged: 0, pending: 1, cleared: 2 };
    rows.sort((a, b) => {
      const ap = ORDER[a.clearanceStatus] ?? 3;
      const bp = ORDER[b.clearanceStatus] ?? 3;
      return ap !== bp ? ap - bp : a.email.localeCompare(b.email);
    });

    return { roster: rows };
  },
);

// ── 3. requestManualOverride ─────────────────────────────────────────────────
/**
 * Allows a Director to manually mark a coach/recruiter as cleared when the
 * 3rd-party API integration is not yet active (e.g. a legacy PDF clearance
 * has been submitted and reviewed offline).
 *
 * Request body: { targetEmail: string, documentRef?: string, expiresAt?: string }
 *   documentRef — storage path or external reference for the uploaded PDF
 *   expiresAt   — ISO 8601 expiry date; defaults to 1 year from now
 */
exports.requestManualOverride = onCall(
  { region: REGION },
  async (request) => {
    const { auth: reqAuth } = request;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { role, clubId } = reqAuth.token;
    if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
      throw new HttpsError(
        'permission-denied',
        'Director role required for manual clearance override.',
      );
    }

    const {
      targetEmail,
      documentRef = null,
      expiresAt: rawExpiry = null,
    } = request.data || {};

    if (typeof targetEmail !== 'string' || !targetEmail.trim()) {
      throw new HttpsError('invalid-argument', 'targetEmail is required.');
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();
    const userRef = db().collection('users').doc(normalizedEmail);
    const snap = await userRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'User not found.');

    const userData = snap.data() || {};
    if (clubId && userData.clubId !== clubId) {
      throw new HttpsError('permission-denied', 'Target user is not in your club.');
    }
    if (!['coach', 'recruiter', 'director', 'tutor'].includes(userData.role)) {
      throw new HttpsError(
        'invalid-argument',
        'Manual override is only valid for coach, recruiter, director, or tutor roles.',
      );
    }

    // ── Build expiry timestamp ────────────────────────────────────────────
    let expiresAtTimestamp;
    if (rawExpiry) {
      const d = new Date(rawExpiry);
      if (isNaN(d.getTime())) {
        throw new HttpsError('invalid-argument', 'expiresAt must be a valid ISO 8601 date.');
      }
      expiresAtTimestamp = admin.firestore.Timestamp.fromDate(d);
    } else {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      expiresAtTimestamp = admin.firestore.Timestamp.fromDate(d);
    }

    // ── Write clearance — Zero-Trust fields only ──────────────────────────
    await userRef.set(
      {
        clearance: {
          status: 'cleared',
          thirdPartyRef: documentRef || null,
          expiresAt: expiresAtTimestamp,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'manual_override',
          manualOverride: true,
          overriddenBy: reqAuth.uid,
        },
      },
      { merge: true },
    );

    // ── Re-stamp JWT claim ────────────────────────────────────────────────
    const userRecord = await auth().getUserByEmail(normalizedEmail).catch(() => null);
    if (userRecord) {
      await stampClearanceClaim(userRecord.uid, normalizedEmail);
    }

    // ── Audit log ─────────────────────────────────────────────────────────
    await db().collection('audit_logs').add({
      action: 'manual_clearance_override',
      actorUid: reqAuth.uid,
      targetEmail: normalizedEmail,
      documentRef: documentRef || null,
      expiresAt: expiresAtTimestamp,
      clubId: clubId || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('[compliance] Manual override applied', {
      targetEmail: normalizedEmail,
      by: reqAuth.uid,
    });

    return { ok: true, email: normalizedEmail, status: 'cleared' };
  },
);

// ── 4. revokeCoachClearance ──────────────────────────────────────────────────
/**
 * Directors may revoke a coach or recruiter's clearance, setting status to
 * 'flagged' and immediately invalidating their `isCleared` JWT claim.
 *
 * Request body: { targetEmail: string, reason?: string }
 */
exports.revokeCoachClearance = onCall(
  { region: REGION },
  async (request) => {
    const { auth: reqAuth } = request;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { role, clubId } = reqAuth.token;
    if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
      throw new HttpsError('permission-denied', 'Director role required.');
    }

    const { targetEmail, reason = 'Director-initiated revocation' } = request.data || {};
    if (typeof targetEmail !== 'string' || !targetEmail.trim()) {
      throw new HttpsError('invalid-argument', 'targetEmail is required.');
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();
    const userRef = db().collection('users').doc(normalizedEmail);
    const snap = await userRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'User not found.');

    const userData = snap.data() || {};
    if (clubId && userData.clubId !== clubId) {
      throw new HttpsError('permission-denied', 'Target user is not in your club.');
    }

    await userRef.set(
      {
        clearance: {
          status: 'flagged',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'director_revocation',
          revokedBy: reqAuth.uid,
          revocationReason: String(reason).slice(0, 500),
        },
      },
      { merge: true },
    );

    const userRecord = await auth().getUserByEmail(normalizedEmail).catch(() => null);
    if (userRecord) {
      await stampClearanceClaim(userRecord.uid, normalizedEmail);
    }

    await db().collection('audit_logs').add({
      action: 'clearance_revoked',
      actorUid: reqAuth.uid,
      targetEmail: normalizedEmail,
      reason: String(reason).slice(0, 500),
      clubId: clubId || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('[compliance] Clearance revoked', {
      targetEmail: normalizedEmail,
      by: reqAuth.uid,
    });

    return { ok: true, email: normalizedEmail, status: 'flagged' };
  },
);

// ── 5. directorInitiateCoachClearance ────────────────────────────────────────
/**
 * Director/registrar orders a club-paid Checkr invitation for a coach.
 * Creates candidate + invitation server-side; coach completes Checkr-hosted apply only.
 *
 * Request body: { coachEmail: string }
 * Response: { ok: true, invitationUrl?, message }
 */
exports.directorInitiateCoachClearance = onCall(
  { region: REGION, secrets: [CHECKR_API_KEY], enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { role, clubId } = reqAuth.token;
    const canInitiate =
      role === 'director' ||
      role === 'registrar' ||
      role === 'super_admin' ||
      role === 'global_admin';
    if (!canInitiate) {
      throw new HttpsError('permission-denied', 'Director or Registrar access required.');
    }

    const { coachEmail } = request.data || {};
    if (typeof coachEmail !== 'string' || !coachEmail.trim()) {
      throw new HttpsError('invalid-argument', 'coachEmail is required.');
    }

    const normalizedEmail = coachEmail.toLowerCase().trim();
    const userRef = db().collection('users').doc(normalizedEmail);
    const snap = await userRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Coach not found.');

    const userData = snap.data() || {};
    if (!['coach', 'recruiter', 'tutor'].includes(userData.role)) {
      throw new HttpsError(
        'invalid-argument',
        'Screening can only be ordered for coaches, recruiters, or tutors.',
      );
    }
    if (
      clubId &&
      !['super_admin', 'global_admin'].includes(role) &&
      userData.clubId !== clubId
    ) {
      throw new HttpsError('permission-denied', 'Coach is not in your club.');
    }

    const targetClubId = String(userData.clubId || clubId || '').trim();
    const checkrConfig = await readClubCheckrConfig(targetClubId);
    if (!checkrConfig.packageSlug) {
      throw new HttpsError(
        'failed-precondition',
        'Club Checkr package is not configured. Set checkrPackageSlug on the club document.',
      );
    }
    if (!checkrConfig.workState) {
      throw new HttpsError(
        'failed-precondition',
        'Club work state is not configured. Set checkrWorkState on the club document.',
      );
    }

    const apiKey = CHECKR_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'CHECKR_API_KEY not configured. Use simulateClearance for QA.',
      );
    }

    const existingCl =
      typeof userData.clearance === 'object' && userData.clearance !== null
        ? userData.clearance
        : {};
    if (existingCl.status === 'cleared') {
      return { ok: true, message: 'Coach is already cleared.' };
    }
    if (existingCl.invitationId && existingCl.status === 'pending') {
      return {
        ok: true,
        invitationUrl: existingCl.invitationUrl || null,
        message: 'Screening invitation already sent.',
      };
    }

    const displayName = userData.displayName || userData.playerName || normalizedEmail.split('@')[0];
    const nameParts = String(displayName).trim().split(/\s+/);
    const firstName = nameParts[0] || 'Coach';
    const lastName = nameParts.slice(1).join(' ') || 'Staff';

    const userRecord = await auth().getUserByEmail(normalizedEmail).catch(() => null);
    const externalId = userRecord?.uid || normalizedEmail;

    /** @type {string} */
    let candidateId = typeof existingCl.checkrCandidateId === 'string'
      ? existingCl.checkrCandidateId
      : '';

    if (!candidateId) {
      const candidate = await checkrApiRequest(apiKey, 'POST', '/candidates', {
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        custom_id: externalId,
      });
      candidateId = String(candidate.id || '');
      if (!candidateId) {
        throw new HttpsError('internal', 'Checkr did not return a candidate ID.');
      }
    }

    /** @type {Record<string, unknown>} */
    const invitationBody = {
      candidate_id: candidateId,
      package: checkrConfig.packageSlug,
      work_locations: [{
        country: 'US',
        state: checkrConfig.workState,
        ...(checkrConfig.workCity ? { city: checkrConfig.workCity } : {}),
      }],
    };
    if (checkrConfig.node) invitationBody.node = checkrConfig.node;

    let invitation;
    try {
      invitation = await checkrApiRequest(apiKey, 'POST', '/invitations', invitationBody);
    } catch (inviteErr) {
      const status = inviteErr && typeof inviteErr.status === 'number' ? inviteErr.status : 500;
      const rawBody = inviteErr && typeof inviteErr.rawBody === 'string' ? inviteErr.rawBody : '';
      throw new HttpsError(
        status === 422 || status === 403 ? 'failed-precondition' : 'internal',
        mapCheckrErrorForCoach(status, rawBody),
      );
    }

    const invitationId = String(invitation.id || '');
    const invitationUrl = typeof invitation.invitation_url === 'string'
      ? invitation.invitation_url
      : null;

    const now = admin.firestore.FieldValue.serverTimestamp();
    await userRef.set(
      {
        clearance: {
          status: 'pending',
          checkrCandidateId: candidateId,
          invitationId: invitationId || null,
          invitationUrl,
          source: 'checkr',
          lastVerified: now,
          invitedBy: reqAuth.uid,
        },
      },
      { merge: true },
    );

    await db().collection('audit_logs').add({
      action: 'director_initiate_coach_clearance',
      actorUid: reqAuth.uid,
      targetEmail: normalizedEmail,
      clubId: targetClubId || null,
      checkrCandidateId: candidateId,
      invitationId: invitationId || null,
      timestamp: now,
    });

    logger.info('[compliance] Director ordered coach clearance', {
      targetEmail: normalizedEmail,
      by: reqAuth.uid,
      invitationId,
    });

    return {
      ok: true,
      invitationUrl,
      invitationId: invitationId || null,
      message: 'Screening invitation sent. The coach will receive an email from Checkr.',
    };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// initiateAnkoredUplink  (Alpha — coach self-clear via Ankored)
// ─────────────────────────────────────────────────────────────────────────────
// Called by a coach/recruiter when they press [ INITIATE ANKORED SECURE UPLINK ]
// on the /compliance page.  For Alpha this writes the simplified clearance schema
// and flips isCleared immediately so the coach can access the War Room without
// waiting for a real Ankored webhook callback.
//
// Production: this function will instead generate a signed Ankored session URL
// and return it for redirect; the actual clearance will arrive via the
// backgroundCheckCallback webhook once Ankored completes verification.
// ─────────────────────────────────────────────────────────────────────────────
exports.initiateAnkoredUplink = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Login required.');

    const claims = reqAuth.token || {};
    const role = claims.role || '';
    if (!['coach', 'recruiter', 'director', 'tutor'].includes(role)) {
      throw new HttpsError(
        'permission-denied',
        'Only coaches, recruiters, directors, and tutors may initiate an Ankored uplink.',
      );
    }

    const email = (reqAuth.token?.email || '').toLowerCase().trim();
    if (!email) throw new HttpsError('unauthenticated', 'Cannot resolve caller email.');

    // Alpha: generate a simulated Ankored reference ID
    const ankoredId = `ANKORED-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db().collection('users').doc(email).set(
      {
        clearance: {
          status: 'cleared',
          ankoredId,
          lastVerified: now,
        },
      },
      { merge: true },
    );

    // Stamp JWT claim so coach regains access without logout/login
    await stampClearanceClaim(reqAuth.uid, email);

    await db().collection('audit_logs').add({
      action: 'ankored_uplink_initiated',
      actorUid: reqAuth.uid,
      actorEmail: email,
      ankoredId,
      timestamp: now,
    });

    logger.info('[compliance] Ankored uplink initiated (Alpha)', { email, ankoredId });
    return { ok: true, ankoredId };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// simulateClearance  (Alpha — Ankored BGC simulation, Director / platform admin)
// ─────────────────────────────────────────────────────────────────────────────
// Director or platform-admin callable that mimics a successful Ankored clearance webhook
// for the Alpha test cycle.  Writes the simplified clearance schema and refreshes
// JWT custom claims so the coach regains access immediately without a logout.
// ─────────────────────────────────────────────────────────────────────────────
exports.simulateClearance = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Login required.');

    const callerClaims = reqAuth.token || {};
    if (!['director', 'registrar', 'super_admin', 'global_admin'].includes(callerClaims.role || '')) {
      throw new HttpsError('permission-denied', 'Director or Registrar access required.');
    }

    const { email } = request.data || {};
    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'Target coach email is required.');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const callerRole = callerClaims.role || '';
    const isPlatformAdmin = ['super_admin', 'global_admin'].includes(callerRole);
    const clubId = callerClaims.clubId || callerClaims.tenantId || null;

    const userRef = db().collection('users').doc(normalizedEmail);
    const snap = await userRef.get();
    const userData = snap.data() || {};
    if (clubId && !isPlatformAdmin && userData.clubId !== clubId) {
      throw new HttpsError('permission-denied', 'Target user is not in your club.');
    }

    const ankoredId = `ANKORED-SIM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = admin.firestore.FieldValue.serverTimestamp();
    await userRef.set(
      {
        clearance: {
          status: 'cleared',
          ankoredId,
          lastVerified: now,
        },
      },
      { merge: true },
    );

    const userRecord = await auth().getUserByEmail(normalizedEmail).catch(() => null);
    if (userRecord) {
      await stampClearanceClaim(userRecord.uid, normalizedEmail);
    }

    await db().collection('audit_logs').add({
      action: 'clearance_simulated_ankored',
      actorUid: reqAuth.uid,
      targetEmail: normalizedEmail,
      ankoredId,
      clubId: clubId || null,
      timestamp: now,
    });

    logger.info('[compliance] Ankored clearance simulated', {
      targetEmail: normalizedEmail,
      by: reqAuth.uid,
    });

    return { ok: true, email: normalizedEmail, status: 'cleared' };
  },
);
