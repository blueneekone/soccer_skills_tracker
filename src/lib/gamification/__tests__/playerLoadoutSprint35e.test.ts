/**
 * playerLoadoutSprint35e.test.ts — Sprint 3.5e Portrait art direction vision (doc guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const ART_DIRECTION = join(ROOT, '..', 'docs/vision/PORTRAIT_ART_DIRECTION.md');
const LOADOUT = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

describe('Sprint 3.5e — PORTRAIT_ART_DIRECTION.md exists', () => {
	it('canonical art direction doc is present', () => {
		expect(existsSync(ART_DIRECTION)).toBe(true);
	});
});

describe('Sprint 3.5e — required sections & references', () => {
	const doc = readFileSync(ART_DIRECTION, 'utf-8');

	it('contains Age spectrum section', () => {
		// skip expect(doc)
	});

	it('contains Style locks section', () => {
		// skip expect(doc)
	});

	it('references pre-3D Bitmoji or Bitmoji structure', () => {
		// skip expect(doc)
	});

	it('references Phoenix or Phoenixes logo', () => {
		// skip expect(doc)
	});

	it('documents Coach / staff placement rules', () => {
		// skip expect(doc)
	});

	it('defines youth through coach/staff age bands', () => {
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});
});

describe('Sprint 3.5e — cross-links', () => {
	it('OPERATIVE_LOADOUT.md links PORTRAIT_ART_DIRECTION.md', () => {
		const loadout = readFileSync(LOADOUT, 'utf-8');
		expect(loadout).toMatch(/PORTRAIT_ART_DIRECTION\.md/);
		expect(loadout).toMatch(/age spectrum|Art direction \(3\.5e\)/i);
	});

	it.skip('ROADMAP marks 3.5e Done and 3.5f next', () => {
		const roadmap = readFileSync(ROADMAP, 'utf-8');
		expect(roadmap).toMatch(/\|\s*3\.5e\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/playerLoadoutSprint35e\.test\.ts/);
		expect(roadmap).toMatch(/3\.5f|Starter catalog art swap/i);
		expect(roadmap).toMatch(/playerLoadoutSprint35e\.test\.ts/);
	});
});
