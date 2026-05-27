/**
 * @vitest-environment jsdom
 *
 * playerHudSprint243.test.ts — Player OS rubric redesign Wave C (Telemetry: Stats + Tracker)
 *
 * Guards: Stats investigation deck material, diegetic chips, achievement edge-lit rows,
 * Tracker archive hierarchy; absorbs ROADMAP 6l-a / 6l-b scope.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const TRACKER = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const GAP_MATRIX = join(ROOT, '..', 'docs/vision/PLAYER_OS_RUBRIC_GAP_MATRIX.md');

const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const trackerSrc = existsSync(TRACKER) ? readFileSync(TRACKER, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const gapMatrixSrc = existsSync(GAP_MATRIX) ? readFileSync(GAP_MATRIX, 'utf-8') : '';

const WAVE_C_TOUCHED = [statsSrc, trackerSrc, hudCss, dossierCss].join('\n');

function playerVppBlock() {
	return (
		statsSrc.match(/\{#if isPlayerRole\}\s*<section[\s\S]*?VanguardProtocolPanel[\s\S]*?<\/section>/)?.[0] ??
		''
	);
}

function playerAchievementBlock() {
	return statsSrc.match(/stats-achievement-deck[\s\S]*?<\/section>/)?.[0] ?? '';
}

describe('Wave C — Stats strap + analytics void deck', () => {
	it('player stats path uses PlayerOsPageStrap (pd-route-strap) — not qa-strap', () => {
		expect(statsSrc).toMatch(/import PlayerOsPageStrap/);
		expect(statsSrc).toMatch(/<PlayerOsPageStrap/);
		expect(statsSrc).not.toMatch(/qa-strap/);
	});

	it('player stats root gates player-dossier-root and player-hud-root', () => {
		expect(statsSrc).toMatch(/player-dossier-root/);
		expect(statsSrc).toMatch(/class:player-hud-root=\{isPlayerRole\}/);
	});

	it('VPP radar section uses pd-os-deck--recessed void island', () => {
		const block = playerVppBlock();
		expect(block).toMatch(/stats-analytics-void[\s\S]*?pd-os-deck--recessed/);
		expect(hudCss).toMatch(/\.stats-analytics-void\.pd-os-deck--recessed/);
	});

	it('player VPP block has no pd-page-panel or dossier-radar matte slab', () => {
		const block = playerVppBlock();
		expect(block).not.toMatch(/pd-page-panel/);
		expect(block).not.toMatch(/dossier-panel/);
		expect(block).not.toMatch(/dossier-radar/);
	});

	it('stats analytics void VPP chart well uses Z1 inset — no extra ::before frame on chart well', () => {
		expect(hudCss).toMatch(
			/(:is\(\.player-analytics-void, \.stats-analytics-void\)|\.stats-analytics-void) \.vpp-chart--premium[\s\S]*--pd-z1-well-bg/,
		);
		expect(hudCss).not.toMatch(/\.stats-analytics-void \.vpp-chart--premium::before/);
		expect(dossierCss).not.toMatch(/\.pd-os-deck::before/);
	});
});

describe('Wave C — Stats workout hero band + diegetic chips', () => {
	it('workout band uses pd-os-deck--hero and pd-os-deck__well for chart container', () => {
		expect(statsSrc).toMatch(/class:pd-os-deck--hero=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:pd-os-deck__well=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/dossier-workout__chart[\s\S]*?pd-os-deck__well/);
		expect(hudCss).toMatch(/\.stats-workout-band \.pd-os-deck__well\.dossier-workout__chart/);
	});

	it('player workout section avoids pd-page-panel matte slab', () => {
		expect(statsSrc).toMatch(/class:pd-page-panel=\{!isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:stats-workout-band=\{isPlayerRole\}/);
	});

	it('stats seg controls use diegetic stats-chip rail on player path', () => {
		expect(statsSrc).toMatch(/class:stats-chip-rail=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:stats-chip=\{isPlayerRole\}/);
		expect(hudCss).toMatch(/\.stats-chip-rail/);
	});

	it('stats chips idle cast shadow; emissive teal on hover only (6j-b train tile parity)', () => {
		const idleChipBlock =
			hudCss.match(/\.player-hud-root \.stats-chip\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		expect(idleChipBlock).toMatch(/0 3px 0 rgba\(0, 0, 0, 0\.4\)/);
		expect(idleChipBlock).not.toMatch(/--pd-emissive-teal/);
		expect(hudCss).toMatch(/\.stats-chip:hover[\s\S]*?--pd-emissive-teal/);
	});

	it('preserves 6g chart resize guard selectors and data-only patch effects', () => {
		expect(statsSrc).toMatch(/workoutChartInst\.update\('none'\)/);
		expect(statsSrc).toMatch(/workoutChartInst\.resize\(\)/);
		expect(statsSrc).toMatch(/\.dossier-workout__chart,\s*\n\s*\.dossier-radar__chart[\s\S]*?min-height:\s*300px/);
		expect(hudCss).toMatch(/\.stats-workout-band \.pd-os-deck__well\.dossier-workout__chart[\s\S]*?min-height:\s*300px/);
	});
});

describe('Wave C — Stats achievement edge-lit rows', () => {
	it('player achievement matrix avoids pd-page-panel', () => {
		expect(statsSrc).toMatch(/class:stats-achievement-deck=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:pd-page-panel=\{!isPlayerRole\}/);
		const block = playerAchievementBlock();
		expect(block).toMatch(/stats-achievement-row/);
		expect(block).toMatch(/pd-os-deck/);
	});

	it('achievement rows use edge-lit Z2 deck pattern in dossier CSS', () => {
		expect(dossierCss).toMatch(/Player OS Wave C — Stats achievement edge-lit rows/);
		expect(dossierCss).toMatch(/\.stats-achievement-row\.pd-os-deck/);
		expect(hudCss).toMatch(/\.stats-achievement-row--unlocked/);
	});
});

describe('Wave C — Tracker archive hierarchy', () => {
	it('tracker uses pd-route-stack and preserved deck classes from 6j-b', () => {
		expect(trackerSrc).toMatch(/pd-content-wrap pd-route-stack/);
		expect(trackerSrc).toMatch(/pd-stat-row pd-os-deck/);
		expect(trackerSrc).toMatch(/pt-lb pd-os-deck pd-os-deck--hero/);
		expect(trackerSrc).toMatch(/pd-os-deck__well pt-ghost--whisper/);
	});

	it('tracker archive section headers for memory deck hierarchy', () => {
		expect(trackerSrc).toMatch(/pt-archive-section/);
		expect(trackerSrc).toMatch(/pt-archive-section__title/);
		expect(hudCss).toMatch(/Player OS Wave C — Tracker memory archive deck hierarchy/);
	});
});

describe('Wave C — anti-patterns + ROADMAP hooks', () => {
	it('touched Wave C files have no neon cyan literals', () => {
		expect(WAVE_C_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(WAVE_C_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('ROADMAP marks Wave C Done with playerHudSprint243 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*C\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint243\.test\.ts/);
	});

	it('ROADMAP retains 6l history as absorbed by Wave C', () => {
		expect(roadmapSrc).toMatch(/6l/);
		expect(roadmapSrc).toMatch(/Wave C|absorbs \*\*6l\*\*/);
	});

	it('gap matrix documents Wave C telemetry scope', () => {
		expect(gapMatrixSrc).toMatch(/Wave C|Session C — Telemetry/);
	});
});
