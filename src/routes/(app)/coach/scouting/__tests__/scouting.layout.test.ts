/**
 * scouting.layout.test.ts — Slice 5: Coach scouting liquid bento regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/coach/scouting — Liquid Bento (Sprint 1.1)', () => {
	it('prospect panel grid uses bento-grid--liquid', () => {
		expect(src).toMatch(/bento-grid--liquid/);
	});

	it('uses 12-column bento grid layout', () => {
		expect(src).toMatch(/bento-grid--12col/);
	});

	it('roster spans 4 columns and evaluation spans 8', () => {
		expect(src).toMatch(/bento-span-4/);
		expect(src).toMatch(/bento-span-8/);
	});
});
