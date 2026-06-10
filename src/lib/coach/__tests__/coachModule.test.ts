/**
 * Coach OS module layout — routes stay thin; domain lives under $lib/coach/.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd(), 'src');
const COACH_LIB = join(ROOT, 'lib/coach');
const RULES = join(process.cwd(), 'firestore.rules');

describe('$lib/coach module tree', () => {
	it('barrel exports context, intent, drills, logistics, match-day', () => {
		const barrel = readFileSync(join(COACH_LIB, 'index.ts'), 'utf-8');
		expect(barrel).toMatch(/context\/index/);
		expect(barrel).toMatch(/intent\/index/);
		expect(barrel).toMatch(/drills\/index/);
		expect(barrel).toMatch(/logistics\/index/);
		expect(barrel).toMatch(/match-day\/index/);
	});

	it('CoachTeamScope lives in context module', () => {
		expect(existsSync(join(COACH_LIB, 'context/coachTeamScope.svelte.ts'))).toBe(true);
		const src = readFileSync(join(COACH_LIB, 'context/coachTeamScope.svelte.ts'), 'utf-8');
		expect(src).toMatch(/syncSelectedTeam/);
		expect(src).toMatch(/workspaceContextStore/);
	});
});

describe('Coach routes — thin shells', () => {
	const cases = [
		{
			route: 'forge',
			importPattern: /\$lib\/coach\/intent/,
			view: 'CoachIntentEngineView',
		},
		{
			route: 'drills',
			importPattern: /\$lib\/coach\/drills/,
			view: 'CoachDrillsView',
		},
		{
			route: 'logistics',
			importPattern: /\$lib\/coach\/logistics/,
			view: 'CoachLogisticsView',
		},
		{
			route: 'match-day',
			importPattern: /\$lib\/coach\/match-day/,
			view: 'CoachMatchDayView',
		},
	];

	for (const { route, importPattern, view } of cases) {
		it(`/coach/${route} imports ${view} from $lib/coach`, () => {
			const page = readFileSync(
				join(ROOT, 'routes/(app)/coach', route, '+page.svelte'),
				'utf-8',
			);
			expect(page).toMatch(importPattern);
			expect(page).toMatch(new RegExp(view));
			expect(page.length).toBeLessThan(400);
		});
	}

	it('domain views are not duplicated under routes/', () => {
		expect(existsSync(join(ROOT, 'routes/(app)/coach/drills/CoachDrillsView.svelte'))).toBe(
			false,
		);
		expect(existsSync(join(COACH_LIB, 'drills/CoachDrillsView.svelte'))).toBe(true);
		expect(existsSync(join(COACH_LIB, 'logistics/CoachLogisticsView.svelte'))).toBe(true);
		expect(existsSync(join(COACH_LIB, 'match-day/CoachMatchDayView.svelte'))).toBe(true);
	});
});

// T1-2 — match-day telemetry Firestore persistence guards
describe('T1-2: match-day telemetry Firestore persistence', () => {
	const VIEW = join(COACH_LIB, 'match-day/CoachMatchDayView.svelte');

	it('CoachMatchDayView persists telemetry events to teams/{teamId}/telemetry_events via addDoc', () => {
		const src = readFileSync(VIEW, 'utf-8');
		expect(src).toMatch(/['"]teams['"]\s*,\s*tid\s*,\s*['"]telemetry_events['"]/);
		expect(src).toMatch(/addDoc/);
		expect(src).toMatch(/serverTimestamp/);
	});

	it('CoachMatchDayView writes teamId, clubId, and loggedBy fields to the event doc', () => {
		const src = readFileSync(VIEW, 'utf-8');
		expect(src).toMatch(/teamId\s*:\s*tid/);
		expect(src).toMatch(/clubId\s*:\s*teamScope\.teamClubId/);
		expect(src).toMatch(/loggedBy\s*:\s*uid/);
	});

	it('CoachMatchDayView uses a date-scoped sessionMatchId derived from selectedTeamId', () => {
		const src = readFileSync(VIEW, 'utf-8');
		expect(src).toMatch(/sessionMatchId/);
		expect(src).toMatch(/matchId\s*:\s*mid/);
		// matchId must be capped to 128 chars to satisfy the firestore rule
		expect(src).toMatch(/\.slice\(0,\s*128\)/);
	});

	it('CoachMatchDayView hydrates eventFeed from Firestore on team change (getDocs + where matchId)', () => {
		const src = readFileSync(VIEW, 'utf-8');
		expect(src).toMatch(/getDocs/);
		expect(src).toMatch(/where\s*\(\s*['"]matchId['"]/);
		expect(src).toMatch(/orderBy\s*\(\s*['"]timestamp['"]/);
		expect(src).toMatch(/eventFeed\s*=/);
	});

	it('firestore.rules already covers teams/telemetry_events writes for coach staff — no new rule needed', () => {
		const rules = readFileSync(RULES, 'utf-8');
		expect(rules).toMatch(/match \/telemetry_events\/\{eventId\}/);
		expect(rules).toMatch(/coachStaffCanAccessTeam\(teamId\)/);
		expect(rules).toMatch(/directorScopedToTeam\(teamId\)/);
	});
});

// T1-3 — club drill promote: clipboard stub replaced with canonical Firestore write
describe('T1-3: drill promote writes to canonical Firestore path (not clipboard-only)', () => {
	const DRILLS_VIEW = join(COACH_LIB, 'drills/CoachDrillsView.svelte');
	const PLATFORM_LIB = join(COACH_LIB, 'platformDrillLibrary.ts');

	it('CoachDrillsView imports recommendDrillToDirector (not clipboard-only buildDirectorDrillRecommendation)', () => {
		const src = readFileSync(DRILLS_VIEW, 'utf-8');
		expect(src).toMatch(/recommendDrillToDirector/);
		expect(src).not.toMatch(/buildDirectorDrillRecommendation/);
	});

	it('CoachDrillsView recommend handler writes to Firestore (no navigator.clipboard as sole effect)', () => {
		const src = readFileSync(DRILLS_VIEW, 'utf-8');
		// Must call recommendDrillToDirector with db
		expect(src).toMatch(/recommendDrillToDirector\s*\(\s*db/);
		// clipboard.writeText must not be the promote path (ok elsewhere, but not in the recommend handler)
		// Verify the handler does NOT fall back to clipboard as sole effect
		const recommendFn = src.match(/async function recommendToDirector[\s\S]*?\n\t}/)?.[0] ?? '';
		expect(recommendFn).toBeTruthy();
		expect(recommendFn).not.toMatch(/navigator\.clipboard/);
	});

	it('platformDrillLibrary exports recommendDrillToDirector writing to drill_recommendations', () => {
		const src = readFileSync(PLATFORM_LIB, 'utf-8');
		expect(src).toMatch(/export async function recommendDrillToDirector/);
		// Must write to the drill_recommendations collection — NOT club_playbooks or shared_drills directly
		expect(src).toMatch(/['"']drill_recommendations['"']/);
		expect(src).not.toMatch(/['"']club_playbooks['"']/);
	});

	it('platformDrillLibrary exports publishDrillToClub writing to clubs/{clubId}/shared_drills', () => {
		const src = readFileSync(PLATFORM_LIB, 'utf-8');
		expect(src).toMatch(/export async function publishDrillToClub/);
		// Must write to clubs/{cid}/shared_drills — the collection loadTeamDrillsForIntent reads
		expect(src).toMatch(/['"']clubs['"']\s*,\s*cid\s*,\s*['"']shared_drills['"']/);
	});

	it('recommendDrillToDirector doc shape includes fields loadTeamDrillsForIntent reads (title/name, attributeId, durationMinutes)', () => {
		const src = readFileSync(PLATFORM_LIB, 'utf-8');
		// Extract the recommendDrillToDirector function body
		const fnMatch = src.match(/export async function recommendDrillToDirector[\s\S]*?\n\}/);
		const fn = fnMatch?.[0] ?? '';
		expect(fn).toMatch(/title\s*[,:]/);;
		expect(fn).toMatch(/name\s*:/);
		expect(fn).toMatch(/attributeId\s*:/);
		expect(fn).toMatch(/durationMinutes\s*:/);
	});

	it('publishDrillToClub doc shape includes fields loadTeamDrillsForIntent reads (title, attributeId, durationMinutes)', () => {
		const src = readFileSync(PLATFORM_LIB, 'utf-8');
		const fnMatch = src.match(/export async function publishDrillToClub[\s\S]*?\n\}/);
		const fn = fnMatch?.[0] ?? '';
		expect(fn).toMatch(/title\s*[,:]/);;
		expect(fn).toMatch(/attributeId\s*:/);
		expect(fn).toMatch(/durationMinutes\s*:/);
	});

	it('clubs/{clubId}/shared_drills rule ships (director write, coach read) — confirm no new rule needed for shared_drills', () => {
		const rules = readFileSync(RULES, 'utf-8');
		expect(rules).toMatch(/match \/shared_drills\/\{drillId\}/);
		// Coach can read
		expect(rules).toMatch(/isCoach\(\)/);
		// Director can write
		expect(rules).toMatch(/isDirector\(\)/);
	});
});

// LAUNCH-club-drill-promote — director inbox UI on Playbook tab
describe('LAUNCH-club-drill-promote: director drill recommendation inbox', () => {
	const PANEL = join(ROOT, 'lib/components/director/DirectorDrillRecommendationsPanel.svelte');
	const PLAYBOOK = join(ROOT, 'lib/components/director/PlaybookTab.svelte');
	const PLATFORM_LIB = join(COACH_LIB, 'platformDrillLibrary.ts');

	it('DirectorDrillRecommendationsPanel imports publishDrillToClub and dismissDrillRecommendation', () => {
		const src = readFileSync(PANEL, 'utf-8');
		expect(src).toMatch(/publishDrillToClub/);
		expect(src).toMatch(/dismissDrillRecommendation/);
		expect(src).toMatch(/drill_recommendations/);
	});

	it('PlaybookTab mounts DirectorDrillRecommendationsPanel for director inbox', () => {
		const src = readFileSync(PLAYBOOK, 'utf-8');
		expect(src).toMatch(/DirectorDrillRecommendationsPanel/);
	});

	it('publishDrillToClub marks recommendation published after shared_drills write', () => {
		const src = readFileSync(PLATFORM_LIB, 'utf-8');
		const fn = src.match(/export async function publishDrillToClub[\s\S]*?\n\}/)?.[0] ?? '';
		expect(fn).toMatch(/status:\s*['"]published['"]/);
		expect(fn).toMatch(/publishedDrillId:\s*ref\.id/);
	});

	it('dismissDrillRecommendation exports status dismissed update', () => {
		const src = readFileSync(PLATFORM_LIB, 'utf-8');
		expect(src).toMatch(/export async function dismissDrillRecommendation/);
		expect(src).toMatch(/status:\s*['"]dismissed['"]/);
	});
});
