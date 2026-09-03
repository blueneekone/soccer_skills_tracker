const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {getRegistryDb} = require('../../cellRouter');
const {normEmail} = require('../utils/formatters');

const REGION = 'us-east1';
const db = () => getRegistryDb();

exports.directorUpsertField = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const fieldId =
      typeof data.fieldId === 'string' ? data.fieldId.trim().slice(0, 128) : '';
  const clubId =
      typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 128) : '';
  const name =
      typeof data.name === 'string' ? data.name.trim().slice(0, 200) : '';
  const location =
      typeof data.location === 'string' ?
        data.location.trim().slice(0, 500) :
        '';
  const statusRaw =
      typeof data.status === 'string' ?
        data.status.trim().toLowerCase() :
        '';
  const status =
      statusRaw === 'maintenance' || statusRaw === 'closed' ?
        statusRaw :
        'active';

  if (!fieldId || !clubId || !name) {
    throw new HttpsError(
        'invalid-argument',
        'fieldId, clubId, and name are required.',
    );
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role;
  const tokenClub = request.auth.token.clubId || null;
  if (role !== 'super_admin') {
    if (role !== 'director' && role !== 'registrar') {
      throw new HttpsError(
          'permission-denied',
          'Only club staff may manage fields.',
      );
    }
    if (!tokenClub || tokenClub !== clubId) {
      throw new HttpsError('permission-denied', 'Club mismatch.');
    }
  }

  await db().collection('fields').doc(fieldId).set(
      {
        clubId,
        name,
        location: location || '',
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: normEmail(request.auth.token.email) || 'unknown',
      },
      {merge: true},
  );
  return {ok: true};
});

exports.geocodeAddress = onCall({region: REGION, enforceAppCheck: false}, async (request) => {
  const data = request.data || {};
  const address = typeof data.address === 'string' ? data.address.trim() : '';

  if (!address) {
    throw new HttpsError('invalid-argument', 'Address is required.');
  }

  const rawHeader = request.rawRequest.headers['x-firebase-appcheck'];
  if (!rawHeader) {
    throw new HttpsError('unauthenticated', 'App Check token is required.');
  }

  try {
    await admin.appCheck().verifyToken(rawHeader);
  } catch (err) {
    throw new HttpsError('unauthenticated', 'Invalid App Check token.');
  }

  const { geocodeViaGoogleMaps } = require('../utils/mapsHelper');
  try {
    const result = await geocodeViaGoogleMaps(address);
    return { ok: true, result };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Geocoding failed.');
  }
});
