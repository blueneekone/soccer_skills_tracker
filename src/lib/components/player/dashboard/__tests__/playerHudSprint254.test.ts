/**
 * @vitest-environment jsdom
 *
 * playerHudSprint254.test.ts — Phase 7 · G6′ — HQ telemetry band structure (head inside void)
 *
 * Guards: collapsed single player-analytics-void deck; G6′ CSS band structure block retained;
 * G7 superseded external pd-hq-section-head + hideHeadTitle on HQ (see playerHudSprint256.test.ts);
 * G3/G5/G6 regression hooks intact.
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
const SPRINT253 = join(__dirname, 'playerHudSprint253.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');
const SPRINT251 = join(__dirname, 'playerHudSprint251.test.ts');
const SPRINT257 = join(__dirname, 'playerHudSprint257.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint253Src = existsSync(SPRINT253) ? readFileSync(SPRINT253, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';
const sprint251Src = existsSync(SPRINT251) ? readFileSync(SPRINT251, 'utf-8') : '';
const sprint257Src = existsSync(SPRINT257) ? readFileSync(SPRINT257, 'utf-8') : '';

const G6P_TOUCHED = [hudCss, vppSrc, pageSrc].join('\n');

const analyticsVoidBlock =
	pageSrc.match(
		/<section[\s\S]*?data-region="player-analytics-void"[\s\S]*?<\/section>/,
	)?.[0] ?? '';

describe('Phase 7 · G6′ — HQ telemetry band structure documented in CSS', () => {
	it('documents Phase 7 · G6′ — HQ telemetry band structure in CSS comments', () => {
		expect(hudCss).toMatch(/Phase 7 · G6′ — HQ telemetry band structure/);
		expect(hudCss).not.toMatch(/\.player-analytics-band\s*\{/);
	});
});

describe('Phase 7 · G6′ — collapsed single void deck (G8: pd-hq-section-head band banner restored)', () => {
	it('dashboard +page: no player-analytics-band wrapper; single recessed void section', () => {
		expect(pageSrc).not.toMatch(/player-analytics-band/);
		expect(pageSrc).not.toMatch(/data-region="player-analytics-band"/);
		expect(pageSrc).toMatch(/data-region="player-analytics-void"/);
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
	});

	it('HQ void uses external pd-hq-section-head before VanguardProtocolPanel', () => {
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head player-analytics-void__head/);
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head__eyebrow/);
		expect(analyticsVoidBlock).toMatch(/Performance/);
		expect(analyticsVoidBlock).toMatch(/Vanguard telemetry/);
		const headIdx = analyticsVoidBlock.indexOf('player-analytics-void__head');
		const vppIdx = analyticsVoidBlock.indexOf('<VanguardProtocolPanel');
		expect(vppIdx).toBeGreaterThan(headIdx);
	});

	it('HQ page passes hideHeadTitle={true} (G8 banner parity)', () => {
		expect(pageSrc).toMatch(/hideHeadTitle=\{true\}/);
	});
});

describe('Phase 7 · G6′ — VPP hideHeadTitle prop retained for optional suppression', () => {
	it('hideHeadTitle prop exists with default false; {#if !hideHeadTitle} renders vpp-head', () => {
		expect(vppSrc).toMatch(/hideHeadTitle\s*=\s*false/);
		expect(vppSrc).toMatch(/\{#if !hideHeadTitle\}/);
		const hideHeadBlock = vppSrc.match(/\{#if !hideHeadTitle\}[\s\S]*?\{\/if\}/)?.[0] ?? '';
		expect(hideHeadBlock).toMatch(/vpp-head vpp-head--premium/);
		expect(hideHeadBlock).toMatch(/vpp-eyebrow/);
		expect(hideHeadBlock).toMatch(/vpp-title/);
		expect(vppSrc).not.toMatch(/showVppHead/);
	});
});

describe('Phase 7 · G6′ — G3 regression: telemetry inner wells frozen', () => {
	it(':is(.player-analytics-void, .stats-analytics-void) .vpp-chart--premium uses --pd-z1-well-bg', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});

describe('Phase 7 · G6′ — G6 regression: hub band rhythm intact', () => {
	it('OperativeHub still has pd-hq-section-head operative-hub__head', () => {
		expect(hubSrc).toMatch(/pd-hq-section-head operative-hub__head/);
		expect(hubSrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(hubSrc).toMatch(/pd-hq-section-head__title/);
	});
});

describe('Phase 7 · G6′ — Quick Ops / Pathway section heads unchanged', () => {
	it('Quick Ops / Pathway retain pd-hq-section-head pattern', () => {
		expect(quickOpsSrc).toMatch(/pd-hq-section-head oqo-deck__head/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head opp-preview__head/);
	});
});

describe('Phase 7 · G6′ — anti-patterns + regression hooks', () => {
	it('touched G6′ sources omit neon cyan literals', () => {
		expect(G6P_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G6P_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('prior sprint regression test files remain intact', () => {
		expect(sprint253Src).toMatch(/playerHudSprint253\.test\.ts — Phase 7 · G6/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
		expect(sprint251Src).toMatch(/playerHudSprint251\.test\.ts — Phase 7 · G5/);
		expect(sprint257Src).toMatch(/playerHudSprint257\.test\.ts — Phase 7 · G8/);
	});
});

describe('Phase 7 · G6′ — ROADMAP', () => {
	it('ROADMAP marks G6′ Done with playerHudSprint254 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*G6′\*\*\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint254\.test\.ts/);
	});
});
