'use strict';

/**
 * weatherOps.js — Epic 5.4 field weather / lightning lock (scheduled evaluator).
 *
 * Default: no-op when WEATHER_LOCK_ENABLED !== 'true'.
 * When enabled: evaluates club facilities via AEGIS (Open-Meteo + NWS) and writes
 * field_weather_status/{facilityId}. Optional TOMORROW_IO_API_KEY reserved for
 * future strike-radius enrichment.
 */

const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {
  evaluateWeatherAtCoords,
  mapSnapshotToFieldStatus,
} = require('./weatherEvaluation');

const REGION = 'us-east1';
const EARTH_RADIUS_KM = 6371;

const db = () => admin.firestore();

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function parseCoord(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveFacilityCoords(data) {
  const lat = parseCoord(data.latitude ?? data.lat);
  const lng = parseCoord(data.longitude ?? data.lng);
  if (lat == null || lng == null) return null;
  return {lat, lng};
}

async function evaluateWeatherForFacility(coords) {
  try {
    const snapshot = await evaluateWeatherAtCoords(coords.lat, coords.lng);
    return mapSnapshotToFieldStatus(snapshot);
  } catch (err) {
    logger.warn('[evaluateFieldWeatherLock] provider evaluation failed', {
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      status: 'advisory',
      lockReason: 'Weather provider unreachable — verify manually before deploying',
      provider: 'aegis',
    };
  }
}

async function writeFacilityWeatherStatus(clubId, facilityId, coords) {
  let evalResult;
  if (coords) {
    evalResult = await evaluateWeatherForFacility(coords);
  } else {
    evalResult = {
      status: 'advisory',
      lockReason: 'Missing facility coordinates — add lat/lng in Field Ops vault',
      provider: 'aegis',
    };
  }

  await db().collection('field_weather_status').doc(facilityId).set(
      {
        clubId,
        facilityId,
        status: evalResult.status,
        ...(evalResult.lockReason ? {lockReason: evalResult.lockReason} : {}),
        ...(evalResult.distanceKm != null ? {distanceKm: evalResult.distanceKm} : {}),
        provider: evalResult.provider,
        evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  return evalResult.status;
}

async function runWeatherLockPass() {
  const enabled = process.env.WEATHER_LOCK_ENABLED === 'true';
  if (!enabled) {
    logger.info('[evaluateFieldWeatherLock] disabled via WEATHER_LOCK_ENABLED');
    return {clubs: 0, facilities: 0, locked: 0, advisory: 0};
  }

  const tomorrowKey = (process.env.TOMORROW_IO_API_KEY || '').trim();
  if (tomorrowKey) {
    logger.info(
        '[evaluateFieldWeatherLock] TOMORROW_IO_API_KEY set — AEGIS active; Tomorrow.io radius enrich pending',
    );
  }

  const radiusKm = Number(process.env.WEATHER_LOCK_RADIUS_KM || '20');
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    logger.warn('[evaluateFieldWeatherLock] invalid WEATHER_LOCK_RADIUS_KM', {radiusKm});
  }

  let clubs = 0;
  let facilities = 0;
  let locked = 0;
  let advisory = 0;

  const clubsSnap = await db().collection('clubs').limit(500).get();
  for (const clubDoc of clubsSnap.docs) {
    clubs += 1;
    const facSnap = await clubDoc.ref.collection('facilities').get();
    for (const facDoc of facSnap.docs) {
      facilities += 1;
      const coords = resolveFacilityCoords(facDoc.data() || {});
      const status = await writeFacilityWeatherStatus(
          clubDoc.id,
          facDoc.id,
          coords,
      );
      if (status === 'locked') locked += 1;
      if (status === 'advisory') advisory += 1;
    }
  }

  return {clubs, facilities, locked, advisory};
}

exports.haversineKm = haversineKm;
exports.resolveFacilityCoords = resolveFacilityCoords;
exports.runWeatherLockPass = runWeatherLockPass;
exports.evaluateWeatherForFacility = evaluateWeatherForFacility;

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
