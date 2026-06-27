/**
 * coachRosterQuickEval.test.ts — SURFACE-MERGE-TRIAL-EVAL roster quick log guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const PANEL = join(ROOT, 'lib/coach/scouting/CoachRosterQuickEvalPanel.svelte');

describe('SURFACE-MERGE-TRIAL-EVAL — CoachRosterQuickEvalPanel', () => {
	it('loads roster names from rosters/{teamId}', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/doc\(db, 'rosters', teamId\)/);
		expect(src).toMatch(/getDoc/);
	});

	it('writes structured trial rows to trials collection', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/addDoc\(collection\(db, 'trials'\)/);
		expect(src).toMatch(/teamId: tid/);
		expect(src).toMatch(/skill/);
		expect(src).toMatch(/result/);
		expect(src).toMatch(/isCoach: true/);
		expect(src).toMatch(/coachEmail: email/);
		expect(src).toMatch(/source: 'coach_roster_quick_log'/);
		expect(src).toMatch(/serverTimestamp\(\)/);
	});

	it('uses sport attribute schema for skill slot picker', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/getAttributeSchemaForSport/);
		expect(src).toMatch(/schema\.keys/);
	});
});
