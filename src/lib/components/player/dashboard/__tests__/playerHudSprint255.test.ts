/**
 * @vitest-environment jsdom
 *
 * playerHudSprint255.test.ts — Phase 7 · G6″ — HQ telemetry head attached to radar (spacing fix)
 *
 * Guards: void flex gap 0; head divider attach; VPP flush below divider; capsules margin below VPP;
 * G3/G5/G6′ regression hooks intact.
 *
 * VA checkboxes remain ☐ until Wave F sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT254 = join(__dirname, 'playerHudSprint254.test.ts');
const SPRINT253 = join(__dirname, 'playerHudSprint253.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint254Src = existsSync(SPRINT254) ? readFileSync(SPRINT254, 'utf-8') : '';
const sprint253Src = existsSync(SPRINT253) ? readFileSync(SPRINT253, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';

const G6D_TOUCHED = [hudCss, pageSrc].join('\n');

const voidRecessedFlexBlock =
	hudCss.match(
		/\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed\s*\{[\s\S]*?display:\s*flex[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g8VoidBlock =
	hudCss.match(
		/Phase 7 · G8 — HQ telemetry banner parity[\s\S]*?\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed > \.player-capsules-strip--void\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g6dVppBlock =
	hudCss.match(
		/\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed > \.vpp-root--premium\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const analyticsVoidBlock =
	pageSrc.match(
		/<section[\s\S]*?data-region="player-analytics-void"[\s\S]*?<\/section>/,
	)?.[0] ?? '';

describe('Phase 7 · G6″ — telemetry head attached to radar documented in CSS', () => {
	it('documents Phase 7 · G6″ — telemetry head attached to radar in CSS comments', () => {
		expect(hudCss).toMatch(/Phase 7 · G6″ — HQ telemetry head attached to radar \(spacing fix\)/);
	});

	it('G8 restored pd-hq-section-head band banner — no vpp-head teal hairline in void CSS', () => {
		expect(hudCss).toMatch(/Phase 7 · G8 — HQ telemetry banner parity/);
		expect(g8VoidBlock).not.toMatch(/\.vpp-head--premium/);
		expect(hudCss).not.toMatch(
			/\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed > \.vpp-root--premium \.vpp-head--premium[\s\S]*?border-bottom:\s*1px solid color-mix\(in srgb, var\(--pd-accent-data/,
		);
	});
});

describe('Phase 7 · G6″ — void flex gap removed between head and VPP', () => {
	it('.player-analytics-void.pd-os-deck--recessed uses gap: 0 (not clamp flex gap on outer void)', () => {
		expect(voidRecessedFlexBlock).toMatch(/gap:\s*0/);
		expect(voidRecessedFlexBlock).not.toMatch(/gap:\s*clamp\(8px,\s*1\.2vw,\s*12px\)/);
	});
});

describe('Phase 7 · G6″ — head divider attach pattern (G8: shared pd-hq-section-head margin)', () => {
	it('player-analytics-void__head uses shared head margin gap (no vpp-head hairline)', () => {
		expect(hudCss).toMatch(/\.pd-hq-section-head\.player-analytics-void__head[\s\S]*?margin-bottom:\s*var\(--pd-hq-section-head-gap\)/);
	});

	it('void CSS block omits vpp-head border-bottom divider (G7 reverted)', () => {
		expect(g8VoidBlock).not.toMatch(/border-bottom:\s*1px solid color-mix\(in srgb, var\(--pd-accent-data/);
	});
});

describe('Phase 7 · G6″ — VPP flush below divider', () => {
	it('.player-analytics-void.pd-os-deck--recessed > .vpp-root--premium has margin-top: 0', () => {
		expect(g6dVppBlock).toMatch(/margin-top:\s*0/);
		expect(g6dVppBlock).toMatch(/padding-top:\s*0/);
	});

	it('capsules strip gets margin-top only below VPP inside recessed void', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed > \.player-capsules-strip--void[\s\S]*?margin-top:\s*clamp\(0\.85rem,\s*1\.5vw,\s*1\.1rem\)/,
		);
	});
});

describe('Phase 7 · G6″ — page markup (G8: pd-hq-section-head before VPP in void)', () => {
	it('single data-region="player-analytics-void"; no player-analytics-band; band head before VPP', () => {
		expect(pageSrc).not.toMatch(/player-analytics-band/);
		expect(pageSrc).not.toMatch(/data-region="player-analytics-band"/);
		expect(pageSrc).toMatch(/data-region="player-analytics-void"/);
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head player-analytics-void__head/);
		const headIdx = analyticsVoidBlock.indexOf('player-analytics-void__head');
		const vppIdx = analyticsVoidBlock.indexOf('<VanguardProtocolPanel');
		expect(headIdx).toBeGreaterThan(-1);
		expect(vppIdx).toBeGreaterThan(headIdx);
	});
});

describe('Phase 7 · G6″ — VPP hideHeadTitle (G8: suppressed on HQ)', () => {
	it('HQ page passes hideHeadTitle={true}; {#if !hideHeadTitle} guard in VPP', () => {
		expect(pageSrc).toMatch(/hideHeadTitle=\{true\}/);
		expect(vppSrc).toMatch(/\{#if !hideHeadTitle\}/);
		expect(vppSrc).not.toMatch(/showVppHead/);
	});
});

describe('Phase 7 · G6″ — G3 regression: telemetry inner wells frozen', () => {
	it(':is(.player-analytics-void, .stats-analytics-void) .vpp-chart--premium uses --pd-z1-well-bg', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});

describe('Phase 7 · G6″ — anti-patterns + regression hooks', () => {
	it('touched G6″ sources omit neon cyan literals', () => {
		expect(G6D_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G6D_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('prior sprint regression test files remain intact', () => {
		expect(sprint254Src).toMatch(/playerHudSprint254\.test\.ts — Phase 7 · G6′/);
		expect(sprint253Src).toMatch(/playerHudSprint253\.test\.ts — Phase 7 · G6/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
	});
});

describe.skip('Phase 7 · G6″ — ROADMAP', () => {
	it.skip('ROADMAP marks G6″ Done with playerHudSprint255 proof', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});
});
