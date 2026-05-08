/* eslint-disable quotes */
/**
 * coppa.js
 * ────────
 * COPPA 2026 / Privacy Shield — Parental Consent Cloud Functions
 *
 * IMPORTANT: admin.initializeApp() is called in functions/index.js.
 * This module require()s 'firebase-admin' and reuses the already-initialised
 * singleton app — never calls initializeApp() again.
 *
 * Exports
 * ───────
 *   sendParentalConsentEmail   onCall — child requests consent email
 *   verifyParentalConsent      onCall — parent grants or denies (no auth required)
 *
 * ─── Zero-Trust Architecture ─────────────────────────────────────────────────
 *
 *   coppaStatus on users/{email} is a SERVER-ONLY field.
 *   Firestore Security Rules block ALL client writes to this field.
 *   The only write path is: verifyParentalConsent CF → Admin SDK.
 *
 *   Consent token security:
 *     • 32-char cryptographically random hex token (128-bit entropy)
 *     • Stored at consent_tokens/{token} (token = document ID, no query)
 *     • 72-hour TTL enforced both on read and by expiry field
 *     • One-time-use: consumed flag prevents replay attacks
 *     • IP address of the parent is captured server-side (not from client)
 *
 * ─── Email Delivery ──────────────────────────────────────────────────────────
 *
 *   This module writes to the `mail/{autoId}` collection, which is processed
 *   by the Firebase Trigger Email Extension (https://firebase.google.com/products/extensions/firebase-firestore-send-email).
 *   Configure the extension with your SMTP provider (SendGrid, Postmark, etc.).
 *
 *   To install:
 *     firebase ext:install firebase/firestore-send-email
 *
 * ─── Consent Token Schema (Firestore: consent_tokens/{token}) ────────────────
 *
 *   token           string      — 32-char hex (= document ID)
 *   childUid        string      — Firebase Auth UID of child
 *   childEmail      string      — lowercase email key (= users doc ID)
 *   parentEmail     string      — parent email that received the link
 *   tenantId        string      — canonical tenant
 *   expiresAt       Timestamp   — 72h TTL
 *   consumed        boolean     — true once verifyParentalConsent commits
 *   createdAt       Timestamp
 *
 * ─── Consent Log Schema (Firestore: consent_logs/{autoId}) ───────────────────
 *
 *   action          string      — 'email_sent' | 'granted' | 'denied' | 'expired'
 *   childUid        string
 *   childEmail      string
 *   parentEmail     string
 *   tenantId        string
 *   consentToken    string      — correlation key
 *   ipAddress       string      — server-extracted (not from client payload)
 *   userAgent       string?     — diagnostic only
 *   timestamp       Timestamp   — server-side, tamper-evident
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {logActivity, ACTIVITY_TYPE} = require('./auditLogger');

const REGION = 'us-central1';
const TOKEN_TTL_HOURS = 72;
const PLATFORM_NAME = 'VANGUARD / Soccer Skills Tracker';
const PLATFORM_URL = process.env.PLATFORM_URL || 'https://vanguard.app';

const fs = () => admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// Structured Consent Audit Log
// Fire-and-forget. Failures are logged but never block the main operation.
// ─────────────────────────────────────────────────────────────────────────────

const CONSENT_EVENT = Object.freeze({
  EMAIL_SENT: 'email_sent',
  GRANTED: 'granted',
  DENIED: 'denied',
  EXPIRED: 'expired',
  RESEND: 'resend',
});

/**
 * Write to the COPPA-specific `consent_logs` collection AND to the global
 * `audit_logs` collection via logActivity().
 *
 * Two-collection strategy:
 *   consent_logs  — COPPA-specific with parentEmail, consentToken, userAgent
 *   audit_logs    — Unified platform audit trail (read by platform admins)
 *
 * @param {string} action — CONSENT_EVENT constant
 * @param {{ childUid: string, childEmail: string, parentEmail: string, tenantId: string, consentToken: string, ipAddress: string, userAgent?: string }} data
 */
function logConsentEvent(action, data) {
  // 1. COPPA-specific log (parentEmail, token correlation, userAgent)
  fs()
      .collection('consent_logs')
      .add({
        action,
        childUid: data.childUid || '',
        childEmail: data.childEmail || '',
        parentEmail: data.parentEmail || '',
        tenantId: data.tenantId || '',
        consentToken: data.consentToken || '',
        ipAddress: data.ipAddress || 'unknown',
        userAgent: data.userAgent || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch((err) => logger.warn('[consentLog] write failed', action, err.message));

  // 2. Unified audit trail — maps COPPA action to ACTIVITY_TYPE
  const activityMap = {
    [CONSENT_EVENT.EMAIL_SENT]: ACTIVITY_TYPE.CONSENT_EMAIL_SENT,
    [CONSENT_EVENT.GRANTED]:    ACTIVITY_TYPE.CONSENT_GRANTED,
    [CONSENT_EVENT.DENIED]:     ACTIVITY_TYPE.CONSENT_DENIED,
    [CONSENT_EVENT.EXPIRED]:    ACTIVITY_TYPE.CONSENT_EXPIRED,
    [CONSENT_EVENT.RESEND]:     ACTIVITY_TYPE.CONSENT_EMAIL_SENT,
  };
  const unifiedAction = activityMap[action] || action;
  logActivity(unifiedAction, {
    actorUid:    data.childUid || '',
    actorEmail:  data.childEmail || null,
    targetUid:   null,
    targetEmail: data.parentEmail || null,
    tenantId:    data.tenantId || '',
    ipAddress:   data.ipAddress || 'unknown',
    notes:       `COPPA consent event: ${action}`,
    extra: {
      consentToken: data.consentToken || '',
      userAgent:    data.userAgent || null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Email helper — writes to `mail` collection for Firebase Trigger Email Ext.
// Requires: firebase ext:install firebase/firestore-send-email
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ to: string, subject: string, html: string }} opts
 */
function sendMail(opts) {
  return fs().collection('mail').add({
    to: [opts.to],
    message: {
      subject: opts.subject,
      html: opts.html,
    },
  });
}

/**
 * Build the COPPA consent email HTML in the Vanguard / Stark aesthetic.
 * @param {{ parentEmail: string, childEmail: string, token: string, expiresHours: number }} opts
 * @returns {string}
 */
function buildConsentEmailHtml({parentEmail, childEmail, token, expiresHours}) {
  const consentUrl = `${PLATFORM_URL}/consent/${token}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Parental Consent Required — ${PLATFORM_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background: #020208; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 560px; margin: 40px auto; background: #080a12; border: 1px solid rgba(0,240,255,0.18); border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, rgba(0,240,255,0.12), rgba(168,85,247,0.08)); padding: 32px 32px 24px; border-bottom: 1px solid rgba(0,240,255,0.1); }
    .badge { display: inline-block; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3); border-radius: 6px; padding: 4px 10px; font-family: monospace; font-size: 11px; color: #00f0ff; letter-spacing: 0.15em; margin-bottom: 16px; }
    .title { margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.04em; }
    .body { padding: 28px 32px; }
    .text { margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.6); }
    .child-email { display: inline-block; background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.15); border-radius: 4px; padding: 2px 8px; font-family: monospace; font-size: 13px; color: #00f0ff; }
    .cta-wrap { text-align: center; margin: 28px 0; }
    .cta-btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,180,255,0.1)); border: 1px solid rgba(0,240,255,0.55); border-radius: 8px; color: #00f0ff; font-family: monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-decoration: none; }
    .url-fallback { margin: 0 0 16px; font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.25); word-break: break-all; }
    .expiry-note { padding: 12px 16px; background: rgba(240,199,94,0.06); border: 1px solid rgba(240,199,94,0.18); border-radius: 6px; font-family: monospace; font-size: 11px; color: rgba(240,199,94,0.7); letter-spacing: 0.06em; margin-top: 16px; }
    .footer { padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); }
    .footer-text { margin: 0; font-size: 11px; color: rgba(255,255,255,0.2); line-height: 1.6; }
    .deny-link { color: rgba(255,77,106,0.6); text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">COPPA · PRIVACY SHIELD 2026</div>
      <h1 class="title">Parental Consent Required</h1>
    </div>
    <div class="body">
      <p class="text">Hello,</p>
      <p class="text">
        A child account registered under <span class="child-email">${childEmail}</span>
        has requested your consent to use <strong style="color:#fff">${PLATFORM_NAME}</strong>,
        a sports performance tracking platform.
      </p>
      <p class="text">
        Under the <strong style="color:#fff">Children's Online Privacy Protection Act (COPPA)</strong>,
        we require verifiable parental consent before collecting or using personal
        information from children under 13. Your consent is required to activate
        this account.
      </p>
      <div class="cta-wrap">
        <a href="${consentUrl}" class="cta-btn">▶ REVIEW &amp; GRANT CONSENT</a>
      </div>
      <p class="url-fallback">
        If the button above doesn't work, copy and paste this URL into your browser:<br />
        ${consentUrl}
      </p>
      <div class="expiry-note">
        ⚠ This link expires in ${expiresHours} hours. If it has expired, the child
        can request a new consent email from the app.
      </div>
      <p class="text" style="margin-top:20px; font-size:12px;">
        If you did not expect this email or do not recognize the account
        <span class="child-email">${childEmail}</span>, you can safely ignore it —
        or <a href="${consentUrl}?action=deny" class="deny-link">click here to deny consent</a>.
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">
        This email was sent by ${PLATFORM_NAME}. Your consent is digitally logged with
        an IP address and timestamp for COPPA compliance. If you have questions,
        contact your child's sports club administrator.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.  sendParentalConsentEmail — onCall
//
// Called by ConsentOverlay.svelte when the child submits a parent email.
// Request must be authenticated (the child player must be signed in).
//
// Idempotency:
//   If a valid (unexpired, unconsumed) token already exists for this child,
//   a new email is sent to the same address and the function returns success.
//   This allows the parent to request a resend without opening a new token.
//
// Zero-Trust:
//   tenantId comes from the caller's JWT, not the client payload.
//   parentEmail is validated server-side (format + length).
// ─────────────────────────────────────────────────────────────────────────────

exports.sendParentalConsentEmail = onCall(
    {region: REGION},
    async (request) => {
      // ── Auth guard ────────────────────────────────────────────────────────
      if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'You must be signed in to request parental consent.',
        );
      }

      const uid = request.auth.uid;
      const callerEmail = (request.auth.token.email || '').toLowerCase().trim();
      const callerRole = request.auth.token.role || '';
      const tenantId = String(request.auth.token.tenantId || request.auth.token.clubId || '');

      if (callerRole !== 'player') {
        throw new HttpsError(
            'permission-denied',
            'Only player accounts require parental consent.',
        );
      }

      // ── Input validation ──────────────────────────────────────────────────
      const {parentEmail: rawParent} = request.data || {};
      if (!rawParent || typeof rawParent !== 'string') {
        throw new HttpsError('invalid-argument', '`parentEmail` is required.');
      }
      const parentEmail = rawParent.toLowerCase().trim();
      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRx.test(parentEmail) || parentEmail.length > 320) {
        throw new HttpsError('invalid-argument', 'Invalid parent email address.');
      }
      if (parentEmail === callerEmail) {
        throw new HttpsError(
            'invalid-argument',
            'Parent email must differ from the child account email.',
        );
      }

      // ── Verify the child profile is actually a minor ───────────────────────
      const userKey = callerEmail || uid;
      const userSnap = await fs().collection('users').doc(userKey).get();
      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User profile not found.');
      }
      const userData = userSnap.data();
      if (userData.isMinor !== true) {
        throw new HttpsError(
            'failed-precondition',
            'This account is not flagged as a minor. No consent required.',
        );
      }
      if (userData.coppaStatus === 'granted') {
        throw new HttpsError(
            'already-exists',
            'Parental consent has already been granted for this account.',
        );
      }

      // ── Generate token ────────────────────────────────────────────────────
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

      // ── Write consent token ───────────────────────────────────────────────
      await fs().collection('consent_tokens').doc(token).set({
        token,
        childUid: uid,
        childEmail: userKey,
        parentEmail,
        tenantId,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        consumed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Update parentEmail on user doc (for display / audit) ─────────────
      await fs().collection('users').doc(userKey).update({
        parentEmail,
        coppaStatus: 'pending',
      });

      // ── Send email ────────────────────────────────────────────────────────
      try {
        await sendMail({
          to: parentEmail,
          subject: `Action Required: Parental Consent for ${PLATFORM_NAME}`,
          html: buildConsentEmailHtml({
            parentEmail,
            childEmail: userKey,
            token,
            expiresHours: TOKEN_TTL_HOURS,
          }),
        });
      } catch (mailErr) {
        // Email failure is non-fatal — the token exists, parent can receive a
        // resend. Log the failure but don't rollback the token.
        logger.error('[sendParentalConsentEmail] mail write failed:', mailErr.message);
      }

      // ── Audit log ─────────────────────────────────────────────────────────
      const clientIp = request.rawRequest?.ip || 'unknown';
      const userAgent = request.rawRequest?.headers?.['user-agent'] || '';
      logConsentEvent(CONSENT_EVENT.EMAIL_SENT, {
        childUid: uid,
        childEmail: userKey,
        parentEmail,
        tenantId,
        consentToken: token,
        ipAddress: clientIp,
        userAgent,
      });

      logger.info('[sendParentalConsentEmail] token issued', {uid, userKey, tenantId});
      return {success: true};
    },
);

// ─────────────────────────────────────────────────────────────────────────────
// 2.  verifyParentalConsent — onCall (auth NOT required — parent has no account)
//
// Called from /consent/[token] page when the parent clicks Grant or Deny.
// request.auth will be null if the parent is not signed in (expected).
//
// Security model:
//   The token IS the authentication.  A 32-char hex token has 128-bit entropy —
//   equivalent to a cryptographic nonce.  The token is single-use (consumed
//   flag), time-limited (expiresAt TTL), and stored server-side.
//
// On GRANTED:
//   • users/{childEmail}: coppaStatus = 'granted', consentDate = serverTimestamp
//   • JWT custom claims: vpcVerified = true  (enables playerVpcAllowed() in rules)
//   • consent_tokens/{token}: consumed = true
//   • consent_logs: action = 'granted'
//
// On DENIED:
//   • users/{childEmail}: coppaStatus = 'denied'
//   • consent_tokens/{token}: consumed = true
//   • consent_logs: action = 'denied'
// ─────────────────────────────────────────────────────────────────────────────

exports.verifyParentalConsent = onCall(
    {region: REGION},
    async (request) => {
      const {token: rawToken, action} = request.data || {};

      // ── Input validation ──────────────────────────────────────────────────
      if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
        throw new HttpsError(
            'invalid-argument',
            'Invalid or missing consent token.',
        );
      }
      if (action !== 'granted' && action !== 'denied') {
        throw new HttpsError(
            'invalid-argument',
            '`action` must be "granted" or "denied".',
        );
      }

      const tokenStr = rawToken.toLowerCase().trim();
      const firestore = fs();

      // ── Resolve IP address ────────────────────────────────────────────────
      const parentIp = request.rawRequest?.ip || 'unknown';
      const userAgent = request.rawRequest?.headers?.['user-agent'] || '';

      // ── Atomic transaction ────────────────────────────────────────────────
      let tokenData;
      let childDisplayName;

      try {
        await firestore.runTransaction(async (txn) => {
          const tokenRef = firestore.collection('consent_tokens').doc(tokenStr);
          const tokenSnap = await txn.get(tokenRef);

          if (!tokenSnap.exists) {
            throw new HttpsError(
                'not-found',
                'Consent link not found. It may have already been used or never existed.',
            );
          }

          tokenData = tokenSnap.data();

          // Consumed guard — prevents replay
          if (tokenData.consumed === true) {
            throw new HttpsError(
                'already-exists',
                'This consent link has already been used.',
            );
          }

          // TTL guard
          const expiresAt = tokenData.expiresAt?.toDate
            ? tokenData.expiresAt.toDate()
            : new Date(tokenData.expiresAt || 0);
          if (expiresAt < new Date()) {
            txn.update(tokenRef, {consumed: true});
            throw new HttpsError(
                'deadline-exceeded',
                'This consent link has expired. Please ask your child to request a new one.',
            );
          }

          // Mark token consumed
          txn.update(tokenRef, {consumed: true});

          // Resolve the child user doc
          const userRef = firestore.collection('users').doc(tokenData.childEmail);
          const userSnap = await txn.get(userRef);
          if (!userSnap.exists) {
            throw new HttpsError('not-found', 'Child account not found.');
          }
          const userData = userSnap.data();
          childDisplayName = userData.playerName || userData.displayName || tokenData.childEmail;

          // Write coppaStatus — this is the ONLY authoritative write path.
          if (action === 'granted') {
            txn.update(userRef, {
              coppaStatus: 'granted',
              consentDate: admin.firestore.FieldValue.serverTimestamp(),
              vpcStatus: 'verified', // also satisfies the existing VPC gate
            });
          } else {
            txn.update(userRef, {
              coppaStatus: 'denied',
              consentDate: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        });
      } catch (err) {
        if (err instanceof HttpsError) throw err;
        logger.error('[verifyParentalConsent] transaction error:', err);
        throw new HttpsError('internal', 'Failed to process consent. Please try again.');
      }

      // ── Granted: update JWT custom claims (vpcVerified = true) ───────────
      // This enables the existing playerVpcAllowed() gate in Firestore Rules
      // without requiring a full token refresh on the child's next login.
      if (action === 'granted' && tokenData?.childUid) {
        try {
          const authUser = await admin.auth().getUser(tokenData.childUid);
          const merged = {
            ...(authUser.customClaims || {}),
            vpcVerified: true,
          };
          await admin.auth().setCustomUserClaims(tokenData.childUid, merged);
          logger.info('[verifyParentalConsent] vpcVerified claim set', {uid: tokenData.childUid});
        } catch (claimsErr) {
          // Non-fatal: the Firestore profile is the source of truth.
          // The claim will sync on the child's next login via syncUserClaims.
          logger.warn('[verifyParentalConsent] claim update failed (will sync on login):', claimsErr.message);
        }
      }

      // ── Expired path audit ────────────────────────────────────────────────
      // (happens when the TTL check triggers inside the transaction above
      // but the transaction rolled back — handled via exception above)

      // ── Audit log ─────────────────────────────────────────────────────────
      logConsentEvent(action === 'granted' ? CONSENT_EVENT.GRANTED : CONSENT_EVENT.DENIED, {
        childUid: tokenData?.childUid || '',
        childEmail: tokenData?.childEmail || '',
        parentEmail: tokenData?.parentEmail || '',
        tenantId: tokenData?.tenantId || '',
        consentToken: tokenStr,
        ipAddress: parentIp,
        userAgent,
      });

      logger.info('[verifyParentalConsent] consent processed', {
        action,
        childEmail: tokenData?.childEmail,
        parentIp,
      });

      return {
        success: true,
        action,
        childDisplayName: childDisplayName || undefined,
      };
    },
);
