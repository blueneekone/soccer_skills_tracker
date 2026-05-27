/**
 * @vitest-environment jsdom
 *
 * playerHudSprint249.test.ts — Phase 7 · G3 Telemetry inner differentiation (HQ + Stats)
 *
 * Guards: unified calm telemetry void kit for analytics voids — Z1 inset wells, no nav tile physics.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const RADAR = join(ROOT, 'lib/components/player/dashboard/AttributeRadar.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT247 = join(__dirname, 'playerHudSprint247.test.ts');
const SPRINT248 = join(__dirname, 'playerHudSprint248.test.ts');
const SPRINT243 = join(__dirname, 'playerHudSprint243.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const radarSrc = existsSync(RADAR) ? readFileSync(RADAR, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint247Src = existsSync(SPRINT247) ? readFileSync(SPRINT247, 'utf-8') : '';
const sprint248Src = existsSync(SPRINT248) ? readFileSync(SPRINT248, 'utf-8') : '';
const sprint243Src = existsSync(SPRINT243) ? readFileSync(SPRINT243, 'utf-8') : '';

const G3_TOUCHED = [hudCss, radarSrc, pageSrc, statsSrc].join('\n');

const g3Block =
	hudCss.match(
		/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)[\s\S]*?\.player-hud-root \.stats-analytics-void--compact \.vpp-head[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g3ChartWellRule =
	hudCss.match(
		/\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g3IdleInspectorRule =
	hudCss.match(
		/\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-inspector--premium,\s*\n\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-inspector--premium\.vpp-inspector--idle\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

function playerStatsVppBlock() {
	return (
		statsSrc.match(/\{#if isPlayerRole\}\s*<section[\s\S]*?VanguardProtocolPanel[\s\S]*?<\/section>/)?.[0] ??
		''
	);
}

describe('Phase 7 · G3 — Telemetry inner documented + unified selectors', () => {
	it('documents Phase 7 · G3 — Telemetry inner: calm void in CSS comments', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(/no hero gold on telemetry bands/);
		expect(hudCss).toMatch(/Rejects: \.oqo-op cast stack/);
	});

	it('shared telemetry selector covers both analytics voids for chart + inspector wells', () => {
		expect(g3Block).toMatch(/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium/);
		expect(g3Block).toMatch(/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-inspector--premium/);
		expect(g3ChartWellRule).toMatch(/--pd-z1-well-bg/);
		expect(g3ChartWellRule).toMatch(/--pd-z1-inset-shadow/);
	});

	it('analytics-void chart well uses Z1 inset — not Quick Ops cast shadow stack', () => {
		expect(g3ChartWellRule).not.toMatch(/0 4px 0 rgba\(0, 0, 0, 0\.42\)/);
		expect(g3ChartWellRule).not.toMatch(/translateY\(-1px\)/);
	});

	it('G3 telemetry block excludes .oqo-deck / .oqo-op selectors', () => {
		const g3RulesOnly = g3Block.includes('*/') ? g3Block.slice(g3Block.indexOf('*/') + 2) : g3Block;
		expect(g3RulesOnly).not.toMatch(/\.oqo-deck/);
		expect(g3RulesOnly).not.toMatch(/\.oqo-op/);
	});

	it('no translateY lift on analytics-void vpp chart/inspector rules', () => {
		const voidVppRules =
			hudCss.match(
				/Phase 7 · G3 — Telemetry inner: calm void[\s\S]*?\.player-hud-root \.stats-analytics-void--compact \.vpp-head[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(voidVppRules).not.toMatch(/translateY\(-1px\)/);
		expect(voidVppRules).not.toMatch(/translateY\(-2px\)/);
		expect(voidVppRules).not.toMatch(/translateY\(-3px\)/);
	});

	it('idle analytics-void inspector wells omit idle --pd-emissive-teal / --pd-emissive-gold', () => {
		expect(g3IdleInspectorRule).not.toMatch(/--pd-emissive-teal/);
		expect(g3IdleInspectorRule).not.toMatch(/--pd-emissive-gold/);
	});

	it('no stats-analytics-void vpp-chart--premium ::before or ::after pseudo frames (Wave C / 2.20b)', () => {
		expect(hudCss).not.toMatch(/\.stats-analytics-void \.vpp-chart--premium::before/);
		expect(hudCss).not.toMatch(/\.stats-analytics-void \.vpp-chart--premium::after/);
	});
});

describe('Phase 7 · G3 — route markup parity', () => {
	it('HQ page retains player-analytics-void + VPP + compact={!telemetryReady}', () => {
		expect(pageSrc).toMatch(/data-region="player-analytics-void"/);
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
		expect(pageSrc).toMatch(/VanguardProtocolPanel/);
		expect(pageSrc).toMatch(/compact=\{!telemetryReady\}/);
	});

	it('Stats player block retains stats-analytics-void + VPP + pd-os-deck--recessed', () => {
		const block = playerStatsVppBlock();
		expect(block).toMatch(/stats-analytics-void[\s\S]*?pd-os-deck--recessed/);
		expect(block).toMatch(/VanguardProtocolPanel/);
		expect(block).toMatch(/data-region="stats-analytics-void"/);
	});

	it('AttributeRadar retains pdDataBloom filter usage', () => {
		expect(radarSrc).toMatch(/url\(#pdDataBloom\)/);
	});
});

describe('Phase 7 · G3 — anti-patterns + regression hooks', () => {
	it('touched G3 sources omit neon cyan literals', () => {
		expect(G3_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G3_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('G1 regression — HQ shared frame tokens + recessed analytics rim intact', () => {
		expect(dossierCss).toMatch(/Phase 7 · G1 — HQ shared frame tokens/);
		expect(hudCss).toMatch(/Phase 7 · G1 — HQ shared frame: raised Z2 decks/);
		expect(hudCss).toMatch(/\.player-analytics-void\.pd-os-deck--recessed[\s\S]*?var\(--pd-hq-deck-rim\)/);
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
	});

	it('G2 regression — Navigation/Progression scoping unchanged (no accidental G3 cross-chrome)', () => {
		expect(hudCss).toMatch(/Phase 7 · G2 — Navigation inner: transit tiles/);
		expect(hudCss).toMatch(/Phase 7 · G2 — Progression connectors/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op/);
		expect(hudCss).toMatch(/\.opp-preview \.opp-node--edge[\s\S]*?clip-path:/);
	});

	it('Wave C regression — stats-analytics-void guards from playerHudSprint243 remain valid', () => {
		expect(hudCss).toMatch(/\.stats-analytics-void\.pd-os-deck--recessed/);
		expect(hudCss).toMatch(/\.stats-analytics-void \.vpp-chart--premium|:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?--pd-z1-well-bg/);
		expect(sprint243Src).toMatch(/playerHudSprint243\.test\.ts — Player OS rubric redesign Wave C/);
	});

	it('prior regression test files remain intact', () => {
		expect(sprint247Src).toMatch(/playerHudSprint247\.test\.ts — Phase 7 · G1/);
		expect(sprint248Src).toMatch(/playerHudSprint248\.test\.ts — Phase 7 · G2/);
	});
});

describe('Phase 7 · G3 — ROADMAP', () => {
	it('ROADMAP marks G3 Done with playerHudSprint249 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*G3\*\*\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint249\.test\.ts/);
	});

	it('current sprint advances to Wave E after G4', () => {
		expect(roadmapSrc).toMatch(/\*\*Current sprint:\*\*[\s\S]*?Wave E/);
	});
});
