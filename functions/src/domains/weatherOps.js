'use strict';

/**
 * weatherOps.js — Epic 5.4 field weather / lightning lock (scheduled evaluator).
 *
 * Default: no-op when WEATHER_LOCK_ENABLED !== 'true'.
 * With provider secret: evaluates club facilities and writes field_weather_status/{facilityId}.
 */

const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const EARTH_RADIUS_KM = 6371;

const db = () => admin.firestore();

/**
 * Haversine distance in km between two WGS84 points.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parseCoord(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve lat/lng from facility doc (supports latitude/longitude and lat/lng).
 * @param {FirebaseFirestore.DocumentData} data
 * @returns {{ lat: number, lng: number } | null}
 */
function resolveFacilityCoords(data) {
  const lat = parseCoord(data.latitude ?? data.lat);
  const lng = parseCoord(data.longitude ?? data.lng);
  if (lat == null || lng == null) return null;
  return {lat, lng};
}

/**
 * Stub provider — returns clear until Tomorrow.io integration is configured.
 * @param {{ lat: number, lng: number }} _coords
 * @returns {Promise<{ status: 'clear' | 'advisory' | 'locked', lockReason?: string, distanceKm?: number }>}
 */
async function evaluateWeatherStub(_coords) {
  return {status: 'clear'};
}

/**
 * @param {string} clubId
 * @param {string} facilityId
 * @param {{ lat: number, lng: number } | null} coords
 * @param {boolean} providerConfigured
 * @returns {Promise<void>}
 */
async function writeFacilityWeatherStatus(clubId, facilityId, coords, providerConfigured) {
  /** @type {{ status: 'clear' | 'advisory' | 'locked', lockReason?: string, distanceKm?: number }} */
  let evalResult = {status: 'clear'};
  if (coords) {
    evalResult = providerConfigured ?
      await evaluateWeatherStub(coords) :
      {status: 'clear', lockReason: 'Provider not configured'};
  } else {
    evalResult = {
      status: 'advisory',
      lockReason: 'Missing facility coordinates — add lat/lng in Field Ops vault',
    };
  }

  await db().collection('field_weather_status').doc(facilityId).set(
      {
        clubId,
        facilityId,
        status: evalResult.status,
        ...(evalResult.lockReason ? {lockReason: evalResult.lockReason} : {}),
        ...(evalResult.distanceKm != null ? {distanceKm: evalResult.distanceKm} : {}),
        provider: providerConfigured ? 'stub' : 'disabled',
        evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );
}

/**
 * @returns {Promise<{ clubs: number, facilities: number, locked: number }>}
 */
async function runWeatherLockPass() {
  const enabled = process.env.WEATHER_LOCK_ENABLED === 'true';
  if (!enabled) {
    logger.info('[evaluateFieldWeatherLock] disabled via WEATHER_LOCK_ENABLED');
    return {clubs: 0, facilities: 0, locked: 0};
  }

  const apiKey = process.env.TOMORROW_IO_API_KEY || '';
  const providerConfigured = Boolean(apiKey.trim());
  if (!providerConfigured) {
    logger.warn(
        '[evaluateFieldWeatherLock] TOMORROW_IO_API_KEY missing — writing clear/stub status only',
    );
  }

  const radiusKm = Number(process.env.WEATHER_LOCK_RADIUS_KM || '20');
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    logger.warn('[evaluateFieldWeatherLock] invalid WEATHER_LOCK_RADIUS_KM', {radiusKm});
  }

  let clubs = 0;
  let facilities = 0;
  let locked = 0;

  const clubsSnap = await db().collection('clubs').limit(500).get();
  for (const clubDoc of clubsSnap.docs) {
    clubs += 1;
    const facSnap = await clubDoc.ref.collection('facilities').get();
    for (const facDoc of facSnap.docs) {
      facilities += 1;
      const coords = resolveFacilityCoords(facDoc.data() || {});
      await writeFacilityWeatherStatus(
          clubDoc.id,
          facDoc.id,
          coords,
          providerConfigured,
      );
      const statusSnap = await db().collection('field_weather_status').doc(facDoc.id).get();
      if (statusSnap.exists && statusSnap.data()?.status === 'locked') {
        locked += 1;
      }
    }
  }

  return {clubs, facilities, locked};
}

exports.haversineKm = haversineKm;
exports.resolveFacilityCoords = resolveFacilityCoords;
exports.runWeatherLockPass = runWeatherLockPass;

exports.evaluateFieldWeatherLock = onSchedule(
    {
      schedule: 'every 15 minutes',
      region: REGION,
      timeoutSeconds: 300,
    },
    async () => {
      try {
        const result = await runWeatherLockPass();
        logger.info('[evaluateFieldWeatherLock] pass complete', result);
      } catch (err) {
        logger.error('[evaluateFieldWeatherLock] pass failed', {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    },
);
