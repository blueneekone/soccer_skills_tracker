'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {DEFAULT_CELL_ID, resolveCellId} = require('../../cellConstants');
const {assertRole} = require('../../tenantUtils');
const {getRegistryDb, getAdminDb} = require('../../cellRouter');

const REGION = 'us-east1';
const BATCH_LIMIT = 500;

exports.startTenantMigration = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const tenantId = String(request.data?.tenantId || '').trim();
  const toCellId = resolveCellId(request.data?.toCellId);
  if (!tenantId || !toCellId) throw new HttpsError('invalid-argument', 'tenantId and toCellId are required.');
  const registry = getRegistryDb();
  const orgRef = registry.collection('organizations').doc(tenantId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new HttpsError('not-found', `Tenant ${tenantId} not found.`);
  const orgData = orgSnap.data();
  if (orgData.writeFrozen) throw new HttpsError('failed-precondition', 'Tenant is already write-frozen.');
  const fromCellId = resolveCellId(orgData.cellId);
  if (fromCellId === toCellId) throw new HttpsError('failed-precondition', 'Source and target cell are identical.');
  const targetSnap = await registry.collection('cells').doc(toCellId).get();
  if (!targetSnap.exists || targetSnap.data().status !== 'active') throw new HttpsError('failed-precondition', `Target cell ${toCellId} is not active.`);
  const migrationRef = registry.collection('cells').doc('_migrations').collection('records').doc();
  const migrationId = migrationRef.id;
  await registry.runTransaction(async (txn) => {
    const fresh = await txn.get(orgRef);
    if (!fresh.exists || fresh.data().writeFrozen) throw new HttpsError('aborted', 'Tenant state changed concurrently.');
    txn.update(orgRef, { writeFrozen: true, writeFrozenAt: admin.firestore.FieldValue.serverTimestamp(), writeFrozenBy: request.auth.uid, writeFrozenMigrationId: migrationId });
    txn.set(migrationRef, { tenantId, fromCellId, toCellId, status: 'frozen', startedAt: admin.firestore.FieldValue.serverTimestamp(), startedBy: request.auth.uid });
  });
  return {ok: true, migrationId, tenantId, fromCellId, toCellId};
});

exports.markExportComplete = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const {migrationId, exportGcsPath} = request.data || {};
  if (!migrationId || !exportGcsPath) throw new HttpsError('invalid-argument', 'migrationId and exportGcsPath are required.');
  const ref = getRegistryDb().collection('cells').doc('_migrations').collection('records').doc(migrationId);
  await ref.update({ status: 'exported', exportGcsPath, exportedAt: admin.firestore.FieldValue.serverTimestamp(), exportedBy: request.auth.uid });
  return {ok: true, migrationId};
});

exports.markImportComplete = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const migrationId = String(request.data?.migrationId || '').trim();
  if (!migrationId) throw new HttpsError('invalid-argument', 'migrationId is required.');
  const ref = getRegistryDb().collection('cells').doc('_migrations').collection('records').doc(migrationId);
  await ref.update({ status: 'imported', importedAt: admin.firestore.FieldValue.serverTimestamp(), importedBy: request.auth.uid });
  return {ok: true, migrationId};
});

exports.verifyTenantOnCell = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const {migrationId, collections} = request.data || {};
  if (!migrationId || !Array.isArray(collections) || collections.length === 0) throw new HttpsError('invalid-argument', 'migrationId and collections[] are required.');
  const migrationRef = getRegistryDb().collection('cells').doc('_migrations').collection('records').doc(migrationId);
  const snap = await migrationRef.get();
  if (!snap.exists) throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
  const m = snap.data() || {};
  const fromDb = getAdminDb(m.fromCellId);
  const toDb = getAdminDb(m.toCellId);
  const diffs = {};
  for (const coll of collections) {
    const [fromCount, toCount] = await Promise.all([
      fromDb.collection(coll).where('clubId', '==', m.tenantId).count().get(),
      toDb.collection(coll).where('clubId', '==', m.tenantId).count().get(),
    ]);
    const a = fromCount.data().count;
    const b = toCount.data().count;
    diffs[coll] = {from: a, to: b, diff: a - b};
  }
  const ok = Object.values(diffs).every((d) => d.diff === 0);
  await migrationRef.update({ verification: { collections, diffs, ok, verifiedAt: admin.firestore.FieldValue.serverTimestamp(), verifiedBy: request.auth.uid }, status: ok ? 'verified' : 'verification-failed' });
  return {ok, migrationId, diffs};
});

exports.executeCutover = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const migrationId = String(request.data?.migrationId || '').trim();
  if (!migrationId) throw new HttpsError('invalid-argument', 'migrationId is required.');
  const registry = getRegistryDb();
  const migrationRef = registry.collection('cells').doc('_migrations').collection('records').doc(migrationId);
  const snap = await migrationRef.get();
  if (!snap.exists) throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
  const m = snap.data() || {};
  if (m.status !== 'verified') throw new HttpsError('failed-precondition', `Migration must be 'verified' before cutover.`);
  const orgRef = registry.collection('organizations').doc(m.tenantId);
  const fromRef = registry.collection('cells').doc(m.fromCellId);
  const toRef = registry.collection('cells').doc(m.toCellId);

  // Cutover transaction ensures < 500 limit
  await registry.runTransaction(async (txn) => {
    txn.update(orgRef, { cellId: m.toCellId, cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(), cellAssignedBy: request.auth.uid, writeFrozen: false, writeFrozenAt: admin.firestore.FieldValue.delete(), writeFrozenBy: admin.firestore.FieldValue.delete(), writeFrozenMigrationId: admin.firestore.FieldValue.delete() });
    txn.set(fromRef, { tenantCount: admin.firestore.FieldValue.increment(-1) }, {merge: true});
    txn.set(toRef, { tenantCount: admin.firestore.FieldValue.increment(1), lastTenantMigratedAt: admin.firestore.FieldValue.serverTimestamp() }, {merge: true});
    txn.update(migrationRef, { status: 'cutover', cutoverAt: admin.firestore.FieldValue.serverTimestamp(), cutoverBy: request.auth.uid });
  });

  let rotated = 0;
  let nextPageToken = undefined;
  do {
    const page = await admin.auth().listUsers(1000, nextPageToken);
    for (const u of page.users) {
      const claims = u.customClaims || {};
      if ((claims.tenantId || claims.clubId || '') !== m.tenantId) continue;
      try {
        await admin.auth().revokeRefreshTokens(u.uid);
        rotated += 1;
      } catch (err) {}
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return {ok: true, migrationId, rotated, tenantId: m.tenantId};
});

exports.rollbackTenantMigration = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const migrationId = String(request.data?.migrationId || '').trim();
  if (!migrationId) throw new HttpsError('invalid-argument', 'migrationId is required.');
  const registry = getRegistryDb();
  const migrationRef = registry.collection('cells').doc('_migrations').collection('records').doc(migrationId);
  const snap = await migrationRef.get();
  if (!snap.exists) throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
  const m = snap.data() || {};
  if (m.status !== 'cutover' && m.status !== 'verification-failed') throw new HttpsError('failed-precondition', `Can only roll back from 'cutover' or 'verification-failed'.`);
  const orgRef = registry.collection('organizations').doc(m.tenantId);
  const fromRef = registry.collection('cells').doc(m.fromCellId);
  const toRef = registry.collection('cells').doc(m.toCellId);
  await registry.runTransaction(async (txn) => {
    txn.update(orgRef, { cellId: m.fromCellId, cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(), cellAssignedBy: request.auth.uid, writeFrozen: false, writeFrozenAt: admin.firestore.FieldValue.delete(), writeFrozenBy: admin.firestore.FieldValue.delete(), writeFrozenMigrationId: admin.firestore.FieldValue.delete() });
    if (m.status === 'cutover') {
      txn.set(fromRef, { tenantCount: admin.firestore.FieldValue.increment(1) }, {merge: true});
      txn.set(toRef, { tenantCount: admin.firestore.FieldValue.increment(-1) }, {merge: true});
    }
    txn.update(migrationRef, { status: 'rolled-back', rolledBackAt: admin.firestore.FieldValue.serverTimestamp(), rolledBackBy: request.auth.uid, rollbackWarning: m.status === 'cutover' ? 'Warning: Target data left in place.' : null });
  });
  return {ok: true, migrationId, tenantId: m.tenantId};
});
