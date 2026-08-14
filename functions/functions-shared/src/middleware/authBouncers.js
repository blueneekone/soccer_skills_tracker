'use strict';

/**
 * functions/src/middleware/authBouncers.js
 * ─────────────────────────────────────────
 * Core role-verification utilities for Cloud Functions callable handlers.
 * Every exported function throws firebase-functions/v2/https `HttpsError` with
 * the original error codes and messages from index.js — consumers must not
 * catch and suppress these; they propagate directly to the client.
 *
 * Extracted verbatim from index.js — functions/src/** domain modules
 * and future domain slices should import from here.
 *
 * External dependencies:
 *   firebase-functions/v2/https — HttpsError
 *   firebase-admin              — Firestore db singleton
 *   ../utils/formatters         — normEmail
 */

const {HttpsError}  = require('firebase-functions/v2/https');
const admin         = require('firebase-admin');
const {normEmail}   = require('../utils/formatters');

// Lazy accessor — defers Firestore init until first handler invocation so this
// module can be required without admin.initializeApp() having been called yet
// (matches the pattern used by compliance.js, coppa.js, etc.).
const db = () => admin.firestore();

// ── Internal constant ─────────────────────────────────────────────────────────

const READONLY_SUBSCRIPTION_MSG =
    'Subscription inactive. Account is in read-only mode.';

// ── Bouncer implementations ───────────────────────────────────────────────────

/**
 * @param {any} request Callable request
 * @return {Object} Actor with role, clubId, email
 */
function assertDirectorOrSuper(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  if (role !== 'super_admin' && role !== 'director') {
    throw new HttpsError(
        'permission-denied',
        'Only directors and application admins may perform this action.',
    );
  }
  return {
    role,
    clubId: request.auth.token.clubId || null,
    email: request.auth.token.email,
  };
}

/**
 * Epic 9: block mutating callables when subscription is not active (past_due /
 * canceled). Legacy: missing entitlement doc or empty subscription_status
 * still allowed. super_admin bypass.
 * @param {string} clubId
 * @param {any} request Callable request
 * @return {Promise<void>}
 */
async function assertClubSubscriptionWritable(clubId, request) {
  if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
    return;
  }
  if (request.auth && request.auth.token.role === 'super_admin') {
    return;
  }
  const snap =
      await db().collection('license_entitlements').doc(clubId.trim()).get();
  if (!snap.exists) {
    return;
  }
  const d = snap.data() || {};
  if (d.billing_exempt === true || d.grandfathered === true) {
    return;
  }
  const raw = d.subscription_status;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return;
  }
  if (String(raw).toLowerCase() === 'active') {
    return;
  }
  throw new HttpsError('permission-denied', READONLY_SUBSCRIPTION_MSG);
}

/**
 * Strict super_admin only (licensing, sport modules, etc.).
 * @param {any} request Callable request
 * @return {{ email: string }}
 */
function assertSuperAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.role !== 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Only application super admins may perform this action.',
    );
  }
  return {email: normEmail(request.auth.token.email) || 'unknown'};
}

/**
 * Coach / director / registrar / super_admin: may add roster rows for teamId.
 * @param {any} request Callable request
 * @param {string} teamId Team document id
 * @return {Promise<{clubId: string}>}
 */
async function assertCanSecureAddPlayer(request, teamId) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }
  const role = request.auth.token.role || 'player';
  const tokenClub = request.auth.token.clubId || null;
  const tokenTeam = request.auth.token.teamId || null;
  const tid = teamId.trim();
  const teamSnap = await db().collection('teams').doc(tid).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const clubIdRaw = teamSnap.data().clubId;
  const clubId =
      typeof clubIdRaw === 'string' && clubIdRaw.trim() ?
        clubIdRaw.trim() :
        '';
  if (!clubId) {
    throw new HttpsError('failed-precondition', 'Team has no club scope.');
  }
  if (role === 'super_admin') {
    return {clubId};
  }
  if (role === 'director' && tokenClub && tokenClub === clubId) {
    return {clubId};
  }
  if (role === 'registrar' && tokenClub && tokenClub === clubId) {
    return {clubId};
  }
  if (role === 'coach' && tokenTeam === tid) {
    return {clubId};
  }
  throw new HttpsError(
      'permission-denied',
      'Only club staff assigned to this team may add players.',
  );
}

/**
 * @param {any} request Callable request
 * @return {{ email: string, householdId: string }}
 */
function assertParent(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.role !== 'parent') {
    throw new HttpsError(
        'permission-denied',
        'Only parent accounts may use this action.',
    );
  }
  const email = normEmail(request.auth.token.email);
  const householdId =
    typeof request.auth.token.householdId === 'string' ?
      request.auth.token.householdId.trim() :
      '';
  if (!email || !householdId) {
    throw new HttpsError(
        'failed-precondition',
        'Your account must be linked to a household. ' +
        'Ask your director to connect parent and player emails.',
    );
  }
  return {email, householdId};
}

/**
 * Parent actor with householdId from Firestore users/{email} when present.
 * JWT `householdId` can lag after waiver sign, household graph updates, or
 * failed claim fast-paths — the household page reads Firestore, so callables
 * must match.
 * @param {any} request Callable request
 * @return {Promise<{ email: string, householdId: string }>}
 */
async function assertParentAsync(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.role !== 'parent') {
    throw new HttpsError(
        'permission-denied',
        'Only parent accounts may use this action.',
    );
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('invalid-argument', 'No email on session.');
  }
  const jwtHid =
    typeof request.auth.token.householdId === 'string' ?
      request.auth.token.householdId.trim() :
      '';
  let docHid = '';
  try {
    const pSnap = await db().collection('users').doc(email).get();
    if (pSnap.exists) {
      const raw = pSnap.data()?.householdId;
      docHid = typeof raw === 'string' ? raw.trim() : '';
    }
  } catch {
    /* fall through to JWT */
  }
  const householdId = docHid || jwtHid;
  if (!householdId) {
    throw new HttpsError(
        'failed-precondition',
        'Your account must be linked to a household. ' +
        'Ask your director to connect parent and player emails.',
    );
  }
  return {email, householdId};
}

/**
 * Assert caller is club staff for roster transfers.
 * @param {any} request Callable request
 * @return {Object} Actor with role, clubId, email
 */
function assertClubStaff(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const clubId = request.auth.token.clubId || null;
  if (role === 'super_admin') {
    return {role, clubId, email: request.auth.token.email};
  }
  if (role === 'director' || role === 'registrar') {
    if (!clubId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing club scope; sign out and back in.',
      );
    }
    return {role, clubId, email: request.auth.token.email};
  }
  throw new HttpsError(
      'permission-denied',
      'Only club staff may perform this action.',
  );
}

/**
 * Coach / director / super_admin — allowed to send guarded athlete messages.
 * @param {any} request Callable request
 * @return {Object} Actor with role, teamId, clubId, email.
 */
function assertCoachMessageSender(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const email = normEmail(request.auth.token.email);
  const teamId = request.auth.token.teamId || null;
  const clubId = request.auth.token.clubId || null;
  if (role === 'super_admin') {
    return {role, teamId, clubId, email};
  }
  if (role === 'director') {
    if (!clubId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing club scope; sign out and back in.',
      );
    }
    return {role, teamId, clubId, email};
  }
  if (role === 'coach') {
    if (!teamId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing team scope; sign out and back in.',
      );
    }
    return {role, teamId, clubId, email};
  }
  throw new HttpsError(
      'permission-denied',
      'Only coaches, directors, or admins may send staff messages.',
  );
}

/**
 * Coach / director / super_admin access to a team doc (tactics, AI, etc.).
 * @param {Object} actor assertCoachMessageSender result
 * @param {string} teamId
 * @param {Object} tSnap teams/{teamId} doc snapshot
 */
function assertActorCanAccessTeam(actor, teamId, tSnap) {
  if (!tSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const teamClubId =
      typeof tSnap.data().clubId === 'string' ?
        tSnap.data().clubId.trim() :
        null;
  if (actor.role === 'super_admin') {
    return;
  }
  if (actor.role === 'coach') {
    if (!actor.teamId || actor.teamId !== teamId) {
      throw new HttpsError(
          'permission-denied',
          'You can only access your assigned team.',
      );
    }
    return;
  }
  if (actor.role === 'director') {
    if (!actor.clubId || !teamClubId || teamClubId !== actor.clubId) {
      throw new HttpsError(
          'permission-denied',
          'Team is not in your club.',
      );
    }
    return;
  }
  throw new HttpsError('permission-denied', 'Not allowed.');
}

/**
 * Sprint 3.3: authenticated player only (JWT role).
 * @param {any} request Callable request
 * @return {string} Normalized users/{emailKey} document id
 */
function assertPlayer(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  if (role !== 'player') {
    throw new HttpsError(
        'permission-denied',
        'Only player accounts may perform this action.',
    );
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError(
        'failed-precondition',
        'A verified email is required.',
    );
  }
  return email;
}

/**
 * Director must operate only on their token club
 * (super_admin may pass any club).
 * @param {any} request
 * @param {string} clubId
 * @return {{role: string, clubId: ?string, email: ?string}}
 */
function assertDirectorClubOrSuper(request, clubId) {
  const actor = assertDirectorOrSuper(request);
  if (actor.role === 'super_admin') {
    return actor;
  }
  if (!clubId || actor.clubId !== clubId) {
    throw new HttpsError(
        'permission-denied',
        'You can only manage resources for your own club.',
    );
  }
  return actor;
}

/**
 * Director, registrar, or super_admin for club branding persistence.
 * @param {any} request
 * @param {string} clubId
 * @return {{role: string, clubId: ?string, email: ?string}}
 */
function assertClubStaffOrSuper(request, clubId) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const tokenClub = request.auth.token.clubId || null;
  if (role === 'super_admin') {
    return {
      role,
      clubId: tokenClub,
      email: normEmail(request.auth.token.email),
    };
  }
  if (role !== 'director' && role !== 'registrar') {
    throw new HttpsError(
        'permission-denied',
        'Only directors or registrars may update club branding.',
    );
  }
  if (!clubId || !tokenClub || tokenClub !== clubId) {
    throw new HttpsError(
        'permission-denied',
        'You can only manage branding for your own club.',
    );
  }
  return {
    role,
    clubId: tokenClub,
    email: normEmail(request.auth.token.email),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  assertDirectorOrSuper,
  assertClubSubscriptionWritable,
  assertSuperAdmin,
  assertCanSecureAddPlayer,
  assertParent,
  assertParentAsync,
  assertClubStaff,
  assertCoachMessageSender,
  assertActorCanAccessTeam,
  assertPlayer,
  assertDirectorClubOrSuper,
  assertClubStaffOrSuper,
};
