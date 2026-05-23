/**
 * playerHudSprint217.test.ts — Sprint 2.17 Z-depth & layering system
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

describe('Sprint 2.17 — Z-depth tokens in player-dossier.css', () => {
	it('defines Z1–Z4 shadow tokens', () => {
		expect(dossierCssSrc).toMatch(/--pd-z1-inset-shadow:/);
		expect(dossierCssSrc).toMatch(/--pd-z2-panel-shadow:/);
		expect(dossierCssSrc).toMatch(/--pd-z3-raised-shadow:/);
		expect(dossierCssSrc).toMatch(/--pd-z4-float-shadow:/);
	});

	it('defines Z-layer utility classes', () => {
		expect(dossierCssSrc).toMatch(/\.pd-z1-recessed[\s\S]*?var\(--pd-z1-well-bg\)/);
		expect(dossierCssSrc).toMatch(/\.pd-z2-panel[\s\S]*?var\(--pd-z2-panel-shadow\)/);
		expect(dossierCssSrc).toMatch(/\.pd-z3-raised[\s\S]*?var\(--pd-z3-raised-shadow\)/);
		expect(dossierCssSrc).toMatch(/\.pd-z4-float[\s\S]*?var\(--pd-z4-float-shadow\)/);
	});

	it('pd-surface-premium / pd-page-panel compose Z2 panel shadow', () => {
		expect(dossierCssSrc).toMatch(
			/\.pd-surface-premium[\s\S]*?box-shadow:\s*var\(--pd-z2-panel-shadow\)/,
		);
		expect(dossierCssSrc).toMatch(
			/\.pd-page-panel[\s\S]*?box-shadow:\s*var\(--pd-z2-panel-shadow\)/,
		);
	});
});

describe('Sprint 2.17 — HQ layering wired in CSS', () => {
	it('identity stage uses Z1 inset well inside hub', () => {
		expect(hudCssSrc).toMatch(
			/\.operative-hub__identity-stage[\s\S]*?background:\s*var\(--pd-z1-well-bg/,
		);
		expect(hudCssSrc).toMatch(
			/\.operative-hub__identity-stage[\s\S]*?var\(--pd-z1-inset-shadow/,
		);
	});

	it('operative hub pd-surface-premium uses Z2 panel shadow', () => {
		expect(hudCssSrc).toMatch(
			/\.operative-hub\.pd-surface-premium[\s\S]*?var\(--pd-z2-panel-shadow/,
		);
	});

	it('quest hero premium uses Z3 raised shadow', () => {
		expect(missionsCssSrc).toMatch(
			/\.quest-hero--premium[\s\S]*?var\(--pd-z3-raised-shadow/,
		);
	});

	it('pd-strap--premium uses Z4 float shadow', () => {
		expect(dossierCssSrc).toMatch(
			/\.pd-strap--premium[\s\S]*?var\(--pd-z4-float-shadow/,
		);
	});
});

describe('Sprint 2.17 — IBM regression guard', () => {
	it('ibm-root--premium stays transparent; identity stage has inset well', () => {
		expect(hudCssSrc).toMatch(/\.ibm-root--premium[\s\S]*?background:\s*transparent/);
		expect(hudCssSrc).toMatch(
			/\.operative-hub__identity-stage \{[\s\S]*?background:\s*var\(--pd-z1-well-bg/,
		);
		expect(hudCssSrc).toMatch(
			/\.operative-hub__identity-stage \{[\s\S]*?box-shadow:\s*var\(--pd-z1-inset-shadow/,
		);
	});
});

describe('Sprint 2.17 — VPP radar well Z1', () => {
	it('vpp-chart--premium uses inset shadow token', () => {
		expect(hudCssSrc).toMatch(
			/\.vpp-chart--premium[\s\S]*?var\(--pd-z1-inset-shadow/,
		);
	});
});

describe('Sprint 2.17 — shared utilities', () => {
	it('pd-empty-state uses Z1 inset token', () => {
		expect(dossierCssSrc).toMatch(
			/\.pd-empty-state[\s\S]*?var\(--pd-z1-inset-shadow/,
		);
	});

	it('pd-route-strap uses Z4 float token', () => {
		expect(dossierCssSrc).toMatch(
			/\.pd-route-strap[\s\S]*?var\(--pd-z4-float-shadow/,
		);
	});
});

describe('Sprint 2.17 — secondary route coverage', () => {
	it('ps-settings inputs use Z1 inset under player-dossier-root', () => {
		expect(dossierCssSrc).toMatch(
			/\.ps-settings-input[\s\S]*?var\(--pd-z1-inset-shadow/,
		);
		expect(dossierCssSrc).toMatch(
			/\.ps-settings-input[\s\S]*?var\(--pd-z1-well-bg/,
		);
	});

	it('quest-log-panel--premium container uses Z2 shadow', () => {
		expect(missionsCssSrc).toMatch(
			/\.quest-log-panel--premium[\s\S]*?var\(--pd-z2-panel-shadow/,
		);
	});
});

describe('Sprint 2.17 — shell rail Z4 active tab', () => {
	it('dossier rail active links strengthen float read', () => {
		expect(shellCssSrc).toMatch(
			/\.ps-rail__link--hub-active[\s\S]*?0 16px 36px/,
		);
		expect(shellCssSrc).toMatch(/Z0 canvas layer/);
	});
});

describe('Sprint 2.17 — ROADMAP sprint pointer', () => {
	it('marks 2.17 Done (current sprint tracked in playerHudSprint218.test.ts)', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.17\s*\|\s*Done\s*\|/);
		expect(roadmapSrc).toMatch(/playerHudSprint217\.test\.ts/);
	});
});
