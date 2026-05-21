/**
 * playerHudSprint26.test.ts — Sprint 2.6 HQ content loop (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const METRICS = join(ROOT, 'lib/player/dashboard/playerHudMetrics.ts');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const metricsSrc = existsSync(METRICS) ? readFileSync(METRICS, 'utf-8') : '';
const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.6 — playerHudMetrics formatLastTrainingLabel', () => {
	it('exports formatLastTrainingLabel', () => {
		expect(metricsSrc).toMatch(/export function formatLastTrainingLabel/);
	});
});

describe('Sprint 2.6 — IdentityBentoModule rank progress + last session', () => {
	it('has rank progress UI classes', () => {
		expect(identitySrc).toMatch(/ibm-rank-progress/);
		expect(identitySrc).toMatch(/ibm-rank-progress__bar/);
		expect(identitySrc).toMatch(/ibm-rank-progress__fill/);
	});

	it('displays xp-to-next-rank copy', () => {
		expect(identitySrc).toMatch(/XP TO|xpToNextRank|nextRank/i);
	});

	it('has last session line', () => {
		expect(identitySrc).toMatch(/ibm-last-session/);
		expect(identitySrc).toMatch(/formatLastTrainingLabel|LAST TRAINED/i);
	});
});

describe('Sprint 2.6 — ActiveBounties embedded hero mission', () => {
	it('imports selectPrimaryBounty', () => {
		expect(bountiesSrc).toMatch(/selectPrimaryBounty/);
	});

	it('renders quest-hero card for primary mission', () => {
		expect(bountiesSrc).toMatch(/quest-hero/);
		expect(bountiesSrc).toMatch(/quest-hero__cta/);
	});

	it('excludes hero quest from compact embedded list', () => {
		expect(bountiesSrc).toMatch(/heroQuest\.id|q\.id !== heroQuest\.id/);
	});
});

describe('Sprint 2.6 — +page.svelte wiring', () => {
	it('passes lastTrainingUtc and rank progress fields to IdentityBentoModule', () => {
		expect(pageSrc).toMatch(/lastTrainingUtc/);
		expect(pageSrc).toMatch(/last_training_utc/);
		expect(pageSrc).toMatch(/rankProgressPercent|progressPercent/);
		expect(pageSrc).toMatch(/atMaxRank/);
		expect(pageSrc).toMatch(/nextRank/);
	});

	it('does NOT import PlayerCommandCenter (2.1.1 guard)', () => {
		expect(pageSrc).not.toMatch(/PlayerCommandCenter/);
	});
});

describe('Sprint 2.6 — player-dashboard-hud.css', () => {
	it('styles rank progress, last session, and quest hero', () => {
		expect(hudCssSrc).toMatch(/\.ibm-rank-progress/);
		expect(hudCssSrc).toMatch(/\.ibm-last-session/);
		expect(hudCssSrc).toMatch(/\.quest-hero/);
	});
});

describe('Sprint 2.6 — PLAYER_OS.md HQ content loop', () => {
	it('documents hero mission, rank bar, and last session', () => {
		expect(playerOsSrc).toMatch(/HQ content loop/i);
		expect(playerOsSrc).toMatch(/selectPrimaryBounty|hero mission/i);
		expect(playerOsSrc).toMatch(/last_training_utc|last session/i);
		expect(playerOsSrc).toMatch(/getCurrentRank|rank progress/i);
	});
});

describe('Sprint 2.6 — prior sprint tests preserved', () => {
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
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
