'use strict';
/**
 * drillCandidates.js
 * ──────────────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S3)
 *
 * Enumerates candidate drills from `global_drills` for a given sport + ageBand
 * and embeds each drill into a 12-dimensional vector that the Q-network ingests
 * alongside the state vector.
 *
 * Embedding layout (12 floats):
 *   [0-5]  onehot attribute index (6 canonical sport attributes)
 *   [6-8]  onehot tier (beginner, intermediate, advanced)
 *   [9]    baseXpNorm  (baseXp / 500, capped at 1.0)
 *   [10]   gritBonusNorm (gritBonus / 100, capped at 1.0)
 *   [11]   isTacticalSvg  (1 if mediaType === 'tactical_svg')
 */

const admin = require('firebase-admin');

/** @returns {import('firebase-admin').firestore.Firestore} */
const db = () => admin.firestore();

const TIER_ORDER = ['beginner', 'intermediate', 'advanced'];
const TIER_IDX = Object.fromEntries(TIER_ORDER.map((t, i) => [t, i]));

const clamp01 = (v) => Math.min(1, Math.max(0, isNaN(v) ? 0 : v));

/**
 * @typedef {'under13'|'teen13to16'|'adult'} AgeBand
 */

/**
 * Determine which tiers are allowed for a given age band.
 * @param {AgeBand} ageBand
 * @returns {Set<string>}
 */
function allowedTiers(ageBand) {
  if (ageBand === 'under13') return new Set(['beginner']);
  if (ageBand === 'teen13to16') return new Set(['beginner', 'intermediate']);
  return new Set(['beginner', 'intermediate', 'advanced']);
}

/**
 * Attribute ID → onehot slot index.
 * Built dynamically from the drills collection so it works with any sport config.
 * For the embedding we use a stable sorted list of attributeIds seen in the result.
 *
 * @param {string[]} attrIds  canonical ordered attribute IDs for the sport
 * @param {string}   attrId
 * @returns {number[]} 6-element onehot (padded with zeros if attr not in list)
 */
function attrOnehot(attrIds, attrId) {
  const hot = Array(6).fill(0);
  const idx = attrIds.indexOf(attrId);
  if (idx >= 0 && idx < 6) hot[idx] = 1;
  return hot;
}

/**
 * Tier → 3-element onehot.
 * @param {string} tier
 */
function tierOnehot(tier) {
  const hot = [0, 0, 0];
  const idx = TIER_IDX[tier.toLowerCase()];
  if (idx !== undefined) hot[idx] = 1;
  return hot;
}

/**
 * Enumerate candidate drills from `global_drills` and embed them.
 *
 * @param {string}   sportId       Canonical sport ID (e.g. 'soccer').
 * @param {AgeBand}  ageBand       Age band for tier hard-filter.
 * @param {boolean}  recoveryMode  When true, limit to physical/grit recovery drills.
 * @returns {Promise<Array<{ drillId: string; embedding: number[]; tier: string; attributeId: string }>>}
 */
async function enumerateCandidates(sportId, ageBand, recoveryMode) {
  const tiers = allowedTiers(ageBand);

  // Fetch drills for the sport (Firestore index: sportId + tier composite).
  // We fetch all allowed tiers and filter client-side for flexibility.
  const snap = await db()
      .collection('global_drills')
      .where('sportId', '==', sportId)
      .limit(500)
      .get();

  const allDrills = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Hard filters
  let filtered = allDrills.filter((drill) => {
    const tier = String(drill.tier ?? 'beginner').toLowerCase();
    if (!tiers.has(tier)) return false;
    if (recoveryMode) {
      // In recovery mode: only physical or grit attribute drills are allowed.
      const attr = String(drill.attributeId ?? '').toLowerCase();
      return attr === 'physical' || attr === 'grit';
    }
    return true;
  });

  if (filtered.length === 0) {
    // Fallback: if recoveryMode emptied the list, relax the attribute filter
    // but still enforce age-appropriate tier.
    filtered = allDrills.filter((drill) => {
      const tier = String(drill.tier ?? 'beginner').toLowerCase();
      return tiers.has(tier);
    });
  }

  // Build ordered attribute list from the filtered set (stable sort)
  const attrSet = new Set(filtered.map((d) => String(d.attributeId ?? '')));
  const attrIds = [...attrSet].sort().slice(0, 6);

  // Embed each drill
  const candidates = filtered.map((drill) => {
    const tier = String(drill.tier ?? 'beginner').toLowerCase();
    const attributeId = String(drill.attributeId ?? '');
    const baseXpNorm = clamp01((drill.gamification?.baseXp ?? 0) / 500);
    const gritBonusNorm = clamp01((drill.gamification?.gritBonus ?? 0) / 100);
    const isTacticalSvg = drill.mediaType === 'tactical_svg' ? 1 : 0;

    const embedding = [
      ...attrOnehot(attrIds, attributeId),  // [0-5]
      ...tierOnehot(tier),                   // [6-8]
      baseXpNorm,                            // [9]
      gritBonusNorm,                         // [10]
      isTacticalSvg,                         // [11]
    ];

    return {
      drillId: drill.id,
      embedding,
      tier,
      attributeId,
    };
  });

  return candidates;
}

module.exports = { enumerateCandidates, allowedTiers };
