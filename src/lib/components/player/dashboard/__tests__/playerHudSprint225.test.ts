/**
 * playerHudSprint225.test.ts — Sprint 2.22 slice 4e stats chart parity + workout slider focus
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');

const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';

describe('Sprint 2.22 slice 4e — stats workout chart full-width parity', () => {
	it('stats/+page.svelte dossier-workout__chart uses 300px height', () => {
		expect(statsSrc).toMatch(/dossier-workout__chart[^>]*tw-h-\[300px\]/);
		expect(statsSrc).toMatch(/dossier-workout__chart[\s\S]*?min-height:\s*300px/);
	});

	it('stats/+page.svelte dossier-workout has bento-span-12 when player role', () => {
		expect(statsSrc).toMatch(/dossier-workout[\s\S]*?class:bento-span-12=\{isPlayerRole\}/);
	});

	it('stats/+page.svelte preserves grid-column 1 / -1 for dossier-workout at desktop', () => {
		expect(statsSrc).toMatch(/dossier-workout[^}]*grid-column:\s*1\s*\/\s*-1/s);
	});

	it('stats/+page.svelte workout chart keeps maintainAspectRatio false and calls resize after data patch', () => {
		expect(statsSrc).toMatch(/maintainAspectRatio:\s*false/);
		expect(statsSrc).toMatch(/workoutChartInst\.update\('none'\)/);
		expect(statsSrc).toMatch(/workoutChartInst\.resize\(\)/);
	});

	it('stats/+page.svelte workout chart canvas fills container edge-to-edge', () => {
		expect(statsSrc).toMatch(/\.dossier-workout \.dossier-canvas[\s\S]*?width:\s*100% !important/);
		expect(statsSrc).toMatch(/\.dossier-workout \.dossier-canvas[\s\S]*?height:\s*100% !important/);
	});
});

describe('Sprint 2.22 slice 4e — workout slider focus-visible only', () => {
	it('workout/+page.svelte uses pw-range:focus-visible for keyboard focus ring', () => {
		expect(workoutSrc).toMatch(/\.pw-range:focus-visible[\s\S]*?outline:/);
	});

	it('workout/+page.svelte pw-range:focus sets outline none (mouse click no box)', () => {
		expect(workoutSrc).toMatch(/\.pw-range:focus[\s\S]*?outline:\s*none/);
	});

	it('workout/+page.svelte intensity slider gets amber focus-visible ring', () => {
		expect(workoutSrc).toMatch(/\.pw-gauge:last-child \.pw-range:focus-visible[\s\S]*?#f59e0b/);
	});
});
