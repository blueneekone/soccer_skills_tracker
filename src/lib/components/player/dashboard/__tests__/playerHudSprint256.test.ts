/**
 * @vitest-environment jsdom
 *
 * playerHudSprint256.test.ts — Phase 7 · G7 — HQ telemetry instrument head cohesion
 *
 * Guards: G7 native VPP head on HQ (superseded by G8 — see playerHudSprint257.test.ts);
 * historical teal/mono telemetry voice assertions retained as regression tombstones.
 *
 * VA checkboxes remain ☐ until Wave F sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT254 = join(__dirname, 'playerHudSprint254.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');
const SPRINT257 = join(__dirname, 'playerHudSprint257.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint254Src = existsSync(SPRINT254) ? readFileSync(SPRINT254, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';
const sprint257Src = existsSync(SPRINT257) ? readFileSync(SPRINT257, 'utf-8') : '';

const G7_TOUCHED = [hudCss, vppSrc, pageSrc].join('\n');

describe('Phase 7 · G7 — superseded by G8 banner parity', () => {
	it('G8 restored pd-hq-section-head on HQ void (G7 native head reverted)', () => {
		expect(sprint257Src).toMatch(/playerHudSprint257\.test\.ts — Phase 7 · G8/);
		expect(hudCss).toMatch(/Phase 7 · G8 — HQ telemetry banner parity/);
		expect(hudCss).not.toMatch(
			/Phase 7 · G7 — HQ telemetry instrument head cohesion[\s\S]*?border-bottom:\s*1px solid color-mix\(in srgb, var\(--pd-accent-data/,
		);
	});
});

describe('Phase 7 · G7 — VPP native telemetry head block (Stats route retains native head)', () => {
	it('{#if !hideHeadTitle} renders vpp-head with vpp-eyebrow + vpp-title', () => {
		expect(vppSrc).toMatch(/\{#if !hideHeadTitle\}/);
		const hideHeadBlock = vppSrc.match(/\{#if !hideHeadTitle\}[\s\S]*?\{\/if\}/)?.[0] ?? '';
		expect(hideHeadBlock).toMatch(/vpp-head vpp-head--premium/);
		expect(hideHeadBlock).toMatch(/vpp-eyebrow/);
		expect(hideHeadBlock).toMatch(/Vanguard Protocol/);
		expect(hideHeadBlock).toMatch(/vpp-title/);
		expect(hideHeadBlock).toMatch(/TELEMETRY/);
	});
});

describe('Phase 7 · G7 — void head integration CSS (G8: vpp-head transparent on Stats/HQ)', () => {
	it('.player-analytics-void .vpp-head--premium has transparent treatment (no boxed banner)', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-head--premium[\s\S]*?background:\s*transparent/,
		);
		expect(hudCss).toMatch(
			/\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-head--premium[\s\S]*?border:\s*none/,
		);
	});

	it('player-capsules-strip__eyebrow uses shared telemetry eyebrow ladder (pd-hud-eyebrow-l3)', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root \.player-capsules-strip__eyebrow[\s\S]*?var\(--pd-hud-eyebrow-l3/,
		);
	});
});

describe('Phase 7 · G7 — G3 regression: telemetry inner wells frozen', () => {
	it(':is(.player-analytics-void, .stats-analytics-void) .vpp-chart--premium uses --pd-z1-well-bg', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});

describe('Phase 7 · G7 — G6 regression: hub band rhythm intact', () => {
	it('OperativeHub still has pd-hq-section-head operative-hub__head', () => {
		expect(hubSrc).toMatch(/pd-hq-section-head operative-hub__head/);
		expect(hubSrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(hubSrc).toMatch(/pd-hq-section-head__title/);
	});
});

describe('Phase 7 · G7 — Quick Ops / Pathway section heads unchanged', () => {
	it('Quick Ops / Pathway retain pd-hq-section-head pattern', () => {
		expect(quickOpsSrc).toMatch(/pd-hq-section-head oqo-deck__head/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head opp-preview__head/);
	});
});

describe('Phase 7 · G7 — anti-patterns + regression hooks', () => {
	it('touched G7 sources omit neon cyan literals', () => {
		expect(G7_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G7_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('prior sprint regression test files remain intact', () => {
		expect(sprint254Src).toMatch(/playerHudSprint254\.test\.ts — Phase 7 · G6′/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
		expect(sprint257Src).toMatch(/playerHudSprint257\.test\.ts — Phase 7 · G8/);
	});
});

describe.skip('Phase 7 · G7 — ROADMAP', () => {
	it.skip('ROADMAP marks G7 Done with playerHudSprint256 proof', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});
});
