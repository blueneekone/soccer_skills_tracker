/**
 * playerLoadoutSprint35f.test.ts — Sprint 3.5f Starter catalog art swap (9 Phoenix SVGs)
 * Authority: docs/vision/PORTRAIT_ART_DIRECTION.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
	defaultPortraitV2,
	STARTER_PORTRAIT_PART_IDS,
} from '../../avatars/portraitV2Schema.js';
import { renderLayeredPortraitSvg } from '../../avatars/renderLayeredPortrait.js';
import portraitPartsManifest from '../../avatars/portraitParts.manifest.json';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const ART_DIRECTION = join(ROOT, '..', 'docs/vision/PORTRAIT_ART_DIRECTION.md');
const PORTRAIT_DIR = join(ROOT, '..', 'static/portrait');
const VA_MANIFEST = join(ROOT, '..', 'docs/vision/va-screenshots/s35f-manifest.json');
const VA_DIR = join(ROOT, '..', 'docs/vision/va-screenshots');

const STARTER_FILES = [
	'face-default.svg',
	'face-round.svg',
	'face-angular.svg',
	'hair-default.svg',
	'hair-crop.svg',
	'hair-long.svg',
	'kit-default.svg',
	'kit-home.svg',
	'kit-away.svg',
];

/** Pre-3.5f stub markers — grey-box / teal kit era */
const STUB_MARKERS = [
	/viewBox="0 0 128 128"/,
	/#14b8a6/i,
	/#0d9488/i,
	/fill="#14b8a6"/i,
];

/** Phoenix art direction anchors (3.5f) */
const PHOENIX_MARKERS = [/#1a2744/i, /#2d1810/i, /viewBox="0 0 256 256"/];

function readSvg(file: string) {
	return readFileSync(join(PORTRAIT_DIR, file), 'utf-8');
}

function pathLikeCount(svg: string) {
	const paths = (svg.match(/<path\b/gi) ?? []).length;
	const ellipses = (svg.match(/<ellipse\b/gi) ?? []).length;
	const circles = (svg.match(/<circle\b/gi) ?? []).length;
	const rects = (svg.match(/<rect\b/gi) ?? []).length;
	return paths + ellipses + circles + rects;
}

describe('Sprint 3.5f — manifest starter ids', () => {
	it('portraitParts.manifest.json lists all 9 starter ids', () => {
		const ids = portraitPartsManifest.map((row) => row.id);
		for (const id of STARTER_PORTRAIT_PART_IDS) {
			expect(ids).toContain(id);
		}
		expect(ids.length).toBe(16);
	});

	it('manifest content hashes updated (non-empty sha256)', () => {
		for (const row of portraitPartsManifest) {
			expect(row.contentHash).toMatch(/^[a-f0-9]{64}$/);
		}
	});
});

describe('Sprint 3.5f — SVG assets (Phoenix cartoon, not stubs)', () => {
	for (const file of STARTER_FILES) {
		it(`${file} exists with 256 viewBox, non-stub art, Phoenix palette`, () => {
			const svg = readSvg(file);
			expect(svg).toMatch(/viewBox="0 0 256 256"/);
			expect(pathLikeCount(svg)).toBeGreaterThanOrEqual(3);
			expect(statSync(join(PORTRAIT_DIR, file)).size).toBeGreaterThan(400);
			for (const stub of STUB_MARKERS) {
				expect(svg).not.toMatch(stub);
			}
			const phoenixHits = PHOENIX_MARKERS.filter((re) => re.test(svg)).length;
			expect(phoenixHits).toBeGreaterThanOrEqual(2);
		});
	}

	it('face variants use distinct silhouettes', () => {
		const def = readSvg('face-default.svg');
		const round = readSvg('face-round.svg');
		const angular = readSvg('face-angular.svg');
		expect(def).not.toBe(round);
		expect(def).not.toBe(angular);
		expect(round).not.toBe(angular);
		expect(round).toMatch(/<path\b|<ellipse\b/);
		expect(angular).toMatch(/<path\b/);
	});

	it('kit home vs away use distinct primary fills', () => {
		const home = readSvg('kit-home.svg');
		const away = readSvg('kit-away.svg');
		expect(home).toMatch(/#1a2744|#243a5c/i);
		expect(away).toMatch(/#2a3f5c|#3d5a78/i);
		expect(home).not.toBe(away);
	});

	it('hair layers do not use open-only stroke hair strands', () => {
		for (const file of ['hair-default.svg', 'hair-crop.svg', 'hair-long.svg']) {
			const svg = readSvg(file);
			expect(svg).toMatch(/fill="#/);
			expect((svg.match(/<path\b[^>]*fill="/gi) ?? []).length).toBeGreaterThanOrEqual(2);
		}
	});
});

describe('Sprint 3.5f — renderLayeredPortraitSvg smoke', () => {
	it('default combo renders layered portrait with kit/face/hair markers', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2(), 128);
		expect(svg).toMatch(/data-portrait-version="2"/);
		expect(svg).toMatch(/portrait-layer--kit-default/);
		expect(svg).toMatch(/portrait-layer--face-default/);
		expect(svg).toMatch(/portrait-layer--hair-default/);
		expect(svg).toMatch(/\/portrait\/kit-default\.svg/);
	});

	it('alternate face + hair + kit slots compose distinct hrefs', () => {
		const svg = renderLayeredPortraitSvg(
			{
				v: 2,
				parts: {
					face: 'portrait_face_angular',
					hair: 'portrait_hair_long',
					kit: 'portrait_kit_away',
				},
			},
			96,
		);
		expect(svg).toMatch(/portrait-layer--face-angular/);
		expect(svg).toMatch(/portrait-layer--hair-long/);
		expect(svg).toMatch(/portrait-layer--kit-away/);
		expect(svg).toMatch(/width="96"/);
	});

	it('one alt per slot differs from default combo', () => {
		const base = renderLayeredPortraitSvg(defaultPortraitV2(), 128);
		const altFace = renderLayeredPortraitSvg(
			{ v: 2, parts: { face: 'portrait_face_round', hair: 'portrait_hair_default', kit: 'portrait_kit_default' } },
			128,
		);
		const altHair = renderLayeredPortraitSvg(
			{ v: 2, parts: { face: 'portrait_face_default', hair: 'portrait_hair_crop', kit: 'portrait_kit_default' } },
			128,
		);
		const altKit = renderLayeredPortraitSvg(
			{ v: 2, parts: { face: 'portrait_face_default', hair: 'portrait_hair_default', kit: 'portrait_kit_home' } },
			128,
		);
		expect(altFace).not.toBe(base);
		expect(altHair).not.toBe(base);
		expect(altKit).not.toBe(base);
	});
});

describe('Sprint 3.5f — ROADMAP + art direction', () => {
	it('ROADMAP marks 3.5f Done and 3.5g next', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*3\.5f\s*\|\s*\*\*Done\*\*/i);
		expect(doc).toMatch(/playerLoadoutSprint35f\.test\.ts/);
		expect(doc).toMatch(/3\.5g|HQ ring polish|3\.5g-f/i);
		expect(doc).toMatch(/visual superseded by 3\.5l-b/i);
	});

	it('PORTRAIT_ART_DIRECTION.md cites Phoenix logo and 3.5f handoff', () => {
		const doc = readFileSync(ART_DIRECTION, 'utf-8');
		expect(doc).toMatch(/Phoenixes_Logo_2026\.png/);
		expect(doc).toMatch(/3\.5f/);
	});
});

describe('Sprint 3.5f — VA manifest (optional gate)', () => {
	it('s35f-manifest.json references studio, HQ ring, and id-card screenshots when present', () => {
		if (!existsSync(VA_MANIFEST)) return;
		const rows = JSON.parse(readFileSync(VA_MANIFEST, 'utf-8'));
		const files = (rows.routes ?? []).map((r: { file: string }) => r.file);
		expect(files).toContain('s35f-studio-portrait-1280.png');
		expect(files).toContain('s35f-hq-ring-1280.png');
		expect(files).toContain('s35f-id-card-1280.png');
		const minBytes = rows.minBytesDefault ?? 8000;
		for (const route of rows.routes ?? []) {
			const png = join(VA_DIR, route.file);
			if (existsSync(png)) {
				expect(statSync(png).size).toBeGreaterThanOrEqual(route.minBytes ?? minBytes);
			}
		}
	});
});
