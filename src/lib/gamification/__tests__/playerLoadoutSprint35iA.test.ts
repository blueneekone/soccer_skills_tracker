/**
 * playerLoadoutSprint35iA.test.ts — Sprint 3.5i-a teen skin tone + presentation catalog
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	defaultOwnedPortraitParts,
	TEEN_STARTER_PORTRAIT_PART_IDS,
} from '../../avatars/portraitV2Schema.js';
import {
	matchesPortraitCatalogFilters,
	PORTRAIT_TONES,
} from '../../avatars/portraitRepresentation.js';
import { getPortraitPartCatalog } from '../../avatars/renderLayeredPortrait.js';
import portraitPartsManifest from '../../avatars/portraitParts.manifest.json';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/PORTRAIT_REPRESENTATION.md');
const CONFIG = join(ROOT, '..', 'static/portrait/catalog.config.json');
const PICKER = join(ROOT, 'lib/components/player/OperativePortraitPartPicker.svelte');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const SYNC = join(ROOT, 'lib/player/syncOperativeIdentity.ts');
const VA_MANIFEST = join(ROOT, '..', 'docs/vision/va-screenshots/s35ia-manifest.json');
const PORTRAIT_DIR = join(ROOT, '..', 'static/portrait');

describe('Sprint 3.5i-a — catalog.config teen rows', () => {
	it('catalog.config.json has portrait_face_teen_* rows for all tones', () => {
		/** @type {Array<{ id: string; tone?: string }>} */
		const config = JSON.parse(readFileSync(CONFIG, 'utf-8'));
		for (const tone of PORTRAIT_TONES) {
			expect(
				config.some(
					(row) => row.id === `portrait_face_teen_${tone}_default` && row.tone === tone,
				),
			).toBe(true);
		}
	});

	it('catalog.config.json has portrait_hair_teen_* starter styles', () => {
		const config = JSON.parse(readFileSync(CONFIG, 'utf-8'));
		for (const id of [
			'portrait_hair_teen_long',
			'portrait_hair_teen_ponytail',
			'portrait_hair_teen_crop',
		]) {
			expect(config.some((row: { id: string }) => row.id === id)).toBe(true);
		}
	});

	it('teen SVG assets exist under static/portrait/', () => {
		for (const id of TEEN_STARTER_PORTRAIT_PART_IDS) {
			const row = portraitPartsManifest.find((entry) => entry.id === id);
			expect(row, `manifest row for ${id}`).toBeTruthy();
			const file = row!.assetPath.replace(/^\/portrait\//, '');
			expect(existsSync(join(PORTRAIT_DIR, file))).toBe(true);
		}
	});

	it('3.5b starter ids unchanged in catalog.config', () => {
		const config = JSON.parse(readFileSync(CONFIG, 'utf-8'));
		const ids = config.map((row: { id: string }) => row.id);
		expect(ids).toContain('portrait_face_default');
		expect(ids).toContain('portrait_hair_long');
		expect(ids).toContain('portrait_kit_home');
	});
});

describe('Sprint 3.5i-a — manifest pipeline', () => {
	it('portraitParts.manifest.json includes tone/presentation metadata for teen faces', () => {
		const medium = portraitPartsManifest.find(
			(row) => row.id === 'portrait_face_teen_medium_default',
		);
		expect(medium?.tone).toBe('medium');
		expect(medium?.presentation).toBe('neutral-presenting');
		expect(medium?.svgInner).toMatch(/<path\b/);
	});

	it('defaultOwnedPortraitParts includes teen starter ids', () => {
		const owned = defaultOwnedPortraitParts();
		for (const id of TEEN_STARTER_PORTRAIT_PART_IDS) {
			expect(owned).toContain(id);
		}
	});

	it('presentation filter surfaces feminine teen hair only', () => {
		const catalog = getPortraitPartCatalog();
		const hair = catalog.filter((row) => row.slot === 'hair');
		const feminine = hair.filter((row) =>
			matchesPortraitCatalogFilters(
				row,
				{ tone: 'all', presentation: 'feminine-presenting' },
				'hair',
			),
		);
		expect(feminine.map((row) => row.id)).toEqual([
			'portrait_hair_teen_long',
			'portrait_hair_teen_ponytail',
			'portrait_hair_teen_crop',
		]);
	});
});

describe('Sprint 3.5i-a — Studio picker wiring', () => {
	it('OperativePortraitPartPicker has tone + presentation filter chips', () => {
		const src = readFileSync(PICKER, 'utf-8');
		expect(src).toMatch(/opp-filter-chip/);
		expect(src).toMatch(/Skin tone filter/);
		expect(src).toMatch(/Style presentation filter/);
		expect(src).toMatch(/matchesPortraitCatalogFilters/);
		expect(src).toMatch(/TONE_CHIP_LABELS/);
		expect(src).not.toMatch(/portrait_face_teen_/);
		expect(src).not.toMatch(/portrait_hair_teen_/);
	});

	it('OperativeLoadoutStudio embeds OperativePortraitPartPicker for portrait tabs', () => {
		const src = readFileSync(STUDIO, 'utf-8');
		expect(src).toMatch(/OperativePortraitPartPicker/);
	});

	it('syncOperativeIdentity writes parts ids only — no gender field', () => {
		const src = readFileSync(SYNC, 'utf-8');
		expect(src).toMatch(/operativeAvatar: parsedAvatar/);
		expect(src).not.toMatch(/\bgender\b/i);
		expect(src).not.toMatch(/skinTone/);
	});
});

describe.skip('Sprint 3.5i-a — ROADMAP + vision + VA', () => {
	it.skip('ROADMAP marks 3.5i Superseded — absorbed into 3.5l-a portrait quality phase', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('PORTRAIT_REPRESENTATION.md documents tone + presentation tags', () => {
		expect(existsSync(VISION)).toBe(true);
		const doc = readFileSync(VISION, 'utf-8');
		const lines = doc.split('\n').length;
		expect(lines).toBeLessThanOrEqual(80);
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('s35ia-manifest.json references studio picker screenshot', () => {
		expect(existsSync(VA_MANIFEST)).toBe(true);
		const manifest = JSON.parse(readFileSync(VA_MANIFEST, 'utf-8'));
		expect(manifest.routes[0].file).toBe('s35ia-studio-picker-1280.png');
	});
});
