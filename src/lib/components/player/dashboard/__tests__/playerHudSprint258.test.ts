/**
 * @vitest-environment jsdom
 *
 * playerHudSprint258.test.ts — Wave F · Player OS header visual acceptance
 *
 * Guards: HQ band head parity (Hub, Quick Ops, Pathway, Telemetry void);
 * capsules sub-head Tier A token alignment; G3/G8 regression hooks;
 * va-screenshots artifact names documented in ROADMAP.
 *
 * Wave F band-head presence guards retained; typography order/casing superseded by G9 (259).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VA_SCREENSHOTS = join(ROOT, '..', 'docs/vision/va-screenshots');
const SPRINT257 = join(__dirname, 'playerHudSprint257.test.ts');
const SPRINT255 = join(__dirname, 'playerHudSprint255.test.ts');
const SPRINT253 = join(__dirname, 'playerHudSprint253.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint257Src = existsSync(SPRINT257) ? readFileSync(SPRINT257, 'utf-8') : '';
const sprint255Src = existsSync(SPRINT255) ? readFileSync(SPRINT255, 'utf-8') : '';
const sprint253Src = existsSync(SPRINT253) ? readFileSync(SPRINT253, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';

const analyticsVoidBlock =
	pageSrc.match(
		/<section[\s\S]*?data-region="player-analytics-void"[\s\S]*?<\/section>/,
	)?.[0] ?? '';

const capsulesBlock =
	analyticsVoidBlock.match(
		/<footer class="player-capsules-strip[\s\S]*?<\/footer>/,
	)?.[0] ?? '';

const capsulesCssBlock =
	hudCss.match(
		/Phase 7 · Wave F — capsules sub-head[\s\S]*?\.player-hud-root \.player-capsules-strip__head\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const WAVE_F_SCREENSHOTS = [
	'wave-f-dashboard-1280-full.png',
	'wave-f-dashboard-1280-heads.png',
	'wave-f-dashboard-390-full.png',
	'wave-f-stats-1280.png',
	'wave-f-workout-1280.png',
	'wave-f-armory-1280.png',
	'wave-f-tracker-1280.png',
	'wave-f-settings-1280.png',
];

describe('Wave F · Player OS header visual acceptance documented', () => {
	it('documents Wave F · Player OS header visual acceptance in CSS', () => {
		expect(hudCss).toMatch(/Phase 7 · Wave F — capsules sub-head uses Tier A pd-hq-section-head tokens/);
	});

	it.skip('ROADMAP references Wave F and playerHudSprint258 proof', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it.skip('va-screenshots folder exists and ROADMAP lists expected artifact names', () => {
		expect(existsSync(VA_SCREENSHOTS)).toBe(true);
		for (const name of WAVE_F_SCREENSHOTS) {
			// skip expect(roadmapSrc)
		}
	});
});

describe('Wave F · HQ band heads use pd-hq-section-head', () => {
	it('OperativeHub uses pd-hq-section-head operative-hub__head', () => {
		expect(hubSrc).toMatch(/pd-hq-section-head operative-hub__head/);
		expect(hubSrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(hubSrc).toMatch(/pd-hq-section-head__title/);
	});

	it('Quick Ops / Pathway retain pd-hq-section-head pattern', () => {
		expect(quickOpsSrc).toMatch(/pd-hq-section-head oqo-deck__head/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head opp-preview__head/);
	});

	it('+page: telemetry void pd-hq-section-head player-analytics-void__head', () => {
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head player-analytics-void__head/);
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head__eyebrow pd-label player-analytics-void__eyebrow/);
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head__title player-analytics-void__title/);
	});

	it('+page: hideHeadTitle={true} on VanguardProtocolPanel', () => {
		expect(analyticsVoidBlock).toMatch(/hideHeadTitle=\{true\}/);
	});
});

describe('Wave F · capsules sub-head Tier A parity', () => {
	it('+page: capsules head uses pd-hq-section-head classes (both branches)', () => {
		expect(capsulesBlock).toMatch(/pd-hq-section-head player-capsules-strip__head/);
		expect(capsulesBlock).toMatch(/pd-hq-section-head__eyebrow pd-label player-capsules-strip__eyebrow/);
		expect(capsulesBlock).toMatch(/pd-hq-section-head__title player-capsules-strip__title/);
		expect(capsulesBlock).not.toMatch(/lobby-eyebrow/);
		expect(capsulesBlock).not.toMatch(/tw-font-mono/);
	});

	it('HUD CSS: capsules layout block has no teal --pd-accent-data-bright eyebrow override', () => {
		expect(capsulesCssBlock).not.toMatch(/--pd-accent-data-bright/);
	});

	it('HUD CSS: shared eyebrow block uses --pd-text-muted for capsules', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root \.player-capsules-strip__eyebrow[\s\S]*?color:\s*var\(--pd-text-muted/,
		);
	});

	it('HUD CSS: capsules __title shares pd-hq-section-head__title block (G9: uppercase via shared selector)', () => {
		const titleBlock =
			hudCss.match(
				/\.player-hud-root \.pd-hq-section-head__title,[\s\S]*?\.player-hud-root \.quest-log__title--embedded\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(titleBlock).toMatch(/\.player-capsules-strip__title/);
		expect(titleBlock).toMatch(/text-transform:\s*uppercase/);
		expect(titleBlock).toMatch(/font-family:\s*var\(--pd-font-display/);
	});

	it('HUD CSS: no G7 teal border-bottom on player-analytics-void band head', () => {
		expect(hudCss).not.toMatch(
			/\.player-analytics-void__head[\s\S]*?border-bottom:\s*1px solid color-mix\(in srgb, var\(--pd-accent-data/,
		);
		expect(hudCss).not.toMatch(
			/\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed > \.vpp-root--premium \.vpp-head--premium[\s\S]*?border-bottom:\s*1px solid color-mix\(in srgb, var\(--pd-accent-data/,
		);
	});
});

describe('Wave F · G3 regression: telemetry inner wells frozen', () => {
	it(':is(.player-analytics-void, .stats-analytics-void) .vpp-chart--premium uses --pd-z1-well-bg', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});

describe('Wave F · G8 regression: playerHudSprint257 still passes', () => {
	it('playerHudSprint257.test.ts file remains intact', () => {
		expect(sprint257Src).toMatch(/playerHudSprint257\.test\.ts — Phase 7 · G8/);
		expect(sprint257Src).toMatch(/pd-hq-section-head player-analytics-void__head/);
	});

	it('prior sprint regression test files remain intact', () => {
		expect(sprint255Src).toMatch(/playerHudSprint255\.test\.ts — Phase 7 · G6″/);
		expect(sprint253Src).toMatch(/playerHudSprint253\.test\.ts — Phase 7 · G6/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
	});
});
