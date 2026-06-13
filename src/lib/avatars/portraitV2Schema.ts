import portraitPartsManifest from './portraitParts.manifest.json';
import { TEEN_STARTER_PORTRAIT_PART_IDS } from './portraitRepresentation.js';

export const OPERATIVE_PORTRAIT_V2_VERSION = 2;

export const PORTRAIT_PART_SLOTS = ['face', 'hair', 'kit'] as const;

export type PortraitPartSlot = (typeof PORTRAIT_PART_SLOTS)[number];

export type BodyScale = 'youth' | 'junior' | 'teen' | 'adult';

export type ProfileAgeBand = 'under13' | 'teen13to16' | 'adult';

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
 * Optional bodyScale (3.5i-b) derives from profile ageBand — see PORTRAIT_REPRESENTATION.md.
 */
export type OperativePortraitV2 = {
	v: typeof OPERATIVE_PORTRAIT_V2_VERSION;
	parts: Partial<Record<PortraitPartSlot, string | null>>;
	bodyScale?: BodyScale;
};

export type OperativePortraitV1 = {
	v: 1;
	seed: string;
};

export type OperativePortrait = OperativePortraitV1 | OperativePortraitV2;

const BODY_SCALES: readonly BodyScale[] = ['youth', 'junior', 'teen', 'adult'];

/** 3.5b legacy starters — always eligible for compose until read-repair band-normalizes. */
export const LEGACY_STARTER_PORTRAIT_PART_IDS = Object.freeze([
	'portrait_face_default',
	'portrait_face_round',
	'portrait_face_angular',
	'portrait_hair_default',
	'portrait_hair_crop',
	'portrait_hair_long',
	'portrait_kit_default',
	'portrait_kit_home',
	'portrait_kit_away',
]) as readonly string[];

/** All catalog ids in the manifest (3.5b starters + expansions). */
export const STARTER_PORTRAIT_PART_IDS = Object.freeze(
	portraitPartsManifest.map((row) => row.id),
) as readonly string[];

export { TEEN_STARTER_PORTRAIT_PART_IDS };

export const BODY_SCALE_CHIP_LABELS: Record<BodyScale, string> = {
	youth: 'YOUTH OPERATIVE',
	junior: 'JUNIOR OPERATIVE',
	teen: 'TEEN OPERATIVE',
	adult: 'ADULT OPERATIVE',
};

const MAX_SEED_LEN = 128;

const DEFAULT_PARTS_BY_SCALE: Record<BodyScale, Record<PortraitPartSlot, string>> = {
	youth: {
		face: 'portrait_face_default',
		hair: 'portrait_hair_default',
		kit: 'portrait_kit_default',
	},
	junior: {
		face: 'portrait_face_default',
		hair: 'portrait_hair_default',
		kit: 'portrait_kit_default',
	},
	teen: {
		face: 'portrait_face_teen_light_default',
		hair: 'portrait_hair_teen_long',
		kit: 'portrait_kit_away',
	},
	adult: {
		face: 'portrait_face_default',
		hair: 'portrait_hair_default',
		kit: 'portrait_kit_default',
	},
};

function normalizeSeed(seed: unknown): string {
	const s = String(seed ?? '')
		.trim()
		.slice(0, MAX_SEED_LEN);
	return s || 'operative';
}

function isBodyScale(value: unknown): value is BodyScale {
	return typeof value === 'string' && (BODY_SCALES as readonly string[]).includes(value);
}

/**
 * Map JWT/profile ageBand → operativeAvatar.bodyScale.
 * under13 → youth (single band for COPPA minors; junior reserved for future split).
 */
export function resolveBodyScaleFromAgeBand(
	ageBand: ProfileAgeBand | string | undefined,
): BodyScale {
	switch (ageBand) {
		case 'under13':
			return 'youth';
		case 'teen13to16':
			return 'teen';
		case 'adult':
			return 'adult';
		default:
			return 'adult';
	}
}

export function isLegacyStarterPortraitPartId(partId: string): boolean {
	return LEGACY_STARTER_PORTRAIT_PART_IDS.includes(partId);
}

/** Catalog id band token embedded after slot segment (e.g. portrait_face_teen_medium_default). */
export function partIdMatchesBodyScale(partId: string, bodyScale: BodyScale): boolean {
	if (isLegacyStarterPortraitPartId(partId)) return true;
	return partId.includes(`_${bodyScale}_`);
}

/** Strict band check — legacy starters do not match (used by read-repair normalize). */
export function partIdMatchesBodyScaleStrict(partId: string, bodyScale: BodyScale): boolean {
	return partId.includes(`_${bodyScale}_`);
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

		const portrait: OperativePortraitV2 = {
			v: OPERATIVE_PORTRAIT_V2_VERSION,
			parts,
		};
		if (o.bodyScale !== undefined) {
			if (!isBodyScale(o.bodyScale)) return null;
			portrait.bodyScale = o.bodyScale;
		}
		return portrait;
	}

	return null;
}

/**
 * Filter manifest rows for a portrait part slot.
 * When bodyScale is set, prefer band-prefixed ids plus legacy starters for backward compat.
 */
export function getPortraitPartsForSlot(
	slot: PortraitPartSlot,
	catalog?: ReadonlyArray<PortraitPartCatalogEntry>,
	bodyScale?: BodyScale,
): PortraitPartCatalogEntry[] {
	const cat = catalog ?? (portraitPartsManifest as PortraitPartCatalogEntry[]);
	const forSlot = cat.filter((row) => row.slot === slot);
	if (!bodyScale) return forSlot;
	return forSlot.filter(
		(row) => isLegacyStarterPortraitPartId(row.id) || partIdMatchesBodyScale(row.id, bodyScale),
	);
}

/** Starter ownership — entire catalog for alpha (includes teen starter set 3.5i-a). */
export function defaultOwnedPortraitParts(): string[] {
	const ids = new Set<string>([...STARTER_PORTRAIT_PART_IDS]);
	for (const id of TEEN_STARTER_PORTRAIT_PART_IDS) ids.add(id);
	return [...ids];
}

function defaultPartIdForSlot(slot: PortraitPartSlot, bodyScale?: BodyScale): string {
	const scale = bodyScale ?? 'adult';
	return DEFAULT_PARTS_BY_SCALE[scale][slot];
}

/**
 * Strip unknown slots; null ids not present in catalog when catalog is provided.
 * When ownedIds is provided, also strip ids not in the owned set.
 * When bodyScale is provided, replace band-mismatched equipped ids with scale defaults.
 */
export function normalizePortraitParts(
	parts: Partial<Record<PortraitPartSlot, string | null>>,
	catalog?: ReadonlyArray<{ id: string; slot: PortraitPartSlot }>,
	ownedIds?: readonly string[],
	bodyScale?: BodyScale,
): Partial<Record<PortraitPartSlot, string | null>> {
	const out: Partial<Record<PortraitPartSlot, string | null>> = {};
	const catalogIds = catalog ? new Set(catalog.map((row) => row.id)) : null;
	const owned = ownedIds ? new Set(ownedIds) : null;

	for (const slot of PORTRAIT_PART_SLOTS) {
		let val = parts[slot];
		if (val === undefined) continue;
		if (val === null) {
			out[slot] = null;
			continue;
		}
		if (typeof val !== 'string') continue;
		if (catalogIds && !catalogIds.has(val)) {
			val = bodyScale ? defaultPartIdForSlot(slot, bodyScale) : null;
		}
		if (owned && val && !owned.has(val)) {
			val = bodyScale ? defaultPartIdForSlot(slot, bodyScale) : null;
		}
		if (val && bodyScale && !partIdMatchesBodyScaleStrict(val, bodyScale)) {
			val = defaultPartIdForSlot(slot, bodyScale);
		}
		if (val === null) {
			out[slot] = null;
			continue;
		}
		out[slot] = val;
	}

	return out;
}

/** Minimal valid v2 portrait — band-aware defaults when bodyScale provided (3.5i-b). */
export function defaultPortraitV2(bodyScale?: BodyScale): OperativePortraitV2 {
	const scale = bodyScale ?? 'adult';
	const defaults = DEFAULT_PARTS_BY_SCALE[scale];
	const portrait: OperativePortraitV2 = {
		v: OPERATIVE_PORTRAIT_V2_VERSION,
		parts: {
			face: defaults.face,
			hair: defaults.hair,
			kit: defaults.kit,
		},
	};
	if (bodyScale) portrait.bodyScale = bodyScale;
	return portrait;
}
