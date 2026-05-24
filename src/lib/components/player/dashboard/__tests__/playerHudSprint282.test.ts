/**
 * playerHudSprint282.test.ts — Sprint 2.8.2 compact telemetry radar sizing (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');
const SPRINT281 = join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint281.test.ts');

const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

const compactBlock =
	hudCssSrc.match(/\.player-analytics-deck--compact[\s\S]*?\.player-hud-root \.player-capsules-strip/)?.[0] ?? '';

describe('Sprint 2.8.2 — compact radar stays hero-readable', () => {
	it('compact .vpp-chart must NOT cap radar at 168px', () => {
		const chartBlock =
			compactBlock.match(/\.player-analytics-deck--compact \.vpp-chart[\s\S]*?(?=\.player-analytics-deck--compact \.vpp-body)/)?.[0] ??
			'';
		expect(chartBlock).not.toMatch(/max-width:\s*168px/);
		expect(hudCssSrc).not.toMatch(/player-analytics-deck--compact[\s\S]*?max-width:\s*168px/);
	});

	it('asserts min chart target min(100%, 260px) desktop and min(100%, 220px) mobile in hud css', () => {
		expect(compactBlock).toMatch(/max-width:\s*min\(100%,\s*220px\)/);
		expect(compactBlock).toMatch(/max-width:\s*min\(100%,\s*260px\)/);
		expect(compactBlock).toMatch(/minmax\(220px,\s*320px\)/);
		expect(compactBlock).toMatch(/\.vpp-chart[\s\S]*?:global\(\.ar-root\)/);
	});

	it('shrinks inspector in compact, not the chart column ratio', () => {
		expect(compactBlock).toMatch(/\.vpp-inspector[\s\S]*max-width:\s*min\(100%,\s*160px\)/);
		expect(compactBlock).not.toMatch(/grid-template-columns:\s*minmax\(0,\s*4fr\)/);
	});
});

describe('Sprint 2.8.2 — +page compact deck wiring', () => {
	it('+page still applies player-analytics-deck--compact when !telemetryReady', () => {
		expect(pageSrc).toMatch(/player-analytics-deck--compact=\{!telemetryReady\}/);
		expect(pageSrc).toMatch(/compact=\{!telemetryReady\}/);
		expect(pageSrc).toMatch(/telemetryReady\s*=\s*\$derived\(hasVanguardTelemetry/);
	});
});

describe('Sprint 2.8.2 — PLAYER_OS.md note', () => {
	it('documents compact deck shrinks inspector, radar stays hero', () => {
		expect(playerOsSrc).toMatch(/2\.8\.2/);
		expect(playerOsSrc).toMatch(/shrinks inspector|inspector padding/i);
		expect(playerOsSrc).toMatch(/radar stays|stays legible|stays hero/i);
	});
});

describe('Sprint 2.8.2 — prior sprint 2.8.1 test preserved', () => {
	it('playerHudSprint281.test.ts still exists', () => {
		expect(existsSync(SPRINT281)).toBe(true);
	});
});
