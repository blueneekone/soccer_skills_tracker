/**
 * playerHudSprint18.test.ts — Sprint 1.8 unified HUD shell, flush embedded panels, Vanguard vectors (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const METRICS = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');
const OPERATIVE = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const metricsSrc = existsSync(METRICS) ? readFileSync(METRICS, 'utf-8') : '';
const operativeSrc = existsSync(OPERATIVE) ? readFileSync(OPERATIVE, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

describe('Sprint 1.8 — OperativeHub bento spans preserved', () => {
	it('OperativeHub retains tw-col-span-4 identity column', () => {
		expect(operativeSrc).toMatch(/tw-col-span-4/);
	});

	it('OperativeHub retains tw-col-span-8 metrics column', () => {
		expect(operativeSrc).toMatch(/tw-col-span-8/);
	});

	it('OperativeHub retains bento-span-12 quests row', () => {
		expect(operativeSrc).toMatch(/bento-span-12/);
	});
});

describe('Sprint 1.8 — IdentityBentoModule embedded flush (no double chrome)', () => {
	it('IdentityBentoModule supports embedded mode via ibm-root--embedded', () => {
		expect(identitySrc).toMatch(/ibm-root--embedded/);
		expect(identitySrc).toMatch(/embedded\s*=\s*false|embedded\s*=\s*true|embedded\?:/);
	});

	it('ibm-root--embedded strips outer border and backdrop chrome', () => {
		expect(identitySrc).toMatch(/\.ibm-root--embedded[\s\S]*?border:\s*none/);
		expect(identitySrc).toMatch(/\.ibm-root--embedded[\s\S]*?background:\s*transparent/);
		expect(identitySrc).toMatch(/\.ibm-root--embedded[\s\S]*?backdrop-filter:\s*none/);
	});

	it('+page passes embedded={true} to IdentityBentoModule inside OperativeHub', () => {
		expect(pageSrc).toMatch(/IdentityBentoModule[\s\S]*?embedded=\{true\}/);
	});
});

describe('Sprint 1.8 — HudMetricsPanel embedded flush + Vanguard vectors only', () => {
	it('HudMetricsPanel supports embedded mode via hmp-root--embedded', () => {
		expect(metricsSrc).toMatch(/hmp-root--embedded/);
		expect(metricsSrc).toMatch(/embedded\s*=\s*false|embedded\s*=\s*true|embedded\?:/);
	});

	it('hmp-root--embedded strips outer border, background, and backdrop chrome', () => {
		expect(metricsSrc).toMatch(/\.hmp-root--embedded[\s\S]*?border:\s*none/);
		expect(metricsSrc).toMatch(/\.hmp-root--embedded[\s\S]*?background:\s*transparent/);
		expect(metricsSrc).toMatch(/\.hmp-root--embedded[\s\S]*?backdrop-filter:\s*none/);
	});

	it('+page collapses hub vectors when !telemetryReady (VPP owns radar — no HudMetricsPanel on page)', () => {
		expect(pageSrc).toMatch(/hmp-vectors-collapsed/);
		expect(pageSrc).not.toMatch(/<HudMetricsPanel/);
	});

	it('HudMetricsPanel shows Vanguard vector labels (PAC, ACC, POW, COMP, STM, AGI)', () => {
		expect(metricsSrc).toMatch(/buildVanguardProtocolRows/);
		expect(metricsSrc).toMatch(/hmp-vectors|vectorRows/);
		expect(metricsSrc).toMatch(/\{row\.label\}/);
	});

	it('HudMetricsPanel does not duplicate identity primary stats (LVL + Streak in hmp grid)', () => {
		expect(metricsSrc).not.toMatch(/hmp-label">LVL<\/dt>/);
		expect(metricsSrc).not.toMatch(/hmp-label">Streak<\/dt>/);
		expect(metricsSrc).not.toMatch(/hmp-label">Total XP<\/dt>/);
		expect(metricsSrc).not.toMatch(/hmp-primary/);
	});

	it('HudMetricsPanel uses compact AWAITING TELEMETRY empty state', () => {
		expect(metricsSrc).toMatch(/AWAITING TELEMETRY/i);
	});
});

describe('Sprint 1.8 — OperativeHub unified glass shell', () => {
	it('OperativeHub uses pd-os-deck hero material (superseded by 2.8 Player Dossier + Wave B)', () => {
		expect(operativeSrc).toMatch(/pd-os-deck--hero/);
		expect(hudCssSrc).toMatch(/\.operative-hub\.pd-os-deck--hero[\s\S]*?--pd-os-hero-fill/);
	});

	it('OperativeHub cells preserve min-width: 0 for flex/grid shrink', () => {
		expect(operativeSrc).toMatch(/min-width:\s*0/);
	});
});

describe('Sprint 1.8 — player-dashboard-hud.css embedded flush rules', () => {
	it('defines operative-hub embedded flush rules for identity and metrics', () => {
		expect(hudCssSrc).toMatch(/\.player-hud-root\s+\.operative-hub/);
		expect(hudCssSrc).toMatch(/ibm-root--embedded|\.operative-hub[\s\S]*embedded/);
		expect(hudCssSrc).toMatch(/hmp-root--embedded|\.operative-hub[\s\S]*hmp-root/);
	});

	it('defines --player-hud-pad token for tighter in-hub density', () => {
		expect(hudCssSrc).toMatch(/--player-hud-pad/);
	});
});
