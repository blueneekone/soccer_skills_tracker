import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	childProfileLoadErrorMessage,
	deriveHudStreak,
	deriveHudXp,
	deriveProfileXp,
	loadLogWorkoutChildSnapshot,
	parsePlayerStatsHud,
	resolveChildAthleteUid,
} from '$lib/parent/logWorkoutChildProfile.js';

const PAGE = join(process.cwd(), 'src/routes/(app)/parent/log-workout/+page.svelte');

describe('PARENT-LOG-WORKOUT-PROFILE — dual XP HUD helpers', () => {
	it('deriveProfileXp reads users totalXp then xp fallback', () => {
		expect(deriveProfileXp({ totalXp: 120, xp: 50 })).toBe(120);
		expect(deriveProfileXp({ xp: 80 })).toBe(80);
		expect(deriveProfileXp(null)).toBe(0);
	});

	it('parsePlayerStatsHud reads player_stats canonical fields', () => {
		expect(parsePlayerStatsHud({ total_xp: 450, streak_days: 3 })).toEqual({
			totalXp: 450,
			streakDays: 3,
		});
		expect(parsePlayerStatsHud({})).toEqual({ totalXp: 0, streakDays: 0 });
	});

	it('deriveHudXp prefers max of profile and player_stats (player dashboard pattern)', () => {
		expect(deriveHudXp(40, 450)).toBe(450);
		expect(deriveHudXp(500, 450)).toBe(500);
	});

	it('deriveHudStreak prefers max of profile and player_stats streak', () => {
		expect(deriveHudStreak(2, 5)).toBe(5);
		expect(deriveHudStreak(7, 3)).toBe(7);
	});

	it('resolveChildAthleteUid accepts uid or athleteUid', () => {
		expect(resolveChildAthleteUid({ uid: 'auth-1' })).toBe('auth-1');
		expect(resolveChildAthleteUid({ athleteUid: 'auth-2' })).toBe('auth-2');
		expect(resolveChildAthleteUid({})).toBe('');
	});

	it('childProfileLoadErrorMessage distinguishes missing doc vs permission-denied', () => {
		expect(childProfileLoadErrorMessage(null, true)).toMatch(/No player profile/);
		expect(childProfileLoadErrorMessage({ code: 'permission-denied' }, false)).toMatch(
			/household clearance/,
		);
	});

	it('loadLogWorkoutChildSnapshot is exported for route refresh', () => {
		expect(typeof loadLogWorkoutChildSnapshot).toBe('function');
	});
});

describe('PARENT-LOG-WORKOUT-PROFILE — route source guards', () => {
	const src = readFileSync(PAGE, 'utf-8');

	it('imports dual-read helper and player_stats path', () => {
		expect(src).toMatch(/logWorkoutChildProfile/);
		expect(src).toMatch(/loadLogWorkoutChildSnapshot/);
		expect(src).toMatch(/deriveHudXp/);
	});

	it('surfaces inline child profile load errors', () => {
		expect(src).toMatch(/childProfileError/);
	});

	it('refreshes child snapshot after successful logTrainingSession', () => {
		expect(src).toMatch(/loadLogWorkoutChildSnapshot/);
		expect(src).toMatch(/await loadLogWorkoutChildSnapshot/);
	});
});
