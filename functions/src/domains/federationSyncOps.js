'use strict';

/**
 * Federation Phase 3 — sync job queue + director status (not Phase 4 OAuth).
 *
 * Queue doc: federation_sync_jobs/{clubId}
 * Audit: security_audit/{autoId} — no raw guardian PII
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const db = () => admin.firestore();

const JOB_COLLECTION = 'federation_sync_jobs';

/**
 * @param {FirebaseFirestore.DocumentSnapshot} snap
 */
function mapJobStatus(snap) {
  if (!snap.exists) {
    return {
      status: 'never_synced',
      lastSyncAt: null,
      lastError: null,
      pendingCount: 0,
      failedCount: 0,
    };
  }
  const data = snap.data() || {};
  const status = typeof data.status === 'string' ? data.status : 'unknown';
  const pendingCount = Number.isFinite(data.pendingCount) ? data.pendingCount : 0;
  const failedCount = Number.isFinite(data.failedCount) ? data.failedCount : 0;
  const lastSyncAt =
    data.lastSyncAt && typeof data.lastSyncAt.toMillis === 'function' ?
      data.lastSyncAt.toMillis() :
      null;
  const lastError = typeof data.lastError === 'string' ? data.lastError : null;
  return {status, lastSyncAt, lastError, pendingCount, failedCount};
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function assertDirectorClub(request, clubId) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const userSnap = await db().collection('users').doc(uid).get();
  const role = userSnap.exists ? userSnap.data()?.role : null;
  const userClub =
    userSnap.exists && typeof userSnap.data()?.clubId === 'string' ?
      userSnap.data().clubId.trim() :
      '';
  const allowedRoles = ['director', 'registrar', 'super_admin', 'global_admin'];
  if (!allowedRoles.includes(role)) {
    throw new HttpsError('permission-denied', 'Director or registrar role required.');
  }
  if (!['super_admin', 'global_admin'].includes(role) && userClub !== clubId) {
    throw new HttpsError('permission-denied', 'Club scope mismatch.');
  }
}

exports.getFederationSyncStatus = onCall({region: REGION}, async (request) => {
  const clubId = typeof request.data?.clubId === 'string' ? request.data.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }
  await assertDirectorClub(request, clubId);

  const jobSnap = await db().collection(JOB_COLLECTION).doc(clubId).get();
  const mapped = mapJobStatus(jobSnap);
  return {
    ok: true,
    clubId,
    phase: 3,
    ...mapped,
  };
});

exports.enqueueFederationSyncJob = onCall({region: REGION}, async (request) => {
  const clubId = typeof request.data?.clubId === 'string' ? request.data.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }
  await assertDirectorClub(request, clubId);

  const now = admin.firestore.FieldValue.serverTimestamp();
  const jobRef = db().collection(JOB_COLLECTION).doc(clubId);
  const existing = await jobRef.get();
  if (existing.exists && existing.data()?.status === 'running') {
    throw new HttpsError('failed-precondition', 'A federation sync job is already running.');
  }

  await jobRef.set({
    clubId,
    status: 'queued',
    pendingCount: 1,
    failedCount: 0,
    lastError: null,
    enqueuedAt: now,
    updatedAt: now,
    phase: 3,
    note: 'Phase 3 diff engine — Phase 4 OAuth per body remains planned.',
  }, {merge: true});

  await db().collection('security_audit').add({
    action: 'federation_sync_enqueued',
    clubId,
    phase: 3,
    actorUid: request.auth.uid,
    timestamp: now,
  });

  return {
    ok: true,
    clubId,
    status: 'queued',
    message: 'Federation sync job queued. Phase 4 API per body remains planned.',
  };
});

/**
 * Scheduled reconciliation stub — invoked by future onSchedule slice.
 * @param {string} clubId
 */
async function reconcileFederationSync(clubId) {
  const jobRef = db().collection(JOB_COLLECTION).doc(clubId);
  const snap = await jobRef.get();
  if (!snap.exists) {
    return {ok: true, clubId, status: 'never_synced'};
  }
  const data = snap.data() || {};
  if (data.status !== 'queued') {
    return {ok: true, clubId, status: data.status || 'unknown', noop: true};
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await jobRef.set({
    status: 'completed',
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: now,
    updatedAt: now,
    lastError: null,
  }, {merge: true});

  await db().collection('security_audit').add({
    action: 'federation_sync_reconciled',
    clubId,
    phase: 3,
    timestamp: now,
  });

  return {ok: true, clubId, status: 'completed'};
}

module.exports.reconcileFederationSync = reconcileFederationSync;
