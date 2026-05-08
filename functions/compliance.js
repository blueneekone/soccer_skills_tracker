'use strict';

/**
 * Epic 14: Vanguard Clearance Protocol
 * ──────────────────────────────────────
 * Background-check integration endpoint + compliance management functions.
 *
 * Zero-Trust contract:
 *   • No sensitive BGC data (SSNs, criminal records) ever enters Firebase.
 *   • Stored fields: status flag, expiry date, 3rd-party reference ID only.
 *   • The `isCleared` JWT claim is the enforcement boundary — Firestore rules
 *     reject coach reads on player data unless isCleared == true.
 *
 * Functions exported:
 *   backgroundCheckCallback  — HTTP webhook (Checkr / 3rd-party BGC provider)
 *   getComplianceRoster      — onCall  (Directors & Registrars)
 *   requestManualOverride    — onCall  (Directors only — legacy PDF clearances)
 *   revokeCoachClearance     — onCall  (Directors only)
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

const REGION = 'us-east1';

/**
 * HMAC secret shared with the BGC provider (Checkr or equivalent).
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
  let isCleared = clearanceStatus === 'cleared';

  if (isCleared && cl.expiresAt != null) {
    try {
      const expMs = typeof cl.expiresAt.toMillis === 'function'
        ? cl.expiresAt.toMillis()
        : Number(cl.expiresAt);
      if (!isNaN(expMs) && expMs < Date.now()) isCleared = false;
    } catch {
      isCleared = false;
    }
  }

  const existing = (await auth().getUser(uid)).customClaims || {};
  await auth().setCustomUserClaims(uid, {
    ...existing,
    isCleared,
    clearanceRef: cl.thirdPartyRef || null,
  });

  logger.info('[compliance] stampClearanceClaim', { uid, email, isCleared });
  return isCleared;
}

// ── 1. backgroundCheckCallback ───────────────────────────────────────────────
/**
 * HTTP webhook consumed by Checkr (or any compliant BGC provider).
 * Expected POST body shape:
 *   { type: 'report.completed', data: { email, status, reportId, expiresAt? } }
 *
 * Checkr status → Vanguard status mapping:
 *   'clear'     → 'cleared'
 *   'consider'  → 'flagged'
 *   'suspended' → 'flagged'
 *   anything else → 'pending'
 *
 * Signature verification uses HMAC-SHA256 with the BGC_WEBHOOK_SECRET.
 * Header expected: X-Checkr-Signature (or X-Bgc-Signature as fallback).
 */
exports.backgroundCheckCallback = onRequest(
  { region: REGION, secrets: [BGC_WEBHOOK_SECRET] },
  async (req, res) => {
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
    const { email, status, reportId, expiresAt: rawExpiry } = data;
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

    // ── Expiry timestamp ──────────────────────────────────────────────────
    let expiresAtTimestamp = null;
    if (rawExpiry) {
      try {
        const d = new Date(rawExpiry);
        if (!isNaN(d.getTime())) {
          expiresAtTimestamp = admin.firestore.Timestamp.fromDate(d);
        }
      } catch {
        logger.warn('[compliance] Could not parse expiresAt', { rawExpiry });
      }
    }
    if (!expiresAtTimestamp && clearanceStatus === 'cleared') {
      // Default: 2-year validity when provider does not supply an expiry.
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      expiresAtTimestamp = admin.firestore.Timestamp.fromDate(d);
    }

    // ── Firestore write (status + ref only — Zero-Trust) ─────────────────
    try {
      const userRef = db().collection('users').doc(normalizedEmail);
      await userRef.set(
        {
          clearance: {
            status: clearanceStatus,
            thirdPartyRef: reportId || null,
            expiresAt: expiresAtTimestamp,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'checkr',
            manualOverride: false,
          },
        },
        { merge: true },
      );

      // ── Re-stamp JWT claim ──────────────────────────────────────────────
      const userRecord = await auth().getUserByEmail(normalizedEmail).catch(() => null);
      if (userRecord) {
        await stampClearanceClaim(userRecord.uid, normalizedEmail);
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
  },
);

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
    if (!['coach', 'recruiter'].includes(userData.role)) {
      throw new HttpsError(
        'invalid-argument',
        'Manual override is only valid for coach and recruiter roles.',
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
// markDocumentsUploaded
// ─────────────────────────────────────────────────────────────────────────────
// Called by a coach/recruiter after they have successfully uploaded both their
// SafeSport and CDC Concussion certificates to Firebase Storage.
//
// Writes clearanceDocs sub-map to the user's Firestore document and flips the
// top-level `documentsUploaded` flag so the Director Panopticon can surface
// "ready for review" rows.
//
// Zero-Trust: caller must own the document (uid match) and be a coach or recruiter.
// ─────────────────────────────────────────────────────────────────────────────
exports.markDocumentsUploaded = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Login required.');

    const { safesportUrl, concussionUrl } = request.data || {};
    if (!safesportUrl || !concussionUrl) {
      throw new HttpsError('invalid-argument', 'Both safesportUrl and concussionUrl are required.');
    }

    const claims = reqAuth.token || {};
    const role = claims.role || '';
    if (!['coach', 'recruiter'].includes(role)) {
      throw new HttpsError('permission-denied', 'Only coaches and recruiters may submit compliance documents.');
    }

    const email = (reqAuth.token?.email || '').toLowerCase().trim();
    if (!email) throw new HttpsError('unauthenticated', 'Cannot resolve caller email.');

    const now = admin.firestore.FieldValue.serverTimestamp();
    await db().collection('users').doc(email).set(
      {
        documentsUploaded: true,
        clearanceDocs: {
          safesport: { url: String(safesportUrl), uploadedAt: now },
          concussion: { url: String(concussionUrl), uploadedAt: now },
        },
        clearance: {
          status: 'pending',
          updatedAt: now,
          source: 'self_upload',
        },
      },
      { merge: true },
    );

    await db().collection('audit_logs').add({
      action: 'compliance_docs_uploaded',
      actorUid: reqAuth.uid,
      actorEmail: email,
      safesportUrl: String(safesportUrl),
      concussionUrl: String(concussionUrl),
      timestamp: now,
    });

    logger.info('[compliance] Documents marked uploaded', { email });
    return { ok: true };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// simulateClearance  (Alpha — Yardstik BGC simulation)
// ─────────────────────────────────────────────────────────────────────────────
// Director-only callable that mimics a successful Yardstik background-check
// callback for the Alpha test cycle.  Sets clearance.status = 'cleared' with
// source = 'yardstik_simulated', then refreshes JWT custom claims so the coach
// regains access immediately without requiring a logout/login cycle.
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

    const now = admin.firestore.FieldValue.serverTimestamp();
    await userRef.set(
      {
        clearance: {
          status: 'cleared',
          updatedAt: now,
          source: 'yardstik_simulated',
          clearedBy: reqAuth.uid,
          // 1-year simulated expiry
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          ),
        },
      },
      { merge: true },
    );

    const userRecord = await auth().getUserByEmail(normalizedEmail).catch(() => null);
    if (userRecord) {
      await stampClearanceClaim(userRecord.uid, normalizedEmail);
    }

    await db().collection('audit_logs').add({
      action: 'clearance_simulated_yardstik',
      actorUid: reqAuth.uid,
      targetEmail: normalizedEmail,
      clubId: clubId || null,
      timestamp: now,
    });

    logger.info('[compliance] Yardstik clearance simulated', {
      targetEmail: normalizedEmail,
      by: reqAuth.uid,
    });

    return { ok: true, email: normalizedEmail, status: 'cleared' };
  },
);
