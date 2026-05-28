/**
 * Pure v1 seed → v2 catalog upgrade (shared by render + read-repair paths).
 * Sprint 3.5h — Bauhaus generator retired; legacy `{ v: 1, seed }` maps to catalog parts.
 */

import {
	defaultPortraitV2,
	getPortraitPartsForSlot,
	isLegacyStarterPortraitPartId,
	normalizePortraitParts,
	type BodyScale,
	type OperativePortraitV2,
	type PortraitPartSlot,
} from './portraitV2Schema.js';

/** djb2 string → unsigned 32-bit hash (stable across client + Cloud Functions). */
function djb2(str: string): number {
	let h = 5381;
	for (let i = 0; i < str.length; i++) {
		h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
	}
	return h;
}

function pickCatalogPartForSlot(
	seed: string,
	slot: PortraitPartSlot,
	bodyScale?: BodyScale,
): string | null {
	const catalog =
		bodyScale ?
			getPortraitPartsForSlot(slot, undefined, bodyScale)
		:	getPortraitPartsForSlot(slot).filter((row) => isLegacyStarterPortraitPartId(row.id));
	if (!catalog.length) return null;
	const idx = djb2(`${seed}::${slot}`) % catalog.length;
	return catalog[idx]?.id ?? null;
}

/**
 * Deterministic v1 seed → v2 catalog part ids per slot (hash picks within slot catalog).
 */
export function upgradeV1SeedToPortraitV2(
	seed: string,
	bodyScale?: BodyScale,
): OperativePortraitV2 {
	const normalizedSeed = String(seed ?? '').trim() || 'operative';
	const parts: Partial<Record<PortraitPartSlot, string | null>> = {};

	for (const slot of ['face', 'hair', 'kit'] as const) {
		const picked = pickCatalogPartForSlot(normalizedSeed, slot, bodyScale);
		if (picked) parts[slot] = picked;
	}

	const hasAnyPart = Object.values(parts).some((v) => typeof v === 'string' && v);
	if (!hasAnyPart) return defaultPortraitV2(bodyScale);

	const portrait: OperativePortraitV2 = {
		v: 2,
		parts: normalizePortraitParts(parts, undefined, undefined, bodyScale),
	};
	if (bodyScale) portrait.bodyScale = bodyScale;
	return portrait;
}
