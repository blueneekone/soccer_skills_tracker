/**
 * playerHudSprint281.test.ts — Sprint 2.8.1 Player Dossier polish + HQ logic fix (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	resolveHeroQuest,
	type QuestTask,
} from '../../../../player/dashboard/activeBounties.js';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');
const BOUNTIES_TEST = join(ROOT, 'lib/player/dashboard/__tests__/activeBounties.test.ts');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const bountiesTsSrc = existsSync(BOUNTIES_TS) ? readFileSync(BOUNTIES_TS, 'utf-8') : '';
const bountiesTestSrc = existsSync(BOUNTIES_TEST) ? readFileSync(BOUNTIES_TEST, 'utf-8') : '';
const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe.skip('Sprint 2.8.1 — resolveHeroQuest claimed training + stale last_training_utc', () => {
	it('synthesizes daily-training-log hero when quest absent from filtered list', () => {
		expect(bountiesTsSrc).toMatch(/synthesizeTrainingHeroQuest/);
		expect(bountiesTsSrc).toMatch(/!trainedToday[\s\S]*synthesizeTrainingHeroQuest/);
	});

	it('returns daily-training-log when claimed but stats say not trained today', () => {
		const streakCheck: QuestTask = {
			id: 'daily-streak-check',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: 'Protect your 5-day streak',
			axisId: 'PAC',
			xpReward: 20,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 1,
		};
		const now = new Date(Date.UTC(2026, 4, 21));
		const hero = resolveHeroQuest([streakCheck], {
			lastTrainingUtc: '2026-05-20',
			now,
		});
		expect(hero?.id).toBe('daily-training-log');
	});

	it('activeBounties.test.ts covers claimed training + stale last_training_utc', () => {
		expect(bountiesTestSrc).toMatch(/claimed but last_training_utc is stale|claimed training \+ stale/i);
		expect(bountiesTestSrc).toMatch(/daily-training-log/);
	});
});

describe.skip('Sprint 2.8.1 — ibm-profile-banner dossier tokens', () => {
	it('IdentityBentoModule uses profile banner eyebrow + action structure', () => {
		expect(identitySrc).toMatch(/ibm-profile-banner__eyebrow/);
		expect(identitySrc).toMatch(/ibm-profile-banner__action/);
	});

	it('styles banner with pd-panel and pd accent tokens', () => {
		const bannerBlock =
			hudCssSrc.match(/\.player-hud-root \.ibm-profile-banner[\s\S]*?\.player-hud-root \.ibm-profile-banner__eyebrow/)?.[0] ??
			hudCssSrc.match(/\.player-hud-root \.ibm-profile-banner[\s\S]{0,800}/)?.[0] ??
			'';
		expect(bannerBlock).toMatch(/var\(--pd-panel|--pd-panel/);
		expect(bannerBlock).toMatch(/var\(--pd-line|--pd-line/);
		expect(hudCssSrc).toMatch(/\.ibm-profile-banner__eyebrow[\s\S]*--pd-accent-data/);
		expect(hudCssSrc).toMatch(/\.ibm-profile-banner:hover[\s\S]*--pd-accent-action|#fbbf24/);
	});
});

describe.skip('Sprint 2.8.1 — IdentityBentoModule hideDisplayName strap dedupe', () => {
	it('exports hideDisplayName prop and conditionally hides ibm-name', () => {
		expect(identitySrc).toMatch(/hideDisplayName/);
		expect(identitySrc).toMatch(/\{#if !hideDisplayName\}/);
		expect(identitySrc).toMatch(/ibm-meta--strap/);
	});

	it('+page passes hideDisplayName when pd-strap shows callsign', () => {
		expect(pageSrc).toMatch(/pd-strap/);
		expect(pageSrc).toMatch(/hideDisplayName=\{true\}/);
	});
});

describe.skip('Sprint 2.8.1 — compact telemetry tightening', () => {
	it('further reduces compact analytics deck and inspector sizing', () => {
		const compactBlock =
			hudCssSrc.match(/\.player-analytics-deck--compact[\s\S]*?\.player-hud-root \.player-capsules-strip/)?.[0] ?? '';
		expect(compactBlock).toMatch(/min-height:\s*0/);
		expect(compactBlock).toMatch(/vpp-inspector[\s\S]*max-width:\s*min\(100%,/);
		expect(compactBlock).toMatch(/vpp-inspector__ghost/);
	});
});

describe.skip('Sprint 2.8.1 — PLAYER_OS.md note', () => {
	it('documents sprint 2.8.1 polish items', () => {
		expect(playerOsSrc).toMatch(/2\.8\.1/);
		expect(playerOsSrc).toMatch(/resolveHeroQuest|daily-training-log/);
		expect(playerOsSrc).toMatch(/hideDisplayName|strap dedupe/i);
	});
});

describe.skip('Sprint 2.8.1 — prior sprint tests preserved', () => {
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
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
