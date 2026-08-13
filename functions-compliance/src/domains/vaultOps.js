'use strict';

/**
 * vaultOps.js — Sprint 2.2 PII Data Vault (server-side envelope encryption).
 *
 * Client writes plaintext only to vaultSealPii; Firestore stores ciphertext in
 * pii_vault/{sealId} and VaultEnvelope refs on parent documents.
 */

const crypto = require('crypto');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');

const REGION = 'us-east1';
const KEY_VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';

const PII_VAULT_MASTER_KEY = defineSecret('PII_VAULT_MASTER_KEY');

const db = () => admin.firestore();

/** @param {Buffer} masterKey @param {Buffer} dek */
function wrapDek(masterKey, dek) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  const enc = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {wrapped: enc.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64')};
}

/** @param {Buffer} masterKey @param {{ wrapped: string, iv: string, tag: string }} wrapped */
function unwrapDek(masterKey, wrapped) {
  const iv = Buffer.from(wrapped.iv, 'base64');
  const tag = Buffer.from(wrapped.tag, 'base64');
  const data = Buffer.from(wrapped.wrapped, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/** @param {Buffer} dek @param {string} plaintext */
function encryptField(dek, plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  };
}

/** @param {Buffer} dek @param {{ iv: string, tag: string, data: string }} blob */
function decryptField(dek, blob) {
  const iv = Buffer.from(blob.iv, 'base64');
  const tag = Buffer.from(blob.tag, 'base64');
  const data = Buffer.from(blob.data, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function resolveMasterKey(secretValue) {
  const raw = String(secretValue || '').trim();
  if (!raw) {
    throw new HttpsError('failed-precondition', 'PII vault master key is not configured.');
  }
  const buf = Buffer.from(raw, raw.length === 64 ? 'hex' : 'base64');
  if (buf.length !== 32) {
    throw new HttpsError('failed-precondition', 'PII vault master key must be 32 bytes.');
  }
  return buf;
}

const SENSITIVE_PII_FIELDS = new Set([
  'playerName', 'displayName', 'email', 'emailLower', 'phoneNumber', 'phoneE164',
  'dateOfBirth', 'parentEmail', 'emergencyName', 'emergencyPhone', 'medicalNotes',
  'waiverSignerLegalName', 'verifiedAddress', 'linkedPlayerEmail', 'coachNotes',
]);

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @param {string} ownerEmailKey
 */
function assertVaultWriteAccess(request, ownerEmailKey) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || '';
  const callerEmail = normEmail(request.auth.token.email || '');
  const clubId = request.auth.token.clubId || null;
  if (role === 'super_admin' || role === 'global_admin') return {callerEmail, clubId};
  if (callerEmail === ownerEmailKey) return {callerEmail, clubId};
  if (role === 'director' || role === 'registrar' || role === 'coach') {
    return {callerEmail, clubId};
  }
  throw new HttpsError('permission-denied', 'Not authorized to seal PII for this profile.');
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @param {FirebaseFirestore.DocumentData} vaultDoc
 */
function assertVaultReadAccess(request, vaultDoc) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || '';
  const callerEmail = normEmail(request.auth.token.email || '');
  const callerUid = request.auth.uid;
  const tokenClub = request.auth.token.clubId || null;

  if (role === 'super_admin' || role === 'global_admin') return;

  if (vaultDoc.ownerUid === callerUid) return;
  if (vaultDoc.ownerEmailKey === callerEmail) return;
  if (tokenClub && vaultDoc.clubId === tokenClub && (role === 'director' || role === 'registrar')) {
    return;
  }
  if (role === 'parent' && vaultDoc.ownerEmailKey) {
    return;
  }

  throw new HttpsError('permission-denied', 'Not authorized to unseal this vault record.');
}

exports.vaultSealPii = onCall(
    {region: REGION, secrets: [PII_VAULT_MASTER_KEY]},
    async (request) => {
      const {ownerEmailKey: rawOwner, clubId, fields} = request.data || {};
      const ownerEmailKey = normEmail(rawOwner);
      if (!ownerEmailKey) {
        throw new HttpsError('invalid-argument', 'ownerEmailKey is required.');
      }
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw new HttpsError('invalid-argument', 'fields object is required.');
      }

      const fieldEntries = Object.entries(fields).filter(
          ([k, v]) => SENSITIVE_PII_FIELDS.has(k) && v != null && String(v).trim() !== '',
      );
      if (fieldEntries.length === 0) {
        throw new HttpsError('invalid-argument', 'No sealable sensitive fields provided.');
      }

      assertVaultWriteAccess(request, ownerEmailKey);

      const masterKey = resolveMasterKey(PII_VAULT_MASTER_KEY.value());
      const dek = crypto.randomBytes(32);
      const wrappedDek = wrapDek(masterKey, dek);

      /** @type {Record<string, { iv: string, tag: string, data: string }>} */
      const ciphertext = {};
      for (const [key, value] of fieldEntries) {
        ciphertext[key] = encryptField(dek, value);
      }

      dek.fill(0);

      const sealRef = db().collection('pii_vault').doc();
      const now = admin.firestore.FieldValue.serverTimestamp();

      await sealRef.set({
        ownerUid: request.auth.uid,
        ownerEmailKey,
        clubId: typeof clubId === 'string' ? clubId : (request.auth.token.clubId || null),
        ciphertext,
        wrappedDek,
        algorithm: 'AES-256-GCM',
        keyVersion: KEY_VERSION,
        createdAt: now,
        shredStatus: 'pending',
      });

      /** @type {Record<string, { vaultRef: string, algorithm: string, keyVersion: string, sealedAt: unknown }>} */
      const vaultRefs = {};
      for (const key of Object.keys(ciphertext)) {
        vaultRefs[key] = {
          vaultRef: sealRef.id,
          algorithm: 'AES-256-GCM',
          keyVersion: KEY_VERSION,
          sealedAt: now,
        };
      }

      await db().collection('users').doc(ownerEmailKey).set({
        lastActiveAt: now,
        lastActiveSource: 'vault',
      }, {merge: true});

      logger.info('[vaultSealPii] sealed fields', {
        ownerEmailKey,
        fieldCount: fieldEntries.length,
        sealId: sealRef.id,
      });

      return {vaultRefs, sealId: sealRef.id};
    },
);

exports.vaultUnsealPii = onCall(
    {region: REGION, secrets: [PII_VAULT_MASTER_KEY]},
    async (request) => {
      const {vaultRefs} = request.data || {};
      if (!Array.isArray(vaultRefs) || vaultRefs.length === 0) {
        throw new HttpsError('invalid-argument', 'vaultRefs array is required.');
      }
      if (vaultRefs.length > 20) {
        throw new HttpsError('invalid-argument', 'Too many vaultRefs (max 20).');
      }

      const masterKey = resolveMasterKey(PII_VAULT_MASTER_KEY.value());
      /** @type {Record<string, string|null>} */
      const values = {};

      for (const ref of vaultRefs) {
        const sealId = typeof ref === 'string' ? ref : ref?.vaultRef;
        const fieldKey = typeof ref === 'object' && ref?.field ? ref.field : null;
        if (!sealId) continue;

        const snap = await db().collection('pii_vault').doc(sealId).get();
        if (!snap.exists) {
          if (fieldKey) values[fieldKey] = null;
          continue;
        }

        const vaultDoc = snap.data();
        if (vaultDoc.shredStatus === 'complete') {
          if (fieldKey) values[fieldKey] = null;
          continue;
        }

        assertVaultReadAccess(request, vaultDoc);

        const dek = unwrapDek(masterKey, vaultDoc.wrappedDek);
        const keys = fieldKey ? [fieldKey] : Object.keys(vaultDoc.ciphertext || {});

        for (const k of keys) {
          const blob = vaultDoc.ciphertext?.[k];
          if (!blob) {
            values[k] = null;
            continue;
          }
          try {
            values[k] = decryptField(dek, blob);
          } catch (err) {
            logger.warn('[vaultUnsealPii] decrypt failed', {sealId, field: k, err: err.message});
            values[k] = null;
          }
        }
        dek.fill(0);
      }

      return {values};
    },
);

module.exports.SENSITIVE_PII_FIELDS = SENSITIVE_PII_FIELDS;
module.exports.KEY_VERSION = KEY_VERSION;
