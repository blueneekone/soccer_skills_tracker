/**
 * Operative Avatar — v2 layered portrait renderer only (Sprint 3.5h).
 *
 * Legacy v1 `{ v: 1, seed }` upgrades via upgradeV1SeedToPortraitV2 — never Bauhaus.
 *
 * Public API: renderOperativeAvatarSvg, parseOperativeAvatar, parseOperativePortrait,
 * normalizeOperativeAvatarSeed, OPERATIVE_AVATAR_VERSION, OPERATIVE_PORTRAIT_V2_VERSION.
 */

import { renderLayeredPortraitSvg } from './renderLayeredPortrait.js';
import {
	OPERATIVE_PORTRAIT_V2_VERSION,
	parseOperativePortrait,
	defaultPortraitV2,
} from './portraitV2Schema.js';
import { upgradeV1SeedToPortraitV2 } from './portraitV1Upgrade.js';

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
 * Resolve any raw portrait/seed input to a v2 portrait for rendering.
 *
 * @param {unknown} rawPortraitOrSeed
 * @returns {import('./portraitV2Schema.js').OperativePortraitV2}
 */
function resolvePortraitV2(rawPortraitOrSeed) {
	if (rawPortraitOrSeed && typeof rawPortraitOrSeed === 'object') {
		const parsed = parseOperativePortrait(rawPortraitOrSeed);
		if (parsed?.v === OPERATIVE_PORTRAIT_V2_VERSION) {
			return parsed;
		}
		if (parsed?.v === OPERATIVE_AVATAR_VERSION) {
			return upgradeV1SeedToPortraitV2(parsed.seed);
		}
		return defaultPortraitV2();
	}

	return upgradeV1SeedToPortraitV2(normalizeOperativeAvatarSeed(rawPortraitOrSeed));
}

/**
 * Client-rendered SVG string — never persisted as binary; only JSON is stored.
 * All paths render v2 layered catalog SVG (v1 seeds upgrade deterministically).
 *
 * @param {unknown} rawPortraitOrSeed
 * @param {number} [size]
 * @returns {string}
 */
export function renderOperativeAvatarSvg(rawPortraitOrSeed, size = 128) {
	return renderLayeredPortraitSvg(resolvePortraitV2(rawPortraitOrSeed), size);
}

/**
 * Parse v1 operativeAvatar only — legacy Firestore reads; not used for rendering.
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
