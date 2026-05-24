/**
 * playerHudSprint216.test.ts — Sprint 2.16 Layout & alignment constitution
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const ACTIVE_BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');
const HQ_PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const STATS_PAGE = join(ROOT, 'routes/(app)/stats/+page.svelte');
const SETTINGS_PAGE = join(ROOT, 'routes/(app)/settings/+page.svelte');
const LAYOUT = join(ROOT, 'routes/(app)/+layout.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const MATERIAL_SPATIAL = join(ROOT, '..', 'docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const activeBountiesTsSrc = existsSync(ACTIVE_BOUNTIES_TS)
	? readFileSync(ACTIVE_BOUNTIES_TS, 'utf-8')
	: '';
const hqPageSrc = existsSync(HQ_PAGE) ? readFileSync(HQ_PAGE, 'utf-8') : '';
const statsPageSrc = existsSync(STATS_PAGE) ? readFileSync(STATS_PAGE, 'utf-8') : '';
const settingsPageSrc = existsSync(SETTINGS_PAGE) ? readFileSync(SETTINGS_PAGE, 'utf-8') : '';
const layoutSrc = existsSync(LAYOUT) ? readFileSync(LAYOUT, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const materialSpatialSrc = existsSync(MATERIAL_SPATIAL)
	? readFileSync(MATERIAL_SPATIAL, 'utf-8')
	: '';

function embeddedBountiesBlock(src: string): string {
	const match = src.match(/\{#if embedded\}[\s\S]*?\{:else\}/);
	return match?.[0] ?? '';
}

describe('Sprint 2.16 — layout constitution tokens', () => {
	it('player-dossier.css defines --pd-content-max and .pd-content-wrap', () => {
		expect(dossierCssSrc).toMatch(/--pd-content-max:\s*min\(100%,\s*90rem\)/);
		expect(dossierCssSrc).toMatch(/\.pd-content-wrap[\s\S]*?max-width:\s*var\(--pd-content-max\)/);
		expect(dossierCssSrc).toMatch(/\.pd-content-wrap[\s\S]*?margin-inline:\s*auto/);
	});
});

describe('Sprint 2.16 — HQ pd-content-wrap', () => {
	it('HQ dashboard +page uses pd-content-wrap wrapping HUDContainer (Option B — see 2.16a)', () => {
		expect(hqPageSrc).toMatch(/pd-content-wrap[\s\S]*?HUDContainer/);
		expect(hqPageSrc).not.toMatch(/<HUDContainer[\s\S]*?<div class="pd-content-wrap"/);
	});
});

describe('Sprint 2.16 — Stats player VPP parity', () => {
	it('stats player path imports and uses VanguardProtocolPanel', () => {
		expect(statsPageSrc).toMatch(/import VanguardProtocolPanel/);
		expect(statsPageSrc).toMatch(/\{#if isPlayerRole\}[\s\S]*?VanguardProtocolPanel/);
	});

	it('stats player template does not expose RDR_S6 or radarTag in player dossier path', () => {
		const playerVppSection =
			statsPageSrc.match(/\{#if isPlayerRole\}\s*<section[\s\S]*?VanguardProtocolPanel/)?.[0] ??
			'';
		expect(playerVppSection).not.toMatch(/RDR_S6/);
		expect(playerVppSection).not.toMatch(/radarTag/);
		expect(playerVppSection).not.toMatch(/SRC=PLAYER_STATS/);
		expect(statsPageSrc).toMatch(/\{:else\}[\s\S]*radarTag/);
	});
});

describe('Sprint 2.16 — ActiveBounties hero dedupe', () => {
	it('embedded rail feed uses visibleQuests rail rows (6b-revise), not tier-split loops', () => {
		const embedded = embeddedBountiesBlock(bountiesSrc);
		expect(embedded).toMatch(/\{#each visibleQuests as quest/);
		expect(embedded).not.toMatch(/\{#each visibleDailies as quest/);
		expect(embedded).not.toMatch(/\{#each visibleBounties as quest/);
		expect(activeBountiesTsSrc).toMatch(/export function excludeHeroFromRailQuests/);
	});
});

describe('Sprint 2.16 — settings diegetic CTAs + debug chrome policy', () => {
	it('player settings uses chamfer clip-path on ps-settings-btn', () => {
		expect(dossierCssSrc).toMatch(
			/\.player-dossier-root\.ps-settings-root \.ps-settings-btn[\s\S]*?clip-path:\s*polygon/,
		);
	});

	it('PlayerSettingsPanel uses sentence-case Save profile label', () => {
		const panelPath = join(ROOT, 'lib/components/player/PlayerSettingsPanel.svelte');
		const panelSrc = existsSync(panelPath) ? readFileSync(panelPath, 'utf-8') : '';
		expect(panelSrc).toMatch(/Save profile/);
		expect(panelSrc).toMatch(/Syncing…/);
	});

	it('+layout.svelte gates ReportAnomaly off player role', () => {
		expect(layoutSrc).toMatch(/authStore\.role\s*!==\s*'player'/);
		expect(layoutSrc).toMatch(/\{#if authStore\.role !== 'player'\}[\s\S]*?ReportAnomaly/);
	});
});

describe('Sprint 2.16 — HQ hub fill CSS', () => {
	it('operative-hub identity stage fill balance at 1280px and 390px', () => {
		expect(hudCssSrc).toMatch(/\.operative-hub__main[\s\S]*?flex:\s*1 1 auto/);
		expect(hudCssSrc).toMatch(/@media \(max-width: 390px\)[\s\S]*?operative-hub/);
		expect(hudCssSrc).toMatch(/@media \(min-width: 1280px\)[\s\S]*?operative-hub__identity-stage/);
	});
});

describe('Sprint 2.16 — ROADMAP + MATERIAL_SPATIAL docs', () => {
	it('ROADMAP marks 2.16 Done', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.16\s*\|\s*Done/i);
		expect(roadmapSrc).toMatch(/playerHudSprint216\.test\.ts/);
	});

	it('PLAYER_OS_MATERIAL_SPATIAL.md has Layout constitution subsection', () => {
		expect(materialSpatialSrc).toMatch(/## Layout constitution/i);
		expect(materialSpatialSrc).toMatch(/--pd-content-max|90rem|1440px/i);
		expect(materialSpatialSrc).toMatch(/Armory.*full-bleed|full-bleed.*Armory/i);
	});
});
