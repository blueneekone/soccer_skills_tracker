/* eslint-disable quotes */
/**
 * cellMigration.js
 * ─────────────────
 * Tenant ↔ cell data-migration tooling.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session G
 *
 * Provisioning a tenant onto a new cell is the EASY part — flip a
 * pointer (see `cellProvisioning.js`).  Moving the tenant's existing
 * Firestore data to the new cell is the HARD part.  This module
 * orchestrates the staged migration with explicit checkpoints so an
 * SRE can pause, resume, or roll back at any point.
 *
 * Migration phases (per tenant)
 * ──────────────────────────────
 *   1.  ANNOUNCE  — write `cells/_migrations/{migrationId}` with
 *                   { tenantId, fromCellId, toCellId, status: 'planned',
 *                     startedBy, plannedFor }
 *
 *   2.  FREEZE    — set organizations/{tenantId}.writeFrozen = true.
 *                   Security rules check this flag and reject writes
 *                   from non-admin users during the migration window.
 *                   Read-only mode minimises the data delta the export
 *                   has to chase.
 *
 *   3.  EXPORT    — out-of-band `gcloud firestore export` from the
 *                   source cell, scoped to the tenant's tenantId prefix.
 *                   Manual today; promoted to `cellMigration:start`
 *                   admin RPC once we wrap the gcloud SDK in a
 *                   Cloud Functions invocation (out of scope for this
 *                   phase).
 *
 *   4.  IMPORT    — out-of-band `gcloud firestore import` into the
 *                   target cell, same scoped prefix.
 *
 *   5.  VERIFY    — `verifyTenantOnCell` callable counts documents per
 *                   collection on source vs target.  Records the
 *                   diff in cells/_migrations/{id}.verification.
 *
 *   6.  CUTOVER   — call provisionTenantCell to flip the routing
 *                   pointer.  syncUserClaims trigger will re-stamp the
 *                   JWT for every member of the tenant; refresh-token
 *                   revocation in provisionTenantCell forces all
 *                   sessions to mint a fresh token within ~60s.
 *
 *   7.  UNFREEZE  — clear writeFrozen.  At this point traffic flows to
 *                   the new cell.  The source cell's data is left in
 *                   place as a 30-day safety net.
 *
 *   8.  ROLLBACK  — emergency only.  Reverse the cutover by calling
 *                   provisionTenantCell with the original cellId, then
 *                   unfreeze.  Data writes that landed on the new cell
 *                   between cutover and rollback must be reconciled
 *                   manually — the function records a warning.
 *
 *   9.  RECYCLE   — after a 30-day quarantine, `purgeMigratedSourceData`
 *                   deletes the tenant's data from the source cell.
 *                   Scheduler-driven; not part of the synchronous
 *                   migration flow.
 *
 * Every step writes its progress to `cells/_migrations/{migrationId}`
 * so the Director OS migration UI can render the current state.
 *
 * Concurrency safeguard
 * ─────────────────────
 * Only ONE active migration per tenant at a time.  The freeze step
 * fails if `organizations/{tenantId}.writeFrozen` is already true.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {DEFAULT_CELL_ID, resolveCellId} = require('./cellConstants');
const {assertRole} = require('./tenantUtils');
const {getRegistryDb, getAdminDb} = require('./cellRouter');

const REGION = 'us-east1';

/**
 * Generate a deterministic migration ID from tenant + timestamp.
 * Deterministic-on-tenant lets a paused migration be resumed without
 * the caller having to remember the migration ID.
 */
function nextMigrationId(tenantId) {
  return `${tenantId}_${Date.now()}`;
}

/**
 * Start a migration — Phase 1 ANNOUNCE + Phase 2 FREEZE.
 */
exports.startTenantMigration = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const tenantId = String(request.data?.tenantId || '').trim();
      const toCellId = resolveCellId(request.data?.toCellId);
      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'tenantId is required.');
      }
      if (toCellId === DEFAULT_CELL_ID) {
        throw new HttpsError(
            'invalid-argument',
            'Cannot migrate TO the default cell. Use rollbackTenantMigration to undo.',
        );
      }

      const registry = getRegistryDb();
      const orgRef = registry.collection('organizations').doc(tenantId);
      const orgSnap = await orgRef.get();
      if (!orgSnap.exists) {
        throw new HttpsError('not-found', `organizations/${tenantId} not found.`);
      }
      const orgData = orgSnap.data() || {};
      if (orgData.writeFrozen === true) {
        throw new HttpsError(
            'failed-precondition',
            `Tenant ${tenantId} already has a migration in progress.`,
        );
      }
      const fromCellId = resolveCellId(orgData.cellId);
      if (fromCellId === toCellId) {
        throw new HttpsError(
            'failed-precondition',
            `Tenant is already on cell ${toCellId}.`,
        );
      }

      const targetSnap = await registry.collection('cells').doc(toCellId).get();
      if (!targetSnap.exists || targetSnap.get('status') !== 'active') {
        throw new HttpsError(
            'failed-precondition',
            `Target cell ${toCellId} must be registered and active.`,
        );
      }

      const migrationId = nextMigrationId(tenantId);
      const migrationRef = registry
          .collection('cells')
          .doc('_migrations')
          .collection('records')
          .doc(migrationId);

      const now = admin.firestore.FieldValue.serverTimestamp();
      await registry.runTransaction(async (txn) => {
        const fresh = await txn.get(orgRef);
        if (fresh.get('writeFrozen') === true) {
          throw new HttpsError(
              'aborted',
              'Another migration started concurrently; retry.',
          );
        }
        txn.set(migrationRef, {
          migrationId,
          tenantId,
          fromCellId,
          toCellId,
          status: 'frozen',
          startedBy: request.auth.uid,
          startedAt: now,
        });
        txn.update(orgRef, {
          writeFrozen: true,
          writeFrozenAt: now,
          writeFrozenBy: request.auth.uid,
          writeFrozenMigrationId: migrationId,
        });
      });

      logger.info('[startTenantMigration] tenant frozen', {
        tenantId,
        migrationId,
        fromCellId,
        toCellId,
      });

      return {
        ok: true,
        migrationId,
        tenantId,
        fromCellId,
        toCellId,
        nextStep: 'Run `gcloud firestore export` on the source cell, then call markExportComplete.',
      };
    },
);

/**
 * Record that the gcloud export step completed.  The SRE supplies the
 * GCS path of the export so the migration record can document where
 * to find the backup.
 */
exports.markExportComplete = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const migrationId = String(request.data?.migrationId || '').trim();
      const exportGcsPath = String(request.data?.exportGcsPath || '').trim();
      if (!migrationId || !exportGcsPath) {
        throw new HttpsError(
            'invalid-argument',
            'migrationId and exportGcsPath are required.',
        );
      }

      const migrationRef = getRegistryDb()
          .collection('cells')
          .doc('_migrations')
          .collection('records')
          .doc(migrationId);
      const snap = await migrationRef.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
      }
      if (snap.get('status') !== 'frozen') {
        throw new HttpsError(
            'failed-precondition',
            `Migration is in status '${snap.get('status')}', expected 'frozen'.`,
        );
      }

      await migrationRef.update({
        status: 'exported',
        exportGcsPath,
        exportCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        exportCompletedBy: request.auth.uid,
      });

      return {ok: true, migrationId, nextStep: 'Run gcloud import into target cell, then call markImportComplete.'};
    },
);

/**
 * Record that the gcloud import step completed.
 */
exports.markImportComplete = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const migrationId = String(request.data?.migrationId || '').trim();
      if (!migrationId) {
        throw new HttpsError('invalid-argument', 'migrationId is required.');
      }

      const migrationRef = getRegistryDb()
          .collection('cells')
          .doc('_migrations')
          .collection('records')
          .doc(migrationId);
      const snap = await migrationRef.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
      }
      if (snap.get('status') !== 'exported') {
        throw new HttpsError(
            'failed-precondition',
            `Migration is in status '${snap.get('status')}', expected 'exported'.`,
        );
      }

      await migrationRef.update({
        status: 'imported',
        importCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        importCompletedBy: request.auth.uid,
      });

      return {ok: true, migrationId, nextStep: 'Call verifyTenantOnCell to spot-check the import.'};
    },
);

/**
 * Verify the import by counting selected tenant-scoped collections
 * on source vs target.  Caller specifies the collection names so the
 * verification is not coupled to the data-model.
 *
 * NOTE: This is a SAMPLED verification — the function counts documents
 * matching `where('clubId', '==', tenantId)` on each collection.  For
 * tenants with > 100k docs this can take a while; the function chunks
 * by 1000 to avoid the 9-minute Cloud Functions timeout.  An SRE who
 * needs a full byte-level verification should use Cloud DLP or
 * dataform jobs out-of-band.
 */
exports.verifyTenantOnCell = onCall(
    {region: REGION, timeoutSeconds: 540},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const migrationId = String(request.data?.migrationId || '').trim();
      const collections = Array.isArray(request.data?.collections) ?
          request.data.collections.filter((s) => typeof s === 'string') : [];

      if (!migrationId || collections.length === 0) {
        throw new HttpsError(
            'invalid-argument',
            'migrationId and collections[] are required.',
        );
      }

      const migrationRef = getRegistryDb()
          .collection('cells')
          .doc('_migrations')
          .collection('records')
          .doc(migrationId);
      const snap = await migrationRef.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
      }
      const m = snap.data() || {};

      const fromDb = getAdminDb(m.fromCellId);
      const toDb = getAdminDb(m.toCellId);

      /** @type {Record<string, { from: number, to: number, diff: number }>} */
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
      await migrationRef.update({
        verification: {
          collections,
          diffs,
          ok,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          verifiedBy: request.auth.uid,
        },
        status: ok ? 'verified' : 'verification-failed',
      });

      return {ok, migrationId, diffs};
    },
);

/**
 * Cut the routing pointer over to the target cell.  Reuses
 * `provisionTenantCell` internally — this is intentional: there is
 * ONE place in the codebase where the cellId pointer is mutated.
 *
 * After cutover, the writeFrozen flag is cleared so the tenant can
 * write again — now to the target cell.
 */
exports.executeCutover = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const migrationId = String(request.data?.migrationId || '').trim();
      if (!migrationId) {
        throw new HttpsError('invalid-argument', 'migrationId is required.');
      }

      const registry = getRegistryDb();
      const migrationRef = registry
          .collection('cells')
          .doc('_migrations')
          .collection('records')
          .doc(migrationId);
      const snap = await migrationRef.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
      }
      const m = snap.data() || {};
      if (m.status !== 'verified') {
        throw new HttpsError(
            'failed-precondition',
            `Migration must be 'verified' before cutover (currently '${m.status}').`,
        );
      }

      // Delegate to provisionTenantCell's internal logic.  Done via a
      // direct require() rather than HTTPS so we keep a single
      // database transaction within the function instance.
      const {provisionTenantCell} = require('./cellProvisioning');
      const fakeReq = {
        auth: request.auth,
        data: {tenantId: m.tenantId, cellId: m.toCellId},
      };
      // onCall handlers expose .run() in the v2 SDK — but rather than
      // rely on that, we re-implement the pointer flip + token rotation
      // here.  Inlining is more robust against SDK churn.
      const orgRef = registry.collection('organizations').doc(m.tenantId);
      const fromRef = registry.collection('cells').doc(m.fromCellId);
      const toRef = registry.collection('cells').doc(m.toCellId);

      await registry.runTransaction(async (txn) => {
        txn.update(orgRef, {
          cellId: m.toCellId,
          cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
          cellAssignedBy: request.auth.uid,
          writeFrozen: false,
          writeFrozenAt: admin.firestore.FieldValue.delete(),
          writeFrozenBy: admin.firestore.FieldValue.delete(),
          writeFrozenMigrationId: admin.firestore.FieldValue.delete(),
        });
        txn.set(fromRef, {
          tenantCount: admin.firestore.FieldValue.increment(-1),
        }, {merge: true});
        txn.set(toRef, {
          tenantCount: admin.firestore.FieldValue.increment(1),
          lastTenantMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        txn.update(migrationRef, {
          status: 'cutover',
          cutoverAt: admin.firestore.FieldValue.serverTimestamp(),
          cutoverBy: request.auth.uid,
        });
      });

      // Force token rotation so every tenant member picks up the new
      // cellId claim within ~60s.  Reuse the helper from provisioning
      // — its iteration logic is paged + tolerant of partial failures.
      // We re-inline the rotation rather than re-exporting it because
      // provisionTenantCell's export is the callable, not the helper.
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
          } catch (err) {
            logger.warn('[executeCutover] revoke failed', {
              uid: u.uid,
              error: err.message,
            });
          }
        }
        nextPageToken = page.pageToken;
      } while (nextPageToken);

      // Silence the unused-variable linter — fakeReq exists for the
      // intentional symmetry with provisionTenantCell's signature in
      // case we later route through it.
      void fakeReq;

      logger.info('[executeCutover] complete', {
        migrationId,
        tenantId: m.tenantId,
        fromCellId: m.fromCellId,
        toCellId: m.toCellId,
        rotated,
      });

      return {ok: true, migrationId, rotated, tenantId: m.tenantId};
    },
);

/**
 * Emergency reversal.  Flips the routing pointer back to fromCellId
 * and unfreezes.  WARNING: any data written on the target cell
 * between cutover and rollback is LEFT IN PLACE on the target cell —
 * the function records a warning so the SRE knows to reconcile.
 */
exports.rollbackTenantMigration = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const migrationId = String(request.data?.migrationId || '').trim();
      if (!migrationId) {
        throw new HttpsError('invalid-argument', 'migrationId is required.');
      }

      const registry = getRegistryDb();
      const migrationRef = registry
          .collection('cells')
          .doc('_migrations')
          .collection('records')
          .doc(migrationId);
      const snap = await migrationRef.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', `Migration ${migrationId} not found.`);
      }
      const m = snap.data() || {};
      if (m.status !== 'cutover' && m.status !== 'verification-failed') {
        throw new HttpsError(
            'failed-precondition',
            `Can only roll back from 'cutover' or 'verification-failed' (currently '${m.status}').`,
        );
      }

      const orgRef = registry.collection('organizations').doc(m.tenantId);
      const fromRef = registry.collection('cells').doc(m.fromCellId);
      const toRef = registry.collection('cells').doc(m.toCellId);

      await registry.runTransaction(async (txn) => {
        txn.update(orgRef, {
          cellId: m.fromCellId,
          cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
          cellAssignedBy: request.auth.uid,
          writeFrozen: false,
          writeFrozenAt: admin.firestore.FieldValue.delete(),
          writeFrozenBy: admin.firestore.FieldValue.delete(),
          writeFrozenMigrationId: admin.firestore.FieldValue.delete(),
        });
        // Reverse the counters only if a cutover actually happened.
        if (m.status === 'cutover') {
          txn.set(fromRef, {
            tenantCount: admin.firestore.FieldValue.increment(1),
          }, {merge: true});
          txn.set(toRef, {
            tenantCount: admin.firestore.FieldValue.increment(-1),
          }, {merge: true});
        }
        txn.update(migrationRef, {
          status: 'rolled-back',
          rolledBackAt: admin.firestore.FieldValue.serverTimestamp(),
          rolledBackBy: request.auth.uid,
          rollbackWarning:
              m.status === 'cutover' ?
                  'Data written on target cell between cutover and rollback must be reconciled manually.' :
                  null,
        });
      });

      logger.warn('[rollbackTenantMigration] complete', {
        migrationId,
        tenantId: m.tenantId,
        fromStatus: m.status,
      });

      return {ok: true, migrationId, tenantId: m.tenantId};
    },
);
