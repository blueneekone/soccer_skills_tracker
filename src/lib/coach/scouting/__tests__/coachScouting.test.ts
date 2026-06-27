/**
 * coachScouting.test.ts — LAUNCH-scouting functional wiring guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const VIEW = join(ROOT, 'lib/coach/scouting/CoachScoutingView.svelte');
const PAGE = join(ROOT, 'routes/(app)/coach/scouting/+page.svelte');
const RULES = join(process.cwd(), 'firestore.rules');

describe('LAUNCH-scouting — coach Proving Grounds wiring', () => {
	it('route delegates to CoachScoutingView (thin page)', () => {
		const page = readFileSync(PAGE, 'utf8');
		expect(page).toMatch(/CoachScoutingView/);
		expect(page).not.toMatch(/MOCK_PROSPECTS/);
	});

	it('CoachScoutingView loads roster from player_lookup by teamId', () => {
		const src = readFileSync(VIEW, 'utf8');
		expect(src).toMatch(/player_lookup/);
		expect(src).toMatch(/where\('teamId', '==', teamId\)/);
		expect(src).not.toMatch(/MOCK_PROSPECTS/);
	});

	it('CoachScoutingView persists locked assessments under teams/{teamId}/scouting_assessments', () => {
		const src = readFileSync(VIEW, 'utf8');
		expect(src).toMatch(/scouting_assessments/);
		expect(src).toMatch(/lockAssessment/);
		expect(src).toMatch(/overallGrade/);
	});

	it('CoachScoutingView uses CoachTeamScope for team picker', () => {
		const src = readFileSync(VIEW, 'utf8');
		expect(src).toMatch(/CoachTeamScope/);
	});

	it('SURFACE-MERGE-TRIAL-EVAL — CoachScoutingView mounts roster quick eval tab', () => {
		const src = readFileSync(VIEW, 'utf8');
		expect(src).toMatch(/CoachRosterQuickEvalPanel/);
		expect(src).toMatch(/roster-eval/);
		expect(src).toMatch(/setScoutingTab/);
	});

	it('firestore.rules defines scouting_assessments under teams with coach write', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/match \/scouting_assessments\/\{playerKey\}/);
		expect(rules).toMatch(/coachStaffCanAccessTeam\(teamId\)/);
	});
});
