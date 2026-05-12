/* eslint-disable quotes */
/**
 * cellBootstrap.js
 * ─────────────────
 * One-shot administrative callables that prepare the cell registry.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session A
 *
 * Two endpoints:
 *
 *   • bootstrapCellRegistry    — Creates cells/(default), cells/_policy,
 *                                and backfills every organizations/*
 *                                doc with cellId: '(default)'.
 *                                IDEMPOTENT — safe to re-run.
 *
 *   • registerDedicatedCell    — Records a freshly-created Firestore
 *                                database in the cells/ registry so the
 *                                provisioning callable (Session B) can
 *                                assign tenants to it.
 *
 * Zero-Trust: both endpoints require global_admin.  No tenant-scoped
 * caller can create or modify cell-routing state.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {DEFAULT_CELL_ID, PRIMARY_REGION} = require('./cellConstants');
const {assertRole} = require('./tenantUtils');
const {getRegistryDb} = require('./cellRouter');

const REGION = 'us-east1';

/**
 * Registry / control-plane Firestore — the (default) cell.
 *
 * The cell registry MUST live on the default cell because it is the
 * source of truth for routing.  Hosting it on a dedicated cell would
 * create the chicken-and-egg problem of needing to know the cellId
 * before reading the cellId.
 *
 * @returns {FirebaseFirestore.Firestore}
 */
const db = () => getRegistryDb();

/**
 * Default cell policy doc — seeded once on first bootstrap run.
 * Numbers are intentionally conservative; the Director OS dashboard
 * (Session I) lets an admin override them at runtime.
 */
const DEFAULT_POLICY = {
  rosterPromoteThreshold: 5000,
  readsPerDayPromoteThreshold: 50000,
  readSustainedDays: 7,
  sharedCellSoftCap: 5000,
  defaultPromotionProfile: 'dedicated-standard',
};

/**
 * bootstrapCellRegistry
 * ─────────────────────
 * Idempotent: every doc write uses { merge: true } and every counter
 * uses `increment(0)` semantics (it only writes counters that don't
 * already exist).
 *
 * Returns a summary so the admin caller can confirm what changed:
 *   { defaultCellSeeded, policySeeded, organizationsBackfilled }
 */
exports.bootstrapCellRegistry = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const summary = {
        defaultCellSeeded: false,
        policySeeded: false,
        organizationsBackfilled: 0,
        organizationsScanned: 0,
      };

      // ── 1. Seed cells/(default) ──────────────────────────────────────────
      const defaultCellRef = db().collection('cells').doc(DEFAULT_CELL_ID);
      const defaultCellSnap = await defaultCellRef.get();
      if (!defaultCellSnap.exists) {
        await defaultCellRef.set({
          id: DEFAULT_CELL_ID,
          databaseId: DEFAULT_CELL_ID,
          region: PRIMARY_REGION,
          status: 'active',
          quotaProfile: 'shared',
          tenantCount: 0, // backfill below will increment
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        summary.defaultCellSeeded = true;
        logger.info('[bootstrapCellRegistry] seeded cells/(default)');
      }

      // ── 2. Seed cells/_policy ────────────────────────────────────────────
      const policyRef = db().collection('cells').doc('_policy');
      const policySnap = await policyRef.get();
      if (!policySnap.exists) {
        await policyRef.set({
          ...DEFAULT_POLICY,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        summary.policySeeded = true;
        logger.info('[bootstrapCellRegistry] seeded cells/_policy');
      }

      // ── 3. Backfill organizations/*.cellId ───────────────────────────────
      // Paginated to handle very large org counts without OOM on the
      // function instance.  Page size 200 keeps each commit batch well
      // under Firestore's 500-op limit (one write per org).
      const PAGE_SIZE = 200;
      let lastDoc = null;
      let assignedToDefault = 0;

      // eslint-disable-next-line no-constant-condition
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
          if (typeof cellId === 'string' && cellId.length > 0) {
            return; // already assigned
          }
          batch.update(doc.ref, {
            cellId: DEFAULT_CELL_ID,
            cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
            cellAssignedBy: 'bootstrap',
          });
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

      // ── 4. Sync the (default) cell's tenantCount counter ─────────────────
      if (assignedToDefault > 0) {
        await defaultCellRef.update({
          tenantCount: admin.firestore.FieldValue.increment(assignedToDefault),
        });
      }

      logger.info('[bootstrapCellRegistry] complete', summary);
      return summary;
    },
);

/**
 * registerDedicatedCell
 * ─────────────────────
 * Records a freshly-created Firestore database (created out-of-band via
 * `gcloud firestore databases create --database=cell-use1-001 --location=us-east1`)
 * in the cells/ registry so the routing layer knows about it.
 *
 * This does NOT create the physical database — that is a manual gcloud
 * step performed by an SRE.  This function only flips it into the
 * routing table.
 */
exports.registerDedicatedCell = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const cellId = String(request.data?.cellId || '').trim();
      const quotaProfile = String(
          request.data?.quotaProfile || 'dedicated-standard',
      );
      const region = String(request.data?.region || PRIMARY_REGION);

      if (!cellId || cellId === DEFAULT_CELL_ID) {
        throw new HttpsError(
            'invalid-argument',
            'cellId is required and must not be the reserved (default) name.',
        );
      }
      if (!/^cell-[a-z0-9]+-\d{3,}$/.test(cellId)) {
        throw new HttpsError(
            'invalid-argument',
            'cellId must match pattern cell-{region}-{nnn} (e.g. cell-use1-001).',
        );
      }
      if (!['dedicated-standard', 'dedicated-large'].includes(quotaProfile)) {
        throw new HttpsError(
            'invalid-argument',
            'quotaProfile must be dedicated-standard or dedicated-large.',
        );
      }

      const ref = db().collection('cells').doc(cellId);
      const existing = await ref.get();
      if (existing.exists) {
        throw new HttpsError(
            'already-exists',
            `Cell ${cellId} is already registered.`,
        );
      }

      await ref.set({
        id: cellId,
        databaseId: cellId,
        region,
        status: 'provisioning', // flipped to 'active' once verified empty + reachable
        quotaProfile,
        tenantCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('[registerDedicatedCell] registered', {
        cellId,
        quotaProfile,
        region,
      });
      return {ok: true, cellId};
    },
);

/**
 * activateCell
 * ────────────
 * Flips a 'provisioning' cell to 'active' after manual verification
 * (database reachable, security rules deployed, indexes built).
 * Separate from registerDedicatedCell so the registration → activation
 * gap forces an explicit "I have verified this cell is ready" step.
 */
exports.activateCell = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const cellId = String(request.data?.cellId || '').trim();
      if (!cellId) {
        throw new HttpsError('invalid-argument', 'cellId is required.');
      }

      const ref = db().collection('cells').doc(cellId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', `Cell ${cellId} is not registered.`);
      }
      const data = snap.data() || {};
      if (data.status === 'active') {
        return {ok: true, cellId, alreadyActive: true};
      }
      if (data.status !== 'provisioning') {
        throw new HttpsError(
            'failed-precondition',
            `Cell ${cellId} is in status '${data.status}' — only 'provisioning' cells can be activated.`,
        );
      }

      await ref.update({
        status: 'active',
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('[activateCell] activated', {cellId});
      return {ok: true, cellId, alreadyActive: false};
    },
);
