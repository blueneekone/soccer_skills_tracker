'use strict';

/**
 * weather.js — AEGIS Weather & Safety Protocol (onCall proxy).
 * Evaluation logic lives in weatherEvaluation.js (shared with scheduled field lock).
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {evaluateWeatherAtCoords} = require('./src/domains/weatherEvaluation');

const REGION = 'us-east1';

exports.getWeatherConditions = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerRole = request.auth.token.role || '';
  const allowedRoles = ['coach', 'director', 'global_admin', 'super_admin'];
  if (!allowedRoles.includes(callerRole)) {
    throw new HttpsError(
        'permission-denied',
        'Weather monitoring is restricted to coaches and directors.',
    );
  }

  const lat = typeof request.data?.lat === 'number' ? request.data.lat : null;
  const lng = typeof request.data?.lng === 'number' ? request.data.lng : null;
  if (lat === null || lng === null || !isFinite(lat) || !isFinite(lng)) {
    throw new HttpsError('invalid-argument', 'Valid lat and lng are required.');
  }

  return evaluateWeatherAtCoords(lat, lng);
});
