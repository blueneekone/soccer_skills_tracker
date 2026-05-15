/**
 * functions/webauthn.js
 * ──────────────────────────────────────────────────────────────────────────
 * Phase 2 Epic 3 — Passwordless WebAuthn (Passkey) Cloud Functions.
 *
 * Four onCall v2 callables (region: us-east1):
 *   webauthnRegisterStart  → generate PublicKeyCredentialCreationOptionsJSON
 *   webauthnRegisterFinish → verify attestation, persist credential
 *   webauthnLoginStart     → generate PublicKeyCredentialRequestOptionsJSON
 *   webauthnLoginFinish    → verify assertion, issue Firebase custom token
 *
 * Security model:
 *   - Registration callables require a signed-in user (request.auth.uid).
 *   - Login start accepts email (pre-auth); login finish uses the UID from
 *     the challenge document (avoids spoofing).
 *   - All credential writes go through Admin SDK — never client SDK.
 *   - Challenge documents carry a 5-minute server-side TTL enforced here.
 *   - Per .cursorrules Zero-Data-Loss: credential writes use { merge: true }.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const db = admin.firestore();

// ── RP configuration ────────────────────────────────────────────────────────
// RP_ID and RP_ORIGIN are set via Firebase environment config / defineString so
// no production values are hard-coded here.
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const RP_NAME = 'Nexus Command';
const RP_ORIGIN = process.env.WEBAUTHN_RP_ORIGIN || 'http://localhost:5173';

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load all registered passkey credentials for a given Firebase UID.
 * @param {string} uid
 * @returns {Promise<Array<{id: string, transports: string[]}>>}
 */
async function loadCredentialsForUid(uid) {
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('passkeys')
    .get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      const stored = data.credentialID;
      const id =
        typeof stored === 'string' && stored
          ? stored
          : typeof d.id === 'string' && d.id
            ? d.id
            : null;
      if (!id) return null;
      return {
        id,
        transports: Array.isArray(data.transports) ? data.transports : [],
      };
    })
    .filter(Boolean);
}

/**
 * Firestore / Node may return `publicKey` as Buffer or plain Uint8Array — not
 * always an object with `toUint8Array()` (runtime log: toUint8Array is not a function).
 * @param {unknown} pk
 * @returns {Uint8Array}
 */
function publicKeyToUint8Array(pk) {
  if (!pk) {
    throw new HttpsError(
      'failed-precondition',
      'Stored credential is missing publicKey.',
    );
  }
  if (pk instanceof Uint8Array) {
    return pk;
  }
  if (Buffer.isBuffer(pk)) {
    return new Uint8Array(pk.buffer, pk.byteOffset, pk.byteLength);
  }
  if (typeof pk.toUint8Array === 'function') {
    return new Uint8Array(pk.toUint8Array());
  }
  if (typeof pk === 'object') {
    const vals = Object.values(pk);
    if (vals.length > 0 && vals.every((v) => typeof v === 'number')) {
      return Uint8Array.from(vals);
    }
  }
  throw new HttpsError(
    'failed-precondition',
    'Stored credential publicKey has an unsupported encoding.',
  );
}

// ── webauthnRegisterStart ────────────────────────────────────────────────────
exports.webauthnRegisterStart = onCall(
  {region: 'us-east1'},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first to register a passkey.');
    }
    const uid = request.auth.uid;

    const existingCreds = await loadCredentialsForUid(uid);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(uid),
      userName: request.auth.token.email || uid,
      userDisplayName: request.auth.token.name || request.auth.token.email || uid,
      attestationType: 'none',
      excludeCredentials: existingCreds.map((c) => ({
        id: c.id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Persist challenge with TTL
    await db
      .collection('users')
      .doc(uid)
      .collection('passkey_challenges')
      .doc('register')
      .set({
        challenge: options.challenge,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      });

    return options;
  },
);

// ── webauthnRegisterFinish ───────────────────────────────────────────────────
exports.webauthnRegisterFinish = onCall(
  {region: 'us-east1'},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first to register a passkey.');
    }
    const uid = request.auth.uid;
    const {attResp} = request.data;

    if (!attResp) {
      throw new HttpsError('invalid-argument', 'attResp is required.');
    }

    const challengeRef = db
      .collection('users')
      .doc(uid)
      .collection('passkey_challenges')
      .doc('register');
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      throw new HttpsError('not-found', 'No pending registration challenge found. Restart the flow.');
    }
    const {challenge, expiresAt} = challengeDoc.data();
    if (new Date() > expiresAt.toDate()) {
      await challengeRef.delete();
      throw new HttpsError('deadline-exceeded', 'Challenge expired. Please try again.');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: attResp,
        expectedChallenge: challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        // Must match authenticatorSelection.userVerification: 'preferred' in register start
        requireUserVerification: false,
      });
    } catch (err) {
      throw new HttpsError('invalid-argument', `Passkey verification failed: ${err.message}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new HttpsError('failed-precondition', 'Passkey registration could not be verified.');
    }

    const {credential} = verification.registrationInfo;

    // Persist credential — Zero-Data-Loss: merge: true
    await db
      .collection('users')
      .doc(uid)
      .collection('passkeys')
      .doc(credential.id)
      .set(
        {
          credentialID: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: attResp.response?.transports || [],
          tenantId: request.auth.token.tenantId || request.auth.token.clubId || null,
          clubId: request.auth.token.clubId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );

    // Clean up challenge
    await challengeRef.delete();

    return {verified: true};
  },
);

// ── webauthnLoginStart ───────────────────────────────────────────────────────
exports.webauthnLoginStart = onCall(
  {region: 'us-east1'},
  async (request) => {
    const {email} = request.data;
    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'email is required.');
    }

    // Resolve UID from email via Admin SDK
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    } catch {
      // Return generic options even for unknown emails to avoid enumeration
      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: 'preferred',
        allowCredentials: [],
      });
      return options;
    }

    const uid = userRecord.uid;
    const existingCreds = await loadCredentialsForUid(uid);

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      allowCredentials: existingCreds.map((c) => ({
        id: c.id,
        transports: c.transports,
      })),
    });

    // Persist challenge keyed by UID so login finish can verify it
    await db
      .collection('users')
      .doc(uid)
      .collection('passkey_challenges')
      .doc('login')
      .set({
        challenge: options.challenge,
        email: email.trim().toLowerCase(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      });

    // Return options + uid so the client can pass it back in loginFinish
    return {options, uid};
  },
);

// ── webauthnLoginFinish ──────────────────────────────────────────────────────
exports.webauthnLoginFinish = onCall(
  {region: 'us-east1'},
  async (request) => {
    const {uid, authResp} = request.data;
    if (!uid || !authResp) {
      throw new HttpsError('invalid-argument', 'uid and authResp are required.');
    }

    const challengeRef = db
      .collection('users')
      .doc(uid)
      .collection('passkey_challenges')
      .doc('login');
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      throw new HttpsError('not-found', 'No pending login challenge. Restart the passkey flow.');
    }
    const {challenge, expiresAt} = challengeDoc.data();
    if (new Date() > expiresAt.toDate()) {
      await challengeRef.delete();
      throw new HttpsError('deadline-exceeded', 'Challenge expired. Please try again.');
    }

    // Load the specific credential being used
    const credentialId = authResp.id;
    const credRef = db
      .collection('users')
      .doc(uid)
      .collection('passkeys')
      .doc(credentialId);
    const credDoc = await credRef.get();

    if (!credDoc.exists) {
      throw new HttpsError('not-found', 'Passkey credential not found for this account.');
    }
    const credData = credDoc.data();

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: authResp,
        expectedChallenge: challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: credData.credentialID,
          publicKey: publicKeyToUint8Array(credData.publicKey),
          counter: credData.counter,
          transports: credData.transports,
        },
        // Align with generateAuthenticationOptions({ userVerification: 'preferred' })
        requireUserVerification: false,
      });
    } catch (err) {
      throw new HttpsError('invalid-argument', `Passkey authentication failed: ${err.message}`);
    }

    if (!verification.verified) {
      throw new HttpsError('failed-precondition', 'Passkey authentication could not be verified.');
    }

    // Update counter to prevent replay attacks — Zero-Data-Loss: merge: true
    await credRef.set(
      {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    // Clean up challenge
    await challengeRef.delete();

    // Issue Firebase custom token — mirrors validatePlayerOTP shape
    const customToken = await admin.auth().createCustomToken(uid);
    return {customToken};
  },
);
