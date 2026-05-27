/**
 * @vitest-environment jsdom
 *
 * playerHudSprint251.test.ts — Phase 7 · G5 Cross-route frame parity (Player OS cohesion)
 *
 * Guards: shared frame token kit, HQ highlight dedup, telemetry void outer parity,
 * OperativeHub hero token family, Stats/Settings/Tracker frame consumption.
 *
 * VA checkboxes remain ☐ until Wave F sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const SETTINGS_PANEL = join(ROOT, 'lib/components/player/PlayerSettingsPanel.svelte');
const TRACKER = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT243 = join(__dirname, 'playerHudSprint243.test.ts');
const SPRINT247 = join(__dirname, 'playerHudSprint247.test.ts');
const SPRINT248 = join(__dirname, 'playerHudSprint248.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');
const SPRINT250 = join(__dirname, 'playerHudSprint250.test.ts');

const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const settingsPanelSrc = existsSync(SETTINGS_PANEL) ? readFileSync(SETTINGS_PANEL, 'utf-8') : '';
const trackerSrc = existsSync(TRACKER) ? readFileSync(TRACKER, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint243Src = existsSync(SPRINT243) ? readFileSync(SPRINT243, 'utf-8') : '';
const sprint247Src = existsSync(SPRINT247) ? readFileSync(SPRINT247, 'utf-8') : '';
const sprint248Src = existsSync(SPRINT248) ? readFileSync(SPRINT248, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';
const sprint250Src = existsSync(SPRINT250) ? readFileSync(SPRINT250, 'utf-8') : '';

const G5_TOUCHED = [dossierCss, hudCss, statsSrc, settingsPanelSrc, trackerSrc, hubSrc].join('\n');

const g5FrameBlock =
	hudCss.match(
		/Phase 7 · G5 — single highlight layer[\s\S]*?\.player-dossier-root \.opp-preview\.pd-os-deck\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g5VoidOuterBlock =
	hudCss.match(
		/Phase 7 · G5 — Telemetry void outer frame parity[\s\S]*?var\(--pd-os-frame-recessed-fill\)/,
	)?.[0] ?? '';

describe('Phase 7 · G5 — frame token kit (player-dossier.css)', () => {
	it('documents Phase 7 · G5 — Cross-route frame token kit', () => {
		expect(dossierCss).toMatch(/Phase 7 · G5 — Cross-route frame token kit/);
		expect(hudCss).toMatch(/Phase 7 · G5 — Cross-route frame parity|Phase 7 · G5 — single highlight layer|Phase 7 · G5 — Telemetry void outer frame parity/);
	});

	it('defines --pd-os-frame-fill and --pd-os-frame-highlight (with HQ aliases)', () => {
		expect(dossierCss).toMatch(/--pd-os-frame-fill:/);
		expect(dossierCss).toMatch(/--pd-os-frame-highlight:/);
		expect(dossierCss).toMatch(/--pd-os-frame-rim:/);
		expect(dossierCss).toMatch(/--pd-os-frame-shadow:/);
		expect(dossierCss).toMatch(/--pd-os-hero-fill:/);
		expect(dossierCss).toMatch(/--pd-hq-deck-fill:\s*var\(--pd-os-frame-fill\)/);
		expect(dossierCss).toMatch(/--pd-hq-deck-highlight-top:\s*var\(--pd-os-frame-highlight\)/);
	});

	it('pd-os-deck kit consumes frame highlight + base fill (not baked duplicate)', () => {
		expect(dossierCss).toMatch(
			/\.player-hud-root \.pd-os-deck[\s\S]*?var\(--pd-os-frame-highlight[\s\S]*?var\(--pd-os-frame-fill/,
		);
		const deckFillDef =
			dossierCss.match(/--pd-os-deck-fill:\s*[^;]+;/)?.[0] ?? '';
		expect(deckFillDef).toMatch(/var\(--pd-os-frame-fill\)/);
		expect(deckFillDef).not.toMatch(/rgba\(255, 255, 255, 0\.05\)/);
	});
});

describe('Phase 7 · G5 — HQ highlight dedup (Quick Ops + Pathway)', () => {
	it('Quick Ops / Pathway use one top-highlight layer in background declaration', () => {
		expect(g5FrameBlock).toMatch(/Phase 7 · G5 — single highlight layer/);
		expect(g5FrameBlock).toMatch(/var\(--pd-os-frame-highlight|var\(--pd-hq-deck-highlight-top\)/);
		expect(g5FrameBlock).toMatch(/var\(--pd-os-frame-fill|var\(--pd-hq-deck-fill\)/);
		const highlightMatches = g5FrameBlock.match(/rgba\(255, 255, 255, 0\.05\)/g) ?? [];
		expect(highlightMatches.length).toBe(0);
	});
});

describe('Phase 7 · G5 — telemetry void outer frame parity', () => {
	it(':is(.player-analytics-void, .stats-analytics-void).pd-os-deck--recessed shares outer background/rim rules', () => {
		expect(g5VoidOuterBlock).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\)\.pd-os-deck--recessed/,
		);
		expect(g5VoidOuterBlock).toMatch(/var\(--pd-os-frame-rim|var\(--pd-hq-deck-rim\)/);
		expect(g5VoidOuterBlock).toMatch(/var\(--pd-os-frame-recessed-highlight\)/);
		expect(g5VoidOuterBlock).toMatch(/var\(--pd-os-frame-recessed-fill\)/);
	});

	it('G3 inner telemetry calm selectors remain intact', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium/,
		);
	});
});

describe('Phase 7 · G5 — OperativeHub hero token family', () => {
	it('.operative-hub.pd-os-deck--hero references --pd-os-hero-fill with G5 comment', () => {
		expect(hudCss).toMatch(/Phase 7 · G5 — OperativeHub hero/);
		expect(hudCss).toMatch(
			/\.player-hud-root \.operative-hub\.pd-os-deck--hero[\s\S]*?var\(--pd-os-hero-fill\)/,
		);
		expect(hubSrc).toMatch(/operative-hub pd-os-deck pd-os-deck--hero/);
	});
});

describe('Phase 7 · G5 — Stats player path frame classes', () => {
	it('stats-workout-band + achievement rows use pd-os-deck frame classes on player path', () => {
		expect(statsSrc).toMatch(/class:stats-workout-band=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:pd-os-deck=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:stats-workout-band=\{isPlayerRole\}[\s\S]*?class:pd-os-deck--hero=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:stats-achievement-deck=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:stats-achievement-row=\{isPlayerRole\}/);
	});

	it('player blocks avoid pd-page-panel / dossier-radar matte when isPlayerRole', () => {
		expect(statsSrc).toMatch(/class:pd-page-panel=\{!isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:dossier-panel=\{!isPlayerRole\}/);
		expect(statsSrc).toMatch(/player-hud-root=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/pd-route-stack=\{isPlayerRole\}/);
		const playerRadarBlock = statsSrc.match(/\{#if isPlayerRole\}[\s\S]*?stats-analytics-void/)?.[0] ?? '';
		expect(playerRadarBlock).not.toMatch(/pd-page-panel|dossier-radar/);
	});

	it('Stats workout + achievement CSS consumes shared frame tokens', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root \.stats-workout-band\.pd-os-deck--hero[\s\S]*?var\(--pd-os-frame-fill\)/,
		);
		expect(hudCss).toMatch(
			/\.player-hud-root \.stats-achievement-row\.pd-os-deck[\s\S]*?var\(--pd-os-frame-fill\)/,
		);
	});
});

describe('Phase 7 · G5 — Settings + Tracker frame tokens', () => {
	it('Settings panel background uses var(--pd-os-frame-fill)', () => {
		expect(settingsPanelSrc).toMatch(/ps-settings-panel pd-os-deck/);
		expect(dossierCss).toMatch(
			/\.ps-settings-panel\.pd-os-deck[\s\S]*?var\(--pd-os-frame-fill\)/,
		);
	});

	it('Tracker retains pd-route-stack and deck bands reference shared frame tokens', () => {
		expect(trackerSrc).toMatch(/pd-content-wrap pd-route-stack/);
		expect(trackerSrc).toMatch(/pd-stat-row pd-os-deck/);
		expect(trackerSrc).toMatch(/pt-lb pd-os-deck pd-os-deck--hero/);
		expect(hudCss).toMatch(
			/Phase 7 · G5 — Tracker bands consume shared frame token kit/,
		);
		expect(hudCss).toMatch(/\.player-hud-root \.pd-stat-row\.pd-os-deck[\s\S]*?var\(--pd-os-frame-fill\)/);
		expect(hudCss).toMatch(/\.player-hud-root \.pt-lb\.pd-os-deck--hero[\s\S]*?var\(--pd-os-hero-fill\)/);
	});
});

describe('Phase 7 · G5 — anti-patterns + regression hooks', () => {
	it('touched G5 sources omit neon cyan literals', () => {
		expect(G5_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G5_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('HQ / Quick Ops / Pathway still omit pg-bracket / pg-scanline (G4 guard)', () => {
		expect(pageSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(hubSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(quickOpsSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(pathwaySrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
	});

	it('prior sprint regression test files remain intact', () => {
		expect(sprint243Src).toMatch(/playerHudSprint243\.test\.ts — Player OS rubric redesign Wave C/);
		expect(sprint247Src).toMatch(/playerHudSprint247\.test\.ts — Phase 7 · G1/);
		expect(sprint248Src).toMatch(/playerHudSprint248\.test\.ts — Phase 7 · G2/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
		expect(sprint250Src).toMatch(/playerHudSprint250\.test\.ts — Phase 7 · G4/);
	});
});

describe('Phase 7 · G5 — ROADMAP', () => {
	it('ROADMAP marks G5 Done with playerHudSprint251 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*G5\*\*\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint251\.test\.ts/);
	});

	it('current sprint advances to Wave E after G5', () => {
		expect(roadmapSrc).toMatch(/\*\*Current sprint:\*\*[\s\S]*?Wave E/);
	});
});
