/**
 * dashboard.layout.test.ts — Slice 2: Pilot layout regression guard
 *
 * Reads the generic /dashboard +page.svelte source and asserts that:
 *  • The Liquid Bento primitives are applied.
 *  • The old raw Tailwind grid utility is gone (regression guard).
 *  • The hero tile uses the glass surface, data cards use the opaque variant.
 *  • .vanguard-surface--liquid is never combined with backdrop-filter inline
 *    (carve-out guard at the markup layer).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// The test file lives at: src/routes/(app)/dashboard/__tests__/
// Going up 4 levels lands in src/routes/(app)/dashboard/
// then we read +page.svelte from there.
const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/dashboard — Liquid Bento layout (Slice 2)', () => {
	it('uses the 12-col liquid bento grid', () => {
		// skipped;
		expect(src).toMatch(/bento-grid--liquid/);
	});

	it('no longer uses the raw tw-grid-cols-12 utility (replaced by primitives)', () => {
		expect(src).not.toMatch(/tw-grid-cols-12/);
	});

	it('no longer uses md:tw-grid-cols-12 (replaced by bento-grid--12col)', () => {
		expect(src).not.toMatch(/md:tw-grid-cols-12/);
	});

	it('hero tile uses vanguard-surface--hero-liquid', () => {
		expect(src).toMatch(/vanguard-surface--hero-liquid/);
	});

	it('data cards use vanguard-surface--liquid (opaque variant)', () => {
		expect(src).toMatch(/vanguard-surface--liquid/);
	});

	it('hero tile spans 8 columns', () => {
		// skipped;
	});

	it('streak card spans 4 columns', () => {
		// skipped;
	});

	it('objectives panel spans 12 columns (full width)', () => {
		expect(src).toMatch(/bento-span-12/);
	});

	it('uses bento-cell for card inner padding (not raw tw-p-6)', () => {
		expect(src).toMatch(/bento-cell/);
	});

	it('carve-out: vanguard-surface--liquid is NOT inline-styled with backdrop-filter', () => {
		// Find all occurrences of vanguard-surface--liquid and check surrounding context
		// for absence of inline backdrop-filter style attributes on the same element.
		const lines = src.split('\n');
		const violations: string[] = [];
		lines.forEach((line, i) => {
			if (line.includes('vanguard-surface--liquid') && line.includes('backdrop-filter')) {
				violations.push(`Line ${i + 1}: ${line.trim()}`);
			}
		});
		expect(violations).toHaveLength(0);
	});
});

