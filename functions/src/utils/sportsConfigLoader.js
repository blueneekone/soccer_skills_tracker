/* eslint-disable quotes */
'use strict';

/**
 * sportsConfigLoader.js
 * ─────────────────────
 * Server-side Admin SDK cache for `sports_configs/{sportId}`.
 *
 * Module-level Map provides in-process memoisation between cold starts;
 * a lightweight version counter (`_cacheVersion`) lets the upsert callable
 * invalidate the cache via `bumpSportsConfigCacheVersion()` without a
 * process restart.
 *
 * All functions return plain JS objects (no Firestore DocumentSnapshot) so
 * callers don't have to deal with `.data()` — mirrors the SportsConfigDoc TS
 * shape from src/lib/types/sportsConfig.ts.
 */

const admin = require('firebase-admin');

/** @type {Map<string, { data: object; version: number }>} */
const _cache = new Map();
let _cacheVersion = 0;

/**
 * Increment the cache version, causing all subsequent reads to bypass the
 * cache and re-fetch from Firestore.  Called by `upsertSportsConfig` after a
 * successful write.
 */
function bumpSportsConfigCacheVersion() {
  _cacheVersion += 1;
}

exports.bumpSportsConfigCacheVersion = bumpSportsConfigCacheVersion;

/**
 * Load a single sport config by sportId.
 *
 * Returns `null` if the document does not exist or is archived.
 *
 * @param {string} sportId
 * @returns {Promise<object|null>}
 */
async function loadSportsConfig(sportId) {
  const cached = _cache.get(sportId);
  if (cached && cached.version === _cacheVersion) {
    return cached.data;
  }

  const db = admin.firestore();
  const snap = await db.collection('sports_configs').doc(sportId).get();
  if (!snap.exists) {
    _cache.delete(sportId);
    return null;
  }

  const data = snap.data();
  if (data.status === 'archived') {
    _cache.delete(sportId);
    return null;
  }

  _cache.set(sportId, {data, version: _cacheVersion});
  return data;
}

exports.loadSportsConfig = loadSportsConfig;

/**
 * Load all active sport configs.
 *
 * Results are cached under the key `__all__`; version-busted like individual
 * entries.
 *
 * @returns {Promise<object[]>}
 */
async function loadAllSportsConfigs() {
  const allKey = '__all__';
  const cached = _cache.get(allKey);
  if (cached && cached.version === _cacheVersion) {
    return /** @type {object[]} */ (cached.data);
  }

  const db = admin.firestore();
  const snap = await db
      .collection('sports_configs')
      .where('status', '==', 'active')
      .get();

  const configs = snap.docs.map((d) => d.data());
  _cache.set(allKey, {data: configs, version: _cacheVersion});
  return configs;
}

exports.loadAllSportsConfigs = loadAllSportsConfigs;
