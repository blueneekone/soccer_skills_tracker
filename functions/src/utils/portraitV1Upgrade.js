'use strict';

/**
 * Server-side v1 seed → v2 portrait upgrade (mirrors src/lib/avatars/portraitV1Upgrade.ts).
 * Sprint 3.5h — public recruit payloads never return `{ v: 1, seed }`.
 */

/** @type {ReadonlyArray<{ id: string, slot: 'face' | 'hair' | 'kit' }>} */
const PORTRAIT_CATALOG = Object.freeze([
  {id: 'portrait_face_default', slot: 'face'},
  {id: 'portrait_face_round', slot: 'face'},
  {id: 'portrait_face_angular', slot: 'face'},
  {id: 'portrait_hair_default', slot: 'hair'},
  {id: 'portrait_hair_crop', slot: 'hair'},
  {id: 'portrait_hair_long', slot: 'hair'},
  {id: 'portrait_kit_default', slot: 'kit'},
  {id: 'portrait_kit_home', slot: 'kit'},
  {id: 'portrait_kit_away', slot: 'kit'},
]);

const PORTRAIT_SLOTS = ['face', 'hair', 'kit'];

/** @param {string} str @returns {number} */
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** @param {'face' | 'hair' | 'kit'} slot @returns {string[]} */
function catalogIdsForSlot(slot) {
  return PORTRAIT_CATALOG.filter((row) => row.slot === slot).map((row) => row.id);
}

/** @param {string} seed @param {'face' | 'hair' | 'kit'} slot @returns {string | null} */
function pickCatalogPartForSlot(seed, slot) {
  const catalog = catalogIdsForSlot(slot);
  if (!catalog.length) return null;
  const idx = djb2(`${seed}::${slot}`) % catalog.length;
  return catalog[idx] ?? null;
}

/** @returns {{ v: 2, parts: Record<string, string | null> }} */
function defaultPortraitV2() {
  return {
    v: 2,
    parts: {
      face: 'portrait_face_default',
      hair: 'portrait_hair_default',
      kit: 'portrait_kit_default',
    },
  };
}

/**
 * @param {string} seed
 * @returns {{ v: 2, parts: Record<string, string | null> }}
 */
function upgradeV1SeedToPortraitV2(seed) {
  const normalizedSeed = String(seed ?? '').trim() || 'operative';
  /** @type {Record<string, string | null>} */
  const parts = {};

  for (const slot of PORTRAIT_SLOTS) {
    const picked = pickCatalogPartForSlot(normalizedSeed, slot);
    if (picked) parts[slot] = picked;
  }

  const hasAnyPart = Object.values(parts).some((v) => typeof v === 'string' && v);
  if (!hasAnyPart) return defaultPortraitV2();

  return {v: 2, parts};
}

/**
 * Normalize Firestore operativeAvatar for public clients — always v2.
 *
 * @param {unknown} rawOa
 * @returns {{ v: 2, parts: Record<string, string | null> } | null}
 */
function resolvePublicOperativeAvatarV2(rawOa) {
  if (!rawOa || typeof rawOa !== 'object') return null;

  if (
    rawOa.v === 2 &&
    rawOa.parts &&
    typeof rawOa.parts === 'object' &&
    !Array.isArray(rawOa.parts)
  ) {
    /** @type {Record<string, string | null>} */
    const parts = {};
    for (const slot of PORTRAIT_SLOTS) {
      const val = rawOa.parts[slot];
      if (typeof val === 'string' && val.trim()) {
        parts[slot] = String(val).trim().slice(0, 64);
      } else if (val === null) {
        parts[slot] = null;
      }
    }
    return {v: 2, parts};
  }

  if (rawOa.v === 1 && typeof rawOa.seed === 'string' && rawOa.seed.trim()) {
    return upgradeV1SeedToPortraitV2(String(rawOa.seed).trim().slice(0, 128));
  }

  return null;
}

module.exports = {
  upgradeV1SeedToPortraitV2,
  resolvePublicOperativeAvatarV2,
};
