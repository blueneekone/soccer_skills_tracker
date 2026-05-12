/* eslint-disable quotes */
/**
 * cellProvisioning.js
 * ────────────────────
 * Tenant ↔ cell assignment callables.
 *
 * Phase 1, Epic 1 — Cell-Based Routing, Session B
 *
 * Two endpoints:
 *
 *   • provisionTenantCell — Pins a tenant to a specific cell, increments
 *                           the cell's tenantCount counter, and force-
 *                           rotates refresh tokens for every user in the
 *                           tenant so the next ID-token refresh picks up
 *                           the new cellId claim.
 *
 *   • peekTenantCell      — Read-only lookup: "which cell does this
 *                           tenant currently live on?"  Useful for the
 *                           Director OS dashboard and the migration UI.
 *
 * Zero-Trust: provisionTenantCell requires global_admin / super_admin.
 * No tenant-scoped caller can change cell assignments.
 *
 * IMPORTANT — Migration order
 * ────────────────────────────
 * `provisionTenantCell` ONLY changes the routing pointer.  It does NOT
 * move tenant data between cells.  Use `migrateTenantToCell` (Session G)
 * for the full export → import → cutover flow.  Calling this function
 * in isolation against a tenant whose data still lives on the source
 * cell will make that data unreachable until either data is migrated or
 * the assignment is reverted.
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {DEFAULT_CELL_ID, resolveCellId} = require('./cellConstants');
const {assertRole} = require('./tenantUtils');
const {getRegistryDb} = require('./cellRouter');

const REGION = 'us-east1';

/**
 * Registry Firestore accessor — control-plane only.
 * @returns {FirebaseFirestore.Firestore}
 */
const db = () => getRegistryDb();

/**
 * Iterate every Auth user whose `customClaims.clubId` matches the
 * supplied tenantId and revoke their refresh tokens, forcing them to
 * mint a fresh ID token on next request — which picks up the new
 * `cellId` claim that syncUserClaims has already stamped on their
 * user document mirror.
 *
 * Paginated via `listUsers({maxResults: 1000})` per the Admin SDK
 * contract.  At most one full scan of the user pool per provisioning
 * call — acceptable given this fires once per tenant migration, not
 * per request.
 *
 * Returns the count of users whose tokens were rotated.
 *
 * @param {string} tenantId
 * @returns {Promise<number>}
 */
async function rotateTokensForTenant(tenantId) {
  let rotated = 0;
  let nextPageToken = undefined;

  do {
    const page = await admin.auth().listUsers(1000, nextPageToken);
    for (const userRecord of page.users) {
      const claims = userRecord.customClaims || {};
      const claimTenant = claims.tenantId || claims.clubId || '';
      if (claimTenant !== tenantId) continue;

      try {
        await admin.auth().revokeRefreshTokens(userRecord.uid);
        rotated += 1;
      } catch (err) {
        logger.warn('[rotateTokensForTenant] revoke failed', {
          uid: userRecord.uid,
          tenantId,
          error: err.message,
        });
      }
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return rotated;
}

/**
 * provisionTenantCell
 * ───────────────────
 * Inputs:
 *   tenantId   — required; the organizations/{tenantId} doc ID
 *   cellId     — required; either '(default)' or a registered cell ID
 *
 * Effects (in order):
 *   1.  Read organizations/{tenantId} to capture the current cellId
 *       (`fromCellId`) for counter accounting.
 *   2.  Validate that the target cellId is registered and 'active'
 *       (unless it is '(default)' which is always assumed active).
 *   3.  Transactionally:
 *         - Update organizations/{tenantId}.cellId = cellId
 *         - Decrement cells/{fromCellId}.tenantCount (if different)
 *         - Increment cells/{toCellId}.tenantCount
 *   4.  Force-rotate refresh tokens for every user in the tenant so
 *       the next ID-token refresh picks up the new cellId claim.
 *
 * Returns:
 *   { ok, tenantId, fromCellId, toCellId, tokensRotated }
 */
exports.provisionTenantCell = onCall(
    {region: REGION},
    async (request) => {
      assertRole(request, ['global_admin', 'super_admin']);

      const tenantId = String(request.data?.tenantId || '').trim();
      const targetCellId = resolveCellId(request.data?.cellId);

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'tenantId is required.');
      }

      // ── 1. Capture current assignment ──────────────────────────────────
      const orgRef = db().collection('organizations').doc(tenantId);
      const orgSnap = await orgRef.get();
      if (!orgSnap.exists) {
        throw new HttpsError(
            'not-found',
            `organizations/${tenantId} does not exist.`,
        );
      }
      const fromCellId = resolveCellId(orgSnap.get('cellId'));

      if (fromCellId === targetCellId) {
        return {
          ok: true,
          tenantId,
          fromCellId,
          toCellId: targetCellId,
          tokensRotated: 0,
          noop: true,
        };
      }

      // ── 2. Validate target cell ─────────────────────────────────────────
      if (targetCellId !== DEFAULT_CELL_ID) {
        const targetRef = db().collection('cells').doc(targetCellId);
        const targetSnap = await targetRef.get();
        if (!targetSnap.exists) {
          throw new HttpsError(
              'not-found',
              `Cell ${targetCellId} is not registered. Call registerDedicatedCell first.`,
          );
        }
        const targetStatus = targetSnap.get('status');
        if (targetStatus !== 'active') {
          throw new HttpsError(
              'failed-precondition',
              `Cell ${targetCellId} has status '${targetStatus}' — only 'active' cells accept assignments.`,
          );
        }
      }

      // ── 3. Transactional reassignment + counter updates ────────────────
      // Counters live in the cells/ registry, which itself lives on the
      // (default) cell — so a single Firestore transaction covers all three
      // documents without crossing a cell boundary.
      const fromRef = db().collection('cells').doc(fromCellId);
      const toRef = db().collection('cells').doc(targetCellId);

      await db().runTransaction(async (txn) => {
        const fresh = await txn.get(orgRef);
        if (!fresh.exists) {
          throw new HttpsError(
              'aborted',
              `organizations/${tenantId} disappeared mid-provision.`,
          );
        }
        // Re-check inside the transaction in case another admin moved
        // the tenant between step 1 and now.
        const liveFromCellId = resolveCellId(fresh.get('cellId'));
        if (liveFromCellId !== fromCellId) {
          throw new HttpsError(
              'aborted',
              'Tenant cellId changed concurrently; retry the provisioning call.',
          );
        }

        txn.update(orgRef, {
          cellId: targetCellId,
          cellAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
          cellAssignedBy: request.auth.uid,
        });

        txn.set(
            fromRef,
            {
              tenantCount: admin.firestore.FieldValue.increment(-1),
            },
            {merge: true},
        );

        txn.set(
            toRef,
            {
              tenantCount: admin.firestore.FieldValue.increment(1),
              lastTenantMigratedAt:
                  admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
        );
      });

      // ── 4. Force token refresh so the new cellId claim is picked up ────
      const tokensRotated = await rotateTokensForTenant(tenantId);

      logger.info('[provisionTenantCell] complete', {
        tenantId,
        fromCellId,
        toCellId: targetCellId,
        tokensRotated,
        actor: request.auth.uid,
      });

      return {
        ok: true,
        tenantId,
        fromCellId,
        toCellId: targetCellId,
        tokensRotated,
        noop: false,
      };
    },
);

/**
 * peekTenantCell
 * ──────────────
 * Read-only convenience for the Director OS migration UI.  Allowed for
 * global_admin and director (a director may need to see which cell
 * their own tenant lives on).  Director callers may only peek at their
 * own tenantId; admins may peek any.
 */
exports.peekTenantCell = onCall(
    {region: REGION},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }
      const tenantId = String(request.data?.tenantId || '').trim();
      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'tenantId is required.');
      }

      const role = String(request.auth.token.role || '');
      const callerTenant = String(
          request.auth.token.tenantId || request.auth.token.clubId || '',
      );
      const isAdmin = role === 'global_admin' || role === 'super_admin';
      if (!isAdmin && callerTenant !== tenantId) {
        throw new HttpsError(
            'permission-denied',
            'You may only peek at your own tenant.',
        );
      }

      const orgSnap = await db().collection('organizations').doc(tenantId).get();
      if (!orgSnap.exists) {
        throw new HttpsError('not-found', `organizations/${tenantId} not found.`);
      }

      const cellId = resolveCellId(orgSnap.get('cellId'));
      return {tenantId, cellId};
    },
);
