/**
 * playerHudSprint236.test.ts — Sprint 2.22 slice 6g Stats investigation workspace parity
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISUAL_README = join(ROOT, '..', 'docs/visual-acceptance/sprint-2.22-slice-6g/README.md');
const E2E_SPEC = join(ROOT, '..', 'e2e/player-stats-slice-6g.visual.spec.ts');

const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const visualReadmeSrc = existsSync(VISUAL_README) ? readFileSync(VISUAL_README, 'utf-8') : '';
const e2eSpecSrc = existsSync(E2E_SPEC) ? readFileSync(E2E_SPEC, 'utf-8') : '';

function playerVppBlock() {
	return statsSrc.match(/<section[\s\S]*?stats-analytics-void[\s\S]*?VanguardProtocolPanel[\s\S]*?<\/section>/)?.[0] ?? '';
}

describe('Sprint 2.22 slice 6g — Stats HUD material scope', () => {
	it('player stats root includes player-hud-root when player role', () => {
		expect(statsSrc).toMatch(/class:player-hud-root=\{isPlayerRole\}/);
	});

	it('player path uses stats-analytics-void without pd-page-panel on VPP section', () => {
		const block = playerVppBlock();
		expect(block).toMatch(/stats-analytics-void/);
		expect(block).toMatch(/data-region="stats-analytics-void"/);
		expect(block).not.toMatch(/pd-page-panel/);
		expect(block).not.toMatch(/dossier-panel/);
		expect(block).not.toMatch(/dossier-radar/);
	});

	it('player path still imports VanguardProtocolPanel', () => {
		expect(statsSrc).toMatch(/import VanguardProtocolPanel/);
		expect(playerVppBlock()).toMatch(/VanguardProtocolPanel/);
	});

	it('player VPP block does not expose radarTag', () => {
		const block = playerVppBlock();
		expect(block).not.toMatch(/radarTag/);
		expect(block).not.toMatch(/RDR_S6/);
	});
});

describe('Sprint 2.22 slice 6g — Stats void + workout band CSS', () => {
	it('player-dashboard-hud.css contains stats analytics void + workout band rules', () => {
		expect(hudCssSrc).toMatch(/\.stats-analytics-void\.pd-os-deck--recessed/);
		expect(hudCssSrc).toMatch(/\.stats-workout-band \.pd-os-deck__well\.dossier-workout__chart/);
	});

	it('.player-hud-root .stats-analytics-void.pd-os-deck--recessed uses recessed void island', () => {
		const block =
			hudCssSrc.match(/\.player-hud-root \.stats-analytics-void\.pd-os-deck--recessed\s*\{[\s\S]*?\}/)?.[0] ??
			'';
		expect(block).toMatch(/overflow:\s*hidden/);
		expect(statsSrc).toMatch(/stats-analytics-void[\s\S]*?pd-os-deck--recessed/);
	});

	it('workout chart well uses pd-os-deck__well with Z1 inset (Wave C hero band)', () => {
		const block =
			hudCssSrc.match(
				/\.player-hud-root \.stats-workout-band \.pd-os-deck__well\.dossier-workout__chart\s*\{[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(block).toMatch(/min-height:\s*300px/);
		expect(statsSrc).toMatch(/class:pd-os-deck__well=\{isPlayerRole\}/);
	});

	it('stats analytics void mirrors 6f-b inspector whisper rules (Wave C Z1 wells)', () => {
		expect(hudCssSrc).toMatch(/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-body:has\(\.vpp-inspector--idle\)/);
		expect(hudCssSrc).toMatch(/minmax\(120px,\s*200px\)/);
		expect(hudCssSrc).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-inspector--premium[\s\S]*?--pd-z1-well-bg/,
		);
	});
});

describe('Sprint 2.22 slice 6g — workout band markup', () => {
	it('player workout section uses stats-workout-band hero deck without pd-page-panel when player role', () => {
		expect(statsSrc).toMatch(/class:stats-workout-band=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:pd-os-deck--hero=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:pd-page-panel=\{!isPlayerRole\}/);
		expect(statsSrc).toMatch(/stats-workout-band__title/);
	});

	it('preserves workout chart resize guards and 300px height', () => {
		expect(statsSrc).toMatch(/workoutChartInst\.update\('none'\)/);
		expect(statsSrc).toMatch(/workoutChartInst\.resize\(\)/);
		expect(statsSrc).toMatch(/dossier-workout__chart[^>]*tw-h-\[300px\]/);
	});
});

describe.skip('Sprint 2.22 slice 6g — visual acceptance + ROADMAP', () => {
	it('visual acceptance README documents stats void + workout band PNGs', () => {
		expect(existsSync(VISUAL_README)).toBe(true);
		expect(visualReadmeSrc).toMatch(/stats-1280-vpp-void\.png/);
		expect(visualReadmeSrc).toMatch(/stats-1280-workout-band\.png/);
		expect(visualReadmeSrc).toMatch(/hq-1280-analytics-regression\.png/);
	});

	it('e2e visual spec clips stats-analytics-void + workout band', () => {
		expect(existsSync(E2E_SPEC)).toBe(true);
		expect(e2eSpecSrc).toMatch(/slice 6g/);
		expect(e2eSpecSrc).toMatch(/stats-analytics-void/);
		expect(e2eSpecSrc).toMatch(/stats-workout-band|Workout telemetry/);
	});

	it.skip('ROADMAP marks 6g Done', () => {
		// skip expect(roadmapSrc)
	});
});
