'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const db = () => admin.firestore();

/** @type {Record<string, boolean>} */
const DEFAULT_MATRIX = {
  requireWaiver: true,
  requirePassportVerified: true,
  requireVpcForMinors: true,
  requireGuardianLinked: false,
  requireSafeSportClearance: true,
};

const MATRIX_KEYS = Object.keys(DEFAULT_MATRIX);

/**
 * @param {Record<string, unknown> | undefined | null} raw
 * @return {Record<string, boolean>}
 */
function normalizeMatrix(raw) {
  /** @type {Record<string, boolean>} */
  const out = {...DEFAULT_MATRIX};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of MATRIX_KEYS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key];
  }
  return out;
}

/**
 * Director/registrar: save org-configurable eligibility requirements.
 */
exports.upsertClubEligibilityMatrix = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tokenClub =
    typeof request.auth.token.clubId === 'string' ?
      request.auth.token.clubId.trim() :
      '';
  const allowed = ['director', 'registrar', 'super_admin', 'global_admin'].includes(role);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Director or registrar access required.');
  }

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }

  if (role === 'director' || role === 'registrar') {
    if (!tokenClub || tokenClub !== clubId) {
      throw new HttpsError('permission-denied', 'Matrix must belong to your club.');
    }
  }

  const clubRef = db().collection('clubs').doc(clubId);
  const clubSnap = await clubRef.get();
  if (!clubSnap.exists) {
    throw new HttpsError('not-found', 'Club not found.');
  }

  const matrix = normalizeMatrix(data.matrix);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await clubRef.set({
    eligibilityMatrix: {
      ...matrix,
      updatedAt: now,
      updatedBy: request.auth.uid,
    },
    updatedAt: now,
  }, {merge: true});

  return {ok: true, clubId, matrix};
});

/**
 * Staff: read club eligibility matrix (defaults when unset).
 */
exports.getClubEligibilityMatrix = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const tokenClub =
    typeof request.auth.token.clubId === 'string' ?
      request.auth.token.clubId.trim() :
      '';
  const allowed = [
    'director', 'registrar', 'coach', 'super_admin', 'global_admin',
  ].includes(role);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Staff access required.');
  }

  const clubId =
    typeof request.data?.clubId === 'string' ? request.data.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }

  if (role === 'director' || role === 'registrar' || role === 'coach') {
    if (!tokenClub || tokenClub !== clubId) {
      throw new HttpsError('permission-denied', 'Matrix must belong to your club.');
    }
  }

  const snap = await db().collection('clubs').doc(clubId).get();
  if (!snap.exists) {
    return {ok: true, clubId, matrix: DEFAULT_MATRIX, isDefault: true};
  }

  const raw = snap.data()?.eligibilityMatrix;
  return {
    ok: true,
    clubId,
    matrix: normalizeMatrix(raw),
    isDefault: !raw,
  };
});

exports.DEFAULT_ELIGIBILITY_MATRIX = DEFAULT_MATRIX;
exports.normalizeEligibilityMatrix = normalizeMatrix;
