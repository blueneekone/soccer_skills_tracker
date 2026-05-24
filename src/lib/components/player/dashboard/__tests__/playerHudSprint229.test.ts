/**
 * playerHudSprint229.test.ts — Sprint 2.22 slice 6c HQ analytics void island
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

describe('Sprint 2.22 slice 6c — analytics void island', () => {
	it('+page.svelte uses player-analytics-void on analytics section', () => {
		expect(pageSrc).toMatch(/player-analytics-void/);
		expect(pageSrc).toMatch(/data-region="player-analytics-void"/);
	});

	it('analytics section does not combine bento-card + pd-surface-premium on same element', () => {
		const voidSection = pageSrc.match(/<section[\s\S]*?player-analytics-void[\s\S]*?>/);
		expect(voidSection?.[0]).toBeTruthy();
		expect(voidSection![0]).not.toMatch(/bento-card/);
		expect(voidSection![0]).not.toMatch(/pd-surface-premium/);
	});

	it('player-dashboard-hud.css contains Sprint 2.22 slice 6c block with pd-os-deck recessed analytics', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6c — analytics layout inside pd-os-deck--recessed/);
		expect(hudCssSrc).toMatch(/\.player-analytics-void\.pd-os-deck--recessed/);
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
	});

	it('.vpp-chart--premium still references --pd-z1-well-bg', () => {
		expect(hudCssSrc).toMatch(/\.vpp-chart--premium\s*\{[^}]*--pd-z1-well-bg/s);
	});

	it('.player-capsules-strip--void present in CSS and +page', () => {
		expect(hudCssSrc).toMatch(/\.player-capsules-strip--void/);
		expect(pageSrc).toMatch(/player-capsules-strip--void/);
	});

	it('void context demotes vpp-head--premium matte frame', () => {
		expect(hudCssSrc).toMatch(
			/\.player-analytics-void\s+\.vpp-head--premium[\s\S]*?background:\s*transparent/,
		);
	});

	it('pd-layer-enter-z2 animation targets player-analytics-void', () => {
		expect(hudCssSrc).toMatch(/\.player-analytics-void[\s\S]*?pd-layer-enter-z2/);
	});
});

describe('Sprint 2.22 slice 6c — ROADMAP sprint pointer', () => {
	it('marks 6c Done in Phase 6 table', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*6c\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/\|\s*\*\*6b-revise\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
	});
});
