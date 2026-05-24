/**
 * playerHudSprint23.test.ts — Sprint 2.3 Gold Command HUD unification (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const STAT_CELL = join(ROOT, 'lib/components/player/dashboard/HudStatCell.svelte');
const CHIP = join(ROOT, 'lib/components/player/dashboard/HudMetricChip.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const statCellSrc = existsSync(STAT_CELL) ? readFileSync(STAT_CELL, 'utf-8') : '';
const chipSrc = existsSync(CHIP) ? readFileSync(CHIP, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.3 — HudStatCell ringless stat cell', () => {
	it('HudStatCell.svelte exists in player/dashboard/', () => {
		expect(existsSync(STAT_CELL)).toBe(true);
	});

	it('HudStatCell does NOT import HudSeededRingCanvas', () => {
		expect(statCellSrc).not.toMatch(/HudSeededRingCanvas/);
	});

	it('HudStatCell uses hud-stat-cell classes', () => {
		expect(statCellSrc).toMatch(/hud-stat-cell/);
		expect(statCellSrc).toMatch(/hud-stat-cell__label/);
		expect(statCellSrc).toMatch(/hud-stat-cell__value/);
	});
});

describe('Sprint 2.3 — IdentityBentoModule stat grid', () => {
	it('IdentityBentoModule imports HudStatCell for metrics', () => {
		expect(ibmSrc).toMatch(/import HudStatCell/);
		expect(ibmSrc).toMatch(/<HudStatCell/);
	});

	it('IdentityBentoModule does NOT use HudMetricChip with rings for streak/XP', () => {
		expect(ibmSrc).not.toMatch(/<HudMetricChip/);
	});

	it('.ibm-metrics uses CSS grid with equal stat columns', () => {
		expect(ibmSrc).toMatch(/\.ibm-metrics[\s\S]*?display:\s*grid/);
		expect(ibmSrc).toMatch(/grid-template-columns:\s*1fr\s+1fr/);
	});
});

describe('Sprint 2.3 — OperativeHub scanlines (removed in 2.8 Player Dossier)', () => {
	it('operative-hub__scanlines element removed from OperativeHub markup', () => {
		expect(hubSrc).not.toMatch(/operative-hub__scanlines/);
	});
});

describe('Sprint 2.3 — ActiveBounties embedded path', () => {
	it('hud-telemetry-root applied only when NOT embedded', () => {
		expect(bountiesSrc).toMatch(/hud-telemetry-root[\s\S]*?!embedded|class:hud-telemetry-root=\{!embedded\}/);
	});

	it('embedded header has no // MISSION DECK eyebrow', () => {
		const embeddedBlock = bountiesSrc.match(/\{#if embedded\}[\s\S]*?\{:else\}/)?.[0] ?? '';
		expect(embeddedBlock).not.toMatch(/MISSION DECK/);
		expect(embeddedBlock).not.toMatch(/quest-log__eyebrow--deck/);
	});
});

describe('Sprint 2.3 — HudMetricChip compat wrapper', () => {
	it('HudMetricChip delegates to HudStatCell without HudSeededRingCanvas', () => {
		expect(chipSrc).toMatch(/HudStatCell/);
		expect(chipSrc).not.toMatch(/HudSeededRingCanvas/);
	});
});

describe('Sprint 2.3 — PLAYER_OS design system docs', () => {
	it('PLAYER_OS.md contains Player OS Design System section', () => {
		expect(playerOsSrc).toMatch(/Player OS Design System/);
	});

	it('PLAYER_OS.md documents no cyan/teal on player dashboard', () => {
		expect(playerOsSrc).toMatch(/cyan|teal|#22d3ee/i);
		expect(playerOsSrc).toMatch(/player dashboard/i);
	});
});

describe('Sprint 2.3 — Sprint 2.1.1 guard (no PlayerCommandCenter on page)', () => {
	it('+page.svelte does NOT import PlayerCommandCenter', () => {
		expect(pageSrc).not.toMatch(/PlayerCommandCenter/);
	});
});

describe('Sprint 2.3 — reduced-motion guards preserved (2.2)', () => {
	it('player-dashboard-hud.css retains prefers-reduced-motion guards', () => {
		expect(hudCssSrc).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
		expect(hudCssSrc).toMatch(/animation:\s*none\s*!important/);
	});
});

describe('Sprint 2.3 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint14.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint15.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint16.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint17.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint20.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint21.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint22.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
