/**
 * playerHudSprint237.test.ts — Sprint 2.22 slice 6h Train / Tracker terminal chrome
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const TRACKER = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const TERMINAL_CSS = join(ROOT, 'lib/styles/player-terminal.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISUAL_README = join(ROOT, '..', 'docs/visual-acceptance/sprint-2.22-slice-6h/README.md');
const E2E_SPEC = join(ROOT, '..', 'e2e/player-train-tracker-slice-6h.visual.spec.ts');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const trackerSrc = existsSync(TRACKER) ? readFileSync(TRACKER, 'utf-8') : '';
const terminalCssSrc = existsSync(TERMINAL_CSS) ? readFileSync(TERMINAL_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const visualReadmeSrc = existsSync(VISUAL_README) ? readFileSync(VISUAL_README, 'utf-8') : '';
const e2eSpecSrc = existsSync(E2E_SPEC) ? readFileSync(E2E_SPEC, 'utf-8') : '';

function execTerminalBlock() {
	return workoutSrc.match(/pw-theater pd-os-deck[\s\S]*?pw-exec__command/)?.[0] ?? '';
}

describe('Sprint 2.22 slice 6h — shared diegetic terminal CSS', () => {
	it('player-terminal.css exists with Sprint 2.22 slice 6h comment', () => {
		expect(existsSync(TERMINAL_CSS)).toBe(true);
		expect(terminalCssSrc).toMatch(/Sprint 2\.22 slice 6h — Train \/ Tracker terminal chrome/);
	});

	it('defines pg-terminal-chrome, brackets, and pw-terminal-state (G9: no pg-scanline)', () => {
		expect(terminalCssSrc).toMatch(/\.pg-terminal-chrome/);
		expect(terminalCssSrc).not.toMatch(/\.pg-scanline\s*\{/);
		expect(terminalCssSrc).not.toMatch(/@keyframes pg-scan/);
		expect(terminalCssSrc).toMatch(/\.pg-bracket--tl/);
		expect(terminalCssSrc).toMatch(/\.pg-bracket--tr/);
		expect(terminalCssSrc).toMatch(/\.pg-bracket--bl/);
		expect(terminalCssSrc).toMatch(/\.pg-bracket--br/);
		expect(terminalCssSrc).toMatch(/\.pw-terminal-state/);
	});
});

describe('Sprint 2.22 slice 6h — Train workout route', () => {
	it('workout root includes player-hud-root', () => {
		expect(workoutSrc).toMatch(/player-hud-root/);
	});

	it('workout page imports player-terminal.css', () => {
		expect(workoutSrc).toMatch(/player-terminal\.css/);
	});

	it('hero deck uses shared theater surface without brackets or scanline (G9 cohesion)', () => {
		const block = execTerminalBlock();
		expect(block).toMatch(/pw-exec__command/);
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
		expect(workoutSrc).not.toMatch(/pg-scanline/);
		expect(workoutSrc).not.toMatch(/pg-bracket/);
		expect(workoutSrc).not.toMatch(/pw-terminal-well/);
	});

	it('exec section outer element lacks pd-page-panel', () => {
		expect(workoutSrc).toMatch(/class="pw-exec/);
		expect(workoutSrc).not.toMatch(/pd-page-panel/);
	});

	it('terminal state copy covers ready, armed, and transmitting', () => {
		expect(workoutSrc).toMatch(/READY TO TRANSMIT/);
		expect(workoutSrc).toMatch(/TRANSMITTING/);
		expect(workoutSrc).toMatch(/pw-terminal-state/);
		expect(workoutSrc).toMatch(/activeMissionId/);
	});

	it('workout page scoped styles do not set competing pw-title font-size', () => {
		expect(workoutSrc).not.toMatch(/\.pw-title\s*\{[^}]*font-size:\s*1\.125rem/s);
	});
});

describe('Sprint 2.22 slice 6h — Tracker route', () => {
	it('tracker root includes player-hud-root', () => {
		expect(trackerSrc).toMatch(/player-hud-root/);
	});

	it('MemoryCapsuleArena receives dossierMode={true}', () => {
		expect(trackerSrc).toMatch(/dossierMode=\{true\}/);
	});

	it('stat section uses pd-stat-row pd-os-deck (6j-b deck band)', () => {
		expect(trackerSrc).toMatch(/pd-stat-row pd-os-deck/);
		expect(trackerSrc).not.toMatch(/pt-stat-void|pd-stat-row pd-page-panel/);
	});

	it('ghost empty state uses pd-os-deck__well whisper inset', () => {
		expect(trackerSrc).toMatch(/pd-os-deck__well pt-ghost--whisper/);
		expect(trackerSrc).not.toMatch(/pt-ghost pd-page-panel pd-empty-state/);
	});
});

describe('Sprint 2.22 slice 6h — HUD CSS material rules', () => {
	it('player-dashboard-hud.css contains Sprint 2.22 slice 6h block', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6h — Train \/ Tracker terminal chrome/);
	});

	it('.player-hud-root .pw-title uses var(--pd-hud-title-l2)', () => {
		const block =
			hudCssSrc.match(/\.player-hud-root \.pw-title\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(block).toMatch(/font-size:\s*var\(--pd-hud-title-l2\)/);
	});

	it('.player-hud-root .pw-eyebrow uses var(--pd-hud-eyebrow-l3)', () => {
		const block =
			hudCssSrc.match(/\.player-hud-root \.pw-eyebrow\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(block).toMatch(/font-size:\s*var\(--pd-hud-eyebrow-l3\)/);
	});

	it('defines Tracker 6j-b deck stack and ghost well treatments', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6j-b — Tracker route deck stack/);
		expect(hudCssSrc).toMatch(/\.player-hud-root \.pd-stat-row\.pd-os-deck/);
		expect(hudCssSrc).toMatch(/\.player-hud-root \.pt-ghost--whisper\.pd-os-deck__well/);
		expect(hudCssSrc).toMatch(/max-height:\s*80px/);
		expect(hudCssSrc).not.toMatch(/\.player-hud-root \.pt-stat-void::before/);
	});
});

describe('Sprint 2.22 slice 6h — visual acceptance + ROADMAP', () => {
	it('visual acceptance README documents train + tracker PNGs', () => {
		expect(existsSync(VISUAL_README)).toBe(true);
		expect(visualReadmeSrc).toMatch(/train-1280-exec-terminal\.png/);
		expect(visualReadmeSrc).toMatch(/train-1280-columns\.png/);
		expect(visualReadmeSrc).toMatch(/train-390-terminal\.png/);
		expect(visualReadmeSrc).toMatch(/tracker-1280-capsule\.png/);
		expect(visualReadmeSrc).toMatch(/tracker-1280-ghost-whisper\.png/);
		expect(visualReadmeSrc).toMatch(/stats-1280-regression\.png/);
	});

	it('e2e visual spec covers train exec terminal and tracker capsule', () => {
		expect(existsSync(E2E_SPEC)).toBe(true);
		expect(e2eSpecSrc).toMatch(/slice 6h/);
		expect(e2eSpecSrc).toMatch(/pg-terminal-chrome|pw-panel--term/);
		expect(e2eSpecSrc).toMatch(/tracker-1280-capsule|mc-arena--dossier-premium/);
	});

	it('ROADMAP marks 6g and 6h Done (6j-b current)', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*6g\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/\|\s*\*\*6h\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/slice 6j-b Routes pd-os-deck depth \(in progress\)/);
	});
});

