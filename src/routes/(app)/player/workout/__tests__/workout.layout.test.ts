/**
 * workout.layout.test.ts — Sprint 1.1: Player workout 12-col bento regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/player/workout — Liquid Bento (Sprint 1.1)', () => {
	it('execution workspace uses 12-column liquid bento grid', () => {
		expect(src).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
	});

	it('ingest queue spans 4 columns and terminal spans 8', () => {
		expect(src).toMatch(/bento-span-4/);
		expect(src).toMatch(/bento-span-8/);
	});

	it('shell padding uses --bento-pad-liquid', () => {
		expect(src).toMatch(/--bento-pad-liquid/);
	});
});
