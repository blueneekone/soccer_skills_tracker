'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {DEFAULT_CELL_ID, PRIMARY_REGION, resolveCellId} = require('../../cellConstants');
const {assertRole} = require('../../tenantUtils');
const {getRegistryDb, getAdminDb} = require('../../cellRouter');

const REGION = 'us-east1';

const db = () => getRegistryDb();

const DEFAULT_POLICY = {
  rosterPromoteThreshold: 5000,
  readsPerDayPromoteThreshold: 50000,
  readSustainedDays: 7,
  sharedCellSoftCap: 5000,
  defaultPromotionProfile: 'dedicated-standard',
};

exports.bootstrapCellRegistry = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const summary = { defaultCellSeeded: false, policySeeded: false, organizationsBackfilled: 0, organizationsScanned: 0 };
  const defaultCellRef = db().collection('cells').doc(DEFAULT_CELL_ID);
  const defaultCellSnap = await defaultCellRef.get();
  if (!defaultCellSnap.exists) {
    await defaultCellRef.set({ id: DEFAULT_CELL_ID, databaseId: DEFAULT_CELL_ID, region: PRIMARY_REGION, status: 'active', quotaProfile: 'shared', tenantCount: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    summary.defaultCellSeeded = true;
  }
  const policyRef = db().collection('cells').doc('_policy');
  const policySnap = await policyRef.get();
  if (!policySnap.exists) {
    await policyRef.set({ ...DEFAULT_POLICY, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    summary.policySeeded = true;
  }
  const PAGE_SIZE = 200;
  let lastDoc = null;
  let assignedToDefault = 0;
  while (true) {
    let query = db().collection('organizations').limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const page = await query.get();
    if (page.empty) break;
    const batch = db().batch();
    let pageBackfilled = 0;
    page.docs.forEach((doc) => {
      summary.organizationsScanned += 1;
      const cellId = doc.get('cellId');
      if (typeof cellId === 'string' && cellId.length > 0) return;
      batch.update(doc.ref, { cellId: DEFAULT_CELL_ID, cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(), cellAssignedBy: 'bootstrap' });
      pageBackfilled += 1;
    });
    if (pageBackfilled > 0) {
      await batch.commit();
      summary.organizationsBackfilled += pageBackfilled;
      assignedToDefault += pageBackfilled;
    }
    if (page.size < PAGE_SIZE) break;
    lastDoc = page.docs[page.docs.length - 1];
  }
  if (assignedToDefault > 0) await defaultCellRef.update({ tenantCount: admin.firestore.FieldValue.increment(assignedToDefault) });
  return summary;
});

exports.registerDedicatedCell = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const cellId = String(request.data?.cellId || '').trim();
  const quotaProfile = String(request.data?.quotaProfile || 'dedicated-standard');
  const region = String(request.data?.region || PRIMARY_REGION);
  if (!cellId || cellId === DEFAULT_CELL_ID) throw new HttpsError('invalid-argument', 'cellId is required and must not be the reserved (default) name.');
  if (!/^cell-[a-z0-9]+-\d{3,}$/.test(cellId)) throw new HttpsError('invalid-argument', 'cellId must match pattern cell-{region}-{nnn} (e.g. cell-use1-001).');
  if (!['dedicated-standard', 'dedicated-large'].includes(quotaProfile)) throw new HttpsError('invalid-argument', 'quotaProfile must be dedicated-standard or dedicated-large.');
  const ref = db().collection('cells').doc(cellId);
  const existing = await ref.get();
  if (existing.exists) throw new HttpsError('already-exists', `Cell ${cellId} is already registered.`);
  await ref.set({ id: cellId, databaseId: cellId, region, status: 'provisioning', quotaProfile, tenantCount: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  const auditData = { timestamp: admin.firestore.FieldValue.serverTimestamp(), admin: request.auth?.token?.email || request.auth?.uid || 'unknown', action: 'REGISTER_DEDICATED_CELL', target: cellId, details: JSON.stringify({ quotaProfile, region }) };
  await Promise.all([ db().collection('security_audits').add(auditData), db().collection('security_audit').add(auditData) ]).catch(() => {});
  return {ok: true, cellId};
});

exports.activateCell = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const cellId = String(request.data?.cellId || '').trim();
  if (!cellId) throw new HttpsError('invalid-argument', 'cellId is required.');
  const ref = db().collection('cells').doc(cellId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', `Cell ${cellId} is not registered.`);
  const data = snap.data() || {};
  if (data.status === 'active') return {ok: true, cellId, alreadyActive: true};
  if (data.status !== 'provisioning') throw new HttpsError('failed-precondition', `Cell ${cellId} is in status '${data.status}' — only 'provisioning' cells can be activated.`);
  await ref.update({ status: 'active', activatedAt: admin.firestore.FieldValue.serverTimestamp() });
  const auditData = { timestamp: admin.firestore.FieldValue.serverTimestamp(), admin: request.auth?.token?.email || request.auth?.uid || 'unknown', action: 'ACTIVATE_CELL', target: cellId, details: JSON.stringify({ cellId }) };
  await Promise.all([ db().collection('security_audits').add(auditData), db().collection('security_audit').add(auditData) ]).catch(() => {});
  return {ok: true, cellId, alreadyActive: false};
});

async function rotateTokensForTenant(tenantId) {
  let rotated = 0;
  let nextPageToken = undefined;
  do {
    const page = await admin.auth().listUsers(1000, nextPageToken);
    for (const userRecord of page.users) {
      const claims = userRecord.customClaims || {};
      const claimTenant = claims.tenantId || claims.clubId || '';
      if (claimTenant !== tenantId) continue;
      try { await admin.auth().revokeRefreshTokens(userRecord.uid); rotated += 1; } catch (err) {}
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return rotated;
}

exports.provisionTenantCell = onCall({region: REGION}, async (request) => {
  assertRole(request, ['global_admin', 'super_admin']);
  const tenantId = String(request.data?.tenantId || '').trim();
  const targetCellId = resolveCellId(request.data?.cellId);
  if (!tenantId) throw new HttpsError('invalid-argument', 'tenantId is required.');
  const orgRef = db().collection('organizations').doc(tenantId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new HttpsError('not-found', `organizations/${tenantId} does not exist.`);
  const fromCellId = resolveCellId(orgSnap.get('cellId'));
  if (fromCellId === targetCellId) return { ok: true, tenantId, fromCellId, toCellId: targetCellId, tokensRotated: 0, noop: true };
  if (targetCellId !== DEFAULT_CELL_ID) {
    const targetRef = db().collection('cells').doc(targetCellId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) throw new HttpsError('not-found', `Cell ${targetCellId} is not registered. Call registerDedicatedCell first.`);
    const targetStatus = targetSnap.get('status');
    if (targetStatus !== 'active') throw new HttpsError('failed-precondition', `Cell ${targetCellId} has status '${targetStatus}' — only 'active' cells accept assignments.`);
  }
  const fromRef = db().collection('cells').doc(fromCellId);
  const toRef = db().collection('cells').doc(targetCellId);
  await db().runTransaction(async (txn) => {
    const fresh = await txn.get(orgRef);
    if (!fresh.exists) throw new HttpsError('aborted', `organizations/${tenantId} disappeared mid-provision.`);
    const liveFromCellId = resolveCellId(fresh.get('cellId'));
    if (liveFromCellId !== fromCellId) throw new HttpsError('aborted', 'Tenant cellId changed concurrently; retry the provisioning call.');
    txn.update(orgRef, { cellId: targetCellId, cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(), cellAssignedBy: request.auth.uid });
    txn.set(fromRef, { tenantCount: admin.firestore.FieldValue.increment(-1) }, {merge: true});
    txn.set(toRef, { tenantCount: admin.firestore.FieldValue.increment(1), lastTenantMigratedAt: admin.firestore.FieldValue.serverTimestamp() }, {merge: true});
  });
  const tokensRotated = await rotateTokensForTenant(tenantId);
  const auditData = { timestamp: admin.firestore.FieldValue.serverTimestamp(), admin: request.auth?.token?.email || request.auth?.uid || 'unknown', action: 'PROVISION_TENANT_CELL', target: tenantId, details: JSON.stringify({ fromCellId, toCellId: targetCellId, tokensRotated }) };
  await Promise.all([ db().collection('security_audits').add(auditData), db().collection('security_audit').add(auditData) ]).catch(() => {});
  return { ok: true, tenantId, fromCellId, toCellId: targetCellId, tokensRotated, noop: false };
});

exports.peekTenantCell = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const tenantId = String(request.data?.tenantId || '').trim();
  if (!tenantId) throw new HttpsError('invalid-argument', 'tenantId is required.');
  const role = String(request.auth.token.role || '');
  const callerTenant = String(request.auth.token.tenantId || request.auth.token.clubId || '');
  const isAdmin = role === 'global_admin' || role === 'super_admin';
  if (!isAdmin && callerTenant !== tenantId) throw new HttpsError('permission-denied', 'You may only peek at your own tenant.');
  const orgSnap = await db().collection('organizations').doc(tenantId).get();
  if (!orgSnap.exists) throw new HttpsError('not-found', `organizations/${tenantId} not found.`);
  const cellId = resolveCellId(orgSnap.get('cellId'));
  return {tenantId, cellId};
});
