/**
 * @vitest-environment jsdom
 *
 * playerHudSprint257.test.ts — Phase 7 · G8 — HQ telemetry BANNER parity
 *
 * Guards: pd-hq-section-head band banner on HQ void (matches Quick Ops / Pathway);
 * hideHeadTitle suppresses vpp-head; G7 teal hairline removed; G3/G6 regression hooks intact.
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
const SPRINT256 = join(__dirname, 'playerHudSprint256.test.ts');
const SPRINT255 = join(__dirname, 'playerHudSprint255.test.ts');
const SPRINT253 = join(__dirname, 'playerHudSprint253.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint256Src = existsSync(SPRINT256) ? readFileSync(SPRINT256, 'utf-8') : '';
const sprint255Src = existsSync(SPRINT255) ? readFileSync(SPRINT255, 'utf-8') : '';
const sprint253Src = existsSync(SPRINT253) ? readFileSync(SPRINT253, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';

const G8_TOUCHED = [hudCss, pageSrc].join('\n');

const g8VoidBlock =
	hudCss.match(
		/Phase 7 · G8 — HQ telemetry banner parity[\s\S]*?\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed > \.player-capsules-strip--void\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const analyticsVoidBlock =
	pageSrc.match(
		/<section[\s\S]*?data-region="player-analytics-void"[\s\S]*?<\/section>/,
	)?.[0] ?? '';

const sharedHeadMarginBlock =
	hudCss.match(
		/\.player-hud-root \.pd-hq-section-head\.oqo-deck__head,[\s\S]*?margin-bottom:\s*var\(--pd-hq-section-head-gap\);\s*\n\}/,
	)?.[0] ?? '';

const sharedEyebrowBlock =
	hudCss.match(
		/\.player-hud-root \.pd-label,[\s\S]*?line-height:\s*1\.3;\s*\n\}/,
	)?.[0] ?? '';

describe('Phase 7 · G8 — HQ telemetry banner parity documented', () => {
	it('documents Phase 7 · G8 — HQ telemetry banner parity in CSS', () => {
		expect(hudCss).toMatch(/Phase 7 · G8 — HQ telemetry banner parity/);
		expect(g8VoidBlock).toMatch(/\.player-analytics-void\.pd-os-deck--recessed > \.vpp-root--premium/);
		expect(g8VoidBlock).not.toMatch(
			/\.player-analytics-void\.pd-os-deck--recessed > \.vpp-root--premium \.vpp-head--premium/,
		);
	});
});

describe('Phase 7 · G8 — HQ page uses shared pd-hq-section-head band banner', () => {
	it('+page.svelte: pd-hq-section-head player-analytics-void__head BEFORE VanguardProtocolPanel', () => {
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head player-analytics-void__head/);
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head__eyebrow pd-label player-analytics-void__eyebrow/);
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head__title player-analytics-void__title/);
		const headIdx = analyticsVoidBlock.indexOf('player-analytics-void__head');
		const vppIdx = analyticsVoidBlock.indexOf('<VanguardProtocolPanel');
		expect(headIdx).toBeGreaterThan(-1);
		expect(vppIdx).toBeGreaterThan(headIdx);
	});

	it('+page.svelte: hideHeadTitle={true} on VanguardProtocolPanel', () => {
		expect(analyticsVoidBlock).toMatch(/hideHeadTitle=\{true\}/);
	});

	it('copy uses HQ band voice: Performance + Vanguard telemetry (not Vanguard Protocol / TELEMETRY)', () => {
		expect(analyticsVoidBlock).toMatch(/>Performance</);
		expect(analyticsVoidBlock).toMatch(/>Vanguard telemetry</);
		expect(analyticsVoidBlock).not.toMatch(/Vanguard Protocol/);
		expect(analyticsVoidBlock).not.toMatch(/TELEMETRY/);
	});
});

describe('Phase 7 · G8 — HUD CSS banner cohesion', () => {
	it('NO G7 teal border-bottom on void vpp-head selector block', () => {
		expect(hudCss).not.toMatch(
			/\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed > \.vpp-root--premium \.vpp-head--premium[\s\S]*?border-bottom:\s*1px solid color-mix\(in srgb, var\(--pd-accent-data/,
		);
	});

	it('player-analytics-void__head in shared head margin block with oqo/opp/hub', () => {
		expect(sharedHeadMarginBlock).toMatch(/\.pd-hq-section-head\.player-analytics-void__head/);
		expect(sharedHeadMarginBlock).toMatch(/\.pd-hq-section-head\.oqo-deck__head/);
		expect(sharedHeadMarginBlock).toMatch(/\.pd-hq-section-head\.opp-preview__head/);
		expect(sharedHeadMarginBlock).toMatch(/\.pd-hq-section-head\.operative-hub__head/);
		expect(sharedHeadMarginBlock).toMatch(/margin-bottom:\s*var\(--pd-hq-section-head-gap\)/);
	});

	it('vpp-eyebrow NOT in shared pd-hq-section-head muted-color eyebrow block', () => {
		expect(sharedEyebrowBlock).toMatch(/\.pd-hq-section-head__eyebrow/);
		expect(sharedEyebrowBlock).not.toMatch(/\.vpp-eyebrow/);
	});

	it('global vpp-head box stays transparent/no-border in analytics voids (Stats parity)', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-head--premium[\s\S]*?background:\s*transparent/,
		);
		expect(hudCss).toMatch(
			/\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-head--premium[\s\S]*?border:\s*none/,
		);
	});
});

describe('Phase 7 · G8 — G3 regression: telemetry inner wells frozen', () => {
	it(':is(.player-analytics-void, .stats-analytics-void) .vpp-chart--premium uses --pd-z1-well-bg', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});

describe('Phase 7 · G8 — G6 regression: hub band rhythm + VPP head dedup intact', () => {
	it('OperativeHub still has pd-hq-section-head operative-hub__head', () => {
		expect(hubSrc).toMatch(/pd-hq-section-head operative-hub__head/);
		expect(hubSrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(hubSrc).toMatch(/pd-hq-section-head__title/);
	});

	it('vpp-root--band-head-hidden dedup retained for hideHeadTitle', () => {
		expect(hudCss).toMatch(/\.vpp-root--band-head-hidden \.vpp-head--premium/);
		expect(vppSrc).toMatch(/class:vpp-root--band-head-hidden=\{hideHeadTitle\}/);
	});
});

describe('Phase 7 · G8 — Quick Ops / Pathway section heads unchanged', () => {
	it('Quick Ops / Pathway retain pd-hq-section-head pattern', () => {
		expect(quickOpsSrc).toMatch(/pd-hq-section-head oqo-deck__head/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head opp-preview__head/);
	});
});

describe('Phase 7 · G8 — anti-patterns + regression hooks', () => {
	it('touched G8 sources omit neon cyan literals', () => {
		expect(G8_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G8_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('prior sprint regression test files remain intact', () => {
		expect(sprint256Src).toMatch(/playerHudSprint256\.test\.ts — Phase 7 · G7/);
		expect(sprint255Src).toMatch(/playerHudSprint255\.test\.ts — Phase 7 · G6″/);
		expect(sprint253Src).toMatch(/playerHudSprint253\.test\.ts — Phase 7 · G6/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
	});
});

describe('Phase 7 · G8 — ROADMAP', () => {
	it('ROADMAP marks G8 Done with playerHudSprint257 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*G8\*\*\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint257\.test\.ts/);
	});
});
