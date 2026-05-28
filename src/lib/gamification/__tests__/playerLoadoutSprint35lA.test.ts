/**
 * playerLoadoutSprint35lA.test.ts — Sprint 3.5l-a Portrait compose/clip fix (no art redraw)
 * Authority: PORTRAIT_ART_DIRECTION.md §2 Registration grid · §2 Human coherence
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultPortraitV2 } from '../../avatars/portraitV2Schema.js';
import {
	LAYER_ORDER,
	renderLayeredPortraitSvg,
	renderPortraitPartLayer,
} from '../../avatars/renderLayeredPortrait.js';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const RENDERER = join(ROOT, 'lib/avatars/renderLayeredPortrait.js');
const OICF = join(ROOT, 'lib/components/stats/OperativeIdCardFrame.svelte');
const FACE_DEFAULT = join(ROOT, '..', 'static/portrait/face-default.svg');
const FACE_ROUND = join(ROOT, '..', 'static/portrait/face-round.svg');
const FACE_ANGULAR = join(ROOT, '..', 'static/portrait/face-angular.svg');

/** Side ear ellipses at eye height — cx outside eye wells (~104/152), cy ~118–122. */
const SIDE_EAR_ELLIPSE =
	/<ellipse[^>]+cx="(?:7[0-9]|8[0-9]|1[6-9][0-9])"[^>]+cy="(?:11[0-9]|12[0-5])"/;

describe('Sprint 3.5l-a — flattened inline compose pipeline', () => {
	it('LAYER_ORDER remains kit → face → hair', () => {
		expect(LAYER_ORDER).toEqual(['kit', 'face', 'hair']);
		const renderer = readFileSync(RENDERER, 'utf-8');
		expect(renderer).toMatch(/export const LAYER_ORDER/);
	});

	it('renderLayeredPortraitSvg includes hair layer when hair part equipped', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2(), 128);
		expect(svg).toMatch(/data-portrait-layer="hair"/);
		expect(svg).toMatch(/data-portrait-layer="face"/);
		expect(svg).toMatch(/data-portrait-layer="kit"/);
		const kitIdx = svg.indexOf('data-portrait-layer="kit"');
		const faceIdx = svg.indexOf('data-portrait-layer="face"');
		const hairIdx = svg.indexOf('data-portrait-layer="hair"');
		expect(faceIdx).toBeGreaterThan(kitIdx);
		expect(hairIdx).toBeGreaterThan(faceIdx);
	});

	it('renderPortraitPartLayer inlines svgInner fragments — no nested <svg> or <image href>', () => {
		const hair = renderPortraitPartLayer('portrait_hair_default', 128);
		expect(hair).toMatch(/data-portrait-layer="hair"/);
		expect(hair).toMatch(/<path\b|<ellipse\b/);
		expect(hair).not.toMatch(/<svg\b/);
		expect(hair).not.toMatch(/<image\b/);
		expect(hair).not.toMatch(/href="\/portrait\//);
	});

	it('composed portrait uses overflow visible on outer svg only', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2(), 96);
		expect(svg).toMatch(/overflow="visible"/);
		expect(svg.match(/<svg\b/g)?.length).toBe(1);
	});
});

describe('Sprint 3.5l-a — face-default side ear removal', () => {
	it('face-default.svg omits side ear ellipse pattern at eye height', () => {
		const svg = readFileSync(FACE_DEFAULT, 'utf-8');
		expect(svg).not.toMatch(/ellipse cx="78" cy="118"/);
		expect(svg).not.toMatch(/ellipse cx="178" cy="118"/);
		expect(svg).not.toMatch(SIDE_EAR_ELLIPSE);
		expect(svg).toMatch(/viewBox="0 0 256 256"/);
	});

	it('face-round and face-angular omit side ear shapes at eye height', () => {
		for (const file of [FACE_ROUND, FACE_ANGULAR]) {
			const svg = readFileSync(file, 'utf-8');
			expect(svg).not.toMatch(SIDE_EAR_ELLIPSE);
			expect(svg).not.toMatch(/ellipse cx="74" cy="122"/);
			expect(svg).not.toMatch(/ellipse cx="182" cy="122"/);
			expect(svg).not.toMatch(/M 76 112 L 68 138/);
			expect(svg).not.toMatch(/M 180 112 L 188 138/);
		}
	});
});

describe('Sprint 3.5l-a — holo portrait well clip guard (extended 3.5m-frame)', () => {
	it('OperativeIdCardFrame uses unified layered-portrait clip — no per-layer hair sticker clip', () => {
		const src = readFileSync(OICF, 'utf-8');
		expect(src).toMatch(/svg\.layered-portrait/);
		expect(src).toMatch(/clip-path:\s*circle\(48%\s+at\s+50%\s+50%\)/);
		expect(src).not.toMatch(/data-portrait-layer='hair'[\s\S]*?clip-path:\s*none/);
		expect(src).not.toMatch(/data-portrait-layer='kit'[\s\S]*?clip-path:\s*circle/);
	});
});

describe('Sprint 3.5l-a — ROADMAP handoff', () => {
	it('ROADMAP marks 3.5l-a Done (Phase 3 track supersedes 3.5l-b)', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*\*\*3\.5l-a\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(doc).toMatch(/playerLoadoutSprint35lA\.test\.ts/);
		expect(doc).toMatch(/3\.5m-frame|Phase 3/i);
	});
});
