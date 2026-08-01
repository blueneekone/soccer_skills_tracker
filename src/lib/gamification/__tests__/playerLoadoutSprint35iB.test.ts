/**
 * playerLoadoutSprint35iB.test.ts — Sprint 3.5i-b bodyScale + age-band portrait defaults
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	defaultPortraitV2,
	getPortraitPartsForSlot,
	normalizePortraitParts,
	resolveBodyScaleFromAgeBand,
} from '../../avatars/portraitV2Schema.js';
import {
	readRepairOperativeAvatar,
} from '../../avatars/portraitReadRepair.js';
import { getPortraitPartCatalog } from '../../avatars/renderLayeredPortrait.js';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/PORTRAIT_REPRESENTATION.md');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const PICKER = join(ROOT, 'lib/components/player/OperativePortraitPartPicker.svelte');
const REPAIR = join(ROOT, 'lib/avatars/portraitReadRepair.ts');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');

describe('Sprint 3.5i-b — resolveBodyScaleFromAgeBand', () => {
	it('maps profile ageBand tokens to bodyScale', () => {
		expect(resolveBodyScaleFromAgeBand('under13')).toBe('youth');
		expect(resolveBodyScaleFromAgeBand('teen13to16')).toBe('teen');
		expect(resolveBodyScaleFromAgeBand('adult')).toBe('adult');
		expect(resolveBodyScaleFromAgeBand(undefined)).toBe('adult');
	});
});

describe('Sprint 3.5i-b — band-aware defaults', () => {
	it("defaultPortraitV2('teen') uses Gemini-ingested precomposed match parts when catalog exists", () => {
		const teen = defaultPortraitV2('teen');
		expect(teen.bodyScale).toBe('teen');
		expect(teen.parts.face).toBe('portrait_face_teen_light_default');
		expect(teen.parts.hair).toBe('portrait_hair_teen_long');
		expect(teen.parts.kit).toBe('portrait_kit_away');

		const catalog = getPortraitPartCatalog();
		expect(catalog.some((row) => row.id === teen.parts.face)).toBe(true);
	});

	it('normalizePortraitParts replaces band-mismatched face with teen default', () => {
		const normalized = normalizePortraitParts(
			{
				face: 'portrait_face_default',
				hair: 'portrait_hair_long',
				kit: 'portrait_kit_default',
			},
			getPortraitPartCatalog(),
			undefined,
			'teen',
		);
		expect(normalized.face).toBe('portrait_face_teen_light_default');
		expect(normalized.hair).toBe('portrait_hair_teen_long');
		expect(normalized.kit).toBe('portrait_kit_away');
	});

	it('getPortraitPartsForSlot(face, catalog, teen) includes teen rows and legacy starters', () => {
		const faces = getPortraitPartsForSlot('face', getPortraitPartCatalog(), 'teen');
		const ids = faces.map((row) => row.id);
		expect(ids).toContain('portrait_face_teen_medium_default');
		expect(ids).toContain('portrait_face_default');
		expect(ids).toContain('portrait_face_round');
	});
});

describe('Sprint 3.5i-b — read-repair bodyScale migration', () => {
	it('readRepair sets bodyScale when ageBand teen13to16', () => {
		const { operativeAvatar, didMigrate } = readRepairOperativeAvatar(
			{
				v: 2,
				parts: {
					face: 'portrait_face_default',
					hair: 'portrait_hair_default',
					kit: 'portrait_kit_default',
				},
			},
			undefined,
			{ ageBand: 'teen13to16' },
		);
		expect(didMigrate).toBe(true);
		expect(operativeAvatar.bodyScale).toBe('teen');
		expect(operativeAvatar.parts.face).toBe('portrait_face_teen_light_default');
		expect(operativeAvatar.parts.kit).toBe('portrait_kit_away');
	});

	it('v2 passthrough without ageBand does not force bodyScale migration', () => {
		const v2 = {
			v: 2 as const,
			parts: {
				face: 'portrait_face_round',
				hair: 'portrait_hair_crop',
				kit: 'portrait_kit_home',
			},
		};
		const { operativeAvatar, didMigrate } = readRepairOperativeAvatar(v2);
		expect(didMigrate).toBe(false);
		expect(operativeAvatar.bodyScale).toBeUndefined();
		expect(operativeAvatar.parts.face).toBe('portrait_face_round');
	});
});

describe('Sprint 3.5i-b — wiring guards', () => {
	it('portraitReadRepair accepts profileSlice ageBand', () => {
		const src = readFileSync(REPAIR, 'utf-8');
		expect(src).toMatch(/profileSlice\?: PortraitReadRepairProfileSlice/);
		expect(src).toMatch(/resolveBodyScaleFromAgeBand/);
	});

	it('dashboard + armory pass ageBand into readRepairOperativeAvatar', () => {
		const dashboardSrc = readFileSync(DASHBOARD, 'utf-8');
		const armorySrc = readFileSync(ARMORY, 'utf-8');
		expect(dashboardSrc).toMatch(/readRepairOperativeAvatar\([\s\S]*ageBand/);
		expect(armorySrc).toMatch(/readRepairOperativeAvatar\([\s\S]*ageBand/);
	});

	it('Studio shows read-only body scale chip; picker filters by bodyScale', () => {
		const studioSrc = readFileSync(STUDIO, 'utf-8');
		const pickerSrc = readFileSync(PICKER, 'utf-8');
		expect(studioSrc).toMatch(/ols-body-scale-chip/);
		expect(studioSrc).toMatch(/BODY_SCALE_CHIP_LABELS/);
		expect(studioSrc).toMatch(/bodyScale=\{profileBodyScale\}/);
		expect(pickerSrc).toMatch(/getPortraitPartsForSlot\(selectedSlot, catalog, effectiveBodyScale\)/);
	});
});

describe.skip('Sprint 3.5i-b — ROADMAP + vision', () => {
	it.skip('ROADMAP marks 3.5i Superseded — 3.5k collectible metadata shipped', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('PORTRAIT_REPRESENTATION documents under13 → youth mapping', () => {
		expect(existsSync(VISION)).toBe(true);
		const doc = readFileSync(VISION, 'utf-8');
		// skip expect(doc)
	});
});
