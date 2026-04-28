import { createAvatar } from '@dicebear/core';
import { create as adventurerCreate, meta as adventurerMeta } from '@dicebear/adventurer';

/** @type {import('@dicebear/core').Style<{}>} */
const adventurerStyle = { create: adventurerCreate, meta: adventurerMeta };

export const OPERATIVE_AVATAR_VERSION = 1;

/** Max Firestore-safe seed length (no image blobs — deterministic SVG only). */
const MAX_SEED_LEN = 128;

/**
 * @param {unknown} seed
 */
export function normalizeOperativeAvatarSeed(seed) {
	const s = String(seed ?? '')
		.trim()
		.slice(0, MAX_SEED_LEN);
	return s || 'operative';
}

/**
 * Client-rendered SVG string — never persisted as binary; only `seed` JSON may be stored.
 *
 * @param {unknown} seed
 * @param {number} [size]
 */
export function renderOperativeAvatarSvg(seed, size = 128) {
	return createAvatar(adventurerStyle, {
		seed: normalizeOperativeAvatarSeed(seed),
		size,
	}).toString();
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
