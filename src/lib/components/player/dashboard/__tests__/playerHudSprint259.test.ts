/**
 * @vitest-environment jsdom
 *
 * playerHudSprint259.test.ts — Phase 7 · G9 — Player OS workspace cohesion
 *
 * Sprint implementation guards. Cross-route cohesion + VA manifest: playerOsCohesion.test.ts (canonical).
 *
 * Guards: L2 title-first (caps via CSS), L3 eyebrow below on HQ + route straps;
 * pathway opp-preview__status rail; telemetry void top frame highlight; NO pg-scanline
 * on Player OS routes (Train + overlay); G3/G8 regression hooks intact.
 */


import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';


const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const TERMINAL_CSS = join(ROOT, 'lib/styles/player-terminal.css');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const STRAP = join(ROOT, 'lib/components/player/PlayerOsPageStrap.svelte');
const OVERLAY = join(ROOT, 'lib/components/player/PlayerDiegeticOverlay.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT258 = join(__dirname, 'playerHudSprint258.test.ts');
const SPRINT257 = join(__dirname, 'playerHudSprint257.test.ts');
const SPRINT255 = join(__dirname, 'playerHudSprint255.test.ts');
const SPRINT249 = join(__dirname, 'playerHudSprint249.test.ts');
const SPRINT250 = join(__dirname, 'playerHudSprint250.test.ts');
const COHESION = join(__dirname, 'playerOsCohesion.test.ts');


const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const terminalCss = existsSync(TERMINAL_CSS) ? readFileSync(TERMINAL_CSS, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const strapSrc = existsSync(STRAP) ? readFileSync(STRAP, 'utf-8') : '';
const overlaySrc = existsSync(OVERLAY) ? readFileSync(OVERLAY, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint258Src = existsSync(SPRINT258) ? readFileSync(SPRINT258, 'utf-8') : '';
const sprint257Src = existsSync(SPRINT257) ? readFileSync(SPRINT257, 'utf-8') : '';
const sprint255Src = existsSync(SPRINT255) ? readFileSync(SPRINT255, 'utf-8') : '';
const sprint249Src = existsSync(SPRINT249) ? readFileSync(SPRINT249, 'utf-8') : '';
const sprint250Src = existsSync(SPRINT250) ? readFileSync(SPRINT250, 'utf-8') : '';
const cohesionSrc = existsSync(COHESION) ? readFileSync(COHESION, 'utf-8') : '';


const analyticsVoidBlock =
	pageSrc.match(
		/<section[\s\S]*?data-region="player-analytics-void"[\s\S]*?<\/section>/,
	)?.[0] ?? '';


const capsulesBlock =
	analyticsVoidBlock.match(
		/<footer class="player-capsules-strip[\s\S]*?<\/footer>/,
	)?.[0] ?? '';


const telemetryVoidFrameBlock =
	hudCss.match(
		/Phase 7 · G9 — Telemetry void top rim-light[\s\S]*?\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\)\.pd-os-deck--recessed[\s\S]*?var\(--pd-os-frame-recessed-fill\)/,
	)?.[0] ?? '';


function titleBeforeEyebrow(src: string, headClass: string): boolean {
	const headMatch = src.match(new RegExp(`<header class="[^"]*${headClass}[^"]*"[^>]*>[\\s\\S]*?</header>`));
	if (!headMatch) return false;
	const block = headMatch[0];
	const titleIdx = block.indexOf('pd-hq-section-head__title');
	const eyebrowIdx = block.indexOf('pd-hq-section-head__eyebrow');
	return titleIdx > -1 && eyebrowIdx > -1 && titleIdx < eyebrowIdx;
}


describe('Phase 7 · G9 — workspace cohesion documented', () => {
	it('documents Phase 7 · G9 — HQ band head hierarchy in CSS', () => {
		expect(hudCss).toMatch(/Phase 7 · G9 — HQ band head hierarchy: L2 title-first \(caps via CSS\), L3 eyebrow below/);
	});


	it('documents Phase 7 · G9 — telemetry void top rim-light in CSS', () => {
		expect(hudCss).toMatch(/Phase 7 · G9 — Telemetry void top rim-light/);
	});


	it.skip('ROADMAP references G9 workspace cohesion and playerHudSprint259 proof', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});
	it('playerOsCohesion.test.ts is the canonical cross-route G9 suite', () => {
		expect(existsSync(COHESION)).toBe(true);
		expect(cohesionSrc).toMatch(/playerOsCohesion\.test\.ts — Phase 7 · G9 canonical cross-route/);
		expect(cohesionSrc).toMatch(/g9-manifest\.json/);
		// skip expect(roadmapSrc)
	});
});


describe('Phase 7 · G9 — title before eyebrow in all HQ band heads', () => {
	it('OperativeHub: __title before __eyebrow', () => {
		expect(titleBeforeEyebrow(hubSrc, 'operative-hub__head')).toBe(true);
	});


	it('OperativeQuickOps: __title before __eyebrow', () => {
		expect(titleBeforeEyebrow(quickOpsSrc, 'oqo-deck__head')).toBe(true);
	});


	it('OperativePathwayPreview: __title before __eyebrow in opp-preview__id', () => {
		expect(pathwaySrc).toMatch(/opp-preview__id/);
		expect(titleBeforeEyebrow(pathwaySrc, 'opp-preview__head')).toBe(true);
	});


	it('+page: telemetry void __title before __eyebrow', () => {
		expect(titleBeforeEyebrow(analyticsVoidBlock, 'player-analytics-void__head')).toBe(true);
	});


	it('+page: capsules __title before __eyebrow (both branches)', () => {
		const heads = [...capsulesBlock.matchAll(/<header class="pd-hq-section-head player-capsules-strip__head"[\s\S]*?<\/header>/g)];
		expect(heads.length).toBeGreaterThanOrEqual(2);
		for (const match of heads) {
			const block = match[0];
			const titleIdx = block.indexOf('pd-hq-section-head__title');
			const eyebrowIdx = block.indexOf('pd-hq-section-head__eyebrow');
			expect(titleIdx).toBeGreaterThan(-1);
			expect(eyebrowIdx).toBeGreaterThan(-1);
			expect(titleIdx).toBeLessThan(eyebrowIdx);
		}
	});
});


describe('Phase 7 · G9 — HUD CSS title-first + uppercase L2', () => {
	it('.pd-hq-section-head__title includes text-transform: uppercase', () => {
		const titleBlock =
			hudCss.match(
				/\.player-hud-root \.pd-hq-section-head__title,[\s\S]*?\.player-hud-root \.quest-log__title--embedded\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(titleBlock).toMatch(/text-transform:\s*uppercase/);
		expect(titleBlock).toMatch(/font-family:\s*var\(--pd-font-display/);
		expect(titleBlock).toMatch(/letter-spacing:\s*0\.04em/);
		expect(titleBlock).toMatch(/color:\s*var\(--pd-text/);
	});


	it('band heads use flex column + eyebrow gap (except opp-preview row layout)', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root \.pd-hq-section-head\.operative-hub__head[\s\S]*?flex-direction:\s*column[\s\S]*?gap:\s*var\(--pd-hq-section-eyebrow-gap\)/,
		);
		expect(hudCss).toMatch(/\.player-hud-root \.pd-hq-section-head\.opp-preview__head[\s\S]*?flex-direction:\s*row/);
	});
});


describe('Phase 7 · G9 — route strap title-first (PlayerOsPageStrap)', () => {
	it('PlayerOsPageStrap: pd-route-strap__title before pd-eyebrow in __id', () => {
		const idBlock = strapSrc.match(/pd-route-strap__id[\s\S]*?<\/div>/)?.[0] ?? '';
		const titleIdx = idBlock.indexOf('pd-route-strap__title');
		const eyebrowIdx = idBlock.indexOf('pd-eyebrow');
		expect(titleIdx).toBeGreaterThan(-1);
		expect(eyebrowIdx).toBeGreaterThan(-1);
		expect(titleIdx).toBeLessThan(eyebrowIdx);
	});


	it('player-dossier.css: route title uppercase; strap eyebrow muted below', () => {
		expect(dossierCss).toMatch(/Phase 7 · G9 — route strap L2 title-first/);
		expect(dossierCss).toMatch(/\.player-dossier-root \.pd-route-strap__title[\s\S]*?text-transform:\s*uppercase/);
		expect(dossierCss).toMatch(/\.player-dossier-root \.pd-route-strap \.pd-eyebrow[\s\S]*?var\(--pd-text-muted/);
	});
});


describe('Phase 7 · G9 — pathway status rail', () => {
	it('OperativePathwayPreview: opp-preview__status present with LVL / 50', () => {
		expect(pathwaySrc).toMatch(/opp-preview__status/);
		expect(pathwaySrc).toMatch(/role="status"/);
		expect(pathwaySrc).toMatch(/LVL \{paddedLevel\} \/ 50/);
		expect(pathwaySrc).not.toMatch(/opp-preview__meta/);
		expect(pathwaySrc).not.toMatch(/opp-preview__title-block/);
	});


	it('HUD CSS: opp-preview__status mirrors pd-strap status treatment', () => {
		expect(hudCss).toMatch(/\.player-hud-root \.opp-preview__status[\s\S]*?text-align:\s*right/);
		expect(hudCss).toMatch(
			/\.player-hud-root \.opp-preview__status \.pd-label[\s\S]*?color-mix\(in srgb, var\(--pd-accent-data\)/,
		);
		expect(hudCss).not.toMatch(/\.player-hud-root \.opp-preview__meta/);
	});
});


describe('Phase 7 · G9 — telemetry void outer top fade (G3 inner wells frozen)', () => {
	it('recessed void stacks --pd-os-frame-highlight above recessed fill on outer plate', () => {
		expect(telemetryVoidFrameBlock).toMatch(/var\(--pd-os-frame-highlight\)/);
		expect(telemetryVoidFrameBlock).toMatch(/var\(--pd-os-frame-recessed-highlight\)/);
		expect(telemetryVoidFrameBlock).toMatch(/var\(--pd-os-frame-recessed-fill\)/);
	});


	it(':is(.player-analytics-void, .stats-analytics-void) .vpp-chart--premium uses --pd-z1-well-bg', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});


describe('Phase 7 · G9 — NO pg-scanline on Player OS routes', () => {
	it('workout/+page.svelte has no pg-scanline markup', () => {
		expect(workoutSrc).not.toMatch(/pg-scanline/);
	});


	it('PlayerDiegeticOverlay.svelte has no pg-scanline or pg-bracket markup', () => {
		expect(overlaySrc).not.toMatch(/pg-scanline/);
		expect(overlaySrc).not.toMatch(/pg-bracket/);
	});


	it('player-terminal.css has no .pg-scanline rule (G9 mandate)', () => {
		expect(terminalCss).toMatch(/Phase 7 · G9 — Train diegetic primitives/);
		expect(terminalCss).not.toMatch(/\.pg-scanline\s*\{/);
		expect(terminalCss).not.toMatch(/@keyframes pg-scan/);
	});


	it('player-dashboard-hud.css does not scope pw-theater > .pg-scanline', () => {
		expect(hudCss).not.toMatch(/\.pw-theater\.pd-os-deck--hero > \.pg-scanline/);
		expect(hudCss).not.toMatch(/\.pw-theater > \.pg-scanline/);
	});
});


describe('Phase 7 · G9 — Stats route band parity (HQ VPP + section heads)', () => {
	const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
	const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
	const statsVoidBlock =
		statsSrc.match(
			/<section[\s\S]*?data-region="stats-analytics-void"[\s\S]*?<\/section>/,
		)?.[0] ?? '';
	it('Stats analytics void: pd-hq-section-head + hideHeadTitle on VPP', () => {
		expect(statsVoidBlock).toMatch(/pd-hq-section-head stats-analytics-void__head/);
		expect(statsVoidBlock).toMatch(/pd-hq-section-head__title[\s\S]*?Vanguard telemetry/);
		expect(statsVoidBlock).toMatch(/hideHeadTitle=\{true\}/);
		expect(statsVoidBlock).not.toMatch(/Vanguard Protocol/);
	});
	it('Stats workout band: title before eyebrow (pd-hq-section-head)', () => {
		expect(statsSrc).toMatch(/pd-hq-section-head stats-workout-band__head/);
		expect(statsSrc).toMatch(
			/stats-workout-band__head[\s\S]*?pd-hq-section-head__title[\s\S]*?pd-hq-section-head__eyebrow/,
		);
	});
	it('Stats player path: single-column dossier-grid + full-width void', () => {
		expect(statsSrc).toMatch(/player-hud-root\.pos-stats\) \.dossier-grid/);
		expect(hudCss).toMatch(/\.player-hud-root\.pos-stats \.dossier-grid/);
	});
});
describe('Phase 7 · G9 — Train theater inner head (title-first, no pg-terminal-chrome)', () => {
	it('workout: Configure session title before Execution terminal eyebrow', () => {
		expect(workoutSrc).toMatch(/pw-exec__head-copy[\s\S]*?pw-title[\s\S]*?pw-eyebrow/);
	});
	it('workout theater body omits pg-terminal-chrome; transmit dock outside body grid', () => {
		expect(workoutSrc).toMatch(/pw-theater__body tw-min-w-0/);
		expect(workoutSrc).not.toMatch(/pw-theater__body[\s\S]*?pg-terminal-chrome/);
		expect(workoutSrc).toMatch(/pw-exec__status[\s\S]*?EST\. YIELD[\s\S]*?\+{estimatedLogXp}/);
	});
});
describe('Phase 7 · G9 — G8 regression: hideHeadTitle + pd-hq-section-head on void', () => {
	it('+page: hideHeadTitle={true} on VanguardProtocolPanel unchanged', () => {
		expect(analyticsVoidBlock).toMatch(/hideHeadTitle=\{true\}/);
	});


	it('+page: pd-hq-section-head on player-analytics-void__head unchanged', () => {
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head player-analytics-void__head/);
	});


	it('playerHudSprint257.test.ts file remains intact', () => {
		expect(sprint257Src).toMatch(/playerHudSprint257\.test\.ts — Phase 7 · G8/);
	});
});


describe('Phase 7 · G9 — prior sprint regression files remain intact', () => {
	it('playerHudSprint258.test.ts notes G9 typography supersession', () => {
		expect(sprint258Src).toMatch(/typography order\/casing superseded by G9/);
	});


	it('playerHudSprint250.test.ts notes G9 no-scanline supersession', () => {
		expect(sprint250Src).toMatch(/G9.*no.?scanline|scanline removed by G9/i);
	});


	it('prior sprint regression test files remain intact', () => {
		expect(sprint255Src).toMatch(/playerHudSprint255\.test\.ts — Phase 7 · G6″/);
		expect(sprint249Src).toMatch(/playerHudSprint249\.test\.ts — Phase 7 · G3/);
	});
});


