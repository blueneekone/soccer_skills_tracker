'use strict';

/**
 * Federation Phase 3 — sync job stubs (not deployed).
 *
 * Planned deliverables per FEDERATION_ROADMAP Phase 3:
 * - Diff engine: player_lookup + households snapshot vs last successful sync
 * - Retry queue in federation_sync_jobs/{clubId}
 * - Audit trail in security_audit (no raw guardian PII in logs)
 * - onSchedule reconciliation + director sync status panel
 *
 * Wire exports from functions-core/index.js when Phase 3 slice ships.
 */

const PHASE3_STUB = 'Federation Phase 3 sync jobs are not yet deployed.';

/**
 * @param {string} clubId
 * @return {Promise<{ ok: false, stub: true, message: string }>}
 */
async function reconcileFederationSync(clubId) {
  void clubId;
  return {
    ok: false,
    stub: true,
    message: PHASE3_STUB,
  };
}

/**
 * @param {string} clubId
 * @return {Promise<{ ok: false, stub: true, message: string }>}
 */
async function enqueueFederationSyncJob(clubId) {
  void clubId;
  return {
    ok: false,
    stub: true,
    message: PHASE3_STUB,
  };
}

/**
 * @param {string} clubId
 * @return {Promise<{ ok: false, stub: true, message: string }>}
 */
async function getFederationSyncStatus(clubId) {
  void clubId;
  return {
    ok: false,
    stub: true,
    message: PHASE3_STUB,
  };
}

module.exports = {
  PHASE3_STUB,
  reconcileFederationSync,
  enqueueFederationSyncJob,
  getFederationSyncStatus,
};
