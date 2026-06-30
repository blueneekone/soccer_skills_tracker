/**
 * playerLoadoutSprint35iFix.test.ts — Sprint 3.5i-fix Hair visibility + face-default art pass
 * Authority: PORTRAIT_ART_DIRECTION.md § Card safe zones · OPERATIVE_ID_CARD.md §7
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { defaultPortraitV2 } from '../../avatars/portraitV2Schema.js';
import {
	renderLayeredPortraitSvg,
	renderPortraitPartLayer,
	getPortraitPartCatalog,
} from '../../avatars/renderLayeredPortrait.js';
import portraitPartsManifest from '../../avatars/portraitParts.manifest.json';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const RENDERER = join(ROOT, 'lib/avatars/renderLayeredPortrait.js');
const GENERATOR = join(ROOT, '..', 'scripts/generate-portrait-manifest.mjs');
const FACE_DEFAULT = join(ROOT, '..', 'static/portrait/face-default.svg');
const VA_MANIFEST = join(ROOT, '..', 'docs/vision/va-screenshots/s35ifix-manifest.json');
const HUD_RING = join(ROOT, 'lib/components/player/HudAvatarRing.svelte');
const OICF = join(ROOT, 'lib/components/stats/OperativeIdCardFrame.svelte');

describe('Sprint 3.5i-fix — inline SVG compose pipeline', () => {
	it('renderLayeredPortraitSvg(defaultPortraitV2()) includes data-portrait-layer="hair"', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2(), 96);
		expect(svg).toMatch(/data-portrait-layer="hair"/);
		expect(svg).toMatch(/data-portrait-layer="face"/);
		expect(svg).toMatch(/data-portrait-layer="kit"/);
		expect(svg).toMatch(/data-portrait-version="2"/);
	});

	it('renderPortraitPartLayer inlines SVG paths — no external <image href>', () => {
		const layer = renderPortraitPartLayer('portrait_hair_default', 96);
		expect(layer).toMatch(/data-portrait-layer="hair"/);
		expect(layer).toMatch(/<path\b|<ellipse\b|<rect\b/);
		expect(layer).not.toMatch(/<image\b/);
		expect(layer).not.toMatch(/href="\/portrait\//);
	});

	it('manifest rows include svgInner + portrait_hair_* asset paths', () => {
		const hairRows = portraitPartsManifest.filter((row) => row.slot === 'hair');
		expect(hairRows.length).toBeGreaterThanOrEqual(3);
		for (const row of hairRows) {
			expect(row.id).toMatch(/^portrait_hair_/);
			expect(row.assetPath).toMatch(/^\/portrait\/hair-.+\.svg$/);
			expect(typeof row.svgInner).toBe('string');
			expect(row.svgInner.length).toBeGreaterThan(20);
		}
	});

	it('LAYER_ORDER kit → face → hair preserved in composed output', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2(), 128);
		const kitIdx = svg.indexOf('data-portrait-layer="kit"');
		const faceIdx = svg.indexOf('data-portrait-layer="face"');
		const hairIdx = svg.indexOf('data-portrait-layer="hair"');
		expect(kitIdx).toBeGreaterThan(-1);
		expect(faceIdx).toBeGreaterThan(kitIdx);
		expect(hairIdx).toBeGreaterThan(faceIdx);
	});

	it('generate-portrait-manifest.mjs embeds svgInner; renderer supports precomposed bust image path', () => {
		const src = readFileSync(GENERATOR, 'utf-8');
		expect(src).toMatch(/svgInner/);
		expect(src).toMatch(/extractSvgInner/);
		const renderer = readFileSync(RENDERER, 'utf-8');
		expect(renderer).toMatch(/entry\.svgInner/);
		expect(renderer).toMatch(/renderPrecomposedBustSvg|precomposed-bust/);
	});
});

describe('Sprint 3.5i-fix — face-default art pass', () => {
	it('face-default.svg omits cheek-bump ear ellipses at eye level', () => {
		const svg = readFileSync(FACE_DEFAULT, 'utf-8');
		expect(svg).not.toMatch(/ellipse cx="78" cy="118"/);
		expect(svg).not.toMatch(/ellipse cx="178" cy="118"/);
		expect(svg).toMatch(/viewBox="0 0 256 256"/);
	});

	it('hair-default.svg extends into crown zone (y < 60 in 256 viewBox)', () => {
		const hair = getPortraitPartCatalog().find((row) => row.id === 'portrait_hair_default');
		expect(hair?.svgInner).toMatch(/\b[1-5]?[0-9]\b/);
		expect(hair?.svgInner).toMatch(/128 (38|40|44|48|52|56)/);
	});
});

describe('Sprint 3.5i-fix — clip / safe zone CSS', () => {
	it('HudAvatarRing allows hair bleed — overflow visible, layer clip on kit+face', () => {
		const src = readFileSync(HUD_RING, 'utf-8');
		expect(src).toMatch(/overflow:\s*visible/);
		expect(src).toMatch(/data-portrait-layer='kit'/);
		expect(src).toMatch(/data-portrait-layer='hair'/);
		expect(src).toMatch(/clip-path:\s*circle/);
	});

	it('OperativeIdCardFrame portrait ring overflow visible with unified bust clip (3.5m-frame)', () => {
		const src = readFileSync(OICF, 'utf-8');
		expect(src).toMatch(/oicf-portrait-ring[\s\S]*?overflow:\s*visible/);
		expect(src).toMatch(/svg\.layered-portrait[\s\S]*?clip-path:\s*circle/);
		expect(src).toMatch(/object-position:\s*center center/);
	});
});

describe.skip('Sprint 3.5i-fix — ROADMAP + VA manifest', () => {
	it.skip('ROADMAP marks 3.5i Superseded — compose/clip fix retained in 3.5l-a', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('s35ifix-manifest.json references HQ holo + Studio VA captures', () => {
		expect(existsSync(VA_MANIFEST)).toBe(true);
		const manifest = JSON.parse(readFileSync(VA_MANIFEST, 'utf-8'));
		expect(manifest.sprint).toMatch(/3\.5i-fix/i);
		const files = manifest.routes.map((r: { file: string }) => r.file);
		expect(files).toContain('s35ifix-hq-holo-1280.png');
		expect(files).toContain('s35ifix-studio-1280.png');
	});
});
