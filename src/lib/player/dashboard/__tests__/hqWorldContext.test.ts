import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
	parseScheduleEventStartMs,
	pickNextScheduleEvent,
	resolveHqStatusBadges,
	resolveNextEventLabel,
} from '../hqWorldContext.js';

describe('hqWorldContext — parseScheduleEventStartMs', () => {
	it('parses legacy date + time fields', () => {
		const ms = parseScheduleEventStartMs({ date: '2026-05-26', time: '18:30', type: 'Practice' });
		expect(ms).not.toBeNull();
		const d = new Date(ms!);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(4);
		expect(d.getDate()).toBe(26);
		expect(d.getHours()).toBe(18);
		expect(d.getMinutes()).toBe(30);
	});

	it('parses startTimestamp milliseconds', () => {
		const ts = Date.UTC(2026, 5, 1, 14, 0, 0);
		expect(parseScheduleEventStartMs({ startTimestamp: ts })).toBe(ts);
	});

	it('returns null for missing start fields', () => {
		expect(parseScheduleEventStartMs(null)).toBeNull();
		expect(parseScheduleEventStartMs({ type: 'Practice' })).toBeNull();
	});
});

describe('hqWorldContext — pickNextScheduleEvent', () => {
	const now = new Date('2026-05-21T12:00:00');

	it('returns earliest future event', () => {
		const picked = pickNextScheduleEvent(
			[
				{ date: '2026-05-30', time: '10:00', type: 'Practice' },
				{ date: '2026-05-22', time: '18:00', type: 'Practice' },
			],
			now,
		);
		expect(picked?.date).toBe('2026-05-22');
	});

	it('skips past events', () => {
		const picked = pickNextScheduleEvent([{ date: '2026-05-01', time: '10:00', type: 'Practice' }], now);
		expect(picked).toBeNull();
	});
});

describe('hqWorldContext — resolveNextEventLabel', () => {
	const now = new Date('2026-05-21T12:00:00');

	it('formats practice events', () => {
		const label = resolveNextEventLabel(
			{ date: '2026-05-26', time: '18:30', type: 'Practice' },
			now,
		);
		expect(label).toMatch(/^Practice · Tue /);
		expect(label).toMatch(/6:30/);
	});

	it('formats match events with opponent', () => {
		const label = resolveNextEventLabel(
			{ date: '2026-05-27', time: '15:00', type: 'Game', opponent: 'Phoenix FC' },
			now,
		);
		expect(label).toMatch(/^Match vs Phoenix FC · /);
	});

	it('returns null when event is missing or in the past', () => {
		expect(resolveNextEventLabel(null, now)).toBeNull();
		expect(
			resolveNextEventLabel({ date: '2026-05-01', time: '10:00', type: 'Practice' }, now),
		).toBeNull();
	});
});

describe('hqWorldContext — resolveHqStatusBadges', () => {
	const now = new Date(Date.UTC(2026, 4, 21, 15, 0, 0));

	it('includes profile incomplete chip when banner not visible', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: true,
			streak: 0,
			lastTrainingUtc: '2026-05-21',
			coachBountyCount: 0,
			now,
		});
		expect(badges.some((b) => b.id === 'profile-incomplete')).toBe(true);
	});

	it('includes album set completion dossier chips (Sprint 3.4)', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: false,
			streak: 0,
			lastTrainingUtc: '2026-05-21',
			coachBountyCount: 0,
			completedAlbumSetChips: [{ setId: 'street_kings', label: 'STREET KINGS SET' }],
			now,
		});
		expect(badges.some((b) => b.id === 'album-set-street_kings' && b.label === 'STREET KINGS SET')).toBe(
			true,
		);
	});

	it('omits profile incomplete chip when hub banner is visible', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: true,
			streak: 0,
			lastTrainingUtc: '2026-05-21',
			coachBountyCount: 0,
			suppressProfileIncompleteBadge: true,
			now,
		});
		expect(badges.some((b) => b.id === 'profile-incomplete')).toBe(false);
	});

	it('includes train today when not trained today and hero is not daily training', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: false,
			streak: 3,
			lastTrainingUtc: '2026-05-20',
			coachBountyCount: 0,
			heroQuestId: 'daily-streak-check',
			now,
		});
		expect(badges.some((b) => b.id === 'train-today')).toBe(true);
		expect(badges.some((b) => b.id === 'streak-live')).toBe(false);
	});

	it('omits train today when hero is daily-training-log', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: false,
			streak: 3,
			lastTrainingUtc: '2026-05-20',
			coachBountyCount: 0,
			heroQuestId: 'daily-training-log',
			now,
		});
		expect(badges.some((b) => b.id === 'train-today')).toBe(false);
	});

	it('omits train today when suppressTrainTodayBadge is set', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: false,
			streak: 3,
			lastTrainingUtc: '2026-05-20',
			coachBountyCount: 0,
			suppressTrainTodayBadge: true,
			now,
		});
		expect(badges.some((b) => b.id === 'train-today')).toBe(false);
	});

	it('includes coach missions and streak live when applicable', () => {
		const badges = resolveHqStatusBadges({
			profileIncomplete: false,
			streak: 5,
			lastTrainingUtc: '2026-05-21',
			coachBountyCount: 2,
			now,
		});
		expect(badges.map((b) => b.label)).toEqual(['2 COACH MISSIONS', 'STREAK LIVE']);
	});
});

// T0-2 regression guard: player schedule must read team_workouts/startTimestamp, not schedules/startAt.
describe('T0-2 — player schedule query source guard', () => {
	const dashboardSrc = readFileSync(
		resolve(__dirname, '../../../../routes/(app)/player/dashboard/+page.svelte'),
		'utf8',
	);

	it('scheduleQ targets team_workouts collection', () => {
		expect(dashboardSrc).toMatch(/collection\(db,\s*['"]team_workouts['"]\)/);
	});

	it('scheduleQ filters on startTimestamp (numeric unix-ms)', () => {
		expect(dashboardSrc).toMatch(/where\(['"]startTimestamp['"]/);
	});

	it('loadLegacyScheduleFallback also targets team_workouts', () => {
		expect(dashboardSrc).toMatch(/loadLegacyScheduleFallback[\s\S]{0,400}team_workouts/);
	});

	it('does not query the stale schedules collection for player schedule', () => {
		// schedules collection must not appear as a Firestore query target in the schedule block
		expect(dashboardSrc).not.toMatch(/collection\(db,\s*['"]schedules['"]\)/);
	});

	it('does not filter on the missing startAt field', () => {
		// startAt was the old field that was never written by the coach
		expect(dashboardSrc).not.toMatch(/where\(['"]startAt['"]/);
	});
});
