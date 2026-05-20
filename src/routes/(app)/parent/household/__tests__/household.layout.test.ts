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
	it('.phh-surface CSS uses var(--shadow-liquid)', () => {
		expect(src).toMatch(/var\(--shadow-liquid\)/);
	});

	it('page shell uses --bento-pad-liquid', () => {
		expect(src).toMatch(/--bento-pad-liquid/);
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
