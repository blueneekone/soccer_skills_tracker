/**
 * Operative Avatar — thin wrapper that routes rendering to the Bauhaus generator.
 *
 * Sprint 9.4: replaced DiceBear adventurer with the zero-dependency
 * bauhausAvatar generator. The public API surface (renderOperativeAvatarSvg,
 * parseOperativeAvatar, normalizeOperativeAvatarSeed, OPERATIVE_AVATAR_VERSION)
 * is unchanged so all call-sites continue to work without modification.
 */

import { renderBauhausAvatarSvg } from './bauhausAvatar.js';

export { renderBauhausAvatarSvg };

export const OPERATIVE_AVATAR_VERSION = 1;

/** Max Firestore-safe seed length. */
const MAX_SEED_LEN = 128;

/**
 * @param {unknown} seed
 * @returns {string}
 */
export function normalizeOperativeAvatarSeed(seed) {
	const s = String(seed ?? '')
		.trim()
		.slice(0, MAX_SEED_LEN);
	return s || 'operative';
}

/**
 * Client-rendered SVG string — never persisted as binary; only `seed` JSON is stored.
 *
 * @param {unknown} seed
 * @param {number} [size]
 * @returns {string}
 */
export function renderOperativeAvatarSvg(seed, size = 128) {
	return renderBauhausAvatarSvg(normalizeOperativeAvatarSeed(seed), size);
}

/**
 * @param {unknown} raw
 * @returns {{ v: number, seed: string } | null}
 */
export function parseOperativeAvatar(raw) {
	if (!raw || typeof raw !== 'object') return null;
	const o = /** @type {Record<string, unknown>} */ (raw);
	if (o.v !== OPERATIVE_AVATAR_VERSION) return null;
	if (typeof o.seed !== 'string') return null;
	return { v: OPERATIVE_AVATAR_VERSION, seed: normalizeOperativeAvatarSeed(o.seed) };
}
