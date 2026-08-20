/* eslint-disable quotes */
/**
 * cellSeed.js
 * ───────────
 * Synthetic load generator for verifying cell-based routing end-to-end.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session J
 *
 * Why a synthetic seed
 * ─────────────────────
 * Migrating a real NGB to validate the routing layer would be high
 * risk and slow.  Instead, this module creates a SYNTHETIC tenant
 * — `synth-ngb-{N}` — pre-populated with N players, M drill
 * completions per player, and one season's worth of fixtures.
 * The Director OS migration UI can then exercise the full lifecycle
 * (register cell → migrate → verify → cut over → roll back) against
 * a tenant we can safely destroy.
 *
 * Use case
 * ────────
 *   1.  `seedSyntheticTenant({ tenantId: 'synth-ngb-001', playerCount: 200 })`
 *   2.  `bootstrapCellRegistry()`  (one-time; idempotent)
 *   3.  `registerDedicatedCell({ cellId: 'cell-use1-001' })`
 *   4.  `gcloud firestore databases create --database=cell-use1-001 --location=us-east1`
 *   5.  `activateCell({ cellId: 'cell-use1-001' })`
 *   6.  `startTenantMigration({ tenantId: 'synth-ngb-001', toCellId: 'cell-use1-001' })`
 *   7.  gcloud export/import (run by SRE)
 *   8.  `markExportComplete` / `markImportComplete`
 *   9.  `verifyTenantOnCell`
 *  10.  `executeCutover`
 *  11.  Confirm a player UID-key sign-in produces a JWT with
 *       `cellId: 'cell-use1-001'` and that `getActiveDb()` returns the
 *       dedicated cell's Firestore instance.
 *  12.  `purgeSyntheticTenant` to clean up.
 *
 * SAFETY
 * ──────
 * Synthetic tenant IDs MUST begin with `synth-` so the purge function
 * cannot accidentally delete real tenant data.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {assertRole} = require('./tenantUtils');
const {getRegistryDb} = require('./cellRouter');

const REGION = 'us-east1';

/**
 * Synthetic tenants are sandboxed by this prefix.  All cleanup queries
 * filter on it so production data is structurally unreachable.
 */
const SYNTH_PREFIX = 'synth-';

/**
 * Seed N players, drills, and fixtures into a synthetic tenant.
 *
 * The data shape mirrors the real schema enough that the migration
 * tool's verifyTenantOnCell can count documents in `users`,
 * `drill_completions`, `fixtures`, and `assigned_missions` and get
 * a meaningful pass/fail.
 */
exports.seedSyntheticTenant = onCall(
    {region: REGION, timeoutSeconds: 540},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const tenantId = String(request.data?.tenantId || '').trim();
      const playerCount = Math.min(
          Number(request.data?.playerCount || 50),
          2000, // upper bound to keep run-time below the 9-min timeout
      );
      const completionsPerPlayer = Math.min(
          Number(request.data?.completionsPerPlayer || 5),
          50,
      );

      if (!tenantId.startsWith(SYNTH_PREFIX)) {
        throw new HttpsError(
            'invalid-argument',
            `Synthetic tenant IDs must start with '${SYNTH_PREFIX}'.`,
        );
      }

      const db = getRegistryDb();
      const now = admin.firestore.FieldValue.serverTimestamp();

      // ── Org doc + cells/(default) tenantCount bump ─────────────────────
      const orgRef = db.collection('organizations').doc(tenantId);
      const orgSnap = await orgRef.get();
      if (!orgSnap.exists) {
        await orgRef.set({
          name: `Synthetic NGB ${tenantId}`,
          cellId: '(default)',
          createdAt: now,
          synthetic: true,
        });
        await db.collection('cells').doc('(default)').set({
          tenantCount: admin.firestore.FieldValue.increment(1),
        }, {merge: true});
      }

      // ── Players ─────────────────────────────────────────────────────────
      // Chunked in writeBatches of 400 ops (Firestore caps at 500 per batch).
      let written = {users: 0, completions: 0, missions: 0, fixtures: 0};
      const OPS_PER_BATCH = 400;
      let batch = db.batch();
      let opsInBatch = 0;

      const commitIfFull = async () => {
        if (opsInBatch >= OPS_PER_BATCH) {
          await batch.commit();
          batch = db.batch();
          opsInBatch = 0;
        }
      };

      for (let i = 0; i < playerCount; i += 1) {
        const userKey = `${tenantId}-player-${i}@synthetic.test`;
        const playerUid = `${tenantId}-uid-${i}`;
        const userRef = db.collection('users').doc(userKey);
        batch.set(userRef, {
          email: userKey,
          playerName: `Synth Player ${i}`,
          role: 'player',
          clubId: tenantId,
          teamId: `${tenantId}-team-A`,
          synthetic: true,
          armory: {totalXP: 0, totalDrillCount: 0},
          createdAt: now,
        });
        opsInBatch += 1;
        written.users += 1;
        await commitIfFull();

        for (let j = 0; j < completionsPerPlayer; j += 1) {
          const completionRef = db.collection('drill_completions').doc();
          batch.set(completionRef, {
            playerUid,
            userKey,
            clubId: tenantId,
            drillId: `synth-drill-${j % 5}`,
            drillTitle: `Synth Drill ${j % 5}`,
            attributeId: ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'][j % 6],
            xpAwarded: 50 + (j * 10),
            outcome: 'success',
            loggedAt: now,
            synthetic: true,
          });
          opsInBatch += 1;
          written.completions += 1;
          await commitIfFull();
        }

        // One mission per player so the assigned_missions collection
        // also has something to migrate.
        const missionRef = db.collection('assigned_missions').doc();
        batch.set(missionRef, {
          playerUid,
          userKey,
          clubId: tenantId,
          missionTitle: 'Synthetic Daily Mission',
          status: 'open',
          createdAt: now,
          synthetic: true,
        });
        opsInBatch += 1;
        written.missions += 1;
        await commitIfFull();
      }

      // ── Fixtures (10 per tenant) ────────────────────────────────────────
      for (let f = 0; f < 10; f += 1) {
        const fixtureRef = db.collection('fixtures').doc();
        batch.set(fixtureRef, {
          tenantId,
          clubId: tenantId,
          seasonId: `${tenantId}-season-2026`,
          opponentId: `${tenantId}-opponent-${f % 3}`,
          status: 'Scheduled',
          kickoffAt: now,
          synthetic: true,
        });
        opsInBatch += 1;
        written.fixtures += 1;
        await commitIfFull();
      }

      if (opsInBatch > 0) await batch.commit();

      logger.info('[seedSyntheticTenant] complete', {tenantId, written});
      return {ok: true, tenantId, written};
    },
);

/**
 * Delete every doc tagged `synthetic: true` for the supplied tenantId.
 * Refuses to run unless tenantId begins with `synth-`.
 */
exports.purgeSyntheticTenant = onCall(
    {region: REGION, timeoutSeconds: 540},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const tenantId = String(request.data?.tenantId || '').trim();
      if (!tenantId.startsWith(SYNTH_PREFIX)) {
        throw new HttpsError(
            'invalid-argument',
            `Refusing to purge — tenantId must start with '${SYNTH_PREFIX}'.`,
        );
      }

      const db = getRegistryDb();
      const collections = [
        'users',
        'drill_completions',
        'assigned_missions',
        'fixtures',
      ];

      let purged = {};
      for (const coll of collections) {
        let count = 0;
        let lastDoc = null;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          let q = db.collection(coll)
              .where('clubId', '==', tenantId)
              .where('synthetic', '==', true)
              .limit(400);
          if (lastDoc) q = q.startAfter(lastDoc);
          const page = await q.get();
          if (page.empty) break;
          const batch = db.batch();
          page.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          count += page.size;
          if (page.size < 400) break;
          lastDoc = page.docs[page.docs.length - 1];
        }
        purged[coll] = count;
      }

      // Delete organization doc + decrement default cell counter.
      await db.collection('organizations').doc(tenantId).delete();
      await db.collection('cells').doc('(default)').set({
        tenantCount: admin.firestore.FieldValue.increment(-1),
      }, {merge: true});

      logger.info('[purgeSyntheticTenant] complete', {tenantId, purged});
      return {ok: true, tenantId, purged};
    },
);
