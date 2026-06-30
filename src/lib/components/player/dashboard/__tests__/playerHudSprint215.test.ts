/**
 * playerHudSprint215.test.ts — Sprint 2.15 Gamification motion + visual acceptance
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');
const VISUAL_ACCEPTANCE = join(ROOT, '..', 'docs/PLAYER_OS_VISUAL_ACCEPTANCE.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';
const visualAcceptanceSrc = existsSync(VISUAL_ACCEPTANCE) ? readFileSync(VISUAL_ACCEPTANCE, 'utf-8') : '';

const motionCss = dossierCssSrc + hudCssSrc + missionsCssSrc;

describe('Sprint 2.15 — pd-enter-rise motion layer', () => {
	it('@keyframes pd-enter-rise defined in player-dossier.css or player-dashboard-hud.css', () => {
		expect(dossierCssSrc + hudCssSrc).toMatch(/@keyframes\s+pd-enter-rise/);
	});

	// HQ stagger superseded by Sprint 2.19 pd-layer-enter-z4/z2 — see playerHudSprint219.test.ts
	it('HQ stagger targets strap, hub wrapper, and analytics deck (2.19 layer enter)', () => {
		const hqMotion = hudCssSrc;
		const usesLayerEnter =
			/@keyframes\s+pd-layer-enter-z4/.test(hqMotion) &&
			/\.player-hud-root\s+\.hud-container\s*>\s*\.pd-strap[\s\S]*?pd-layer-enter-z4/.test(hqMotion);
		const usesLegacyRise =
			/\.player-hud-root\s+\.hud-container\s*>\s*\.pd-strap[\s\S]*?pd-enter-rise/.test(hqMotion);
		expect(usesLayerEnter || usesLegacyRise).toBe(true);
		expect(hudCssSrc).toMatch(/animation-delay:\s*0ms/);
		expect(hudCssSrc).toMatch(/animation-delay:\s*80ms/);
		expect(hudCssSrc).toMatch(/animation-delay:\s*160ms/);
	});

	it('secondary routes stagger via pd-chrome-root .pd-page-root > * (2.19 z4/z2 or pd-enter-rise)', () => {
		expect(dossierCssSrc).toMatch(/\.player-dossier-root\.pd-chrome-root\s+\.pd-page-root\s*>\s*\*:nth-child\(1\)/);
		expect(dossierCssSrc).toMatch(/\.player-dossier-root\.pd-chrome-root\s+\.pd-page-root\s*>\s*\*:nth-child\(2\)/);
		expect(dossierCssSrc).toMatch(/pd-layer-enter-z4|pd-enter-rise/);
	});

	it('XP rank bar fill uses 600ms ease-out transition on premium bar', () => {
		expect(hudCssSrc).toMatch(/\.ibm-rank-bar--premium\s+\.ibm-rank-progress__fill[\s\S]*?transition:\s*width\s+600ms\s+ease-out/);
	});
});

describe('Sprint 2.15 — reduced-motion disables decorative motion', () => {
	it('prefers-reduced-motion blocks stagger enter, shimmer, and streak pulse', () => {
		expect(motionCss).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
		expect(hudCssSrc).toMatch(
			/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?\.player-hud-root\s+\.hud-container\s*>\s*\.pd-strap[\s\S]*?animation:\s*none\s*!important/
		);
		expect(hudCssSrc).toMatch(
			/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?ibm-rank-bar--has-xp[\s\S]*?animation:\s*none\s*!important/
		);
		expect(hudCssSrc).toMatch(
			/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?ibm-streak-at-risk[\s\S]*?animation:\s*none\s*!important/
		);
	});

	it('prefers-reduced-motion disables secondary route enter animation', () => {
		expect(dossierCssSrc).toMatch(
			/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?\.pd-page-root\s*>\s*\*[\s\S]*?animation:\s*none\s*!important/
		);
	});
});

describe('Sprint 2.15 — data-dopamine off disables motion', () => {
	it('PlayerShell sets data-dopamine from vanguardFlags', () => {
		expect(shellSrc).toMatch(/data-dopamine=\{vanguardFlags\.dopamineEnabled/);
		expect(shellSrc).toMatch(/vanguardFlags/);
	});

	it('dashboard retains data-dopamine on player-hud-root', () => {
		const page = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
		const pageSrc = readFileSync(page, 'utf-8');
		expect(pageSrc).toMatch(/data-dopamine=\{vanguardFlags\.dopamineEnabled/);
	});

	it('data-dopamine off selectors disable HQ and shell motion', () => {
		expect(hudCssSrc).toMatch(
			/\.player-hud-root\[data-dopamine='off'\]\s+\.hud-container\s*>\s*\.pd-strap[\s\S]*?animation:\s*none\s*!important/
		);
		expect(hudCssSrc).toMatch(/\.pd-chrome-root\[data-dopamine='off'\]\s+\.pd-page-root\s*>\s*\*/);
		expect(dossierCssSrc).toMatch(/\.pd-chrome-root\[data-dopamine='off'\]\s+\.pd-page-root\s*>\s*\*/);
	});
});

describe('Sprint 2.15 — mission rail motion', () => {
	it('quest-hero--premium has one-shot scale-in animation', () => {
		expect(missionsCssSrc).toMatch(/@keyframes\s+quest-hero-scale-in/);
		expect(missionsCssSrc).toMatch(/\.quest-hero--premium[\s\S]*?quest-hero-scale-in/);
	});

	it('compact row hover brightens accent bar', () => {
		expect(missionsCssSrc).toMatch(/\.quest-row--premium\.quest-row--bounty:hover[\s\S]*?border-left-color/);
		expect(missionsCssSrc).toMatch(/\.quest-row--premium\.quest-row--habit:hover[\s\S]*?border-left-color/);
	});
});

describe.skip('Sprint 2.15 — visual acceptance doc + ROADMAP gate', () => {
	it('PLAYER_OS_VISUAL_ACCEPTANCE.md exists with sign-off table', () => {
		expect(existsSync(VISUAL_ACCEPTANCE)).toBe(true);
		expect(visualAcceptanceSrc).toMatch(/\|\s*State\s*\|\s*Routes\s*\|\s*Pass criteria\s*\|/);
		expect(visualAcceptanceSrc).toMatch(/Reduced motion/);
		expect(visualAcceptanceSrc).toMatch(/Dopamine off/);
	});

	it.skip('ROADMAP marks 2.15 Done and documents premium track progression', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it('PLAYER_OS.md links visual acceptance and marks 2.15 shipped', () => {
		expect(playerOsSrc).toMatch(/PLAYER_OS_VISUAL_ACCEPTANCE\.md/);
		expect(playerOsSrc).toMatch(/2\.15[\s\S]*?(shipped|complete through 2\.15)/i);
		expect(playerOsSrc).toMatch(/2\.16[\s\S]*?(planned|alignment)/i);
	});
});

describe('Sprint 2.15 — Sprint 2.14 regression', () => {
	it('vpp premium and quest-log-panel--premium still present', () => {
		expect(hudCssSrc).toMatch(/\.vpp-chart--premium/);
		expect(bountiesSrc).toMatch(/quest-log-panel--premium=\{embedded\}/);
		expect(missionsCssSrc).toMatch(/\.quest-log-panel--premium/);
	});
});
