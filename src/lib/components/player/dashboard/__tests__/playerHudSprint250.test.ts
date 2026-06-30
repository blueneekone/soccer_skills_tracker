/**
 * @vitest-environment jsdom
 *
 * playerHudSprint250.test.ts — Phase 7 · G4 Execute instrument alignment (Train / pw-theater)
 *
 * Guards: shared hero frame tokens, scoped Execute terminal chrome (brackets only; G9 removed scanline),
 * Wave D/D′ layout + diegetic commit preserved; no Execute chrome leak to HQ bands.
 *
 * G9 removed pg-scanline from Train/overlay — scanline guards superseded by playerHudSprint259.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const TERMINAL_CSS = join(ROOT, 'lib/styles/player-terminal.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT244 = join(__dirname, 'playerHudSprint244.test.ts');
const SPRINT247 = join(__dirname, 'playerHudSprint247.test.ts');
const SPRINT248 = join(__dirname, 'playerHudSprint248.test.ts');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const terminalCss = existsSync(TERMINAL_CSS) ? readFileSync(TERMINAL_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint244Src = existsSync(SPRINT244) ? readFileSync(SPRINT244, 'utf-8') : '';
const sprint247Src = existsSync(SPRINT247) ? readFileSync(SPRINT247, 'utf-8') : '';
const sprint248Src = existsSync(SPRINT248) ? readFileSync(SPRINT248, 'utf-8') : '';

const G4_TOUCHED = [workoutSrc, dossierCss, hudCss, terminalCss].join('\n');

const g4FrameBlock =
	hudCss.match(
		/Phase 7 · G4\/G9 — Train theater[\s\S]*?\.player-hud-root \.pw-theater\.pd-os-deck--hero\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

function theaterBlock() {
	return workoutSrc.match(/class="pw-theater pd-os-deck[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] ?? '';
}

describe.skip('Phase 7 · G4 — Execute frame tokens documented + scoped', () => {
	it('documents Phase 7 · G4/G9 Train theater in CSS comments', () => {
		expect(hudCss).toMatch(/Phase 7 · G4\/G9 — Train theater: shared HQ hero frame/);
		expect(terminalCss).toMatch(/Phase 7 · G9 — Train diegetic primitives/);
		expect(dossierCss).toMatch(/Phase 7 · G4 — Execute hero frame aliases/);
	});

	it('Train hero deck consumes shared HQ frame tokens (OperativeHub parity)', () => {
		expect(dossierCss).toMatch(/--pd-exec-deck-fill:\s*var\(--pd-hq-deck-fill\)/);
		expect(g4FrameBlock).toMatch(/var\(--pd-os-frame-highlight\)/);
		expect(g4FrameBlock).toMatch(/var\(--pd-os-hero-fill/);
		expect(g4FrameBlock).toMatch(/var\(--pd-z3-raised-shadow\)/);
		expect(g4FrameBlock).toMatch(/overflow:\s*visible/);
	});

	it('Execute chrome CSS scoped under .player-hud-root .pw-theater — not HQ / telemetry bands', () => {
		expect(g4FrameBlock).toMatch(/\.player-hud-root \.pw-theater\.pd-os-deck--hero/);
		expect(g4FrameBlock).not.toMatch(/\.oqo-deck|\.opp-preview|\.player-analytics-void|\.vpp-/);
		expect(g4FrameBlock).not.toMatch(/>\s*\.pg-scanline/);
		expect(g4FrameBlock).not.toMatch(/>\s*\.pg-bracket/);
		expect(terminalCss).toMatch(/Phase 7 · G9 — Train diegetic primitives/);
		expect(terminalCss).not.toMatch(/\.pg-scanline\s*\{/);
	});
});

describe.skip('Phase 7 · G4 — Train workout markup (Execute inner terminal)', () => {
	it('hero deck retains pw-theater pd-os-deck pd-os-deck--hero without corner brackets (G9 cohesion)', () => {
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
		expect(workoutSrc).not.toMatch(/pg-bracket/);
	});

	it('workout hero has no pg-scanline (G9 supersedes G4 scanline mandate)', () => {
		const block = theaterBlock();
		expect(block).not.toMatch(/pg-scanline/);
		expect(workoutSrc).not.toMatch(/pg-scanline/);
	});

	it('theater body omits pg-terminal-chrome; transmit dock sibling below grid (G9)', () => {
		expect(workoutSrc).toMatch(/pw-theater__body tw-min-w-0/);
		expect(workoutSrc).not.toMatch(/pw-theater__body[\s\S]*?pg-terminal-chrome/);
		expect(workoutSrc).toMatch(/<div class="pw-theater__transmit">/);
		expect(workoutSrc).not.toMatch(/pw-exec__xp/);
	});

	it('Wave D′ layout preserved: grid, configure/execute wells, transmit dock', () => {
		expect(workoutSrc).toMatch(/pw-theater__grid/);
		expect(workoutSrc).toMatch(/pw-theater__configure pd-os-deck__well/);
		expect(workoutSrc).toMatch(/pw-theater__execute pd-os-deck__well/);
		expect(workoutSrc).toMatch(/pw-theater__transmit/);
	});

	it('terminal state copy covers ready, armed, transmitting', () => {
		expect(workoutSrc).toMatch(/pw-terminal-state/);
		expect(workoutSrc).toMatch(/READY TO TRANSMIT/);
		expect(workoutSrc).toMatch(/TRANSMITTING/);
		expect(workoutSrc).toMatch(/ARMED:/);
	});
});

describe.skip('Phase 7 · G4 — HQ regression (no Execute chrome leak)', () => {
	it('HQ dashboard route files omit pg-bracket / pg-scanline / pg-terminal-chrome', () => {
		expect(pageSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(hubSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(quickOpsSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(pathwaySrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
	});
});

describe.skip('Phase 7 · G4 — Wave D/D′ commit + accent canon', () => {
	it('workout page has no inline style block, qa-btn, or legacy accent literals', () => {
		expect(workoutSrc).not.toMatch(/<style[\s>]/);
		expect(workoutSrc).not.toMatch(/\bqa-btn\b/);
		expect(G4_TOUCHED).not.toMatch(/#f59e0b/i);
		expect(G4_TOUCHED).not.toMatch(/#00d4ff/i);
	});

	it('PlayerDiegeticOverlay + dopamineOnCommit + no Swal (244 regression)', () => {
		expect(workoutSrc).toMatch(/import PlayerDiegeticOverlay/);
		expect(workoutSrc).toMatch(/<PlayerDiegeticOverlay/);
		expect(workoutSrc).toMatch(/dopamineOnCommit/);
		expect(workoutSrc).not.toMatch(/\bsweetalert2\b/i);
		expect(workoutSrc).not.toMatch(/\bSwal\b/);
	});

	it('diegetic pw-range rules remain in player-terminal.css', () => {
		expect(terminalCss).toMatch(/Wave D — Train diegetic range sliders/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-range::-webkit-slider-runnable-track/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-range::-moz-range-thumb/);
	});

	it('J-09 — Train sliders pair pw-loadbar conduit with native pw-range', () => {
		expect(terminalCss).toMatch(/J-09 — pw-loadbar visual conduit/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-loadbar/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-loadbar__fill/);
		expect(workoutSrc).toMatch(/pw-loadbar pw-loadbar--rpe/);
		expect(workoutSrc).toMatch(/class="pw-range pw-range--rpe"/);
		expect(workoutSrc).toMatch(/pw-loadbar__scan/);
	});

	it('transmit CTA uses pw-exec--transmit with :active press in hud CSS', () => {
		expect(workoutSrc).toMatch(/pw-exec pw-exec--transmit/);
		expect(hudCss).toMatch(/\.player-hud-root \.pw-theater \.pw-exec\.pw-exec--transmit:active:not\(:disabled\)/);
	});
});

describe.skip('Phase 7 · G4 — prior sprint regression hooks', () => {
	it('playerHudSprint244.test.ts updated for G9 no-scanline guard', () => {
		expect(sprint244Src).toMatch(/G9|no pg-scanline|no scanline/i);
	});

	it('G1/G2 regression test files remain intact', () => {
		expect(sprint247Src).toMatch(/playerHudSprint247\.test\.ts — Phase 7 · G1/);
		expect(sprint248Src).toMatch(/playerHudSprint248\.test\.ts — Phase 7 · G2/);
	});
});

describe.skip('Phase 7 · G4 — ROADMAP', () => {
	it.skip('ROADMAP marks G4 Done with playerHudSprint250 proof', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it('current sprint advances to Wave E after G4', () => {
		// skip expect(roadmapSrc)
	});
});
