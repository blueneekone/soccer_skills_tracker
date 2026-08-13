'use strict';

/**
 * functions/src/auth/customClaims.js
 * Sprint 1.3 — JWT custom claim builder (sync core).
 *
 * Embedded into Firebase Auth tokens by syncUserClaims (adminOps.js).
 * Async enrichments (entitlements, cellId) are merged after this base shape.
 */

const DEFAULT_CELL_ID = 'default';

/**
 * @param {Record<string, unknown>|null|undefined} userData Firestore users/{email} doc
 * @returns {Record<string, unknown>|null}
 */
function buildBaseCustomClaims(userData) {
  if (!userData || typeof userData !== 'object') return null;

  const clearedRole = typeof userData.role === 'string' && userData.role.trim()
    ? userData.role.trim()
    : 'player';

  const clearanceData =
    typeof userData.clearance === 'object' && userData.clearance !== null
      ? userData.clearance
      : {};
  const clearanceStatus =
    typeof clearanceData.status === 'string' ? clearanceData.status : 'pending';
  let isCleared = clearanceStatus === 'cleared';
  if (isCleared && clearanceData.expiresAt != null) {
    try {
      const expMs =
        typeof clearanceData.expiresAt.toMillis === 'function'
          ? clearanceData.expiresAt.toMillis()
          : Number(clearanceData.expiresAt);
      if (!Number.isNaN(expMs) && expMs < Date.now()) isCleared = false;
    } catch {
      isCleared = false;
    }
  }
  const requiresClearance = clearedRole === 'coach' || clearedRole === 'recruiter';
  if (!requiresClearance) isCleared = true;

  return {
    teamId: userData.teamId || null,
    role: clearedRole,
    clubId: userData.clubId || null,
    orgId: userData.orgId || null,
    divisionId: userData.divisionId || userData.clubId || null,
    householdId: userData.householdId || null,
    minor: userData.isMinor === true,
    vpcVerified: userData.vpcStatus === 'verified',
    isCleared,
    tier: null,
    subscription_status: null,
    cellId: DEFAULT_CELL_ID,
    phoneVerified: userData.phoneVerified === true,
    ageBand:
      userData.ageBand ||
      (userData.isMinor === true ? 'teen13to16' : 'adult'),
  };
}

module.exports = {
  DEFAULT_CELL_ID,
  buildBaseCustomClaims,
};
