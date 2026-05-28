/**
 * playerLoadoutSprint35mFrame.test.ts — Sprint 3.5m-frame Portrait art-well inset & holo integration
 * Authority: PORTRAIT_REFERENCE_BOARD.md · OPERATIVE_ID_CARD.md §3 Z3
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultPortraitV2 } from '../../avatars/portraitV2Schema.js';
import {
	PORTRAIT_BUST_VIEWBOX,
	renderLayeredPortraitSvg,
} from '../../avatars/renderLayeredPortrait.js';

const ROOT = join(__dirname, '..', '..', '..');
const RENDERER = join(ROOT, 'lib/avatars/renderLayeredPortrait.js');
const OICF = join(ROOT, 'lib/components/stats/OperativeIdCardFrame.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const HCS = join(ROOT, 'lib/components/player/HologramCardShell.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

describe('Sprint 3.5m-frame — renderLayeredPortrait centering', () => {
	it('composed SVG uses xMidYMid meet for vertical bust centering', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2(), 128);
		expect(svg).toMatch(/preserveAspectRatio="xMidYMid meet"/);
		expect(svg).not.toMatch(/preserveAspectRatio="xMidYMin meet"/);
	});

	it('exports PORTRAIT_BUST_VIEWBOX constant', () => {
		expect(PORTRAIT_BUST_VIEWBOX).toBe(256);
		const src = readFileSync(RENDERER, 'utf-8');
		expect(src).toMatch(/export const PORTRAIT_BUST_VIEWBOX/);
		expect(src).toMatch(/xMidYMid meet/);
	});
});

describe('Sprint 3.5m-frame — OperativeIdCardFrame art well', () => {
	const src = readFileSync(OICF, 'utf-8');

	it('unified clip on layered-portrait — no per-layer kit/face/hair clip-path split', () => {
		expect(src).toMatch(/svg\.layered-portrait[\s\S]*?clip-path:\s*circle\(48%\s+at\s+50%\s+50%\)/);
		expect(src).not.toMatch(/data-portrait-layer='hair'[\s\S]*?clip-path:\s*none/);
		expect(src).not.toMatch(/data-portrait-layer='kit'[\s\S]*?clip-path:\s*circle\(46%/);
	});

	it('holo variant has recessed portrait well inset (vignette / inner shadow)', () => {
		expect(src).toMatch(/oicf-portrait-ring--holo\s+\.oicf-portrait/);
		expect(src).toMatch(/inset\s+0\s+0\s+22px/);
		expect(src).toMatch(/inset\s+0\s+0\s+18px/);
	});

	it('loadout border remains absolute inset over portrait ring', () => {
		expect(src).toMatch(/\.oicf-loadout-border[\s\S]*?position:\s*absolute[\s\S]*?inset:\s*0/);
	});

	it('art-well uses Z3 height clamp 55–65%', () => {
		expect(src).toMatch(/min-height:\s*clamp\(7rem,\s*55%,\s*65%\)/);
	});
});

describe('Sprint 3.5m-frame — holo shell smoke guards', () => {
	it('IdentityBentoModule wires holo OperativeIdCardFrame without duplicate clip', () => {
		const src = readFileSync(IBM, 'utf-8');
		expect(src).toMatch(/variant="holo"/);
		expect(src).toMatch(/3\.5m-frame/);
		expect(src).not.toMatch(/ibm-holo-face[\s\S]*?clip-path:/);
	});

	it('HologramCardShell documents frame-owned portrait clip (no double-ring)', () => {
		const src = readFileSync(HCS, 'utf-8');
		expect(src).toMatch(/3\.5m-frame/);
		expect(src).not.toMatch(/hcs-content[\s\S]*?clip-path:\s*circle/);
	});
});

describe('Sprint 3.5m-frame — ROADMAP', () => {
	it('marks 3.5m-frame Done and next 3.5m-art', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*\*\*3\.5m-frame\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(doc).toMatch(/3\.5m-frame Done/i);
		expect(doc).toMatch(/next\s*3\.5m-art/i);
		expect(doc).toMatch(/playerLoadoutSprint35mFrame\.test\.ts/);
	});
});
