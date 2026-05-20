/**
 * forge.layout.test.ts — Slice 5: Coach forge liquid bento regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/coach/forge — Liquid Bento (Sprint 1.1)', () => {
	it('workspace uses 12-column liquid bento grid', () => {
		expect(src).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
	});

	it('outer vanguard-surface panel uses vanguard-surface--liquid', () => {
		expect(src).toMatch(/vanguard-surface--liquid/);
	});

	it('armory spans 8 columns and payload spans 4', () => {
		expect(src).toMatch(/bento-span-8/);
		expect(src).toMatch(/bento-span-4/);
	});
});
