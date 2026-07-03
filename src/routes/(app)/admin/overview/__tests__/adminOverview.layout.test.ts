/**
 * adminOverview.layout.test.ts — Slice 6: Admin overview liquid bento regression
 *
 * Guards that:
 *  • All KPI bento grids use bento-grid--liquid (dense flow + clamp gap).
 *  • .cc-soc-card CSS uses --shadow-liquid (opaque carve-out preserved).
 *  • .cc-soc-card CSS does NOT use backdrop-filter.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const ARENA = join(__dirname, '..', 'AdminOverviewArena.svelte');
const HUD = join(__dirname, '..', 'AdminOverviewHUD.svelte');

const src = readFileSync(PAGE, 'utf-8');
const arenaSrc = readFileSync(ARENA, 'utf-8');
const hudSrc = readFileSync(HUD, 'utf-8');

describe('/admin/overview — Liquid Bento (Sprint 1.1)', () => {
	it('tab panels use 12-column liquid bento grid', () => {
		expect(arenaSrc).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
	});

	it('KPI tiles use bento-span-3 within the 12-column grid', () => {
		expect(arenaSrc).toMatch(/bento-span-3/);
	});

	it('shell padding uses --bento-pad-liquid', () => {
		expect(src).toMatch(/--bento-pad-liquid/);
	});

	it('.cc-soc-card CSS uses var(--shadow-liquid)', () => {
		expect(src).toMatch(/var\(--shadow-liquid\)/);
	});

	it('.cc-soc-card CSS does NOT apply backdrop-filter (opaque carve-out)', () => {
		const m = src.match(/\.cc-soc-card\s*\{([^}]+)\}/s);
		expect(m).not.toBeNull();
		expect(m![1]).not.toMatch(/backdrop-filter/);
	});

	it('cards and panels use dark-form-surface (Sprint 0.1)', () => {
		expect(arenaSrc).toMatch(/cc-soc-card dark-form-surface/);
		expect(hudSrc).toMatch(/cc-chart-card--soc dark-form-surface/);
		expect(hudSrc).toMatch(/cc-feed-shell--soc dark-form-surface/);
	});
});
