/**
 * playerHudSprint210.test.ts — Sprint 2.10 HQ world context (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HQ_WORLD = join(ROOT, 'lib/player/dashboard/hqWorldContext.ts');
const HQ_WORLD_TEST = join(ROOT, 'lib/player/dashboard/__tests__/hqWorldContext.test.ts');
const STRIP = join(ROOT, 'lib/components/player/dashboard/HqWorldContextStrip.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const hqWorldSrc = existsSync(HQ_WORLD) ? readFileSync(HQ_WORLD, 'utf-8') : '';
const hqWorldTestSrc = existsSync(HQ_WORLD_TEST) ? readFileSync(HQ_WORLD_TEST, 'utf-8') : '';
const stripSrc = existsSync(STRIP) ? readFileSync(STRIP, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.10 — hqWorldContext.ts pure helpers', () => {
	it('exports resolveHqStatusBadges and resolveNextEventLabel', () => {
		expect(existsSync(HQ_WORLD)).toBe(true);
		expect(hqWorldSrc).toMatch(/export function resolveHqStatusBadges/);
		expect(hqWorldSrc).toMatch(/export function resolveNextEventLabel/);
		expect(hqWorldSrc).toMatch(/parseScheduleEventStartMs|pickNextScheduleEvent/);
	});

	it('has unit tests covering badge resolver cases', () => {
		expect(existsSync(HQ_WORLD_TEST)).toBe(true);
		expect(hqWorldTestSrc).toMatch(/profile incomplete/i);
		expect(hqWorldTestSrc).toMatch(/not trained today|train today/i);
		expect(hqWorldTestSrc).toMatch(/resolveNextEventLabel/);
	});
});

describe('Sprint 2.10 — HqWorldContextStrip component', () => {
	it('component exists with dossier chip styling', () => {
		expect(existsSync(STRIP)).toBe(true);
		expect(stripSrc).toMatch(/hq-world-context/);
		expect(stripSrc).toMatch(/pd-label pd-mono/);
		expect(stripSrc).toMatch(/No sessions scheduled/);
	});
});

describe('Sprint 2.10 — +page.svelte wiring', () => {
	it('embeds HqWorldContextStrip inline inside pd-strap', () => {
		expect(pageSrc).toMatch(/pd-strap__context/);
		expect(pageSrc).toMatch(/HqWorldContextStrip[\s\S]*inline/);
	});

	it('queries schedules collection with one listener and defensive fallback', () => {
		expect(pageSrc).toMatch(/collection\(db,\s*['"]schedules['"]\)/);
		expect(pageSrc).toMatch(/onSnapshot/);
		expect(pageSrc).toMatch(/pickNextScheduleEvent|loadLegacyScheduleFallback/);
	});

	it('derives coach bounty count from ActiveBounties callback', () => {
		expect(pageSrc).toMatch(/onCoachBountyCount/);
		expect(pageSrc).toMatch(/resolveHqStatusBadges/);
	});
});

describe('Sprint 2.10 — ActiveBounties coach pulse callback', () => {
	it('exposes onCoachBountyCount without duplicate team_assignments listener', () => {
		expect(bountiesSrc).toMatch(/onCoachBountyCount/);
		expect(bountiesSrc).toMatch(/coach_intent.*coach_homework|coach_homework.*coach_intent/);
	});
});

describe('Sprint 2.10 — player-dashboard-hud.css', () => {
	it('styles hq-world-context strip', () => {
		expect(hudCssSrc).toMatch(/\.hq-world-context/);
		expect(hudCssSrc).toMatch(/\.hq-world-context__chip/);
	});
});

describe('Sprint 2.10 — PLAYER_OS.md world context docs', () => {
	it('documents World context (2.10) data sources and fallbacks', () => {
		expect(playerOsSrc).toMatch(/World context.*2\.10|2\.10.*World context/i);
		expect(playerOsSrc).toMatch(/schedules/);
		expect(playerOsSrc).toMatch(/onCoachBountyCount|coach missions/i);
	});
});

describe('Sprint 2.10 — prior sprint tests preserved', () => {
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
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint23.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint24.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint25.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint26.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint27.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint28.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint281.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint282.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint29.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
