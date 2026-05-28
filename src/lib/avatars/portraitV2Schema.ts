import portraitPartsManifest from './portraitParts.manifest.json';
import { TEEN_STARTER_PORTRAIT_PART_IDS } from './portraitRepresentation.js';

export const OPERATIVE_PORTRAIT_V2_VERSION = 2;

export const PORTRAIT_PART_SLOTS = ['face', 'hair', 'kit'] as const;

export type PortraitPartSlot = (typeof PORTRAIT_PART_SLOTS)[number];

export type PortraitPartCatalogEntry = {
	id: string;
	slot: PortraitPartSlot;
	label: string;
	renderKey: string;
	assetPath: string;
	contentHash: string;
	svgInner?: string;
	tone?: import('./portraitRepresentation.js').PortraitTone;
	presentation?: import('./portraitRepresentation.js').PortraitPresentation;
	ageBand?: import('./portraitRepresentation.js').PortraitAgeBand;
};

/**
 * v2 operativeAvatar.parts — face / hair / kit catalog ids only.
 * Skin tone is encoded in the face part id (e.g. portrait_face_teen_medium_default).
 * No separate skinTone or gender field — see docs/vision/PORTRAIT_REPRESENTATION.md.
 */
export type OperativePortraitV2 = {
	v: typeof OPERATIVE_PORTRAIT_V2_VERSION;
	parts: Partial<Record<PortraitPartSlot, string | null>>;
};

export type OperativePortraitV1 = {
	v: 1;
	seed: string;
};

export type OperativePortrait = OperativePortraitV1 | OperativePortraitV2;

/** All catalog ids in the manifest (3.5b starters + expansions). */
export const STARTER_PORTRAIT_PART_IDS = Object.freeze(
	portraitPartsManifest.map((row) => row.id),
) as readonly string[];

export { TEEN_STARTER_PORTRAIT_PART_IDS };

const MAX_SEED_LEN = 128;

function normalizeSeed(seed: unknown): string {
	const s = String(seed ?? '')
		.trim()
		.slice(0, MAX_SEED_LEN);
	return s || 'operative';
}

/**
 * Parse operativeAvatar Firestore JSON — v1 (Bauhaus seed) or v2 (layered parts).
 * Rejects unknown versions, unknown part keys, and non-string part ids.
 */
export function parseOperativePortrait(raw: unknown): OperativePortrait | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;

	if (o.v === 1) {
		if (typeof o.seed !== 'string') return null;
		return { v: 1, seed: normalizeSeed(o.seed) };
	}

	if (o.v === OPERATIVE_PORTRAIT_V2_VERSION) {
		if (!o.parts || typeof o.parts !== 'object' || Array.isArray(o.parts)) return null;
		const rawParts = o.parts as Record<string, unknown>;
		const parts: Partial<Record<PortraitPartSlot, string | null>> = {};

		for (const key of Object.keys(rawParts)) {
			if (!PORTRAIT_PART_SLOTS.includes(key as PortraitPartSlot)) return null;
			const val = rawParts[key];
			if (val === null) {
				parts[key as PortraitPartSlot] = null;
				continue;
			}
			if (typeof val !== 'string') return null;
			parts[key as PortraitPartSlot] = val;
		}

		return { v: OPERATIVE_PORTRAIT_V2_VERSION, parts };
	}

	return null;
}

/**
 * Filter manifest rows for a portrait part slot.
 */
export function getPortraitPartsForSlot(
	slot: PortraitPartSlot,
	catalog?: ReadonlyArray<PortraitPartCatalogEntry>,
): PortraitPartCatalogEntry[] {
	const cat = catalog ?? (portraitPartsManifest as PortraitPartCatalogEntry[]);
	return cat.filter((row) => row.slot === slot);
}

/** Starter ownership — entire catalog for alpha (includes teen starter set 3.5i-a). */
export function defaultOwnedPortraitParts(): string[] {
	const ids = new Set<string>([...STARTER_PORTRAIT_PART_IDS]);
	for (const id of TEEN_STARTER_PORTRAIT_PART_IDS) ids.add(id);
	return [...ids];
}

/**
 * Strip unknown slots; null ids not present in catalog when catalog is provided.
 * When ownedIds is provided, also strip ids not in the owned set.
 */
export function normalizePortraitParts(
	parts: Partial<Record<PortraitPartSlot, string | null>>,
	catalog?: ReadonlyArray<{ id: string; slot: PortraitPartSlot }>,
	ownedIds?: readonly string[],
): Partial<Record<PortraitPartSlot, string | null>> {
	const out: Partial<Record<PortraitPartSlot, string | null>> = {};
	const catalogIds = catalog ? new Set(catalog.map((row) => row.id)) : null;
	const owned = ownedIds ? new Set(ownedIds) : null;

	for (const slot of PORTRAIT_PART_SLOTS) {
		const val = parts[slot];
		if (val === undefined) continue;
		if (val === null) {
			out[slot] = null;
			continue;
		}
		if (typeof val !== 'string') continue;
		if (catalogIds && !catalogIds.has(val)) {
			out[slot] = null;
			continue;
		}
		if (owned && !owned.has(val)) {
			out[slot] = null;
			continue;
		}
		out[slot] = val;
	}

	return out;
}

/** Minimal valid v2 portrait with dev stub part ids (3.5a catalog). */
export function defaultPortraitV2(): OperativePortraitV2 {
	return {
		v: OPERATIVE_PORTRAIT_V2_VERSION,
		parts: {
			face: 'portrait_face_default',
			hair: 'portrait_hair_default',
			kit: 'portrait_kit_default',
		},
	};
}
