/**
 * playerRlFunctional.test.ts — Sprint RL-audit (adaptive homework wiring guards)
 * Heuristic mode at abPercent=0 is sufficient; no GCS-trained model required.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const FUNCTIONS_INDEX = join(ROOT, '..', 'functions/index.js');
const ADAPTIVE_HOMEWORK = join(ROOT, 'routes/(app)/player/dashboard/AdaptiveHomework.svelte');
const DASHBOARD_PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const FUNCTIONAL_MVP = join(ROOT, '..', 'docs/vision/FUNCTIONAL_MVP.md');

describe('Sprint RL-audit — getAdaptiveWorkoutPolicy export', () => {
	it('functions/index.js exports getAdaptiveWorkoutPolicy', () => {
		expect(existsSync(FUNCTIONS_INDEX)).toBe(true);
		const index = readFileSync(FUNCTIONS_INDEX, 'utf-8');
		expect(index).toMatch(/exports\.getAdaptiveWorkoutPolicy\s*=\s*rlOps\.getAdaptiveWorkoutPolicy/);
		expect(index).toMatch(/exports\.rlOnWorkoutLogCreated\s*=\s*transitionRecorder\.onWorkoutLogCreated/);
	});
});

describe('Sprint RL-audit — AdaptiveHomework callable wiring', () => {
	it('AdaptiveHomework calls httpsCallable getAdaptiveWorkoutPolicy', () => {
		expect(existsSync(ADAPTIVE_HOMEWORK)).toBe(true);
		const src = readFileSync(ADAPTIVE_HOMEWORK, 'utf-8');
		expect(src).toMatch(/httpsCallable/);
		expect(src).toMatch(/getAdaptiveWorkoutPolicy/);
		expect(src).toMatch(/team_assignments/);
		expect(src).toMatch(/SUGGESTED BY AI/);
	});

	it('heuristic fallback does not require policy mode', () => {
		const src = readFileSync(ADAPTIVE_HOMEWORK, 'utf-8');
		expect(src).toMatch(/mode === 'policy'/);
		expect(src).toMatch(/global_drills/);
	});
});

describe('Sprint RL-audit — HQ visibility', () => {
	it('player dashboard mounts AdaptiveHomework for assignment + policy path', () => {
		expect(existsSync(DASHBOARD_PAGE)).toBe(true);
		const page = readFileSync(DASHBOARD_PAGE, 'utf-8');
		expect(page).toMatch(/import AdaptiveHomework from '\.\/AdaptiveHomework\.svelte'/);
		expect(page).toMatch(/<AdaptiveHomework\s*\/>/);
		expect(page).toMatch(/aria-label="Adaptive homework"/);
	});

	it('FUNCTIONAL_MVP.md documents RL audit section', () => {
		expect(existsSync(FUNCTIONAL_MVP)).toBe(true);
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/## RL/);
		expect(doc).toMatch(/rl_policy_state\/current/);
		expect(doc).toMatch(/rlOnWorkoutLogCreated/);
		expect(doc).toMatch(/abPercent:\s*0/);
	});
});
