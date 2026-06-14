/**
 * playerLoadoutSprint35mArt.test.ts — Sprint 3.5m-art Pip-Boy-tone cohesive bust SVG redraw
 * Authority: PORTRAIT_REFERENCE_BOARD.md + PORTRAIT_ART_DIRECTION.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { defaultPortraitV2 } from '../../avatars/portraitV2Schema.js';
import { renderLayeredPortraitSvg } from '../../avatars/renderLayeredPortrait.js';
import portraitManifest from '../../avatars/portraitParts.manifest.json';

const ROOT = join(__dirname, '..', '..', '..');
const PORTRAIT_DIR = join(ROOT, '..', 'static', 'portrait');
const CATALOG = join(PORTRAIT_DIR, 'catalog.config.json');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const RENDERER = join(ROOT, 'lib/avatars/renderLayeredPortrait.js');

const SIDE_EAR_ELLIPSE =
	/<ellipse[^>]+cx="(?:7[0-9]|8[0-9]|1[6-9][0-9])"[^>]+cy="(?:11[0-9]|12[0-5])"/;

/** @type {{ file: string }[]} */
const catalog = JSON.parse(readFileSync(CATALOG, 'utf-8'));

describe('Sprint 3.5m-art — catalog assets on disk', () => {
	it('every catalog.config.json file exists under static/portrait/', () => {
		for (const row of catalog) {
			expect(existsSync(join(PORTRAIT_DIR, row.file))).toBe(true);
		}
	});

	it('manifest row count matches catalog; each row has svgInner + contentHash', () => {
		expect(portraitManifest.length).toBe(catalog.length);
		for (const row of portraitManifest) {
			expect(row.svgInner?.length).toBeGreaterThan(50);
			expect(row.contentHash).toMatch(/^[a-f0-9]{64}$/);
			expect(row.assetPath).toMatch(/^\/portrait\//);
		}
	});
});

describe('Sprint 3.5m-art — hair human graphic (not flame mascot)', () => {
	it('hair-default.svg has no flame triangles and at least three path elements', () => {
		const svg = readFileSync(join(PORTRAIT_DIR, 'hair-default.svg'), 'utf-8');
		expect(svg).not.toMatch(/#f5a830/i);
		expect((svg.match(/<path\b/g) ?? []).length).toBeGreaterThanOrEqual(3);
	});

	it('hair-teen-ponytail.svg includes distinct ponytail tail mass', () => {
		const svg = readFileSync(join(PORTRAIT_DIR, 'hair-teen-ponytail.svg'), 'utf-8');
		expect(svg).toMatch(/ponytail|206 148|200 220/i);
		expect((svg.match(/<path\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
		expect(svg).not.toMatch(/#f5a830/i);
	});
});

describe('Sprint 3.5m-art — face cohesion (no side ear ellipses)', () => {
	it('face-default and face-teen-medium omit side ear ellipses at eye height', () => {
		for (const file of ['face-default.svg', 'face-teen-medium-default.svg']) {
			const svg = readFileSync(join(PORTRAIT_DIR, file), 'utf-8');
			expect(svg).not.toMatch(SIDE_EAR_ELLIPSE);
			expect(svg).not.toMatch(/opacity="0\.3/i);
		}
	});
});

describe('Sprint 3.5m-art — compose pipeline', () => {
	it('renderLayeredPortraitSvg keeps xMidYMid meet from 3.5m-frame', () => {
		const src = readFileSync(RENDERER, 'utf-8');
		expect(src).toMatch(/xMidYMid meet/);
		const svg = renderLayeredPortraitSvg(defaultPortraitV2('teen'), 128);
		expect(svg).toMatch(/data-precomposed-bust=/);
		expect(svg).toMatch(/xMidYMid meet/);
		expect(svg).toMatch(/<image\b/);
	});

	it('legacy face×hair×kit sample combos produce substantial SVG output', () => {
		const combos = [
			{ face: 'portrait_face_default', hair: 'portrait_hair_default', kit: 'portrait_kit_default' },
			{ face: 'portrait_face_round', hair: 'portrait_hair_crop', kit: 'portrait_kit_home' },
			{
				face: 'portrait_face_teen_medium_default',
				hair: 'portrait_hair_teen_ponytail',
				kit: 'portrait_kit_home',
			},
		];
		for (const parts of combos) {
			const svg = renderLayeredPortraitSvg({ v: 2, parts }, 128);
			expect(svg.length).toBeGreaterThan(200);
			expect(svg).toMatch(/<path\b/);
		}
	});
});

describe('Sprint 3.5m-art — ROADMAP human gate', () => {
	it('marks 3.5m-art Superseded — human VA failed; Gemini ingest replaces', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*\*\*3\.5m-art\*\*\s*\|/i);
		expect(doc).toMatch(/Superseded|human VA failed/i);
		expect(doc).not.toMatch(/\|\s*\*\*3\.5m-art\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(doc).toMatch(/playerLoadoutSprint35mArt\.test\.ts/);
		expect(doc).toMatch(/3\.5m-gemini-ingest|3\.5m-gate/i);
	});
});
