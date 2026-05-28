/**
 * Portrait representation catalog tags — Studio filter chips only (3.5i-a).
 * Not persisted to Firestore; face part id encodes skin tone.
 */

export const PORTRAIT_TONES = ['light', 'medium', 'tan', 'deep'] as const;
export type PortraitTone = (typeof PORTRAIT_TONES)[number];

export const PORTRAIT_PRESENTATIONS = [
	'feminine-presenting',
	'neutral-presenting',
	'masculine-presenting',
] as const;
export type PortraitPresentation = (typeof PORTRAIT_PRESENTATIONS)[number];

export type PortraitAgeBand = 'teen' | 'youth' | 'junior' | 'adult';

export type PortraitCatalogMeta = {
	tone?: PortraitTone;
	presentation?: PortraitPresentation;
	ageBand?: PortraitAgeBand;
};

export type PortraitFilterState = {
	tone: PortraitTone | 'all';
	presentation: PortraitPresentation | 'all';
};

export const DEFAULT_PORTRAIT_FILTERS: PortraitFilterState = {
	tone: 'all',
	presentation: 'all',
};

export const TONE_CHIP_LABELS: Record<PortraitTone, string> = {
	light: 'Light',
	medium: 'Medium',
	tan: 'Tan',
	deep: 'Deep',
};

export const PRESENTATION_CHIP_LABELS: Record<PortraitPresentation, string> = {
	'feminine-presenting': 'Feminine',
	'neutral-presenting': 'Neutral',
	'masculine-presenting': 'Masculine',
};

/** Teen starter ids shipped in 3.5i-a (alpha-owned). */
export const TEEN_STARTER_PORTRAIT_PART_IDS = Object.freeze([
	'portrait_face_teen_light_default',
	'portrait_face_teen_medium_default',
	'portrait_face_teen_tan_default',
	'portrait_face_teen_deep_default',
	'portrait_hair_teen_long',
	'portrait_hair_teen_ponytail',
	'portrait_hair_teen_crop',
]) as readonly string[];

/**
 * @param {PortraitCatalogMeta & { id?: string }} row
 * @param {PortraitFilterState} filters
 * @param {'face' | 'hair' | 'kit'} slot
 */
export function matchesPortraitCatalogFilters(
	row: PortraitCatalogMeta & { id?: string },
	filters: PortraitFilterState,
	slot: 'face' | 'hair' | 'kit',
): boolean {
	if (slot === 'face' && filters.tone !== 'all') {
		if (!row.tone || row.tone !== filters.tone) return false;
	}

	if (filters.presentation !== 'all') {
		const presentation = row.presentation ?? 'neutral-presenting';
		if (presentation !== filters.presentation) return false;
	}

	return true;
}
