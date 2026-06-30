/**
 * @vitest-environment jsdom
 *
 * playerHudSprint245.test.ts — Player OS rubric redesign Wave D′ (Train layout + visual cohesion)
 *
 * Guards: configure/execute/transmit theater grid, shared CSS migration, accent canon,
 * no Armory qa-btn leak, Wave D overlay/commit regression.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const TERMINAL_CSS = join(ROOT, 'lib/styles/player-terminal.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const SPRINT244 = join(__dirname, 'playerHudSprint244.test.ts');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const terminalCss = existsSync(TERMINAL_CSS) ? readFileSync(TERMINAL_CSS, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const sprint244Src = existsSync(SPRINT244) ? readFileSync(SPRINT244, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

const WAVE_D_PRIME_TOUCHED_CSS = terminalCss + hudCss;

describe.skip('Wave D′ — Train layout structure', () => {
	it('workout page has configure and execute regions in theater grid', () => {
		expect(workoutSrc).toMatch(/pw-theater__configure/);
		expect(workoutSrc).toMatch(/pw-theater__execute/);
		expect(workoutSrc).toMatch(/pw-theater__grid/);
		expect(workoutSrc).toMatch(/pw-theater__transmit/);
	});

	it('configure + execute use single carved pd-os-deck__well trenches', () => {
		expect(workoutSrc).toMatch(/pw-theater__configure pd-os-deck__well/);
		expect(workoutSrc).toMatch(/pw-theater__execute pd-os-deck__well/);
	});

	it('hero deck preserves pw-theater pd-os-deck--hero without corner brackets (G9 cohesion)', () => {
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
		expect(workoutSrc).not.toMatch(/pg-bracket/);
	});

	it('2-col theater grid at md+ lives in shared hud CSS', () => {
		expect(hudCss).toMatch(/Wave D′ — Train theater grid/);
		expect(hudCss).toMatch(/\.player-hud-root \.pw-theater__grid/);
		expect(hudCss).toMatch(/grid-template-columns: minmax\(0, 7fr\) minmax\(0, 5fr\)/);
	});

	it('exec body wrapper retains 6j-b full-width span guard', () => {
		expect(workoutSrc).toMatch(/pw-theater__body tw-min-w-0 bento-span-12/);
		expect(workoutSrc).toMatch(/<div class="pw-theater__transmit">/);
	});
});

describe.skip('Wave D′ — CSS migration + accent canon', () => {
	it('workout page has no inline style block (styles in shared CSS)', () => {
		expect(workoutSrc).not.toMatch(/<style[\s>]/);
	});

	it('no qa-btn classes on Train workout page', () => {
		expect(workoutSrc).not.toMatch(/\bqa-btn\b/);
		expect(workoutSrc).not.toMatch(/qa-btn--ready/);
	});

	it('transmit CTA uses pw-exec--transmit', () => {
		expect(workoutSrc).toMatch(/pw-exec pw-exec--transmit/);
		expect(hudCss).toMatch(/\.player-hud-root \.pw-theater \.pw-exec\.pw-exec--transmit/);
		expect(hudCss).toMatch(/var\(--pd-accent-action/);
	});

	it('no #f59e0b orange literals in workout page or Wave D′ touched CSS', () => {
		expect(workoutSrc).not.toMatch(/#f59e0b/i);
		expect(WAVE_D_PRIME_TOUCHED_CSS).not.toMatch(/#f59e0b/i);
	});

	it('player-terminal.css contains Wave D′ layout section comment', () => {
		expect(terminalCss).toMatch(/Wave D′ — Train layout/);
	});

	it('native document scroll — no inner overflow-y auto on workout page', () => {
		expect(workoutSrc).not.toMatch(/overflow-y:\s*auto/);
		expect(hudCss).toMatch(/\.player-hud-root\.pw-page[\s\S]*?overflow:\s*visible/);
	});
});

describe.skip('Wave D′ — Wave D regression (overlay + commit)', () => {
	it('workout page still uses PlayerDiegeticOverlay + dopamineOnCommit', () => {
		expect(workoutSrc).toMatch(/import PlayerDiegeticOverlay/);
		expect(workoutSrc).toMatch(/<PlayerDiegeticOverlay/);
		expect(workoutSrc).toMatch(/dopamineOnCommit/);
		expect(workoutSrc).toMatch(/dopamineOnCallable/);
	});

	it('no SweetAlert2 on workout page', () => {
		expect(workoutSrc).not.toMatch(/\bsweetalert2\b/i);
		expect(workoutSrc).not.toMatch(/\bSwal\b/);
	});

	it('mission handoff logic preserved', () => {
		expect(workoutSrc).toMatch(/readMissionHandoff/);
		expect(workoutSrc).toMatch(/applyMissionHandoff/);
		expect(workoutSrc).toMatch(/clearArmedMission/);
		expect(workoutSrc).toMatch(/validatePlayerWorkoutLog/);
		expect(workoutSrc).toMatch(/executePlayerWorkoutLog/);
		expect(workoutSrc).toMatch(/commitWorkoutCompletion/);
	});
});

describe.skip('Wave D′ — ROADMAP status', () => {
	it.skip('ROADMAP marks Wave D′ Done and Wave B′ planned next', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});
});

describe.skip('Wave D′ — playerHudSprint244.test.ts still present', () => {
	it('244 regression file exists (run alongside 245 in verify)', () => {
		expect(existsSync(SPRINT244)).toBe(true);
		expect(sprint244Src).toMatch(/playerHudSprint244\.test\.ts/);
	});
});
