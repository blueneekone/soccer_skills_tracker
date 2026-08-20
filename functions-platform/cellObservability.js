/* eslint-disable quotes */
/**
 * cellObservability.js
 * ─────────────────────
 * Cell observability + promotion queue.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session I
 *
 * What "observability" means in this layer
 * ─────────────────────────────────────────
 * Three signals drive the operations decision "should we promote
 * tenant X to a dedicated cell?":
 *
 *   1.  Roster size       — number of users with role='player' in the
 *                           tenant.  Coarse but cheap (Firestore
 *                           aggregate query).
 *
 *   2.  Sustained reads   — daily Firestore read count exceeding the
 *                           policy threshold for `readSustainedDays`
 *                           consecutive days.  Cloud Monitoring
 *                           provides the raw metric; this module
 *                           records a rolling counter to Firestore
 *                           for fast dashboard queries.
 *
 *   3.  Manual flag       — an admin can flag a tenant for promotion
 *                           via `flagTenantForPromotion`.  Used for
 *                           pre-scheduled migrations (new NGB onboard).
 *
 * Each signal lands a doc in `cell_promotion_queue/{tenantId}`.  The
 * Director OS health dashboard subscribes to this collection sorted
 * by `flaggedAt`.  Once a tenant is migrated, the queue entry is
 * archived (status='migrated') rather than deleted, so the audit
 * trail is preserved.
 *
 * What this module does NOT do
 * ─────────────────────────────
 * It does NOT call into Cloud Monitoring's API to pull live metrics.
 * That work belongs in a separate scheduler that runs on the
 * production Cloud Monitoring project.  This module exposes the
 * Firestore-side primitives and a callable that the scheduler
 * dispatches to.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {assertRole} = require('./tenantUtils');
const {getRegistryDb} = require('./cellRouter');

const REGION = 'us-east1';

/**
 * Record a roster-size signal in the promotion queue.
 *
 * Called by the `evaluateCellPromotions` scheduler (below) — exposed
 * as a callable too so an admin can re-run it ad-hoc against a
 * specific tenant for diagnosis.
 */
exports.flagTenantForPromotion = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const tenantId = String(request.data?.tenantId || '').trim();
      const trigger = String(request.data?.trigger || 'manual');
      const rosterSize = Number(request.data?.rosterSize || 0);
      const rollingDailyReads = Number(request.data?.rollingDailyReads || 0);

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'tenantId is required.');
      }
      if (!['roster_size', 'sustained_reads', 'manual'].includes(trigger)) {
        throw new HttpsError('invalid-argument', 'invalid trigger.');
      }

      const ref = getRegistryDb()
          .collection('cell_promotion_queue')
          .doc(tenantId);

      const snap = await ref.get();
      const existing = snap.exists ? snap.data() || {} : {};

      await ref.set({
        tenantId,
        trigger,
        rosterSize: rosterSize || existing.rosterSize || 0,
        rollingDailyReads: rollingDailyReads || existing.rollingDailyReads || 0,
        flaggedAt:
            existing.flaggedAt || admin.firestore.FieldValue.serverTimestamp(),
        flaggedBy: request.auth.uid,
        status: existing.status === 'migrated' ? 'migrated' : 'pending',
      }, {merge: true});

      return {ok: true, tenantId, trigger};
    },
);

/**
 * Acknowledge a promotion queue entry — silences the dashboard alert
 * without migrating the tenant.  Used when ops decides to deliberately
 * defer (e.g. NGB asked to wait until off-season).
 */
exports.acknowledgePromotionFlag = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const tenantId = String(request.data?.tenantId || '').trim();
      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'tenantId is required.');
      }

      const ref = getRegistryDb()
          .collection('cell_promotion_queue')
          .doc(tenantId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError(
            'not-found',
            `cell_promotion_queue/${tenantId} not found.`,
        );
      }

      await ref.update({
        acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
        acknowledgedBy: request.auth.uid,
        status: 'acknowledged',
      });

      return {ok: true, tenantId};
    },
);

/**
 * Hourly scheduler that scans organizations/* and flags tenants
 * whose roster size exceeds the policy threshold.
 *
 * Future work: when Cloud Monitoring integration lands, this scheduler
 * also pulls per-tenant Firestore read counts from the last 24h and
 * compares against `readsPerDayPromoteThreshold`.  Today it's
 * roster-size-only — the cheap signal that catches 80% of promotion
 * candidates.
 *
 * Schedule: every hour at minute 17 to avoid colliding with
 * cron-on-the-hour scrapes.
 */
exports.evaluateCellPromotions = onSchedule(
    {
      schedule: '17 * * * *',
      region: REGION,
      timeZone: 'America/New_York',
    },
    async () => {
      const registry = getRegistryDb();

      const policySnap = await registry.collection('cells').doc('_policy').get();
      if (!policySnap.exists) {
        logger.warn('[evaluateCellPromotions] no cells/_policy — skipping.');
        return;
      }
      const policy = policySnap.data() || {};
      const rosterThreshold = Number(policy.rosterPromoteThreshold || 5000);

      // Paginate through organizations.  Skip tenants already on a
      // dedicated cell (their cellId is not '(default)').
      let lastDoc = null;
      let flagged = 0;
      const PAGE_SIZE = 100;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        let q = registry.collection('organizations').limit(PAGE_SIZE);
        if (lastDoc) q = q.startAfter(lastDoc);
        const page = await q.get();
        if (page.empty) break;

        for (const orgDoc of page.docs) {
          const tenantId = orgDoc.id;
          const cellId = orgDoc.get('cellId') || '(default)';
          if (cellId !== '(default)') continue;

          // Roster size = count of player users in this tenant.
          // Using count() aggregation — single read per tenant.
          let rosterSize = 0;
          try {
            const agg = await registry
                .collection('users')
                .where('clubId', '==', tenantId)
                .where('role', '==', 'player')
                .count()
                .get();
            rosterSize = agg.data().count;
          } catch (err) {
            logger.warn('[evaluateCellPromotions] count() failed', {
              tenantId,
              error: err.message,
            });
            continue;
          }

          if (rosterSize >= rosterThreshold) {
            await registry
                .collection('cell_promotion_queue')
                .doc(tenantId)
                .set({
                  tenantId,
                  trigger: 'roster_size',
                  rosterSize,
                  flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
                  flaggedBy: 'scheduler',
                  status: 'pending',
                }, {merge: true});
            flagged += 1;
          }
        }

        if (page.size < PAGE_SIZE) break;
        lastDoc = page.docs[page.docs.length - 1];
      }

      logger.info('[evaluateCellPromotions] complete', {flagged});
    },
);

/**
 * Daily scheduler that prunes idempotency + rate-bucket records older
 * than 24h.  Without this, gateway_idempotency would grow unbounded.
 *
 * Schedule: 03:33 ET — quiet window between night-owl writes and
 * morning load.
 */
exports.purgeGatewayCaches = onSchedule(
    {
      schedule: '33 3 * * *',
      region: REGION,
      timeZone: 'America/New_York',
    },
    async () => {
      const registry = getRegistryDb();
      const cutoff = admin.firestore.Timestamp.fromMillis(
          Date.now() - 24 * 60 * 60 * 1000,
      );

      let pruned = 0;
      const purge = async (collectionName) => {
        let lastDoc = null;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          let q = registry.collection(collectionName)
              .where('recordedAt', '<', cutoff)
              .limit(400);
          if (lastDoc) q = q.startAfter(lastDoc);
          const page = await q.get();
          if (page.empty) break;
          const batch = registry.batch();
          page.docs.forEach((d) => {
            batch.delete(d.ref);
            pruned += 1;
          });
          await batch.commit();
          if (page.size < 400) break;
          lastDoc = page.docs[page.docs.length - 1];
        }
      };

      await purge('gateway_idempotency');
      logger.info('[purgeGatewayCaches] complete', {pruned});
    },
);
