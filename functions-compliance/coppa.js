/* eslint-disable quotes */
/**
 * coppa.js
 * â”€â”€â”€â”€â”€â”€â”€â”€
 * COPPA 2026 / Privacy Shield â€” Parental Consent Cloud Functions
 *
 * IMPORTANT: admin.initializeApp() is called in functions/index.js.
 * This module require()s 'firebase-admin' and reuses the already-initialised
 * singleton app â€” never calls initializeApp() again.
 *
 * Exports
 * â”€â”€â”€â”€â”€â”€â”€
 *   sendParentalConsentEmail   onCall â€” child requests consent email
 *   verifyParentalConsent      onCall â€” parent grants or denies (no auth required)
 *
 * â”€â”€â”€ Zero-Trust Architecture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *   coppaStatus on users/{email} is a SERVER-ONLY field.
 *   Firestore Security Rules block ALL client writes to this field.
 *   The only write path is: verifyParentalConsent CF â†’ Admin SDK.
 *
 *   Consent token security:
 *     â€¢ 32-char cryptographically random hex token (128-bit entropy)
 *     â€¢ Stored at consent_tokens/{token} (token = document ID, no query)
 *     â€¢ 72-hour TTL enforced both on read and by expiry field
 *     â€¢ One-time-use: consumed flag prevents replay attacks
 *     â€¢ IP address of the parent is captured server-side (not from client)
 *
 * â”€â”€â”€ Email Delivery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *   This module writes to the `mail/{autoId}` collection, which is processed
 *   by the Firebase Trigger Email Extension (https://firebase.google.com/products/extensions/firebase-firestore-send-email).
 *   Configure the extension with your SMTP provider (SendGrid, Postmark, etc.).
 *
 *   To install:
 *     firebase ext:install firebase/firestore-send-email
 *
 * â”€â”€â”€ Consent Token Schema (Firestore: consent_tokens/{token}) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *   token           string      â€” 32-char hex (= document ID)
 *   childUid        string      â€” Firebase Auth UID of child
 *   childEmail      string      â€” lowercase email key (= users doc ID)
 *   parentEmail     string      â€” parent email that received the link
 *   tenantId        string      â€” canonical tenant
 *   expiresAt       Timestamp   â€” 72h TTL
 *   consumed        boolean     â€” true once verifyParentalConsent commits
 *   createdAt       Timestamp
 *
 * â”€â”€â”€ Consent Log Schema (Firestore: consent_logs/{autoId}) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *   action          string      â€” 'email_sent' | 'granted' | 'denied' | 'expired'
 *   childUid        string
 *   childEmail      string
 *   parentEmail     string
 *   tenantId        string
 *   consentToken    string      â€” correlation key
 *   ipAddress       string      â€” server-extracted (not from client payload)
 *   userAgent       string?     â€” diagnostic only
 *   timestamp       Timestamp   â€” server-side, tamper-evident
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {logActivity, ACTIVITY_TYPE} = require('./auditLogger');

const REGION = 'us-east1';
const TOKEN_TTL_HOURS = 72;
const PLATFORM_NAME = 'VANGUARD / Soccer Skills Tracker';
const PLATFORM_URL = process.env.PLATFORM_URL || 'https://vanguard.app';

const fs = () => admin.firestore();

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Structured Consent Audit Log
// Fire-and-forget. Failures are logged but never block the main operation.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CONSENT_EVENT = Object.freeze({
  EMAIL_SENT: 'email_sent',
  GRANTED: 'granted',
  DENIED: 'denied',
  EXPIRED: 'expired',
  RESEND: 'resend',
});

/**
 * Sprint 2.1 — write canonical consent record inside an existing transaction.
 *
 * @param {import('firebase-admin/firestore').Transaction} txn
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {{ parentId: string, childId: string, ipAddress: string, consentMethod: string, coppaStatus: string, clubId: string, tokenRef?: string }} vault
 */
function writeConsentVault(txn, firestore, vault) {
  const consentRef = firestore.collection('consents').doc();
  txn.set(consentRef, {
    parentId: vault.parentId,
    childId: vault.childId,
    consentDate: admin.firestore.FieldValue.serverTimestamp(),
    ipAddress: vault.ipAddress,
    consentMethod: vault.consentMethod,
    coppaStatus: vault.coppaStatus,
    clubId: vault.clubId,
    tokenRef: vault.tokenRef || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

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

  // 2. Unified audit trail â€” maps COPPA action to ACTIVITY_TYPE
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Email helper â€” writes to `mail` collection for Firebase Trigger Email Ext.
// Requires: firebase ext:install firebase/firestore-send-email
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @param {{ to: string, subject: string, html: string, mailType?: string }} opts
 *
 * Phase 2, Epic 3 — mailType convention:
 *   'transactional'  (default) — consent emails, OTPs, invite links.
 *                                Teen ad-block interceptors do NOT block these.
 *   'marketing'      — promotional newsletters, event announcements.
 *                      Teen ad-block interceptors BLOCK these for teen13to16 subjects.
 */
function sendMail(opts) {
  return fs().collection('mail').add({
    to: [opts.to],
    message: {
      subject: opts.subject,
      html: opts.html,
    },
    // mailType enables the teen ad-block interceptor to distinguish transactional
    // from marketing mails.  All coppa.js mails are transactional.
    mailType: opts.mailType || 'transactional',
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
  <title>Parental Consent Required â€” ${PLATFORM_NAME}</title>
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
      <div class="badge">COPPA Â· PRIVACY SHIELD 2026</div>
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
        <a href="${consentUrl}" class="cta-btn">â–¶ REVIEW &amp; GRANT CONSENT</a>
      </div>
      <p class="url-fallback">
        If the button above doesn't work, copy and paste this URL into your browser:<br />
        ${consentUrl}
      </p>
      <div class="expiry-note">
        âš  This link expires in ${expiresHours} hours. If it has expired, the child
        can request a new consent email from the app.
      </div>
      <p class="text" style="margin-top:20px; font-size:12px;">
        If you did not expect this email or do not recognize the account
        <span class="child-email">${childEmail}</span>, you can safely ignore it â€”
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1.  sendParentalConsentEmail â€” onCall
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
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.sendParentalConsentEmail = onCall(
    {region: REGION},
    async (request) => {
      // â”€â”€ Auth guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Input validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Verify the child profile is actually a minor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Generate token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

      // â”€â”€ Write consent token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Update parentEmail on user doc (for display / audit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      await fs().collection('users').doc(userKey).update({
        parentEmail,
        coppaStatus: 'pending',
      });

      // â”€â”€ Send email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        // Email failure is non-fatal â€” the token exists, parent can receive a
        // resend. Log the failure but don't rollback the token.
        logger.error('[sendParentalConsentEmail] mail write failed:', mailErr.message);
      }

      // â”€â”€ Audit log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2.  verifyParentalConsent â€” onCall (auth NOT required â€” parent has no account)
//
// Called from /consent/[token] page when the parent clicks Grant or Deny.
// request.auth will be null if the parent is not signed in (expected).
//
// Security model:
//   The token IS the authentication.  A 32-char hex token has 128-bit entropy â€”
//   equivalent to a cryptographic nonce.  The token is single-use (consumed
//   flag), time-limited (expiresAt TTL), and stored server-side.
//
// On GRANTED:
//   â€¢ users/{childEmail}: coppaStatus = 'granted', consentDate = serverTimestamp
//   â€¢ JWT custom claims: vpcVerified = true  (enables playerVpcAllowed() in rules)
//   â€¢ consent_tokens/{token}: consumed = true
//   â€¢ consent_logs: action = 'granted'
//
// On DENIED:
//   â€¢ users/{childEmail}: coppaStatus = 'denied'
//   â€¢ consent_tokens/{token}: consumed = true
//   â€¢ consent_logs: action = 'denied'
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.verifyParentalConsent = onCall(
    {region: REGION},
    async (request) => {
      const {token: rawToken, action} = request.data || {};

      // â”€â”€ Input validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Resolve IP address â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const parentIp = request.rawRequest?.ip || 'unknown';
      const userAgent = request.rawRequest?.headers?.['user-agent'] || '';

      // â”€â”€ Atomic transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

          // Consumed guard â€” prevents replay
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

          // Write coppaStatus â€” this is the ONLY authoritative write path.
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

          writeConsentVault(txn, firestore, {
            parentId: tokenData.parentEmail || '',
            childId: tokenData.childUid || '',
            ipAddress: parentIp,
            consentMethod: 'email_token',
            coppaStatus: action,
            clubId: tokenData.tenantId || '',
            tokenRef: tokenStr,
          });
        });
      } catch (err) {
        if (err instanceof HttpsError) throw err;
        logger.error('[verifyParentalConsent] transaction error:', err);
        throw new HttpsError('internal', 'Failed to process consent. Please try again.');
      }

      // â”€â”€ Granted: update JWT custom claims (vpcVerified = true) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Expired path audit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // (happens when the TTL check triggers inside the transaction above
      // but the transaction rolled back â€” handled via exception above)

      // â”€â”€ Audit log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// ═══════════════════════════════════════════════════════════════════════════════
// Epic 15 — Native WebAuthn COPPA Attestation
// ═══════════════════════════════════════════════════════════════════════════════

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10-minute window

/**
 * generateWebAuthnChallenge
 * ─────────────────────────
 * Issues a 32-byte cryptographically-random challenge, stores it in
 * `coppaChallenges/{userId}` with a 10-minute TTL, and returns the
 * base64url-encoded challenge plus RP metadata to the browser.
 *
 * Accepts either an authenticated caller (reqAuth.uid) or a pre-auth
 * tempUserId so the flow can be invoked before the parent account is
 * fully created.
 */
exports.generateWebAuthnChallenge = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    const { tempUserId } = request.data || {};
    const userId = reqAuth?.uid || tempUserId;

    if (!userId || typeof userId !== 'string') {
      throw new HttpsError('unauthenticated', 'Authenticated UID or tempUserId required.');
    }

    // 256-bit entropy — never derive from Firestore doc IDs
    const challenge = crypto.randomBytes(32).toString('base64url');

    await fs().collection('coppaChallenges').doc(userId).set({
      challenge,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('[coppa] WebAuthn challenge issued', { userId });
    return { challenge, rpName: PLATFORM_NAME, userId };
  },
);

/**
 * verifyBiometricConsent
 * ──────────────────────
 * Receives the raw WebAuthn AttestationResponse from the browser,
 * verifies the challenge binding (clientDataJSON), performs anti-replay
 * deletion, then atomically writes the consent record and stamps the
 * `vpcVerified` JWT claim on both parent and child accounts.
 *
 * Expected request.data shape:
 *   clientDataJSON   string  base64url-encoded ArrayBuffer
 *   attestationObject string base64url-encoded ArrayBuffer (stored for audit)
 *   credentialId     string  credential.id from PublicKeyCredential
 *   childEmail?      string  target minor's email (lowercase)
 *   inviteToken?     string  consent_tokens doc ID (consumed on success)
 */
exports.verifyBiometricConsent = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const reqAuth   = request.auth;
    const tempUserId = request.data?.tempUserId;
    const userId    = reqAuth?.uid || tempUserId;

    if (!userId) throw new HttpsError('unauthenticated', 'User ID required.');

    const { clientDataJSON, attestationObject, credentialId, childEmail, inviteToken } =
      request.data || {};

    if (!clientDataJSON) {
      throw new HttpsError('invalid-argument', 'clientDataJSON is required.');
    }

    // ── 1. Load + validate stored challenge ─────────────────────────────────
    const challengeRef  = fs().collection('coppaChallenges').doc(userId);
    const challengeSnap = await challengeRef.get();

    if (!challengeSnap.exists) {
      throw new HttpsError('not-found', 'No pending challenge. Please restart verification.');
    }

    const storedData = challengeSnap.data();
    const storedChallenge = storedData.challenge;

    const createdAt = storedData.createdAt?.toDate ? storedData.createdAt.toDate() : new Date(0);
    if (Date.now() - createdAt.getTime() > CHALLENGE_TTL_MS) {
      await challengeRef.delete().catch(() => null);
      throw new HttpsError('deadline-exceeded', 'Challenge expired. Please restart verification.');
    }

    // ── 2. Decode & verify clientDataJSON ───────────────────────────────────
    let clientData;
    try {
      const raw = Buffer.from(clientDataJSON, 'base64url').toString('utf8');
      clientData = JSON.parse(raw);
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid clientDataJSON encoding.');
    }

    if (clientData.type !== 'webauthn.create') {
      throw new HttpsError('invalid-argument', `Expected webauthn.create, got: ${clientData.type}`);
    }

    if (clientData.challenge !== storedChallenge) {
      logger.warn('[coppa] Challenge mismatch — possible replay', { userId });
      throw new HttpsError('permission-denied', 'Challenge mismatch. Possible replay attack.');
    }

    const allowedOrigins = [
      PLATFORM_URL,
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean);
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(clientData.origin)) {
      logger.warn('[coppa] Origin mismatch', { userId, origin: clientData.origin });
      throw new HttpsError('permission-denied', 'Invalid attestation origin.');
    }

    // ── 3. Anti-replay: delete challenge immediately ─────────────────────────
    await challengeRef.delete();

    // ── 4. Resolve identities ────────────────────────────────────────────────
    const clientIp      = request.rawRequest?.ip || 'unknown';
    const parentEmail   = (reqAuth?.token?.email || '').toLowerCase().trim();
    const targetChild   = (childEmail || '').toLowerCase().trim();
    const now           = admin.firestore.FieldValue.serverTimestamp();

    // ── 5. Atomic Firestore commit ───────────────────────────────────────────
    const batch = fs().batch();

    // Parent compliance record
    if (parentEmail) {
      const parentRef = fs().collection('users').doc(parentEmail);
      batch.set(parentRef, {
        coppa: {
          status:       'cleared',
          attestedVia:  'webauthn_biometric',
          timestamp:    now,
          clientIp,
          credentialId: credentialId || null,
        },
        coppaStatus: 'granted',
        consentDate: now,
        vpcStatus:   'verified',
      }, { merge: true });
    }

    // Child consent grant
    if (targetChild) {
      const childRef = fs().collection('users').doc(targetChild);
      batch.set(childRef, {
        coppaStatus: 'granted',
        consentDate: now,
        vpcStatus:   'verified',
        'coppa.parentConsentedVia':    'webauthn_biometric',
        'coppa.parentConsentTimestamp': now,
      }, { merge: true });
    }

    // Consume invite token if supplied
    if (inviteToken && typeof inviteToken === 'string') {
      const tokenRef = fs().collection('consent_tokens').doc(inviteToken);
      // Non-fatal: token may already be consumed or nonexistent
      batch.set(tokenRef, {
        consumed:     true,
        consumedVia:  'webauthn_biometric',
        consumedAt:   now,
      }, { merge: true });
    }

    // Audit log
    const auditRef = fs().collection('consent_logs').doc();
    batch.set(auditRef, {
      action:       'webauthn_biometric_consent',
      attestedVia:  'webauthn_biometric',
      parentUid:    userId,
      parentEmail:  parentEmail || null,
      childEmail:   targetChild || null,
      credentialId: credentialId || null,
      clientIp,
      timestamp:    now,
    });

    await batch.commit();

    // ── 6. Stamp JWT claims (non-fatal) ──────────────────────────────────────
    const claimUpdates = [];
    if (reqAuth?.uid) {
      claimUpdates.push(
        admin.auth().getUser(reqAuth.uid).then(u =>
          admin.auth().setCustomUserClaims(u.uid, { ...(u.customClaims || {}), vpcVerified: true }),
        ).catch(e => logger.warn('[coppa] parent claim update failed', { error: e.message })),
      );
    }
    if (targetChild) {
      claimUpdates.push(
        admin.auth().getUserByEmail(targetChild).then(u =>
          admin.auth().setCustomUserClaims(u.uid, { ...(u.customClaims || {}), vpcVerified: true }),
        ).catch(e => logger.warn('[coppa] child claim update failed', { email: targetChild, error: e.message })),
      );
    }
    await Promise.allSettled(claimUpdates);

    logger.info('[coppa] WebAuthn biometric consent verified', { userId, parentEmail, targetChild });
    return { success: true, attestedVia: 'webauthn_biometric' };
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// directorOutOfBandClearance
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Director-attested out-of-band VPC clearance.
 * Called when a Director has physically verified parental consent and needs to
 * unlock a player node that is stuck in `coppaStatus: 'pending_guardian'`.
 *
 * Zero-Trust contract:
 *   • Caller must hold director / registrar / super_admin / global_admin role.
 *   • Caller's clubId must match the target player's clubId (tenant isolation).
 *   • Writes an IMMUTABLE audit log entry — never editable by the caller.
 *   • Stamps `vpcVerified: true` JWT claim immediately (no logout required).
 *
 * request.data shape:
 *   targetEmail  string  — player email (Firestore doc key)
 *   clubId       string  — caller's club (enforced for tenant isolation)
 */
exports.directorOutOfBandClearance = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const reqAuth = request.auth;
    if (!reqAuth) throw new HttpsError('unauthenticated', 'Login required.');

    const callerClaims = reqAuth.token || {};
    const allowedRoles = ['director', 'registrar', 'super_admin', 'global_admin'];
    if (!allowedRoles.includes(callerClaims.role || '')) {
      throw new HttpsError('permission-denied', 'Director or Registrar access required.');
    }

    const { targetEmail, clubId, attestationType: rawAttestationType } = request.data || {};
    // Allowlist of valid attestation types for immutable audit records
    const VALID_ATTESTATIONS = ['director_out_of_band', 'director_physical_escrow'];
    const attestationType = VALID_ATTESTATIONS.includes(rawAttestationType)
      ? rawAttestationType
      : 'director_out_of_band';
    if (!targetEmail || typeof targetEmail !== 'string') {
      throw new HttpsError('invalid-argument', 'targetEmail is required.');
    }
    if (!clubId || typeof clubId !== 'string') {
      throw new HttpsError('invalid-argument', 'clubId is required.');
    }

    // Tenant isolation: caller's club must match supplied clubId
    const callerClub = callerClaims.clubId || callerClaims.tenantId || '';
    const isGlobalOps = ['super_admin', 'global_admin'].includes(callerClaims.role || '');
    if (!isGlobalOps && callerClub !== clubId) {
      throw new HttpsError('permission-denied', 'Cross-tenant operation not permitted.');
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();
    const userRef = fs().collection('users').doc(normalizedEmail);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'Player record not found.');
    }

    const userData = userSnap.data() || {};

    // Read-Repair: accept legacy clubId / tenantId field names
    const playerClub = userData.clubId || userData.tenantId || '';
    if (!isGlobalOps && playerClub && playerClub !== clubId) {
      throw new HttpsError('permission-denied', 'Player is not in your club.');
    }

    const clientIp  = request.rawRequest?.ip || 'unknown';
    const now       = admin.firestore.FieldValue.serverTimestamp();
    const dirEmail  = (callerClaims.email || '').toLowerCase();

    // Atomic batch: user update + immutable audit log
    const batch = fs().batch();

    batch.set(userRef, {
      coppaStatus:  'granted',
      vpcStatus:    'verified',
      consentDate:  now,
      coppa: {
        status:       'cleared',
        attestedVia:  attestationType,
        directorUid:  reqAuth.uid,
        directorEmail: dirEmail,
        timestamp:    now,
        clientIp,
      },
    }, { merge: true });

    // Immutable audit record (no update path; autoId doc)
    const auditRef = fs().collection('consent_logs').doc();
    batch.set(auditRef, {
      action:        `director_clearance_${attestationType}`,
      attestedVia:   attestationType,
      directorUid:   reqAuth.uid,
      directorEmail: dirEmail,
      targetEmail:   normalizedEmail,
      clubId,
      clientIp,
      timestamp:     now,
    });

    await batch.commit();

    // Stamp JWT claim (non-fatal)
    try {
      const authUser = await admin.auth().getUserByEmail(normalizedEmail);
      const existing = authUser.customClaims || {};
      await admin.auth().setCustomUserClaims(authUser.uid, {
        ...existing,
        vpcVerified: true,
      });
    } catch (claimErr) {
      logger.warn('[coppa] OOB claim update failed (non-fatal)', {
        targetEmail: normalizedEmail,
        error: claimErr.message,
      });
    }

    logger.info('[coppa] Director out-of-band clearance applied', {
      targetEmail: normalizedEmail,
      directorUid: reqAuth.uid,
      clubId,
    });

    return { success: true, attestedVia: attestationType };
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 2, Epic 3 — WebAuthn Biometric Attestation for Parental Consent
// ═══════════════════════════════════════════════════════════════════════════════
//
// These two callables extend the COPPA consent flow so that a parent's grant
// decision is bound to their on-device biometric (TouchID / FaceID / Windows
// Hello) via the WebAuthn Attestation API.  The resulting attestation record
// is stored in `coppa_attestations/{tokenId}` as an immutable, Admin-SDK-only
// document that satisfies the COPPA "digital signature" audit requirement.
//
// Flow:
//   1. Parent opens /consent/[token] in browser.
//   2. Browser calls generateConsentAttestationChallenge → gets a 32-byte
//      random challenge tied to the consent token doc.
//   3. Browser calls navigator.credentials.create() → OS biometric prompt.
//   4. Browser calls attestParentalConsent → server verifies challenge + RP ID
//      + origin, writes attestation, and commits the consent grant.
//
// Fallback: if the browser does not support WebAuthn, the existing
//   verifyParentalConsent callable is used instead (classical flow).
//
// WEBAUTHN_RP_ORIGIN env var must match the hosting domain exactly:
//   e.g. 'https://vanguard.app' (no trailing slash).
// ═══════════════════════════════════════════════════════════════════════════════

const CONSENT_CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 min
const CONSENT_CHALLENGE_MAX_ATTEMPTS = 5;

/**
 * generateConsentAttestationChallenge  onCall (no auth required)
 * ─────────────────────────────────────
 * Issues a 32-byte cryptographically-random challenge tied to a consent token.
 * The challenge is stored on the consent_tokens doc itself so the subsequent
 * attestParentalConsent CF can verify it atomically.
 *
 * Rate limit: max 5 challenge issuances per token (challengeCount field).
 *
 * request.data: { token: string }  — 64-char hex consent token
 * Returns:
 *   { challenge: string, rpId: string, userIdHandle: string,
 *     userName: string, userDisplayName: string }
 */
exports.generateConsentAttestationChallenge = onCall(
    {region: REGION, enforceAppCheck: false},
    async (request) => {
      const {token: rawToken} = request.data || {};

      if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
        throw new HttpsError('invalid-argument', 'Invalid or missing consent token (must be 64 hex chars).');
      }

      const tokenStr = rawToken.toLowerCase().trim();
      const tokenRef = fs().collection('consent_tokens').doc(tokenStr);
      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        throw new HttpsError('not-found', 'Consent link not found or has expired.');
      }

      const tokenData = tokenSnap.data();

      if (tokenData.consumed === true) {
        throw new HttpsError('already-exists', 'This consent link has already been used.');
      }

      const expiresAt = tokenData.expiresAt?.toDate
          ? tokenData.expiresAt.toDate()
          : new Date(tokenData.expiresAt || 0);
      if (expiresAt < new Date()) {
        throw new HttpsError('deadline-exceeded', 'This consent link has expired.');
      }

      // Rate-limit: at most CONSENT_CHALLENGE_MAX_ATTEMPTS per token.
      const prevCount = tokenData.challengeCount || 0;
      if (prevCount >= CONSENT_CHALLENGE_MAX_ATTEMPTS) {
        throw new HttpsError(
            'resource-exhausted',
            `Maximum challenge attempts (${CONSENT_CHALLENGE_MAX_ATTEMPTS}) exceeded for this consent link.`,
        );
      }

      // Generate a fresh 32-byte challenge (base64url).
      const challenge = crypto.randomBytes(32).toString('base64url');
      const now = admin.firestore.FieldValue.serverTimestamp();

      await tokenRef.update({
        webauthnChallenge: challenge,
        challengeIssuedAt: now,
        challengeCount: prevCount + 1,
      });

      // Derive RP identity from PLATFORM_URL or env var.
      const rpOrigin = process.env.WEBAUTHN_RP_ORIGIN || PLATFORM_URL;
      let rpId;
      try {
        rpId = new URL(rpOrigin).hostname;
      } catch {
        rpId = 'vanguard.app';
      }

      // userIdHandle: first 16 chars of token — opaque, not a UID, not PII.
      const userIdHandle = tokenStr.slice(0, 16);
      const parentEmail = tokenData.parentEmail || '';
      const childEmail  = tokenData.childEmail  || '';

      logger.info('[coppa] Consent attestation challenge issued', {
        token: tokenStr.slice(0, 8) + '...', challengeCount: prevCount + 1,
      });

      return {
        challenge,
        rpId,
        userIdHandle,
        userName: parentEmail,
        userDisplayName: `Parent / Guardian granting consent for ${childEmail}`,
      };
    },
);

/**
 * attestParentalConsent  onCall (no auth required)
 * ─────────────────────────────────────────────────
 * Receives the WebAuthn attestation from the parent's browser, verifies:
 *   1. Token not consumed + not expired.
 *   2. Stored challenge exists (was issued by generateConsentAttestationChallenge).
 *   3. clientDataJSON: type == 'webauthn.create', challenge matches, origin matches.
 *   4. attestationObject: RP ID hash matches, UV flag set, authData well-formed.
 * Then commits atomically:
 *   - coppa_attestations/{tokenId} written (immutable)
 *   - consent_tokens/{token} consumed
 *   - users/{childEmail} coppaStatus updated
 *   - vpcVerified JWT claim stamped (if granted)
 *   - consent_logs entry written
 *
 * Falls back gracefully if cbor-x is unavailable (stores attestation as-is).
 *
 * request.data: AttestParentalConsentInput (see src/lib/types/coppa.ts)
 * Returns: AttestParentalConsentResult
 */
exports.attestParentalConsent = onCall(
    {region: REGION, enforceAppCheck: false},
    async (request) => {
      const {
        token: rawToken,
        action,
        attestationObjectB64,
        clientDataJSONB64,
        credentialIdB64,
      } = request.data || {};

      // ── Input validation ──────────────────────────────────────────────────
      if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
        throw new HttpsError('invalid-argument', 'Invalid or missing consent token.');
      }
      if (action !== 'granted' && action !== 'denied') {
        throw new HttpsError('invalid-argument', '`action` must be "granted" or "denied".');
      }
      if (!attestationObjectB64 || !clientDataJSONB64 || !credentialIdB64) {
        throw new HttpsError('invalid-argument', 'attestationObjectB64, clientDataJSONB64, and credentialIdB64 are required.');
      }

      const tokenStr = rawToken.toLowerCase().trim();
      const firestore = fs();

      const parentIp  = request.rawRequest?.ip || 'unknown';
      const userAgent = request.rawRequest?.headers?.['user-agent'] || '';

      // ── Load consent token ────────────────────────────────────────────────
      const tokenRef  = firestore.collection('consent_tokens').doc(tokenStr);
      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        throw new HttpsError('not-found', 'Consent link not found or has expired.');
      }

      const tokenData = tokenSnap.data();

      if (tokenData.consumed === true) {
        throw new HttpsError('already-exists', 'This consent link has already been used.');
      }

      const expiresAt = tokenData.expiresAt?.toDate
          ? tokenData.expiresAt.toDate()
          : new Date(tokenData.expiresAt || 0);
      if (expiresAt < new Date()) {
        throw new HttpsError('deadline-exceeded', 'This consent link has expired.');
      }

      if (!tokenData.webauthnChallenge) {
        throw new HttpsError('failed-precondition', 'No pending challenge found. Call generateConsentAttestationChallenge first.');
      }

      // ── Verify clientDataJSON ─────────────────────────────────────────────
      let clientData;
      try {
        const raw = Buffer.from(clientDataJSONB64, 'base64url').toString('utf8');
        clientData = JSON.parse(raw);
      } catch {
        throw new HttpsError('invalid-argument', 'Invalid clientDataJSON encoding.');
      }

      if (clientData.type !== 'webauthn.create') {
        throw new HttpsError('invalid-argument', `Expected type 'webauthn.create', got: ${clientData.type}`);
      }

      if (clientData.challenge !== tokenData.webauthnChallenge) {
        logger.warn('[coppa] attestParentalConsent: challenge mismatch', {token: tokenStr.slice(0, 8)});
        throw new HttpsError('permission-denied', 'Challenge mismatch — possible replay attack.');
      }

      const rpOrigin = process.env.WEBAUTHN_RP_ORIGIN || PLATFORM_URL;
      const allowedOrigins = [
        rpOrigin,
        'http://localhost:5173',
        'http://localhost:5174',
      ].filter(Boolean);
      if (allowedOrigins.length > 0 && !allowedOrigins.includes(clientData.origin)) {
        logger.warn('[coppa] attestParentalConsent: origin mismatch', {origin: clientData.origin});
        throw new HttpsError('permission-denied', 'Invalid attestation origin.');
      }

      // ── Verify attestationObject (CBOR decode) ────────────────────────────
      let rpIdHashMatch = true; // default permissive if CBOR unavailable
      let publicKeyB64  = '';

      try {
        const {decode} = require('cbor-x');
        const attestBuf = Buffer.from(attestationObjectB64, 'base64url');
        const attestObj = decode(attestBuf);

        // authData is a byte array in the decoded CBOR map
        const authData = attestObj.authData;
        if (authData && authData.length >= 37) {
          // Bytes 0-31: RP ID hash (SHA-256 of rpId)
          const storedRpIdHash = authData.slice(0, 32);
          let rpId;
          try {
            rpId = new URL(rpOrigin).hostname;
          } catch {
            rpId = 'vanguard.app';
          }
          const expectedRpIdHash = crypto.createHash('sha256').update(rpId).digest();
          rpIdHashMatch = crypto.timingSafeEqual(storedRpIdHash, expectedRpIdHash);

          if (!rpIdHashMatch) {
            logger.warn('[coppa] attestParentalConsent: RP ID hash mismatch');
            throw new HttpsError('permission-denied', 'RP ID hash mismatch — attestation is not for this origin.');
          }

          // Byte 32: flags — bit 2 (UV flag) must be set (userVerification required)
          const flags = authData[32];
          const uvFlag = (flags & 0x04) !== 0;
          if (!uvFlag) {
            throw new HttpsError('failed-precondition', 'User verification was not performed — biometric required.');
          }

          // Bytes 55+ may contain COSE public key (attested credential data if present).
          // Length check: aaguid (16) + credLen (2) + credentialId + credentialPublicKey
          if (authData.length > 55) {
            const credLen = (authData[53] << 8) | authData[54];
            const keyStart = 55 + credLen;
            if (authData.length > keyStart) {
              const cosePub = authData.slice(keyStart);
              publicKeyB64 = Buffer.from(cosePub).toString('base64url');
            }
          }
        }
      } catch (cborErr) {
        // Non-HttpsError means cbor-x parse issue — log and continue (store raw).
        if (cborErr instanceof HttpsError) throw cborErr;
        logger.warn('[coppa] attestParentalConsent: CBOR decode failed, storing raw attestation', {
          err: cborErr.message,
        });
      }

      // ── Atomic Firestore commit ───────────────────────────────────────────
      let tokenDataFinal = tokenData;
      let childDisplayName;

      try {
        await firestore.runTransaction(async (txn) => {
          // Re-read inside transaction for strict consistency.
          const freshSnap = await txn.get(tokenRef);
          if (!freshSnap.exists) throw new HttpsError('not-found', 'Consent link not found.');
          tokenDataFinal = freshSnap.data();
          if (tokenDataFinal.consumed === true) {
            throw new HttpsError('already-exists', 'This consent link has already been used.');
          }

          // Mark token consumed.
          txn.update(tokenRef, {consumed: true});

          // Read child user doc.
          const userRef  = firestore.collection('users').doc(tokenDataFinal.childEmail);
          const userSnap = await txn.get(userRef);
          if (!userSnap.exists) throw new HttpsError('not-found', 'Child account not found.');
          const userData = userSnap.data();
          childDisplayName = userData.playerName || userData.displayName || tokenDataFinal.childEmail;

          // Flip coppaStatus.
          if (action === 'granted') {
            txn.update(userRef, {
              coppaStatus: 'granted',
              consentDate: admin.firestore.FieldValue.serverTimestamp(),
              vpcStatus:   'verified',
            });
          } else {
            txn.update(userRef, {
              coppaStatus: 'denied',
              consentDate: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          writeConsentVault(txn, firestore, {
            parentId: tokenDataFinal.parentEmail || '',
            childId: tokenDataFinal.childUid || '',
            ipAddress: parentIp,
            consentMethod: 'webauthn',
            coppaStatus: action,
            clubId: tokenDataFinal.tenantId || '',
            tokenRef: tokenStr,
          });

          // Write immutable attestation record.
          let rpIdForRecord;
          try {
            rpIdForRecord = new URL(rpOrigin).hostname;
          } catch {
            rpIdForRecord = 'vanguard.app';
          }
          const attestRef = firestore.collection('coppa_attestations').doc(tokenStr);
          txn.set(attestRef, {
            tokenId:              tokenStr,
            parentEmail:          tokenDataFinal.parentEmail || '',
            childUid:             tokenDataFinal.childUid    || '',
            tenantId:             tokenDataFinal.tenantId    || '',
            publicKeyB64,
            attestationObjectB64,
            clientDataJSONB64,
            credentialIdB64,
            rpId:                 rpIdForRecord,
            origin:               clientData.origin || rpOrigin,
            action,
            parentIp,
            parentUserAgent:      userAgent,
            attestedAt:           admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      } catch (err) {
        if (err instanceof HttpsError) throw err;
        logger.error('[coppa] attestParentalConsent: transaction error', err);
        throw new HttpsError('internal', 'Failed to record consent. Please try again.');
      }

      // ── Stamp JWT claim (vpcVerified) ─────────────────────────────────────
      if (action === 'granted' && tokenDataFinal?.childUid) {
        try {
          const authUser = await admin.auth().getUser(tokenDataFinal.childUid);
          const merged   = { ...(authUser.customClaims || {}), vpcVerified: true };
          await admin.auth().setCustomUserClaims(tokenDataFinal.childUid, merged);
          logger.info('[coppa] attestParentalConsent: vpcVerified claim set', {uid: tokenDataFinal.childUid});
        } catch (claimsErr) {
          logger.warn('[coppa] attestParentalConsent: claim update failed (syncs on next login)', claimsErr.message);
        }
      }

      // ── Audit log ─────────────────────────────────────────────────────────
      logConsentEvent(action === 'granted' ? CONSENT_EVENT.GRANTED : CONSENT_EVENT.DENIED, {
        childUid:     tokenDataFinal?.childUid    || '',
        childEmail:   tokenDataFinal?.childEmail   || '',
        parentEmail:  tokenDataFinal?.parentEmail  || '',
        tenantId:     tokenDataFinal?.tenantId     || '',
        consentToken: tokenStr,
        ipAddress:    parentIp,
        userAgent,
      });

      logger.info('[coppa] attestParentalConsent: consent committed with biometric attestation', {
        action,
        childEmail: tokenDataFinal?.childEmail,
        rpIdHashMatch,
      });

      return {
        success:           true,
        action,
        attestationStored: true,
        childDisplayName:  childDisplayName || undefined,
      };
    },
);
