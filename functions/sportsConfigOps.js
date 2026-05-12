/* eslint-disable quotes */
'use strict';

/**
 * sportsConfigOps.js
 * ──────────────────
 * Phase 3, Epic 4 — Sports_Configs Dynamic Trees.
 *
 * Three super_admin callables for managing `sports_configs/{sportId}`:
 *
 *   upsertSportsConfig  — create or update; auto-bumps schemaVersion on
 *                         structural changes (attribute IDs or playerStatKey values).
 *   listSportsConfigs   — returns all docs; optionally includes archived.
 *   archiveSportsConfig — soft-delete: sets status → 'archived'. No hard delete.
 *
 * All writes go through Admin SDK (bypasses client-side rules) and call
 * bumpSportsConfigCacheVersion() to invalidate the server-side loader cache.
 */

const admin = require('firebase-admin');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {
  bumpSportsConfigCacheVersion,
} = require('./src/utils/sportsConfigLoader');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate a single attribute entry.
 * @param {unknown} attr
 * @param {number} idx
 */
function validateAttribute(attr, idx) {
  if (!attr || typeof attr !== 'object') {
    throw new HttpsError('invalid-argument', `attributes[${idx}] must be an object.`);
  }
  const a = /** @type {Record<string,unknown>} */ (attr);
  const required = ['id', 'name', 'shortLabel', 'hexColor', 'playerStatKey'];
  for (const field of required) {
    if (typeof a[field] !== 'string' || !a[field]) {
      throw new HttpsError(
          'invalid-argument',
          `attributes[${idx}].${field} must be a non-empty string.`,
      );
    }
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(/** @type {string} */ (a.hexColor))) {
    throw new HttpsError(
        'invalid-argument',
        `attributes[${idx}].hexColor must be a 6-digit hex colour (e.g. #ff0055).`,
    );
  }
}

/**
 * Validate the full input payload for upsertSportsConfig.
 * @param {unknown} data
 */
function validateUpsertInput(data) {
  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Request body must be an object.');
  }
  const d = /** @type {Record<string,unknown>} */ (data);

  if (typeof d.sportId !== 'string' || !/^[a-z_]{2,32}$/.test(d.sportId)) {
    throw new HttpsError('invalid-argument', 'sportId must be 2-32 lowercase snake_case chars.');
  }
  if (typeof d.displayName !== 'string' || !d.displayName.trim()) {
    throw new HttpsError('invalid-argument', 'displayName must be a non-empty string.');
  }
  if (!Array.isArray(d.attributes) || d.attributes.length !== 6) {
    throw new HttpsError('invalid-argument', 'attributes must be an array of exactly 6 entries.');
  }
  d.attributes.forEach((a, i) => validateAttribute(a, i));

  const palette = d.palette;
  if (!palette || typeof palette !== 'object') {
    throw new HttpsError('invalid-argument', 'palette must be an object with fg/glow/ring.');
  }
  const p = /** @type {Record<string,unknown>} */ (palette);
  for (const field of ['fg', 'glow', 'ring']) {
    if (typeof p[field] !== 'string' || !p[field]) {
      throw new HttpsError('invalid-argument', `palette.${field} must be a non-empty string.`);
    }
  }

  if (typeof d.iconClass !== 'string' || !d.iconClass) {
    throw new HttpsError('invalid-argument', 'iconClass must be a non-empty string.');
  }
  if (!Array.isArray(d.aliases)) {
    throw new HttpsError('invalid-argument', 'aliases must be an array of strings.');
  }

  const proj = d.rpgProjection;
  if (!proj || typeof proj !== 'object') {
    throw new HttpsError('invalid-argument', 'rpgProjection must be an object.');
  }
  const projSlots = ['ball_mastery', 'striking', 'pace', 'scanning', 'grit'];
  for (const slot of projSlots) {
    const v = /** @type {Record<string,unknown>} */ (proj)[slot];
    if (!Array.isArray(v) || v.length === 0) {
      throw new HttpsError(
          'invalid-argument',
          `rpgProjection.${slot} must be a non-empty array of playerStatKey strings.`,
      );
    }
  }
}

/**
 * Determine whether a structural change occurred between the existing doc and
 * the incoming payload.  Returns true iff a schemaVersion bump is needed.
 *
 * Structural = change to attribute IDs or playerStatKey values.
 * Display-only changes (name, shortLabel, hexColor, palette, iconClass) do NOT bump.
 *
 * @param {object|null} existing  current Firestore doc data (or null for new doc)
 * @param {Record<string,unknown>} incoming
 * @returns {boolean}
 */
function isStructuralChange(existing, incoming) {
  if (!existing) return false; // new doc: schemaVersion starts at 1, no bump needed

  const oldAttrs = /** @type {Array<{id:string;playerStatKey:string}>} */ (
    existing.attributes || []
  );
  const newAttrs = /** @type {Array<{id:string;playerStatKey:string}>} */ (
    incoming.attributes || []
  );

  if (oldAttrs.length !== newAttrs.length) return true;

  for (let i = 0; i < oldAttrs.length; i++) {
    if (
      oldAttrs[i].id !== newAttrs[i].id ||
      oldAttrs[i].playerStatKey !== newAttrs[i].playerStatKey
    ) {
      return true;
    }
  }
  return false;
}

// ── Callables ─────────────────────────────────────────────────────────────────

/**
 * `upsertSportsConfig` onCall (super_admin / global_admin)
 *
 * Creates or updates a sport config document.  Auto-increments schemaVersion
 * when attribute IDs or playerStatKey values change; display-only edits leave
 * schemaVersion unchanged.
 */
exports.upsertSportsConfig = onCall(async (request) => {
  const role = request.auth?.token?.role;
  if (role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'super_admin or global_admin role required.');
  }

  const data = request.data;
  validateUpsertInput(data);

  const sportId = data.sportId;
  const db = admin.firestore();
  const ref = db.collection('sports_configs').doc(sportId);

  const existingSnap = await ref.get();
  const existing = existingSnap.exists ? existingSnap.data() : null;

  const schemaBumped = isStructuralChange(existing, data);
  const newSchemaVersion = existing ?
    (schemaBumped ? (existing.schemaVersion || 1) + 1 : (existing.schemaVersion || 1)) :
    1;

  const payload = {
    sportId,
    displayName: data.displayName,
    schemaVersion: newSchemaVersion,
    status: data.status || existing?.status || 'active',
    attributes: data.attributes,
    palette: data.palette,
    iconClass: data.iconClass,
    aliases: data.aliases,
    rpgProjection: data.rpgProjection,
    updatedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!existing) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await ref.set(payload, {merge: true});
  bumpSportsConfigCacheVersion();

  return {sportId, schemaVersion: newSchemaVersion, schemaBumped};
});

/**
 * `listSportsConfigs` onCall (super_admin / global_admin)
 *
 * Returns all sport config documents; includes archived when
 * `includeArchived: true` is passed.
 */
exports.listSportsConfigs = onCall(async (request) => {
  const role = request.auth?.token?.role;
  if (role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'super_admin or global_admin role required.');
  }

  const includeArchived = Boolean(request.data?.includeArchived);
  const db = admin.firestore();

  let query = db.collection('sports_configs').orderBy('displayName');
  if (!includeArchived) {
    query = db
        .collection('sports_configs')
        .where('status', 'in', ['active', 'draft'])
        .orderBy('displayName');
  }

  const snap = await query.get();
  const configs = snap.docs.map((d) => ({id: d.id, ...d.data()}));
  return {configs};
});

/**
 * `archiveSportsConfig` onCall (super_admin / global_admin)
 *
 * Soft-deletes a sport config by setting status → 'archived'.
 * Hard delete is blocked at the Firestore rules layer.
 */
exports.archiveSportsConfig = onCall(async (request) => {
  const role = request.auth?.token?.role;
  if (role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'super_admin or global_admin role required.');
  }

  const sportId = request.data?.sportId;
  if (typeof sportId !== 'string' || !sportId) {
    throw new HttpsError('invalid-argument', 'sportId must be a non-empty string.');
  }

  const db = admin.firestore();
  const ref = db.collection('sports_configs').doc(sportId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', `sports_configs/${sportId} does not exist.`);
  }

  await ref.update({
    status: 'archived',
    updatedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  bumpSportsConfigCacheVersion();

  return {sportId, status: 'archived'};
});
