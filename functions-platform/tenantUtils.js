/* eslint-disable quotes */
/**
 * tenantUtils.js
 * ──────────────
 * Zero-Trust tenant scope utilities for Nexus Command Cloud Functions.
 *
 * GOLDEN RULE: Never trust a tenantId passed from the client.
 *   Always read it from `request.auth.token` (the server-verified JWT).
 *   The token is set by `syncUserClaims` (Firestore trigger) and
 *   `consumeInviteCode` (explicit setCustomUserClaims call).
 *
 * Usage in any onCall function:
 *
 *   const { getCallerTenantId, assertSameTenant } = require('./tenantUtils');
 *
 *   // Pattern A — read caller's tenantId from token (ignore client value)
 *   const tenantId = getCallerTenantId(request);
 *
 *   // Pattern B — validate a tenantId the client passed (e.g. teamId scope)
 *   const tenantId = assertSameTenant(request, request.data.tenantId);
 *   // throws if client tenantId doesn't match token tenantId
 *
 * Both functions accept the Firebase Functions v2 `CallableRequest` object.
 */

const {HttpsError} = require('firebase-functions/v2/https');
const {DEFAULT_CELL_ID, resolveCellId} = require('./cellConstants');

/**
 * Extract the server-authoritative tenantId from the caller's JWT.
 *
 * Accepts both `tenantId` (canonical) and `clubId` (legacy) claim names.
 * Throws `unauthenticated` if not signed in.
 * Throws `permission-denied` if signed in but no tenant claim exists
 * (user has not redeemed an invite yet — should be redirected to onboarding).
 *
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @param {{ allowNoTenant?: boolean }} [opts]
 *   Set `allowNoTenant: true` for functions accessible to pre-onboarded users
 *   (e.g. the consumeInviteCode function itself).
 * @returns {string} The verified tenantId from the JWT.
 */
function getCallerTenantId(request, opts = {}) {
  if (!request.auth) {
    throw new HttpsError(
        'unauthenticated',
        'You must be signed in to perform this action.',
    );
  }

  const tenantId =
    String(request.auth.token.tenantId || request.auth.token.clubId || '');

  if (!tenantId && !opts.allowNoTenant) {
    throw new HttpsError(
        'permission-denied',
        'Your account is not associated with an organisation. ' +
        'Please enter an invite code at /join to continue.',
    );
  }

  return tenantId;
}

/**
 * Assert that the caller's token tenantId matches a value provided by the
 * client (e.g. a `tenantId` field in `request.data` or a resource's tenantId
 * read from Firestore before calling this check).
 *
 * Returns the VERIFIED (server-side) tenantId — callers should always use
 * the return value, not the client-supplied one, for subsequent Firestore ops.
 *
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @param {string | null | undefined} clientTenantId
 *   The tenantId the client claims to be operating under.
 *   If null/undefined, skips the equality check (useful when the client is
 *   not expected to supply one — the server derives it from the token).
 * @returns {string} The verified tenantId from the JWT.
 * @throws {HttpsError} permission-denied if tenantIds do not match.
 */
function assertSameTenant(request, clientTenantId) {
  const serverTenantId = getCallerTenantId(request);

  if (clientTenantId && clientTenantId !== serverTenantId) {
    throw new HttpsError(
        'permission-denied',
        'Tenant mismatch: you do not have access to the requested organisation.',
    );
  }

  // Always return the SERVER value — discard the client-supplied one.
  return serverTenantId;
}

/**
 * Convenience: assert the caller is authenticated and return their uid.
 * Use alongside getCallerTenantId when you need both uid and tenantId.
 *
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @returns {{ uid: string, email: string | null }}
 */
function assertAuthenticated(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  return {
    uid: request.auth.uid,
    email: request.auth.token.email || null,
  };
}

/**
 * Extract role from the caller's JWT claims.
 * Returns 'guest' if no role claim exists.
 *
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @returns {string}
 */
function getCallerRole(request) {
  return String(request.auth?.token?.role || 'guest');
}

/**
 * Assert the caller holds one of the specified roles.
 * Useful for director/coach-only Cloud Function endpoints.
 *
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @param {string[]} allowedRoles
 * @returns {string} The caller's role.
 */
function assertRole(request, allowedRoles) {
  const role = getCallerRole(request);
  if (!allowedRoles.includes(role)) {
    throw new HttpsError(
        'permission-denied',
        `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
    );
  }
  return role;
}

/**
 * Extract the server-authoritative cellId from the caller's JWT.
 *
 * Phase 1, Epic 1 — Cell-Based Routing.
 *
 * Reads `request.auth.token.cellId` (written by syncUserClaims after
 * Session B's extension).  Defaults to the reserved '(default)' string
 * for tenants that have not been promoted to a dedicated cell — the
 * long tail of small clubs.
 *
 * NEVER trust a cellId from `request.data` — routing decisions are
 * a security boundary.  A malicious caller forging a different cellId
 * could attempt to read another tenant's data.
 *
 * Returns a non-empty string — callers can pass the result directly to
 * the Admin SDK's `getFirestore(app, cellId)` without nullish-checking.
 *
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @returns {string} The verified cellId from the JWT, or '(default)'.
 */
function getCallerCellId(request) {
  if (!request.auth) {
    return DEFAULT_CELL_ID;
  }
  return resolveCellId(request.auth.token.cellId);
}

module.exports = {
  getCallerTenantId,
  assertSameTenant,
  assertAuthenticated,
  getCallerRole,
  assertRole,
  getCallerCellId,
};
