/**
 * @vitest-environment jsdom
 *
 * playerHudSprint253.test.ts — Phase 7 · G6 — HQ band rhythm (Command deck + Telemetry void)
 *
 * Guards: pd-hq-section-head on hub + analytics void; hub hero rim-light; VPP head dedup;
 * identity trench soften; G1/G2/G3/G5 regression hooks intact.
 *
 * VA checkboxes remain ☐ until Wave F sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT247 = join(__dirname, 'playerHudSprint247.test.ts');
const SPRINT248 = join(__dirname, 'playerHudSprint248.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');
const SPRINT251 = join(__dirname, 'playerHudSprint251.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint247Src = existsSync(SPRINT247) ? readFileSync(SPRINT247, 'utf-8') : '';
const sprint248Src = existsSync(SPRINT248) ? readFileSync(SPRINT248, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';
const sprint251Src = existsSync(SPRINT251) ? readFileSync(SPRINT251, 'utf-8') : '';

const G6_TOUCHED = [hudCss, hubSrc, vppSrc, pageSrc].join('\n');

const g6HeroBlock =
	hudCss.match(
		/Phase 7 · G6 — HQ band rhythm: hub hero rim-light[\s\S]*?\.player-hud-root \.operative-hub\.pd-os-deck--hero\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g6IdentityBlock =
	hudCss.match(
		/Phase 7 · G6 — HQ band rhythm: soften identity trench[\s\S]*?\.player-hud-root \.operative-hub__identity-stage::before\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g6VppDedupBlock =
	hudCss.match(
		/Phase 7 · G6 — HQ band rhythm: VPP head dedup[\s\S]*?\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-root--band-head-hidden \.vpp-head--premium\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

describe('Phase 7 · G6 — HQ band rhythm documented in CSS', () => {
	it('documents Phase 7 · G6 — HQ band rhythm in CSS comments', () => {
		expect(hudCss).toMatch(/Phase 7 · G6 — HQ band rhythm/);
		expect(g6HeroBlock).toMatch(/Phase 7 · G6 — HQ band rhythm: hub hero rim-light/);
		expect(g6IdentityBlock).toMatch(/Phase 7 · G6 — HQ band rhythm: soften identity trench/);
		expect(g6VppDedupBlock).toMatch(/Phase 7 · G6 — HQ band rhythm: VPP head dedup/);
	});
});

describe('Phase 7 · G6 — Command deck section head', () => {
	it('OperativeHub includes pd-hq-section-head + eyebrow + title', () => {
		expect(hubSrc).toMatch(/pd-hq-section-head operative-hub__head/);
		expect(hubSrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(hubSrc).toMatch(/pd-hq-section-head__title/);
		expect(hubSrc).toMatch(/Command/);
		expect(hubSrc).toMatch(/Operative status/);
		expect(hubSrc).toMatch(/operative-hub pd-os-deck pd-os-deck--hero/);
	});
});

describe('Phase 7 · G6 — Telemetry void section head (G8: pd-hq-section-head band banner restored)', () => {
	it('player-analytics-void section uses pd-hq-section-head + hideHeadTitle on VanguardProtocolPanel', () => {
		const analyticsBlock =
			pageSrc.match(
				/<section[\s\S]*?data-region="player-analytics-void"[\s\S]*?<\/section>/,
			)?.[0] ?? '';
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
		expect(analyticsBlock).toMatch(/pd-hq-section-head player-analytics-void__head/);
		expect(analyticsBlock).toMatch(/Performance/);
		expect(analyticsBlock).toMatch(/Vanguard telemetry/);
		expect(analyticsBlock).toMatch(/hideHeadTitle=\{true\}/);
		expect(analyticsBlock).toMatch(/<VanguardProtocolPanel/);
		expect(pageSrc).not.toMatch(/player-analytics-band/);
	});

	it('VPP hideHeadTitle prop optional; HQ page suppresses native head (G8)', () => {
		expect(pageSrc).toMatch(/hideHeadTitle=\{true\}/);
		expect(vppSrc).toMatch(/hideHeadTitle\s*=\s*false/);
		expect(vppSrc).toMatch(/\{#if !hideHeadTitle\}/);
		expect(vppSrc).not.toMatch(/showVppHead/);
	});
});

describe('Phase 7 · G6 — G1 regression: Quick Ops + Pathway section heads', () => {
	it('Quick Ops / Pathway still use pd-hq-section-head (G1/G2 regression)', () => {
		expect(quickOpsSrc).toMatch(/pd-hq-section-head oqo-deck__head/);
		expect(quickOpsSrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(quickOpsSrc).toMatch(/pd-hq-section-head__title/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head opp-preview__head/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head__title/);
	});
});

describe('Phase 7 · G6 — hub hero rim-light + identity trench soften', () => {
	it('operative-hub.pd-os-deck--hero layers --pd-os-frame-highlight with --pd-os-hero-fill', () => {
		expect(g6HeroBlock).toMatch(/var\(--pd-os-frame-highlight\)/);
		expect(g6HeroBlock).toMatch(/var\(--pd-os-hero-fill\)/);
	});

	it('identity-stage trench inset softened (transparent + ::before removed)', () => {
		expect(g6IdentityBlock).toMatch(/background:\s*transparent/);
		expect(g6IdentityBlock).toMatch(/display:\s*none/);
	});
});

describe('Phase 7 · G6 — VPP head dedup + G3 inner telemetry frozen', () => {
	it('G6 VPP head dedup comment retained; hideHeadTitle + band-head-hidden on HQ (G8)', () => {
		expect(g6VppDedupBlock).toMatch(/Phase 7 · G6 — HQ band rhythm: VPP head dedup/);
		expect(hudCss).not.toMatch(
			/:has\(\.pd-hq-section-head\) \.vpp-head--premium \.vpp-title/,
		);
		expect(hudCss).toMatch(/\.vpp-root--band-head-hidden \.vpp-head--premium/);
	});

	it('G3 unified telemetry inner selectors unchanged (:is void .vpp-chart--premium with --pd-z1-well-bg)', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});

describe('Phase 7 · G6 — G5 frame tokens intact', () => {
	it('shared frame tokens remain documented and referenced', () => {
		expect(dossierCss).toMatch(/--pd-os-frame-fill:/);
		expect(dossierCss).toMatch(/--pd-os-frame-highlight:/);
		expect(dossierCss).toMatch(/--pd-os-hero-fill:/);
		expect(hudCss).toMatch(/Phase 7 · G5 — OperativeHub hero/);
		expect(hudCss).toMatch(/Phase 7 · G5 — Telemetry void outer frame parity/);
	});
});

describe('Phase 7 · G6 — anti-patterns + regression hooks', () => {
	it('touched G6 sources omit neon cyan literals', () => {
		expect(G6_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G6_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('prior sprint regression test files remain intact', () => {
		expect(sprint247Src).toMatch(/playerHudSprint247\.test\.ts — Phase 7 · G1/);
		expect(sprint248Src).toMatch(/playerHudSprint248\.test\.ts — Phase 7 · G2/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
		expect(sprint251Src).toMatch(/playerHudSprint251\.test\.ts — Phase 7 · G5/);
	});
});

describe('Phase 7 · G6 — ROADMAP', () => {
	it('ROADMAP marks G6 Done with playerHudSprint253 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*G6\*\*\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint253\.test\.ts/);
	});

	it('current sprint advances to Wave F after G6', () => {
		expect(roadmapSrc).toMatch(/\*\*Current sprint:\*\*[\s\S]*?Wave F/);
	});
});
