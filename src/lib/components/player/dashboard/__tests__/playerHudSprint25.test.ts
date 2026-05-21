/**
 * playerHudSprint25.test.ts — Sprint 2.5 command strip layout v2 (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const HMP = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');
const RADAR = join(ROOT, 'lib/components/player/dashboard/AttributeRadar.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const hmpSrc = existsSync(HMP) ? readFileSync(HMP, 'utf-8') : '';
const radarSrc = existsSync(RADAR) ? readFileSync(RADAR, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.5 — OperativeHub 8+4 command strip', () => {
	it('grid has 8+4 command/missions split (main span-8, missions span-4 on md+)', () => {
		expect(hubSrc).toMatch(/operative-hub__main[\s\S]*?bento-span-8/);
		expect(hubSrc).toMatch(/operative-hub__missions[\s\S]*?bento-span-4/);
	});

	it('does NOT use sole bento-span-12 quests row under hub', () => {
		expect(hubSrc).not.toMatch(/operative-hub__quests[\s\S]*?bento-span-12/);
	});

	it('background is flat dominant surface (NOT rgba(2, 2, 2, 0.7) glass)', () => {
		const hubBlock = hubSrc.match(/\.operative-hub\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(hubBlock).not.toMatch(/rgba\(2,\s*2,\s*2,\s*0\.7\)/);
		expect(hubBlock).not.toMatch(/backdrop-filter:\s*blur/);
		expect(hubBlock).toMatch(/var\(--color-dominant|#0f172a/);
	});
});

describe('Sprint 2.5 — IdentityBentoModule conditional avatar', () => {
	it('renders HudAvatarRing when profile complete', () => {
		expect(identitySrc).toMatch(/HudAvatarRing/);
		expect(identitySrc).toMatch(/profileIncomplete|ibm-root--badge-only/);
	});

	it('renders inline badge when profile incomplete', () => {
		expect(identitySrc).toMatch(/ibm-inline-badge/);
		expect(identitySrc).toMatch(/ibm-inline-badge__initials/);
	});

	it('branches layout on profileIncomplete', () => {
		expect(identitySrc).toMatch(/\{#if\s*!profileIncomplete\}|\{#if\s*profileIncomplete\}/);
	});
});

describe('Sprint 2.5 — HudMetricsPanel embedded vectors only', () => {
	it('does NOT render hmp-power / Match Data when embedded', () => {
		const powerBlock = hmpSrc.match(/\{#if[\s\S]*?hmp-power[\s\S]*?\{\/if\}/)?.[0] ?? '';
		expect(powerBlock).toMatch(/!embedded/);
		expect(hmpSrc).toMatch(/hmp-power/);
		expect(hmpSrc).toMatch(/extractPowerMetrics/);
	});
});

describe('Sprint 2.5 — +page.svelte wiring', () => {
	it('passes profileIncomplete={!hasArmoryProfile} to IdentityBentoModule', () => {
		expect(pageSrc).toMatch(/profileIncomplete=\{!hasArmoryProfile\}/);
	});

	it('has player-analytics-deck with VanguardProtocolPanel', () => {
		expect(pageSrc).toMatch(/player-analytics-deck/);
		expect(pageSrc).toMatch(/<VanguardProtocolPanel/);
	});

	it('does NOT import PlayerCommandCenter (2.1.1 guard)', () => {
		expect(pageSrc).not.toMatch(/PlayerCommandCenter/);
	});
});

describe('Sprint 2.5 — AttributeRadar zero-data outline', () => {
	it('renders faint track hex when all values are zero', () => {
		expect(radarSrc).toMatch(/allZero|zero-data|zeroData|ZERO_TRACK_RADIUS/i);
		expect(radarSrc).toMatch(/ar-zero-track/);
	});
});

describe('Sprint 2.5 — ActiveBounties mission rail', () => {
	it('embedded path adds quest-log-panel--rail modifier', () => {
		expect(bountiesSrc).toMatch(/quest-log-panel--rail/);
		expect(bountiesSrc).toMatch(/quest-log-panel--rail=\{embedded\}|class:quest-log-panel--rail=\{embedded\}/);
	});
});

describe('Sprint 2.5 — PLAYER_OS.md command strip docs', () => {
	it('documents mission rail + conditional avatar + command strip layout', () => {
		expect(playerOsSrc).toMatch(/Mission rail|mission rail/i);
		expect(playerOsSrc).toMatch(/Command main|command strip/i);
		expect(playerOsSrc).toMatch(/conditional avatar|inline badge|operativeAvatar/i);
		expect(playerOsSrc).toMatch(/single flat surface|flat surface/i);
	});
});

describe('Sprint 2.5 — prior sprint tests preserved', () => {
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
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
