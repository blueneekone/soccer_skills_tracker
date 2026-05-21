/**
 * playerHudSprint27.test.ts — Sprint 2.7 Presence & hierarchy (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const METRICS = join(ROOT, 'lib/player/dashboard/playerHudMetrics.ts');
const BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');
const BOUNTIES_TEST = join(ROOT, 'lib/player/dashboard/__tests__/activeBounties.test.ts');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const HMP = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const metricsSrc = existsSync(METRICS) ? readFileSync(METRICS, 'utf-8') : '';
const bountiesTsSrc = existsSync(BOUNTIES_TS) ? readFileSync(BOUNTIES_TS, 'utf-8') : '';
const bountiesTestSrc = existsSync(BOUNTIES_TEST) ? readFileSync(BOUNTIES_TEST, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const hmpSrc = existsSync(HMP) ? readFileSync(HMP, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.7 — playerHudMetrics isTrainingToday', () => {
	it('exports isTrainingToday', () => {
		expect(metricsSrc).toMatch(/export function isTrainingToday/);
	});
});

describe('Sprint 2.7 — activeBounties resolveHeroQuest', () => {
	it('exports resolveHeroQuest', () => {
		expect(bountiesTsSrc).toMatch(/export function resolveHeroQuest/);
	});

	it('activeBounties.test.ts covers not-trained-today and trained-today streak hero', () => {
		expect(bountiesTestSrc).toMatch(/resolveHeroQuest/);
		expect(bountiesTestSrc).toMatch(/daily-training-log/);
		expect(bountiesTestSrc).toMatch(/daily-streak-check/);
		expect(bountiesTestSrc).toMatch(/not trained today|not-trained-today/i);
	});
});

describe('Sprint 2.7 — ActiveBounties hero wiring', () => {
	it('uses resolveHeroQuest and accepts lastTrainingUtc', () => {
		expect(bountiesSrc).toMatch(/resolveHeroQuest/);
		expect(bountiesSrc).toMatch(/lastTrainingUtc/);
	});
});

describe('Sprint 2.7 — IdentityBentoModule profile banner', () => {
	it('uses ibm-profile-banner instead of full ibm-cta--setup block', () => {
		expect(identitySrc).toMatch(/ibm-profile-banner/);
		expect(identitySrc).not.toMatch(/ibm-cta--setup/);
		expect(identitySrc).not.toMatch(/FINISH PROFILE SETUP/);
	});
});

describe('Sprint 2.7 — HudMetricsPanel collapsed vectors', () => {
	it('has collapsed empty vectors path when embedded && !telemetryReady', () => {
		expect(hmpSrc).toMatch(/hmp-vectors-collapsed/);
		expect(hmpSrc).toMatch(/embedded && !telemetryReady/);
	});
});

describe('Sprint 2.7 — compact analytics deck', () => {
	it('+page applies player-analytics-deck--compact when no telemetry', () => {
		expect(pageSrc).toMatch(/player-analytics-deck--compact/);
		expect(pageSrc).toMatch(/hasVanguardTelemetry|telemetryReady/);
	});

	it('VanguardProtocolPanel or page supports compact mode', () => {
		expect(vppSrc + pageSrc).toMatch(/compact/);
		expect(hudCssSrc).toMatch(/player-analytics-deck--compact/);
	});
});

describe('Sprint 2.7 — player-dashboard-hud.css typography & hierarchy', () => {
	it('scopes ibm-meta to slate without structural blue', () => {
		const metaBlock = hudCssSrc.match(/\.player-hud-root \.ibm-meta[\s\S]*?}/)?.[0] ?? '';
		expect(metaBlock).toMatch(/#64748b/);
		expect(metaBlock).not.toMatch(/#3b82f6/);
	});

	it('quest-hero title white; reward muted; CTA gold', () => {
		expect(hudCssSrc).toMatch(/\.quest-hero__title[\s\S]*#f8fafc|var\(--vanguard-text-1/);
		const rewardBlock = hudCssSrc.match(/\.player-hud-root \.quest-hero__reward[\s\S]*?}/)?.[0] ?? '';
		expect(rewardBlock).toMatch(/\.quest-hero__reward/);
		expect(rewardBlock).not.toMatch(/color:\s*#fbbf24;/);
		expect(rewardBlock).toMatch(/color-mix|#64748b/);
		const ctaBlock = hudCssSrc.match(/\.player-hud-root \.quest-hero__cta[\s\S]*?}/)?.[0] ?? '';
		expect(ctaBlock).toMatch(/#fbbf24/);
	});

	it('styles profile banner and collapsed vectors', () => {
		expect(hudCssSrc).toMatch(/\.ibm-profile-banner/);
		expect(hudCssSrc).toMatch(/\.hmp-vectors-collapsed/);
	});
});

describe('Sprint 2.7 — PLAYER_OS.md presence rules', () => {
	it('documents presence & hierarchy sprint 2.7', () => {
		expect(playerOsSrc).toMatch(/Presence & hierarchy/i);
		expect(playerOsSrc).toMatch(/resolveHeroQuest/);
		expect(playerOsSrc).toMatch(/2\.7/);
	});
});

describe('Sprint 2.7 — +page guards', () => {
	it('passes lastTrainingUtc to ActiveBounties embedded', () => {
		expect(pageSrc).toMatch(/ActiveBounties[\s\S]*lastTrainingUtc/);
	});

	it('does NOT import PlayerCommandCenter (2.1.1 guard)', () => {
		expect(pageSrc).not.toMatch(/PlayerCommandCenter/);
	});
});

describe('Sprint 2.7 — prior sprint tests preserved', () => {
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
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
