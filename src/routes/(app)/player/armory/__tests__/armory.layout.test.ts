/**
 * armory.layout.test.ts — Slice 3: Player armory liquid aesthetic regression
 *
 * Guards that the armory quartermaster grid:
 *  • Uses var(--bento-gap-liquid) for its gap (fluid clamp spacing).
 *  • .qa-card CSS incorporates --shadow-liquid (opaque, no backdrop-filter).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('/player/armory — Liquid aesthetic (Slice 3)', () => {
	it('.qa-grid uses 12-column liquid bento layout', () => {
		expect(src).toMatch(/qa-grid bento-grid bento-grid--12col bento-grid--liquid/);
	});

	it('.qa-card uses var(--shadow-liquid)', () => {
		expect(src).toMatch(/var\(--shadow-liquid\)/);
	});

	it('.qa-card does NOT use backdrop-filter (opaque carve-out)', () => {
		const m = src.match(/\.qa-card\s*\{([^}]+)\}/s);
		expect(m).not.toBeNull();
		expect(m![1]).not.toMatch(/backdrop-filter/);
	});
});
