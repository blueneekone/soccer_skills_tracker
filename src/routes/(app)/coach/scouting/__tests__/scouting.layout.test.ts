/**
 * scouting.layout.test.ts — Slice 5: Coach scouting liquid bento regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const VIEW = join(process.cwd(), 'src/lib/coach/scouting/CoachScoutingView.svelte');
const pageSrc = readFileSync(PAGE, 'utf-8');
const viewSrc = readFileSync(VIEW, 'utf-8');

describe('/coach/scouting — Liquid Bento (Sprint 1.1)', () => {
	it('prospect panel grid uses bento-grid--liquid', () => {
		expect(viewSrc).toMatch(/bento-grid--liquid/);
	});

	it('uses 12-column bento grid layout', () => {
		expect(viewSrc).toMatch(/bento-grid--12col/);
	});

	it('roster spans 4 columns and evaluation spans 8', () => {
		expect(viewSrc).toMatch(/tw-col-span-4/);
		expect(viewSrc).toMatch(/tw-col-span-8/);
	});

	it('route stays thin and imports CoachScoutingView', () => {
		expect(pageSrc).toMatch(/CoachScoutingView/);
	});
});
