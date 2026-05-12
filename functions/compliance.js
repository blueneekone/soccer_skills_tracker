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
 *   generateCheckrEmbedToken — onCall  (Coach — exchange user info for Checkr embed token)
 *   backgroundCheckCallback  — HTTP webhook (Checkr report.completed webhook)
 *   getComplianceRoster      — onCall  (Directors & Registrars)
 *   requestManualOverride    — onCall  (Directors only)
 *   revokeCoachClearance     — onCall  (Directors only)
 *   simulateClearance        — onCall  (Director — Alpha simulation, no live keys needed)
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
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
 * Exchange the caller's identity for a short-lived Checkr embed token.
 * The token is returned to the frontend and passed directly to Checkr.mount().
 * No PII is stored in Firebase — Checkr owns the candidate record.
 *
 * Checkr API reference: POST https://api.checkr.com/v1/embeds/tokens
 *   Auth: Basic <base64(API_KEY:)>
 *   Body: { candidate: { email, first_name?, last_name? }, package?: string }
 *   Response: { token: "<embed_token>" }
 */
exports.generateCheckrEmbedToken = onCall(
  { region: REGION, secrets: [CHECKR_API_KEY], enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Login required.');

    const claims = reqAuth.token || {};
    const role = claims.role || '';
    // Phase 2, Epic 2 — Session K.  Extended clearance scope: every adult
    // role that can touch minor PII (coach, recruiter, director, tutor).
    // Players + parents are NOT in scope — they manage their own data.
    if (!['coach', 'recruiter', 'director', 'tutor'].includes(role)) {
      throw new HttpsError(
        'permission-denied',
        'Only coaches, recruiters, directors, and tutors require a background check.',
      );
    }

    const email = (claims.email || '').toLowerCase().trim();
    if (!email) throw new HttpsError('unauthenticated', 'Cannot resolve caller email.');

    // Split display name into first/last for Checkr candidate record.
    const rawName = String(claims.name || claims.displayName || '').trim();
    const nameParts = rawName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // ── Org-level Compliance Vault: upstream deduplication ─────────────────
    // Before making a billable Checkr API call, check if the user is already
    // cleared at the parent-org level.  If a sibling division already completed
    // a BGC, propagate the result and skip the Checkr flow entirely.
    try {
      const userSnap = await db().collection('users').doc(email).get();
      const orgId = userSnap.exists ? (userSnap.data()?.orgId || '') : '';
      if (orgId) {
        const vaultSnap = await db()
          .collection('orgs').doc(orgId)
          .collection('compliance_vault').doc(email)
          .get();
        if (vaultSnap.exists) {
          const vault = vaultSnap.data() || {};
          if (vault.status === 'cleared') {
            logger.info('[compliance] Org-vault hit — propagating clearance', { email, orgId });
            const now = admin.firestore.FieldValue.serverTimestamp();
            await db().collection('users').doc(email).set(
              { clearance: { status: 'cleared', source: 'org_vault_propagation', orgId, lastVerified: now } },
              { merge: true },
            );
            const userRecord = await auth().getUserByEmail(email).catch(() => null);
            if (userRecord) await stampClearanceClaim(userRecord.uid, email);
            return { embedToken: null, orgVaultCleared: true };
          }
        }
      }
    } catch (vaultErr) {
      // Non-fatal: vault check failure must never block the Checkr flow.
      logger.warn('[compliance] Org-vault upstream check failed (non-fatal)', vaultErr);
    }

    const apiKey = CHECKR_API_KEY.value();
    if (!apiKey) {
      // No live key — return a sentinel so the embed component can show a
      // "contact director" message rather than crashing.
      logger.warn('[compliance] CHECKR_API_KEY not set — returning mock token for Alpha');
      return { embedToken: null, alphaMode: true };
    }

    const b64Key = Buffer.from(`${apiKey}:`).toString('base64');
    const body = {
      candidate: {
        email,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName  ? { last_name: lastName }   : {}),
      },
    };

    const res = await fetch('https://api.checkr.com/v1/embeds/tokens', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${b64Key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => String(res.status));
      logger.error('[compliance] Checkr embed token request failed', {
        status: res.status,
        body: errText.slice(0, 500),
      });
      throw new HttpsError('internal', 'Failed to generate Checkr embed token. Check API key.');
    }

    const data = await res.json();
    const embedToken = data.token || data.embed_token || null;
    if (!embedToken) {
      logger.error('[compliance] Checkr response missing token field', { data });
      throw new HttpsError('internal', 'Checkr returned no embed token.');
    }

    // Mark coach as pending in Firestore so the panopticon shows correct state.
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db().collection('users').doc(email).set(
      { clearance: { status: 'pending', lastVerified: now } },
      { merge: true },
    );

    logger.info('[compliance] Checkr embed token issued', { email });
    return { embedToken };
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
// simulateClearance  (Alpha — Ankored BGC simulation, Director-only)
// ─────────────────────────────────────────────────────────────────────────────
// Director-only callable that mimics a successful Ankored clearance webhook
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
    const clubId = callerClaims.clubId || callerClaims.tenantId || null;

    const userRef = db().collection('users').doc(normalizedEmail);
    const snap = await userRef.get();
    const userData = snap.data() || {};
    if (clubId && userData.clubId !== clubId) {
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
