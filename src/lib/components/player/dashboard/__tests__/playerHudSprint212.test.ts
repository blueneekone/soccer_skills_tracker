/**
 * playerHudSprint212.test.ts — Sprint 2.12 HQ Premium (Epic 1)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.12 — depth tokens (player-dossier.css)', () => {
	it('defines --pd-depth-* tokens under .player-dossier-root', () => {
		expect(dossierCssSrc).toMatch(/--pd-depth-panel-gradient/);
		expect(dossierCssSrc).toMatch(/--pd-depth-glow-gold/);
		expect(dossierCssSrc).toMatch(/--pd-depth-glow-teal/);
		expect(dossierCssSrc).toMatch(/--pd-shadow-elev-1/);
		expect(dossierCssSrc).toMatch(/--pd-shadow-elev-2/);
	});

	it('pd-surface-premium + pd-grain + pd-strap--premium utilities exist', () => {
		expect(dossierCssSrc).toMatch(/\.pd-surface-premium/);
		expect(dossierCssSrc).toMatch(/\.pd-grain/);
		expect(dossierCssSrc).toMatch(/\.pd-strap--premium/);
	});

	it('prefers-reduced-motion disables grain overlay intensity', () => {
		expect(dossierCssSrc).toMatch(
			/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?\.pd-grain/,
		);
	});
});

describe('Sprint 2.12 — OperativeHub premium shell', () => {
	it('hub uses pd-os-deck hero shell and identity stage wrapper', () => {
		expect(hubSrc).toMatch(/operative-hub pd-os-deck pd-os-deck--hero/);
		expect(hubSrc).toMatch(/operative-hub__identity-stage/);
	});

	it('identity stage glows when child has data-streak-active', () => {
		expect(ibmSrc).toMatch(/data-streak-active=\{currentStreak > 0 \? 'true' : undefined\}/);
		expect(hudCssSrc).toMatch(/ibm-streak-at-risk|data-streak-active|ibm-holo-face__name/);
	});
});

describe('Sprint 2.12 — IdentityBentoModule premium HQ path', () => {
	it('ibm-root--premium on embedded path with hero avatar size', () => {
		expect(ibmSrc).toMatch(/ibm-root--premium=\{embedded\}/);
		expect(ibmSrc).toMatch(/size=\{embedded \? 88 : 72\}/);
	});

	it('rank bar premium class wired', () => {
		expect(ibmSrc).toMatch(/ibm-rank-bar--premium=\{embedded\}/);
		expect(hudCssSrc).toMatch(/\.ibm-rank-bar--premium/);
	});

	it('incomplete profile uses onboarding hero (2.12.1 supersedes badge-only hide)', () => {
		expect(ibmSrc).toMatch(/ibm-root--incomplete=\{profileIncomplete\}/);
		expect(hudCssSrc).toMatch(/\.ibm-silhouette-ring/);
	});
});

describe('Sprint 2.12 — mission rail premium card faces', () => {
	it('ActiveBounties uses quest-row--premium and quest-hero--premium', () => {
		expect(bountiesSrc).toMatch(/quest-row--premium/);
		expect(bountiesSrc).toMatch(/quest-hero--premium/);
	});

	it('player-missions.css defines premium row + hero shimmer', () => {
		expect(missionsCssSrc).toMatch(/\.quest-row--premium/);
		expect(missionsCssSrc).toMatch(/\.quest-hero--premium/);
		expect(missionsCssSrc).toMatch(/quest-hero-shimmer|prefers-reduced-motion/);
	});
});

describe('Sprint 2.12 — single telemetry surface (+page.svelte)', () => {
	it('does NOT render embedded HudMetricsPanel when telemetryReady (VPP owns radar)', () => {
		expect(pageSrc).not.toMatch(/\{#if telemetryReady\}[\s\S]*?HudMetricsPanel/);
		expect(pageSrc).toMatch(/VanguardProtocolPanel/);
	});

	it('shows collapsed hub one-liner when !telemetryReady only', () => {
		expect(pageSrc).toMatch(/\{#if !telemetryReady\}[\s\S]*?hmp-vectors-collapsed/);
		expect(pageSrc).not.toMatch(
			/HudMetricsPanel[\s\S]{0,300}embedded=\{true\}/,
		);
	});

	it('VPP compact mode tracks telemetryReady', () => {
		expect(pageSrc).toMatch(/compact=\{!telemetryReady\}/);
	});
});

describe('Sprint 2.12 — HQ canvas + shell ambient', () => {
	it('PlayerShell canvas owns pd-grain; HQ page keeps dopamine data attribute', () => {
		expect(shellSrc).toMatch(/pd-grain/);
		expect(pageSrc).toMatch(/data-dopamine=\{vanguardFlags\.dopamineEnabled/);
	});

	it('strap uses pd-strap--premium', () => {
		expect(pageSrc).toMatch(/pd-strap--premium/);
	});

	it('bento gap tightened to clamp 12–20px', () => {
		expect(hudCssSrc).toMatch(/--bento-gap-liquid:\s*clamp\(12px,\s*1\.5vw,\s*20px\)/);
	});

	it('PlayerShell dossier vignette in player-shell.css', () => {
		expect(shellCssSrc).toMatch(/\.ps-root\.ps-root--dossier::after/);
		expect(shellCssSrc).toMatch(/radial-gradient/);
	});
});

describe('Sprint 2.12 — reduced motion + pulse/shimmer guards', () => {
	it('player-dashboard-hud.css disables streak pulse and hero shimmer under reduced motion', () => {
		expect(hudCssSrc).toMatch(
			/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?ibm-streak-cell-pulse|quest-hero--premium/,
		);
		expect(missionsCssSrc).toMatch(
			/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?quest-hero/,
		);
	});
});

describe('Sprint 2.12 — ROADMAP + PLAYER_OS doc touch', () => {
	it('ROADMAP marks 2.12 Done with proof path', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.12\s*\|\s*Done\s*\|/);
		expect(roadmapSrc).toMatch(/playerHudSprint212\.test\.ts/);
		expect(roadmapSrc).toMatch(/2\.12\.1–2\.15|ecosystem premium IN PROGRESS/i);
	});

	it('PLAYER_OS reflects 2.12 shipped (not planned-only)', () => {
		expect(playerOsSrc).toMatch(/Sprint 2\.12.*shipped|2\.12.*Done|premium HQ complete/i);
	});
});
