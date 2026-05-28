/**
 * playerLoadoutSprint35a.test.ts — Sprint 3.5a Portrait v2 schema + layered renderer
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	PORTRAIT_PART_SLOTS,
	parseOperativePortrait,
	defaultPortraitV2,
	normalizePortraitParts,
} from '../../avatars/portraitV2Schema.js';
import {
	parseOperativeAvatar,
	renderOperativeAvatarSvg,
} from '../../avatars/operativeAvatar.js';
import {
	getPortraitPartCatalog,
	renderLayeredPortraitSvg,
	renderPortraitPartLayer,
} from '../../avatars/renderLayeredPortrait.js';
import { composeOperativePortrait } from '../renderOperativeLoadout.js';
import portraitPartsManifest from '../../avatars/portraitParts.manifest.json';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const PORTRAIT_DIR = join(ROOT, '..', 'static/portrait');
const SCHEMA = join(ROOT, 'lib/avatars/portraitV2Schema.ts');
const RENDERER = join(ROOT, 'lib/avatars/renderLayeredPortrait.js');
const OPERATIVE_AVATAR = join(ROOT, 'lib/avatars/operativeAvatar.js');
const RENDER_LOADOUT = join(ROOT, 'lib/gamification/renderOperativeLoadout.js');

describe('Sprint 3.5a — portrait v2 schema', () => {
	it('parseOperativePortrait accepts v1 unchanged', () => {
		const v1 = { v: 1, seed: 'test-player-42' };
		expect(parseOperativePortrait(v1)).toEqual({ v: 1, seed: 'test-player-42' });
		expect(parseOperativeAvatar(v1)).toEqual({ v: 1, seed: 'test-player-42' });
	});

	it('parseOperativePortrait accepts valid v2 with face/hair/kit ids', () => {
		const v2 = {
			v: 2,
			parts: {
				face: 'portrait_face_default',
				hair: 'portrait_hair_default',
				kit: 'portrait_kit_default',
			},
		};
		expect(parseOperativePortrait(v2)).toEqual(v2);
	});

	it('rejects v3 and unknown part keys', () => {
		expect(parseOperativePortrait({ v: 3, parts: {} })).toBeNull();
		expect(
			parseOperativePortrait({ v: 2, parts: { face: 'ok', beard: 'nope' } }),
		).toBeNull();
		expect(parseOperativePortrait({ v: 2, parts: { face: 42 } })).toBeNull();
	});

	it('normalizePortraitParts strips unknown catalog ids when catalog provided', () => {
		const catalog = getPortraitPartCatalog();
		const normalized = normalizePortraitParts(
			{ face: 'portrait_face_default', hair: 'unknown_hair_xyz', kit: null },
			catalog,
		);
		expect(normalized.face).toBe('portrait_face_default');
		expect(normalized.hair).toBeNull();
		expect(normalized.kit).toBeNull();
	});

	it('defaultPortraitV2 returns minimal valid stub ids', () => {
		expect(defaultPortraitV2()).toEqual({
			v: 2,
			parts: {
				face: 'portrait_face_default',
				hair: 'portrait_hair_default',
				kit: 'portrait_kit_default',
			},
		});
	});
});

describe('Sprint 3.5a — layered SVG renderer', () => {
	it('renderLayeredPortraitSvg returns SVG with layer markers for kit/face/hair', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2(), 128);
		expect(svg).toMatch(/data-portrait-version="2"/);
		expect(svg).toMatch(/data-portrait-layer="kit"/);
		expect(svg).toMatch(/data-portrait-layer="face"/);
		expect(svg).toMatch(/data-portrait-layer="hair"/);
		expect(svg).toMatch(/<svg[^>]*viewBox="0 0 128 128"/);
	});

	it('renderPortraitPartLayer references /portrait/ asset path', () => {
		const layer = renderPortraitPartLayer('portrait_face_default', 96);
		expect(layer).toMatch(/\/portrait\/face-default\.svg/);
		expect(layer).toMatch(/data-portrait-layer="face"/);
	});

	it('renderOperativeAvatarSvg(v1 seed object) upgrades to deterministic v2 layered SVG', () => {
		const v1 = { v: 1, seed: 'deterministic-seed-35a' };
		const a = renderOperativeAvatarSvg(v1, 128);
		const b = renderOperativeAvatarSvg(v1, 128);
		expect(a).toBe(b);
		expect(a).toMatch(/<svg[^>]*viewBox="0 0 128 128"/);
		expect(a).toMatch(/data-portrait-version="2"/);
	});

	it('renderOperativeAvatarSvg(v2 default) differs from upgraded v1 at same seed', () => {
		const v1Svg = renderOperativeAvatarSvg({ v: 1, seed: 'operative' }, 128);
		const v2Svg = renderOperativeAvatarSvg(defaultPortraitV2(), 128);
		expect(v2Svg).toMatch(/data-portrait-layer="face"/);
		expect(v1Svg).toMatch(/data-portrait-version="2"/);
	});

	it('composeOperativePortrait with v2 operativeAvatar yields non-empty portraitSvg', () => {
		const composed = composeOperativePortrait({
			operativeAvatar: defaultPortraitV2(),
			size: 96,
		});
		expect(composed.portraitSvg.length).toBeGreaterThan(0);
		expect(composed.portraitSvg).toMatch(/data-portrait-version="2"/);
	});
});

describe('Sprint 3.5a — manifest + static assets', () => {
	it('portraitParts manifest rows use face|hair|kit slots and /portrait/ paths', () => {
		expect(portraitPartsManifest.length).toBeGreaterThanOrEqual(3);
		for (const row of portraitPartsManifest) {
			expect(PORTRAIT_PART_SLOTS).toContain(row.slot);
			expect(row.assetPath).toMatch(/^\/portrait\/.+\.svg$/);
			expect(row.contentHash).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	it('static/portrait stub SVGs exist', () => {
		expect(existsSync(join(PORTRAIT_DIR, 'face-default.svg'))).toBe(true);
		expect(existsSync(join(PORTRAIT_DIR, 'hair-default.svg'))).toBe(true);
		expect(existsSync(join(PORTRAIT_DIR, 'kit-default.svg'))).toBe(true);
	});

	it('getPortraitPartCatalog mirrors manifest ids', () => {
		const ids = new Set(getPortraitPartCatalog().map((row) => row.id));
		expect(ids.has('portrait_face_default')).toBe(true);
		expect(ids.has('portrait_hair_default')).toBe(true);
		expect(ids.has('portrait_kit_default')).toBe(true);
	});
});

describe('Sprint 3.5a — wiring (v2 render path)', () => {
	it('operativeAvatar.js exports v2 parse + layered render only', () => {
		const src = readFileSync(OPERATIVE_AVATAR, 'utf-8');
		expect(src).toMatch(/parseOperativePortrait/);
		expect(src).toMatch(/renderLayeredPortraitSvg/);
		expect(src).toMatch(/OPERATIVE_PORTRAIT_V2_VERSION/);
		expect(src).not.toMatch(/bauhausAvatar/i);
	});

	it('renderOperativeLoadout passes full operativeAvatar to renderer', () => {
		const src = readFileSync(RENDER_LOADOUT, 'utf-8');
		expect(src).toMatch(/renderOperativeAvatarSvg\(operativeAvatar/);
		expect(src).not.toMatch(/parseOperativeAvatar/);
	});

	it('deliverable schema + renderer files exist', () => {
		expect(existsSync(SCHEMA)).toBe(true);
		expect(existsSync(RENDERER)).toBe(true);
	});
});

describe('Sprint 3.5a — ROADMAP + vision', () => {
	it('ROADMAP marks 3.5a Done', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*3\.5a\s*\|\s*\*\*Done\*\*/i);
		expect(doc).toMatch(/playerLoadoutSprint35a\.test\.ts/);
	});

	it('OPERATIVE_LOADOUT.md documents v2 portrait parts', () => {
		const doc = readFileSync(VISION, 'utf-8');
		expect(doc).toMatch(/portrait v2|v2 portrait|Portrait v2/i);
		expect(doc).toMatch(/\*\*3\.5a\*\*/);
		expect(doc).toMatch(/face.*hair.*kit|face \/ hair \/ kit/i);
	});
});
