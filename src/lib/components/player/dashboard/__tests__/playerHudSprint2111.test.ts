/**
 * playerHudSprint2111.test.ts — Sprint 2.11.1 shared component dossier pass
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const INTEL = join(ROOT, 'lib/components/ui/IntelModal.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const HMP = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');

const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const intelSrc = existsSync(INTEL) ? readFileSync(INTEL, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const hmpSrc = existsSync(HMP) ? readFileSync(HMP, 'utf-8') : '';

describe('Sprint 2.11.1 — player-missions.css consolidates embedded mission rail', () => {
	it('player-missions.css exists and scopes embedded accept to dossier gold', () => {
		expect(missionsCssSrc.length).toBeGreaterThan(0);
		expect(missionsCssSrc).toMatch(/\.player-hud-root \.quest-log-panel--embedded/);
		expect(missionsCssSrc).toMatch(/--pd-accent-action|#fbbf24/);
		expect(missionsCssSrc).not.toMatch(/#22d3ee/);
	});

	it('player-dashboard-hud.css imports player-missions.css', () => {
		expect(hudCssSrc).toMatch(/@import\s+['"]\.\/player-missions\.css['"]/);
	});

	it('ActiveBounties does not import hud-telemetry.css (player embedded path)', () => {
		expect(bountiesSrc).not.toMatch(/hud-telemetry\.css/);
	});

	it('hero CTA uses quest-hero__cta only — not ibm-cta--setup', () => {
		const heroBtn = bountiesSrc.match(/class="quest-hero__cta[\s\S]{0,80}"/)?.[0];
		expect(heroBtn).toBeTruthy();
		expect(heroBtn).not.toMatch(/ibm-cta/);
	});
});

describe('Sprint 2.11.1 — dashboard loading + single telemetry surface', () => {
	it('loading gate does not use #0B0F19', () => {
		expect(pageSrc).not.toMatch(/tw-bg-\[#0B0F19\]/);
		expect(pageSrc).toMatch(/--pd-bg|var\(--pd-bg/);
	});

	it('single telemetry surface — hub collapsed when !telemetryReady; VPP always mounted', () => {
		expect(pageSrc).toMatch(/\{#if !telemetryReady\}[\s\S]*?hmp-vectors-collapsed/);
		expect(pageSrc).toMatch(/VanguardProtocolPanel/);
		expect(pageSrc).not.toMatch(/\{#if telemetryReady\}[\s\S]*?HudMetricsPanel/);
	});

	it('HudMetricsPanel hides embedded vectors when !telemetryReady', () => {
		expect(hmpSrc).toMatch(/\{#if !embedded \|\| telemetryReady\}/);
		expect(hmpSrc).not.toMatch(/hmp-vectors-collapsed[\s\S]*?embedded && !telemetryReady/);
	});
});

describe('Sprint 2.11.1 — HQ density + operative hub alignment', () => {
	it('operative-hub missions align-self stretch in css (missions column fills hub height)', () => {
		expect(hudCssSrc).toMatch(/\.operative-hub \.operative-hub__missions[\s\S]*?align-self:\s*stretch/);
		expect(hubSrc).toMatch(/align-self:\s*stretch/);
	});

	it('player-hud-root sets bento gap liquid (212 premium: clamp 12–20px)', () => {
		expect(hudCssSrc).toMatch(/--bento-gap-liquid:\s*clamp\(12px,\s*1\.5vw,\s*20px\)/);
	});
});

describe('Sprint 2.11.1 — Armory pathway + shared panels', () => {
	it('Armory no longer renders pathway shell (HQ owns pathway — Sprint 2.22 slice 4b)', () => {
		expect(armorySrc).not.toMatch(/qa-pathway-shell/);
		expect(armorySrc).not.toMatch(/OperativePathway/);
	});
});

describe('Sprint 2.11.1 — IntelModal player workout dossier hook', () => {
	it('IntelModal supports dossierMode with pd-panel class hook', () => {
		expect(intelSrc).toMatch(/dossierMode/);
		expect(intelSrc).toMatch(/im-panel--dossier|pd-panel/);
	});

	it('workout page passes dossierMode to IntelModal', () => {
		expect(workoutSrc).toMatch(/IntelModal[\s\S]*?dossierMode/);
	});

	it('pd-glass-panel utility exists in player-dossier.css', () => {
		expect(dossierCssSrc).toMatch(/\.player-dossier-root \.pd-glass-panel[\s\S]*?--pd-panel/);
	});
});
