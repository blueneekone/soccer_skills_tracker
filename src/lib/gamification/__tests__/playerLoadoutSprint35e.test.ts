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
		expect(doc).toMatch(/##\s*4\.\s*Age spectrum|Age spectrum/i);
	});

	it('contains Style locks section', () => {
		expect(doc).toMatch(/##\s*2\.\s*Style locks|Style locks/i);
	});

	it('references pre-3D Bitmoji or Bitmoji structure', () => {
		expect(doc).toMatch(/pre-3D Bitmoji|Bitmoji/i);
	});

	it('references Phoenix or Phoenixes logo', () => {
		expect(doc).toMatch(/Phoenix|Phoenixes_Logo/i);
	});

	it('documents Coach / staff placement rules', () => {
		expect(doc).toMatch(/Coach|staff/i);
	});

	it('defines youth through coach/staff age bands', () => {
		expect(doc).toMatch(/Youth/i);
		expect(doc).toMatch(/Teen/i);
		expect(doc).toMatch(/Coach|staff/i);
	});
});

describe('Sprint 3.5e — cross-links', () => {
	it('OPERATIVE_LOADOUT.md links PORTRAIT_ART_DIRECTION.md', () => {
		const loadout = readFileSync(LOADOUT, 'utf-8');
		expect(loadout).toMatch(/PORTRAIT_ART_DIRECTION\.md/);
		expect(loadout).toMatch(/age spectrum|Art direction \(3\.5e\)/i);
	});

	it('ROADMAP marks 3.5e Done and 3.5f next', () => {
		const roadmap = readFileSync(ROADMAP, 'utf-8');
		expect(roadmap).toMatch(/\|\s*3\.5e\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/playerLoadoutSprint35e\.test\.ts/);
		expect(roadmap).toMatch(/3\.5f|Starter catalog art swap/i);
		expect(roadmap).toMatch(/playerLoadoutSprint35e\.test\.ts/);
	});
});
