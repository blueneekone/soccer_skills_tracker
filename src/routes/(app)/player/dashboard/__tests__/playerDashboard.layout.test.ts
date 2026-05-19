/**
 * playerDashboard.layout.test.ts — Slice 3: Player dashboard liquid bento regression
 *
 * Guards that the player dashboard:
 *  • Uses the Liquid Bento grid (dense flow + clamp gap).
 *  • Opaque .bento-card CSS incorporates --shadow-liquid.
 *  • A loading skeleton / loading state exists (CLS guard, .cursorrules §4).
 *  • No backdrop-filter inside .bento-card local CSS (carve-out regression guard).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/player/dashboard — Liquid Bento (Slice 3)', () => {
	it('adds bento-grid--liquid to the lobby grid', () => {
		expect(src).toMatch(/bento-grid--liquid/);
	});

	it('retains bento-grid--12col for the 12-column layout', () => {
		expect(src).toMatch(/bento-grid--12col/);
	});

	it('.bento-card local CSS uses var(--shadow-liquid)', () => {
		expect(src).toMatch(/var\(--shadow-liquid\)/);
	});

	it('.bento-card local CSS does NOT use backdrop-filter (opaque carve-out)', () => {
		// Extract the .bento-card rule block
		const m = src.match(/\.bento-card\s*\{([^}]+)\}/s);
		expect(m).not.toBeNull();
		expect(m![1]).not.toMatch(/backdrop-filter/);
	});

	it('has a loading/skeleton state for CLS prevention (.cursorrules §4)', () => {
		// The page must contain either aria-busy, a skeleton loader, or a loading conditional
		const hasLoadingState =
			src.includes('authStore.isLoading') ||
			src.includes('aria-busy') ||
			src.includes('skeleton') ||
			src.includes(':loading');
		expect(hasLoadingState).toBe(true);
	});
});
