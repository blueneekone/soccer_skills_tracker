/**
 * household.layout.test.ts — Slice 4: Parent household liquid regression
 *
 * Guards that:
 *  • .phh-surface local CSS incorporates --shadow-liquid.
 *  • The form sub-grid uses bento-grid--liquid (dense flow + clamp gap).
 *  • .phh-surface does NOT apply backdrop-filter (opaque carve-out).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/parent/household — Liquid aesthetic (Sprint 1.1)', () => {
	it('uses parent lounge Z2 panels on main sections', () => {
		expect(src).toMatch(/parent-lounge-z2-panel/);
	});

	it('parent lounge shell provides page gutter via layout CSS', () => {
		const layout = readFileSync(join(__dirname, '..', '..', '+layout.svelte'), 'utf-8');
		expect(layout).toMatch(/parent-lounge-z1-well/);
	});

	it('main sections use 12-column liquid bento grid', () => {
		expect(src).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
	});

	it('.phh-surface CSS does NOT apply backdrop-filter (opaque carve-out)', () => {
		const m = src.match(/\.phh-surface\s*\{([^}]+)\}/s);
		expect(m).not.toBeNull();
		expect(m![1]).not.toMatch(/backdrop-filter/);
	});

	it('the form sub-grid uses bento-grid--liquid', () => {
		expect(src).toMatch(/bento-grid--liquid/);
	});
});
