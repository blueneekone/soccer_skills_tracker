/**
 * hotelPartnerOps.js — Hotel partner directory management (Session B1)
 * ─────────────────────────────────────────────────────────────────────
 * Super-admin onCall functions for provisioning and rotating hotel partner
 * API credentials.  The plain-text key and signing secret are returned ONCE
 * to the caller and never stored — only `crypto.scrypt`-derived hashes live
 * in Firestore.
 *
 * Auth model (recap):
 *   Authorization: Partner <partnerId>:<base64-api-key>
 *   X-Vanguard-Signature: <hex(HMAC-SHA256(rawBody, signingSecret))>
 *
 * Exports:
 *   provisionHotelPartner   — create a new partner row + generate credentials
 *   rotateHotelPartnerKeys  — replace credentials (24h grace on old hash)
 *   setHotelPartnerStatus   — activate / pause / revoke
 */

'use strict';

const crypto = require('crypto');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const db = admin.firestore();

/** Credential length in bytes before base64 encoding. */
const KEY_BYTES = 32;
/** scrypt params — same as pricingPolicyOps salt to re-use the helper. */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LEN = 64;

// ── Helpers ───────────────────────────────────────────────────────────────

function generateCredential() {
  return crypto.randomBytes(KEY_BYTES).toString('base64url');
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Derive an scrypt hash for a credential.
 * @param {string} plaintext
 * @param {string} salt  hex-encoded 32-byte salt
 * @returns {Promise<string>} hex-encoded hash
 */
function scryptHash(plaintext, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
        plaintext,
        Buffer.from(salt, 'hex'),
        SCRYPT_KEY_LEN,
        {N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P},
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString('hex'));
        },
    );
  });
}

function assertSuperAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const role = request.auth.token.role ?? '';
  if (!['super_admin', 'global_admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Super-admin required.');
  }
}

// ── provisionHotelPartner ─────────────────────────────────────────────────

/**
 * Create a new hotel partner and generate initial credentials.
 *
 * Input: {
 *   name: string,
 *   contactEmails: string[],
 *   payloadFormat?: 'vanguard_v1' | 'marriott_v1' | 'hilton_v1',
 *   ngbAllowlist?: string[],
 * }
 * Returns: { partnerId, apiKey, signingSecret, note }
 */
exports.provisionHotelPartner = onCall(
    {region: REGION},
    async (request) => {
      assertSuperAdmin(request);

      const {name, contactEmails, payloadFormat, ngbAllowlist} = request.data ?? {};
      if (typeof name !== 'string' || !name.trim()) {
        throw new HttpsError('invalid-argument', 'name is required.');
      }
      if (!Array.isArray(contactEmails) || contactEmails.length === 0) {
        throw new HttpsError('invalid-argument', 'contactEmails[] is required.');
      }

      const apiKey = generateCredential();
      const signingSecret = generateCredential();
      const keySalt = generateSalt();

      const [apiKeyHash, signingSecretHash] = await Promise.all([
        scryptHash(apiKey, keySalt),
        scryptHash(signingSecret, keySalt),
      ]);

      const ref = db.collection('hotel_partners').doc();
      await ref.set({
        id: ref.id,
        name: name.trim(),
        status: 'active',
        apiKeyHash,
        signingSecretHash,
        keySalt,
        previousApiKeyHash: null,
        previousApiKeyHashUntil: null,
        previousSigningSecretHash: null,
        contactEmails,
        payloadFormat: payloadFormat ?? 'vanguard_v1',
        ngbAllowlist: Array.isArray(ngbAllowlist) ? ngbAllowlist : [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        partnerId: ref.id,
        apiKey,
        signingSecret,
        note: 'IMPORTANT: Save these credentials now. They will never be shown again.',
      };
    },
);

// ── rotateHotelPartnerKeys ────────────────────────────────────────────────

/**
 * Rotate API credentials for an existing partner.
 * The previous key pair remains valid for 24h so the partner can
 * update their configuration without downtime.
 *
 * Input: { partnerId: string }
 * Returns: { partnerId, apiKey, signingSecret, note }
 */
exports.rotateHotelPartnerKeys = onCall(
    {region: REGION},
    async (request) => {
      assertSuperAdmin(request);

      const {partnerId} = request.data ?? {};
      if (!partnerId || typeof partnerId !== 'string') {
        throw new HttpsError('invalid-argument', 'partnerId required.');
      }

      const ref = db.doc(`hotel_partners/${partnerId}`);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Partner not found.');
      const current = snap.data();

      const newApiKey = generateCredential();
      const newSigningSecret = generateCredential();
      const newSalt = generateSalt();

      const [newApiKeyHash, newSigningSecretHash] = await Promise.all([
        scryptHash(newApiKey, newSalt),
        scryptHash(newSigningSecret, newSalt),
      ]);

      const gracePeriodUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await ref.update({
        apiKeyHash: newApiKeyHash,
        signingSecretHash: newSigningSecretHash,
        keySalt: newSalt,
        previousApiKeyHash: current.apiKeyHash,
        previousSigningSecretHash: current.signingSecretHash,
        previousApiKeyHashUntil: gracePeriodUntil,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        partnerId,
        apiKey: newApiKey,
        signingSecret: newSigningSecret,
        note: `Previous credentials valid until ${gracePeriodUntil}. IMPORTANT: Save the new credentials — they won't be shown again.`,
      };
    },
);

// ── setHotelPartnerStatus ─────────────────────────────────────────────────

/**
 * Input: { partnerId: string, status: 'active' | 'paused' | 'revoked' }
 * Returns: { partnerId, status }
 */
exports.setHotelPartnerStatus = onCall(
    {region: REGION},
    async (request) => {
      assertSuperAdmin(request);

      const {partnerId, status} = request.data ?? {};
      if (!partnerId || typeof partnerId !== 'string') {
        throw new HttpsError('invalid-argument', 'partnerId required.');
      }
      if (!['active', 'paused', 'revoked'].includes(status)) {
        throw new HttpsError('invalid-argument', 'status must be active | paused | revoked.');
      }

      const ref = db.doc(`hotel_partners/${partnerId}`);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Partner not found.');

      await ref.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {partnerId, status};
    },
);

// Export scryptHash for use in the API gateway middleware.
exports._scryptHash = scryptHash;
