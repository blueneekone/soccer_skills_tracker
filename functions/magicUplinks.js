/**
 * magicUplinks.js
 * ────────────────
 * Phase 2, Epic 3 — Passwordless Magic Uplinks (Email v1).
 *
 * Exports
 * ───────
 *   mintMagicUplink    onCall  — director/coach/super_admin mints a single-use
 *                               time-locked invite link and dispatches it via
 *                               the Firebase Trigger Email extension.
 *   redeemMagicUplink  onCall  — PUBLIC surface (no auth required); parses the
 *                               `<tokenId>.<secret>` from the URL, atomically
 *                               verifies + consumes the uplink, and returns a
 *                               Firebase custom token with tenant claims pre-
 *                               stamped so the client can call
 *                               signInWithCustomToken immediately.
 *
 * Token security model
 * ─────────────────────
 *   • tokenId:  20 random bytes → base64url  (= Firestore doc ID + URL prefix)
 *   • secret:   32 random bytes → base64url  (travels in the email ONLY)
 *   • Stored:   hex(scrypt(secret, salt, 64, {N:16384,r:8,p:1}))
 *   • Single-use enforced by a Firestore transaction that checks consumedAt==null
 *     before stamping.
 *   • Constant-time compare via crypto.timingSafeEqual to prevent timing attacks.
 *
 * IMPORTANT: admin.initializeApp() is called in functions/index.js.
 * This module reuses the already-initialised singleton app.
 */

'use strict';

const crypto  = require('crypto');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {FieldValue} = require('firebase-admin/firestore');
const logger  = require('firebase-functions/logger');
const admin   = require('firebase-admin');

const {
  TTL_HOURS_BY_PURPOSE,
  MAX_EXPIRY_HOURS,
  MIN_EXPIRY_HOURS,
  TOKEN_ID_BYTES,
  SECRET_BYTES,
  SALT_BYTES,
  TOKEN_SEPARATOR,
  SCRYPT_N,
  SCRYPT_R,
  SCRYPT_P,
  SCRYPT_KEY_LEN,
  MAX_PENDING_PER_TRIPLE,
  REDIRECT_BY_PURPOSE,
  STATUS,
  AUDIT_ACTION,
  DISPATCH_CHANNEL,
} = require('./magicUplinkConstants');

const REGION        = 'us-east1';
const PLATFORM_NAME = 'VANGUARD / Soccer Skills Tracker';
const PLATFORM_URL  = process.env.PLATFORM_URL || 'https://vanguard.app';

const db = () => admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Derive an scrypt hash for a secret.
 * @param {string} secret  base64url string
 * @param {string} salt    hex-encoded 32-byte salt
 * @returns {Promise<Buffer>}
 */
function scryptDerive(secret, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
        secret,
        Buffer.from(salt, 'hex'),
        SCRYPT_KEY_LEN,
        {N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P},
        (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

/**
 * Write to the `mail/{docId}` collection consumed by the Trigger Email extension.
 * Phase 2, Epic 3 — mailType: 'transactional' marks this as a non-marketing
 * email so the teen ad-block interceptor does not suppress it.
 * @param {{ to: string, subject: string, html: string }} opts
 * @returns {Promise<string>} docId used as dispatchMessageId
 */
async function sendMagicUplinkEmail({to, subject, html}) {
  const ref = await db().collection('mail').add({
    to: [to],
    message: {subject, html},
    mailType: 'transactional',
  });
  return ref.id;
}

/**
 * Write an audit row to `magic_uplink_audit/{autoId}`.
 * Fire-and-forget — failures are logged but never block the main operation.
 */
function writeAuditRow(data) {
  db().collection('magic_uplink_audit').add({
    ...data,
    timestamp: FieldValue.serverTimestamp(),
  }).catch((err) => logger.warn('magic_uplink_audit write failed', err));
}

/**
 * Build the Vanguard-branded Magic Uplink email HTML.
 */
function buildUplinkEmailHtml({targetEmail, purpose, role, expiresAt, uplinkUrl}) {
  const expiryLabel = expiresAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const roleLabel = role || purpose;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You have been invited — ${PLATFORM_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background: #020208; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 560px; margin: 40px auto; background: #080a12; border: 1px solid rgba(0,240,255,0.18); border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, rgba(0,240,255,0.12), rgba(168,85,247,0.08)); padding: 32px 32px 24px; border-bottom: 1px solid rgba(0,240,255,0.1); }
    .badge { display: inline-block; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3); border-radius: 6px; padding: 4px 10px; font-family: monospace; font-size: 11px; color: #00f0ff; letter-spacing: 0.15em; margin-bottom: 16px; }
    .title { margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.04em; }
    .body { padding: 28px 32px; }
    .text { margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.6); }
    .role-tag { display: inline-block; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); border-radius: 4px; padding: 2px 8px; font-family: monospace; font-size: 13px; color: #a855f7; text-transform: uppercase; letter-spacing: 0.1em; }
    .cta-wrap { text-align: center; margin: 28px 0; }
    .cta-btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,180,255,0.1)); border: 1px solid rgba(0,240,255,0.55); border-radius: 8px; color: #00f0ff; font-family: monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-decoration: none; }
    .url-fallback { margin: 0 0 16px; font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.25); word-break: break-all; }
    .expiry-note { padding: 12px 16px; background: rgba(240,199,94,0.06); border: 1px solid rgba(240,199,94,0.18); border-radius: 6px; font-family: monospace; font-size: 11px; color: rgba(240,199,94,0.7); letter-spacing: 0.06em; margin-top: 16px; }
    .security-note { padding: 12px 16px; background: rgba(255,77,106,0.04); border: 1px solid rgba(255,77,106,0.12); border-radius: 6px; font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 12px; }
    .footer { padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); }
    .footer-text { margin: 0; font-size: 11px; color: rgba(255,255,255,0.2); line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">MAGIC UPLINK</div>
      <h1 class="title">You have been invited</h1>
    </div>
    <div class="body">
      <p class="text">
        You have been granted access to the <strong style="color:#fff">${PLATFORM_NAME}</strong>
        platform as a <span class="role-tag">${roleLabel}</span>.
      </p>
      <p class="text">
        This link is single-use and will activate your account automatically —
        no password required.  Simply click the button below to get started.
      </p>
      <div class="cta-wrap">
        <a href="${uplinkUrl}" class="cta-btn">⚡ ACTIVATE ACCOUNT</a>
      </div>
      <p class="url-fallback">Or paste this link into your browser:<br>${uplinkUrl}</p>
      <div class="expiry-note">⏱ This invite expires on ${expiryLabel}.  After that you will need to request a new one.</div>
      <div class="security-note">If you were not expecting this invitation, you can safely ignore this email.  The link only works once and for the account of ${targetEmail}.</div>
    </div>
    <div class="footer">
      <p class="footer-text">
        ${PLATFORM_NAME} · Secure Onboarding<br>
        This message was sent to ${targetEmail} via the Vanguard platform.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── mintMagicUplink ───────────────────────────────────────────────────────

/**
 * onCall — director / coach (for own team) / super_admin.
 *
 * Input:
 *   targetEmail   string   required
 *   purpose       string   required  — player|parent|coach|director|registrar|recruiter
 *   role          string   required  — JWT role claim
 *   clubId        string   optional
 *   teamId        string   optional
 *   householdId   string   optional
 *   tenantId      string   optional
 *   expiryHours   number   optional  — override default TTL (1–720)
 *
 * Returns:
 *   { tokenId, expiresAt (ISO), dispatchMessageId }
 */
exports.mintMagicUplink = onCall({region: REGION}, async (request) => {
  const {auth, data} = request;

  // ── Auth guard ──────────────────────────────────────────────────────────
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required to mint an uplink.');
  }
  const callerRole = auth.token.role || '';
  const allowed = ['director', 'coach', 'registrar', 'super_admin'].includes(callerRole);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Only directors, coaches, or super_admins may mint uplinks.');
  }

  // ── Input validation ────────────────────────────────────────────────────
  const {
    targetEmail,
    purpose,
    role,
    clubId,
    teamId,
    householdId,
    tenantId,
    expiryHours: rawExpiryHours,
  } = data || {};

  if (typeof targetEmail !== 'string' || !targetEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'targetEmail must be a valid email address.');
  }
  const email = targetEmail.toLowerCase().trim();

  const validPurposes = ['player', 'parent', 'coach', 'director', 'registrar', 'recruiter'];
  if (!validPurposes.includes(purpose)) {
    throw new HttpsError('invalid-argument', `purpose must be one of: ${validPurposes.join(', ')}.`);
  }
  if (typeof role !== 'string' || !role) {
    throw new HttpsError('invalid-argument', 'role is required.');
  }

  const defaultHours = TTL_HOURS_BY_PURPOSE[purpose];
  let expiryHours = defaultHours;
  if (rawExpiryHours !== undefined) {
    const parsed = Number(rawExpiryHours);
    if (!Number.isFinite(parsed) || parsed < MIN_EXPIRY_HOURS || parsed > MAX_EXPIRY_HOURS) {
      throw new HttpsError(
          'invalid-argument',
          `expiryHours must be between ${MIN_EXPIRY_HOURS} and ${MAX_EXPIRY_HOURS}.`,
      );
    }
    expiryHours = parsed;
  }

  // ── Rate-limit guard ────────────────────────────────────────────────────
  // Reject if minter already has MAX_PENDING_PER_TRIPLE active uplinks for the
  // same (mintedByUid, targetEmail, purpose) triple, to prevent spam from a
  // compromised director account.
  const pending = await db()
      .collection('magic_uplinks')
      .where('mintedByUid', '==', auth.uid)
      .where('targetEmail', '==', email)
      .where('purpose', '==', purpose)
      .where('status', '==', STATUS.PENDING)
      .limit(MAX_PENDING_PER_TRIPLE)
      .get();

  if (pending.size >= MAX_PENDING_PER_TRIPLE) {
    throw new HttpsError(
        'resource-exhausted',
        `You already have ${MAX_PENDING_PER_TRIPLE} active uplinks for this recipient and purpose. ` +
        'Revoke one before minting another.',
    );
  }

  // ── Generate token material ─────────────────────────────────────────────
  const tokenId = crypto.randomBytes(TOKEN_ID_BYTES).toString('base64url');
  const secret  = crypto.randomBytes(SECRET_BYTES).toString('base64url');
  const salt    = crypto.randomBytes(SALT_BYTES).toString('hex');
  const keyBuf  = await scryptDerive(secret, salt);
  const tokenHash = keyBuf.toString('hex');

  // ── Compute expiry ──────────────────────────────────────────────────────
  const nowMs     = Date.now();
  const expiresAt = new Date(nowMs + expiryHours * 60 * 60 * 1000);

  // ── Write uplink doc + audit row ────────────────────────────────────────
  const uplinkRef = db().collection('magic_uplinks').doc(tokenId);
  const auditRef  = db().collection('magic_uplink_audit').doc();

  const uplinkData = {
    id: tokenId,
    tokenHash,
    salt,
    dispatchChannel: DISPATCH_CHANNEL.EMAIL,
    targetEmail: email,
    purpose,
    role,
    status: STATUS.PENDING,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    mintedAt: FieldValue.serverTimestamp(),
    mintedByUid: auth.uid,
    ...(clubId     && {clubId}),
    ...(teamId     && {teamId}),
    ...(householdId && {householdId}),
    ...(tenantId   && {tenantId}),
  };

  const batch = db().batch();
  batch.set(uplinkRef, uplinkData);
  batch.set(auditRef, {
    action: AUDIT_ACTION.MINTED,
    tokenId,
    targetEmail: email,
    purpose,
    actorUid: auth.uid,
    ...(clubId && {clubId}),
    ...(tenantId && {tenantId}),
    timestamp: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  // ── Dispatch email ──────────────────────────────────────────────────────
  const uplinkUrl = `${PLATFORM_URL}/uplink/${tokenId}${TOKEN_SEPARATOR}${secret}`;
  let dispatchMessageId = '';
  try {
    dispatchMessageId = await sendMagicUplinkEmail({
      to: email,
      subject: `[${PLATFORM_NAME}] Your Magic Uplink — activate your ${role} account`,
      html: buildUplinkEmailHtml({
        targetEmail: email,
        purpose,
        role,
        expiresAt,
        uplinkUrl,
      }),
    });

    // Stamp dispatchedAt + dispatchMessageId on the uplink doc.
    await uplinkRef.update({
      dispatchedAt: FieldValue.serverTimestamp(),
      dispatchMessageId,
    });

    writeAuditRow({
      action: AUDIT_ACTION.DISPATCHED,
      tokenId,
      targetEmail: email,
      purpose,
      actorUid: auth.uid,
      dispatchMessageId,
    });
  } catch (dispatchErr) {
    // Dispatch failure is non-fatal — the uplink doc exists; director can
    // retry from the management console.
    logger.error('mintMagicUplink: email dispatch failed', {tokenId, dispatchErr});
  }

  return {
    tokenId,
    expiresAt: expiresAt.toISOString(),
    dispatchMessageId,
  };
});

// ── redeemMagicUplink ─────────────────────────────────────────────────────

/**
 * onCall — PUBLIC surface (no auth required).
 *
 * Input:
 *   token   string  required  — `<tokenId>.<base64url-secret>` from the URL
 *
 * Returns:
 *   { customToken, redirectTo }
 *
 * Error codes:
 *   invalid-argument  — malformed token
 *   not-found         — no matching uplink doc
 *   failed-precondition — already consumed / revoked / expired
 *   unauthenticated   — scrypt hash mismatch (wrong secret)
 *   internal          — unexpected server error
 */
exports.redeemMagicUplink = onCall({region: REGION}, async (request) => {
  const {data} = request;

  // ── Parse token ─────────────────────────────────────────────────────────
  const rawToken = (data || {}).token;
  if (typeof rawToken !== 'string' || !rawToken.includes(TOKEN_SEPARATOR)) {
    throw new HttpsError('invalid-argument', 'Invalid uplink token format.');
  }
  const sepIdx  = rawToken.indexOf(TOKEN_SEPARATOR);
  const tokenId = rawToken.slice(0, sepIdx);
  const secret  = rawToken.slice(sepIdx + 1);

  if (!tokenId || !secret) {
    throw new HttpsError('invalid-argument', 'Invalid uplink token format.');
  }

  // ── Load uplink doc (pre-transaction read for fast rejection) ───────────
  const uplinkRef = db().collection('magic_uplinks').doc(tokenId);
  const snap      = await uplinkRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Uplink not found or already deleted.');
  }

  const uplink = snap.data();
  const now    = new Date();

  if (uplink.consumedAt) {
    throw new HttpsError('failed-precondition', 'This uplink has already been used.');
  }
  if (uplink.revokedAt) {
    throw new HttpsError('failed-precondition', 'This uplink has been revoked.');
  }
  if (uplink.expiresAt.toDate() < now) {
    throw new HttpsError('failed-precondition', 'This uplink has expired.');
  }

  // ── Constant-time scrypt compare ────────────────────────────────────────
  const derivedKey  = await scryptDerive(secret, uplink.salt);
  const storedKey   = Buffer.from(uplink.tokenHash, 'hex');

  if (derivedKey.length !== storedKey.length || !crypto.timingSafeEqual(derivedKey, storedKey)) {
    // Do NOT reveal whether the tokenId was valid.
    throw new HttpsError('unauthenticated', 'Invalid uplink token.');
  }

  // ── Resolve or create the target Firebase Auth user ────────────────────
  const emailKey = uplink.targetEmail;
  let uid;

  try {
    const existing = await admin.auth().getUserByEmail(emailKey);
    uid = existing.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const newUser = await admin.auth().createUser({email: emailKey});
      uid = newUser.uid;
    } else {
      throw err;
    }
  }

  // ── Build baseline claims ───────────────────────────────────────────────
  const baselineClaims = {
    role: uplink.role,
    ...(uplink.tenantId  && {tenantId:  uplink.tenantId}),
    ...(uplink.clubId    && {clubId:    uplink.clubId}),
    ...(uplink.teamId    && {teamId:    uplink.teamId}),
    ...(uplink.householdId && {householdId: uplink.householdId}),
  };

  // ── Atomic transaction: consume + stamp user doc ────────────────────────
  await db().runTransaction(async (txn) => {
    // Re-read inside transaction (defense against race).
    const txSnap = await txn.get(uplinkRef);
    if (!txSnap.exists || txSnap.data().consumedAt) {
      throw new HttpsError('failed-precondition', 'This uplink has already been used.');
    }

    // Consume the uplink.
    txn.update(uplinkRef, {
      status:         STATUS.CONSUMED,
      consumedAt:     FieldValue.serverTimestamp(),
      consumedByUid:  uid,
    });

    // Upsert users/{emailKey} so syncUserClaims trigger fires.
    const usersRef = db().collection('users').doc(emailKey);
    txn.set(usersRef, {
      email: emailKey,
      firebaseUid: uid,
      ...baselineClaims,
      onboardedVia: 'magic_uplink',
      uplinkTokenId: tokenId,
    }, {merge: true});
  });

  // ── Set custom claims for instant first-render (outside transaction) ────
  await admin.auth().setCustomUserClaims(uid, {
    ...baselineClaims,
    mintedFrom: 'magic_uplink',
  });

  // ── Mint custom token ───────────────────────────────────────────────────
  const customToken = await admin.auth().createCustomToken(uid, {
    ...baselineClaims,
    mintedFrom: 'magic_uplink',
  });

  // ── Audit row (fire-and-forget) ─────────────────────────────────────────
  writeAuditRow({
    action:        AUDIT_ACTION.REDEEMED,
    tokenId,
    targetEmail:   emailKey,
    purpose:       uplink.purpose,
    consumedByUid: uid,
    ...(uplink.clubId && {clubId: uplink.clubId}),
    ...(uplink.tenantId && {tenantId: uplink.tenantId}),
  });

  const redirectTo = REDIRECT_BY_PURPOSE[uplink.purpose] || '/';
  return {customToken, redirectTo};
});

// ── revokeMagicUplink ─────────────────────────────────────────────────────

/**
 * onCall — director / super_admin.
 * Stamps `revokedAt` on the uplink doc and writes an audit row.
 *
 * Input:
 *   tokenId   string  required
 */
exports.revokeMagicUplink = onCall({region: REGION}, async (request) => {
  const {auth, data} = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const callerRole = auth.token.role || '';
  if (!['director', 'super_admin'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Only directors or super_admins may revoke uplinks.');
  }

  const tokenId = (data || {}).tokenId;
  if (typeof tokenId !== 'string' || !tokenId) {
    throw new HttpsError('invalid-argument', 'tokenId is required.');
  }

  const uplinkRef = db().collection('magic_uplinks').doc(tokenId);
  const snap = await uplinkRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Uplink not found.');
  }

  const uplink = snap.data();

  // Scope check — directors can only revoke uplinks for their own club.
  if (callerRole === 'director') {
    const callerClub = auth.token.clubId || '';
    if (uplink.clubId && uplink.clubId !== callerClub) {
      throw new HttpsError('permission-denied', 'You may only revoke uplinks for your own club.');
    }
  }

  if (uplink.consumedAt || uplink.revokedAt) {
    throw new HttpsError(
        'failed-precondition',
        uplink.consumedAt ? 'Uplink already consumed.' : 'Uplink already revoked.',
    );
  }

  const batch = db().batch();
  batch.update(uplinkRef, {
    status:      STATUS.REVOKED,
    revokedAt:   FieldValue.serverTimestamp(),
    revokedByUid: auth.uid,
  });
  const auditRef = db().collection('magic_uplink_audit').doc();
  batch.set(auditRef, {
    action:      AUDIT_ACTION.REVOKED,
    tokenId,
    targetEmail: uplink.targetEmail,
    purpose:     uplink.purpose,
    actorUid:    auth.uid,
    ...(uplink.clubId   && {clubId:   uplink.clubId}),
    ...(uplink.tenantId && {tenantId: uplink.tenantId}),
    timestamp:   FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return {success: true};
});

// ── purgeExpiredUplinks ───────────────────────────────────────────────────

/**
 * Scheduled — runs every 24 hours.
 *
 * Pass 1 (stamp): finds pending uplinks past their expiresAt, sets
 *   `status: 'expired'`.  Does NOT delete — kept 90 days for audit.
 *
 * Pass 2 (hard delete): finds expired / revoked uplinks with
 *   expiresAt < 90 days ago and hard-deletes both the uplink doc and
 *   its audit rows.
 */
exports.purgeExpiredUplinks = onSchedule(
    {schedule: 'every 24 hours', region: REGION},
    async () => {
      const now        = admin.firestore.Timestamp.now();
      const cutoff90   = admin.firestore.Timestamp.fromMillis(
          Date.now() - 90 * 24 * 60 * 60 * 1000,
      );

      // ── Pass 1: stamp expired ──────────────────────────────────────────
      const expiredSnap = await db()
          .collection('magic_uplinks')
          .where('status', '==', STATUS.PENDING)
          .where('expiresAt', '<', now)
          .limit(500)
          .get();

      const stampBatch = db().batch();
      expiredSnap.docs.forEach((d) => {
        stampBatch.update(d.ref, {status: STATUS.EXPIRED});
        const auditRef = db().collection('magic_uplink_audit').doc();
        stampBatch.set(auditRef, {
          action:      AUDIT_ACTION.EXPIRED,
          tokenId:     d.id,
          targetEmail: d.data().targetEmail,
          purpose:     d.data().purpose,
          timestamp:   FieldValue.serverTimestamp(),
        });
      });
      if (!expiredSnap.empty) {
        await stampBatch.commit();
        logger.info(`purgeExpiredUplinks: stamped ${expiredSnap.size} uplinks as expired`);
      }

      // ── Pass 2: hard-delete docs older than 90 days ────────────────────
      const oldSnap = await db()
          .collection('magic_uplinks')
          .where('expiresAt', '<', cutoff90)
          .limit(200)
          .get();

      const deleteBatch = db().batch();
      for (const d of oldSnap.docs) {
        // Delete audit rows for this tokenId.
        const auditSnap = await db()
            .collection('magic_uplink_audit')
            .where('tokenId', '==', d.id)
            .get();
        auditSnap.docs.forEach((a) => deleteBatch.delete(a.ref));
        deleteBatch.delete(d.ref);
      }
      if (!oldSnap.empty) {
        await deleteBatch.commit();
        logger.info(`purgeExpiredUplinks: hard-deleted ${oldSnap.size} uplinks (>90d)`);
      }
    },
);
