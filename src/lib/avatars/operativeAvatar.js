/**
 * Operative Avatar — routes rendering to Bauhaus (v1) or layered portrait (v2).
 *
 * Sprint 9.4: replaced DiceBear adventurer with the zero-dependency
 * bauhausAvatar generator. Sprint 3.5a: v2 layered SVG from catalog part ids.
 *
 * Public API: renderOperativeAvatarSvg, parseOperativeAvatar, parseOperativePortrait,
 * normalizeOperativeAvatarSeed, OPERATIVE_AVATAR_VERSION, OPERATIVE_PORTRAIT_V2_VERSION.
 */

import { renderBauhausAvatarSvg } from './bauhausAvatar.js';
import { renderLayeredPortraitSvg } from './renderLayeredPortrait.js';
import {
	OPERATIVE_PORTRAIT_V2_VERSION,
	parseOperativePortrait,
} from './portraitV2Schema.js';

export { renderBauhausAvatarSvg };
export { parseOperativePortrait, OPERATIVE_PORTRAIT_V2_VERSION };

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
 * Client-rendered SVG string — never persisted as binary; only JSON is stored.
 * Accepts v1/v2 portrait objects, v1 seed string, or unknown → Bauhaus fallback.
 *
 * @param {unknown} rawPortraitOrSeed
 * @param {number} [size]
 * @returns {string}
 */
export function renderOperativeAvatarSvg(rawPortraitOrSeed, size = 128) {
	if (rawPortraitOrSeed && typeof rawPortraitOrSeed === 'object') {
		const parsed = parseOperativePortrait(rawPortraitOrSeed);
		if (parsed?.v === OPERATIVE_PORTRAIT_V2_VERSION) {
			return renderLayeredPortraitSvg(parsed, size);
		}
		if (parsed?.v === OPERATIVE_AVATAR_VERSION) {
			return renderBauhausAvatarSvg(parsed.seed, size);
		}
		return renderBauhausAvatarSvg('operative', size);
	}

	return renderBauhausAvatarSvg(normalizeOperativeAvatarSeed(rawPortraitOrSeed), size);
}

/**
 * Parse v1 operativeAvatar only — Studio and legacy call-sites expect `{ v: 1, seed }`.
 *
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
