/**
 * phoneVerification.js
 * ─────────────────────
 * Phase 2, Epic 3 — Native Firebase Phone Number Verification.
 *
 * Exports
 * ───────
 *   mirrorPhoneVerification   onCall  — mirrors phone number to Firestore user
 *                                       doc + stamps phoneVerified JWT claim.
 *   unlinkPhoneVerification   onCall  — removes phone credential from Firebase
 *                                       Auth + clears Firestore fields + strips
 *                                       JWT claim.
 *
 * Security model
 * ──────────────
 * • `mirrorPhoneVerification` is ONLY callable by an authenticated user who
 *   already has a phone credential attached (Firebase's `linkWithPhoneNumber`
 *   already ran on the client and the user's ID token now carries
 *   `phone_number`).  The CF reads `phone_number` from the JWT — the client
 *   cannot supply a fake phone number.
 *
 * • `unlinkPhoneVerification` uses the Admin SDK to remove the credential,
 *   so the client cannot unlink someone else's phone.
 *
 * • `syncUserClaims` (adminOps.js) now reads `userData.phoneVerified` and
 *   preserves the claim on every restamp, so a Firestore trigger on the same
 *   user doc does not silently strip `phoneVerified: true`.
 *
 * IMPORTANT: admin.initializeApp() is called in functions/index.js.
 * This module reuses the already-initialised singleton app.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {FieldValue}          = require('firebase-admin/firestore');
const logger                = require('firebase-functions/logger');
const admin                 = require('firebase-admin');

const REGION = 'us-east1';

const db = () => admin.firestore();

// ── mirrorPhoneVerification ───────────────────────────────────────────────

/**
 * onCall — requires authentication.
 *
 * The client calls this AFTER a successful `confirmationResult.confirm(code)`
 * and a forced ID-token refresh so the JWT carries `phone_number`.
 *
 * Steps:
 *   1. Read `phone_number` from the verified JWT claim (canonical, tamper-proof).
 *   2. Write `phoneE164`, `phoneVerifiedAt`, `phoneVerified: true` to
 *      `users/{emailKey}` via merge so existing fields are preserved.
 *   3. Read existing custom claims, merge in `{ phoneVerified: true }`, and
 *      re-stamp with `setCustomUserClaims`.  The subsequent `syncUserClaims`
 *      trigger will also preserve the claim via `userData.phoneVerified`.
 *
 * Returns: { phoneVerified: true, phoneE164 }
 */
exports.mirrorPhoneVerification = onCall({region: REGION}, async (request) => {
  const {auth} = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  // phone_number is set by Firebase Auth after a successful phone linkage.
  const phoneE164 = auth.token.phone_number;
  if (!phoneE164) {
    throw new HttpsError(
        'failed-precondition',
        'No verified phone number found on this account. ' +
        'Complete linkWithPhoneNumber + confirmationResult.confirm() first.',
    );
  }

  const uid      = auth.uid;
  const email    = (auth.token.email || '').toLowerCase();
  if (!email) {
    throw new HttpsError('failed-precondition', 'User account must have an email to mirror phone.');
  }

  // ── Write to users/{email} (merge) ─────────────────────────────────────
  const usersRef = db().collection('users').doc(email);
  await usersRef.set(
      {
        phoneE164,
        phoneVerifiedAt: FieldValue.serverTimestamp(),
        phoneVerified:   true,
      },
      {merge: true},
  );

  // ── Merge phoneVerified into existing JWT claims ────────────────────────
  try {
    const existing = await admin.auth().getUser(uid);
    const currentClaims = existing.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, {
      ...currentClaims,
      phoneVerified: true,
    });
  } catch (err) {
    logger.warn('mirrorPhoneVerification: setCustomUserClaims failed', err);
    // Non-fatal — syncUserClaims trigger will restamp on the next doc write.
  }

  logger.info(`mirrorPhoneVerification: stamped phoneVerified for ${email}`);
  return {phoneVerified: true, phoneE164};
});

// ── unlinkPhoneVerification ───────────────────────────────────────────────

/**
 * onCall — requires authentication.
 *
 * Removes the phone number credential from Firebase Auth, clears Firestore
 * mirror fields, and strips the `phoneVerified` JWT custom claim.
 *
 * The `syncUserClaims` trigger fires when the user doc is updated, but since
 * `phoneVerified: false` is now written explicitly, the trigger will stamp
 * `phoneVerified: false` on its next restamp — no race condition.
 *
 * Returns: { phoneUnlinked: true }
 */
exports.unlinkPhoneVerification = onCall({region: REGION}, async (request) => {
  const {auth} = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const uid   = auth.uid;
  const email = (auth.token.email || '').toLowerCase();
  if (!email) {
    throw new HttpsError('failed-precondition', 'User account must have an email.');
  }

  // ── Remove phone from Firebase Auth ────────────────────────────────────
  try {
    await admin.auth().updateUser(uid, {phoneNumber: null});
  } catch (err) {
    logger.warn('unlinkPhoneVerification: updateUser phoneNumber=null failed', err);
    // Continue — clean up Firestore regardless.
  }

  // ── Clear Firestore mirror ──────────────────────────────────────────────
  const usersRef = db().collection('users').doc(email);
  await usersRef.set(
      {
        phoneE164:       null,
        phoneVerifiedAt: null,
        phoneVerified:   false,
      },
      {merge: true},
  );

  // ── Strip JWT claim ─────────────────────────────────────────────────────
  try {
    const existing = await admin.auth().getUser(uid);
    const currentClaims = {...(existing.customClaims || {})};
    delete currentClaims.phoneVerified;
    await admin.auth().setCustomUserClaims(uid, currentClaims);
  } catch (err) {
    logger.warn('unlinkPhoneVerification: setCustomUserClaims failed', err);
  }

  logger.info(`unlinkPhoneVerification: cleared phone for ${email}`);
  return {phoneUnlinked: true};
});
