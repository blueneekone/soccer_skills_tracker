'use strict';

/**
 * shredOps.js — Sprint 2.2 TTL hard purge for inactive user PII.
 *
 * DO NOT PURGE: Consents are legal attestations required for multi-year compliance
 * retention. The consents collection is explicitly excluded from all query scope.
 */

const crypto = require('crypto');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const INACTIVE_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const SHRED_SENTINEL = '__SHREDDED__';

const db = () => admin.firestore();

// DO NOT PURGE: Consents are legal attestations required for multi-year compliance retention.
const SHRED_ROOT_COLLECTIONS = ['users', 'passports'];

/** @type {readonly string[]} */
const USER_PII_FIELDS = [
  'playerName', 'displayName', 'email', 'emailLower', 'phoneNumber', 'phoneE164',
  'dateOfBirth', 'parentEmail', 'verifiedAddress',
];

/** @type {readonly string[]} */
const PASSPORT_PII_FIELDS = [
  'emergencyName', 'emergencyPhone', 'medicalNotes', 'waiverSignerLegalName',
];

/**
 * @param {FirebaseFirestore.DocumentData} data
 * @returns {Date|null}
 */
function resolveLastActive(data) {
  const candidates = [data.lastActiveAt, data.lastActivityDate, data.updatedAt, data.createdAt];
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c.toDate === 'function') return c.toDate();
    if (c instanceof Date) return c;
    if (typeof c === 'string') {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/** @returns {string} */
function randomShredValue() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * @param {Record<string, unknown>} data
 * @param {readonly string[]} fields
 * @returns {Record<string, unknown>}
 */
function buildShredPatch(data, fields) {
  /** @type {Record<string, unknown>} */
  const patch = {
    shredStatus: 'complete',
    shreddedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  for (const field of fields) {
    if (data[field] == null || data[field] === SHRED_SENTINEL) continue;
    patch[field] = SHRED_SENTINEL;
  }
  return patch;
}

/**
 * @param {FirebaseFirestore.DocumentReference} docRef
 * @param {Record<string, unknown>} data
 */
async function deleteLinkedVaultDocs(data) {
  const refs = new Set();
  for (const value of Object.values(data)) {
    if (value && typeof value === 'object' && typeof value.vaultRef === 'string') {
      refs.add(value.vaultRef);
    }
  }
  if (refs.size === 0) return;

  const batch = db().batch();
  for (const sealId of refs) {
    batch.delete(db().collection('pii_vault').doc(sealId));
  }
  await batch.commit();
}

/**
 * Paginated shred for sub-collections containing PII arrays.
 * @param {string} collection
 * @param {string} field
 */
async function shredSubCollectionField(collection, field) {
  let shredded = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db().collection(collection).limit(PAGE_SIZE).get();
    if (snap.empty) break;

    const batch = db().batch();
    let ops = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d[field] == null || d[field] === SHRED_SENTINEL) continue;
      if (Array.isArray(d[field])) {
        batch.update(doc.ref, {
          [field]: admin.firestore.FieldValue.delete(),
          shredStatus: 'complete',
        });
        ops++;
        shredded++;
      } else if (typeof d[field] === 'string') {
        batch.update(doc.ref, {
          [field]: SHRED_SENTINEL,
          shredStatus: 'complete',
        });
        ops++;
        shredded++;
      }
    }
    if (ops === 0) break;
    await batch.commit();
    if (snap.size < PAGE_SIZE) break;
  }
  return shredded;
}

/**
 * @param {string} runId
 * @returns {Promise<{ users: number, passports: number, vaults: number }>}
 */
async function runShredPass(runId) {
  const cutoff = new Date(Date.now() - INACTIVE_MS);
  const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

  let usersShredded = 0;
  let passportsShredded = 0;
  let vaultsDeleted = 0;

  const userSnap = await db().collection('users')
      .where('lastActiveAt', '<=', cutoffTs)
      .limit(PAGE_SIZE)
      .get();

    for (const doc of userSnap.docs) {
    const data = doc.data();
    if (data.shredStatus === 'complete') continue;
    const lastActive = resolveLastActive(data);
    if (lastActive && lastActive > cutoff) continue;

    await deleteLinkedVaultDocs(data);
    const patch = buildShredPatch(data, USER_PII_FIELDS);
    patch.shredRunId = runId;
    await doc.ref.set(patch, {merge: true});
    usersShredded++;
  }

  const passportSnap = await db().collection('passports')
      .limit(PAGE_SIZE)
      .get();

  for (const doc of passportSnap.docs) {
    const data = doc.data();
    if (data.shredStatus === 'complete') continue;
    const emailKey = doc.id.toLowerCase();
    const userSnapOne = await db().collection('users').doc(emailKey).get();
    const userData = userSnapOne.exists ? userSnapOne.data() : {};
    const lastActive = resolveLastActive(userData.lastActiveAt ? userData : data);
    if (lastActive && lastActive > cutoff) continue;

    await deleteLinkedVaultDocs(data);
    const patch = buildShredPatch(data, PASSPORT_PII_FIELDS);
    patch.shredRunId = runId;
    await doc.ref.set(patch, {merge: true});
    passportsShredded++;
  }

  await shredSubCollectionField('eq_attestations', 'parentEmail');
  await shredSubCollectionField('eq_attestations', 'linkedPlayerEmail');
  await shredSubCollectionField('academic_records', 'playerEmail');
  await shredSubCollectionField('match_results_public', 'playerEmails');

  return {users: usersShredded, passports: passportsShredded, vaults: vaultsDeleted};
}

exports.shredSensitiveData = onSchedule(
    {
      region: REGION,
      schedule: '15 4 * * *',
      timeZone: 'UTC',
    },
    async () => {
      if (process.env.VAULT_SHRED_ENABLED === 'false') {
        logger.info('[shredSensitiveData] disabled via VAULT_SHRED_ENABLED=false');
        return;
      }

      const runId = crypto.randomUUID();
      logger.info('[shredSensitiveData] starting pass', {
        runId,
        inactiveThresholdHours: 24,
        collections: SHRED_ROOT_COLLECTIONS,
        exempt: ['consents'],
      });

      try {
        const result = await runShredPass(runId);
        logger.info('[shredSensitiveData] pass complete', {runId, ...result});
      } catch (err) {
        logger.error('[shredSensitiveData] pass failed', {runId, err: err.message});
        throw err;
      }
    },
);

exports.SHRED_ROOT_COLLECTIONS = SHRED_ROOT_COLLECTIONS;
exports.SHRED_SENTINEL = SHRED_SENTINEL;
exports.resolveLastActive = resolveLastActive;
exports.buildShredPatch = buildShredPatch;
exports.runShredPass = runShredPass;
