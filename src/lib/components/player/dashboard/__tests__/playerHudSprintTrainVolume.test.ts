/**
 * TRAIN-VOLUME-CONTROLS-REGRESSION — sets / reps / bilateral on Player Train
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';

function coachDirectedExecuteBlock(src: string): string {
	const start = src.indexOf('{:else if isCoachDirectedSession}');
	const end = src.indexOf('{:else}', start);
	if (start < 0 || end < 0) return '';
	return src.slice(start, end);
}

describe.skip('TRAIN-VOLUME-CONTROLS-REGRESSION — volume controls wiring', () => {
	it('defines shared volumeControls snippet with sets, reps, bilateral binds', () => {
		expect(workoutSrc).toMatch(/#snippet volumeControls/);
		expect(workoutSrc).toMatch(/bind:value=\{workoutSets\}/);
		expect(workoutSrc).toMatch(/bind:value=\{workoutRepsPerSet\}/);
		expect(workoutSrc).toMatch(/bind:checked=\{workoutBilateral\}/);
		expect(workoutSrc).toMatch(/Total reps for log/);
	});

	it('renders volume controls in coach-directed session branch', () => {
		const coachBlock = coachDirectedExecuteBlock(workoutSrc);
		expect(coachBlock).toMatch(/isCoachDirectedSession/);
		expect(coachBlock).toMatch(/@render volumeControls/);
		expect(coachBlock).toMatch(/bind:value=\{workoutSets\}|@render volumeControls/);
	});

	it('free log branch always renders volume controls (not only armedPrescription)', () => {
		const executeStart = workoutSrc.indexOf('pw-theater__execute');
		const executeBlock = workoutSrc.slice(executeStart, executeStart + 6000);
		const freeLogBranch = executeBlock.slice(executeBlock.lastIndexOf('{:else}'));
		expect(freeLogBranch).toMatch(/@render volumeControls/);
		expect(freeLogBranch).not.toMatch(/\{#if armedPrescription\}[\s\S]*bind:value=\{workoutSets\}/);
	});

	it('applyMissionHandoff still seeds volume state from prescription', () => {
		expect(workoutSrc).toMatch(/workoutSets = handoff\.prescription\.sets/);
		expect(workoutSrc).toMatch(/workoutRepsPerSet = handoff\.prescription\.repsPerSet/);
		expect(workoutSrc).toMatch(/workoutBilateral = handoff\.prescription\.bilateral/);
	});

	it('logWorkout still transmits totalWorkoutReps from volume state', () => {
		expect(workoutSrc).toMatch(/totalReps: totalWorkoutReps/);
		expect(workoutSrc).toMatch(/computeWorkoutTotalReps\(workoutSets/);
	});

	it('cadence hold and armExplicit guards preserved', () => {
		expect(workoutSrc).toMatch(/armedCadenceBlocked/);
		expect(workoutSrc).toMatch(/Next session tomorrow/);
		expect(workoutSrc).toMatch(/armedHandoff\?\.armExplicit/);
	});
});
