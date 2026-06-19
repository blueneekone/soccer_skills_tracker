import { describe, it, expect } from 'vitest';
import {
	mapAttributeToVanguardAxis,
	sortQuestLog,
	bountyFromCoachIntent,
	buildDailyQuests,
	countCadenceSessionsInWindow,
	coachIntentCtaDisabled,
	coachIntentSessionLoggedToday,
	formatCadenceAriaLabel,
	formatCadenceProgress,
	formatCadenceProgressCompact,
	formatCadenceResumeHint,
	questCtaLabel,
	questRailBorderState,
	questHudCtaShort,
	questHudCtaFor,
	questTerminalCmd,
	formatQuestRewardLabel,
	resolveQuestLifecycle,
	resolveHeroQuest,
	excludeHeroFromRailQuests,
	isHighPriorityQuest,
	maxVisibleQuests,
	purgeCoachIntentIds,
	type QuestTask,
} from '../activeBounties.js';

describe('activeBounties', () => {
	it('maps sport attribute ids to Vanguard axis codes', () => {
		expect(mapAttributeToVanguardAxis('pace')).toBe('PAC');
		expect(mapAttributeToVanguardAxis('ball_mastery')).toBe('ACC');
		expect(mapAttributeToVanguardAxis('grit')).toBe('STM');
	});

	it('sorts bounty-tier quests before dailies', () => {
		const daily: QuestTask = {
			id: 'd1',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: 'Log training',
			axisId: 'STM',
			xpReward: 20,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 0,
		};
		const bounty = bountyFromCoachIntent(
			'i1',
			{ targetAttributeId: 'pace', requiredXp: 200, priority: 10 },
			{ acceptedIds: [], completedIds: [], claimedIds: [], claimedDateUtc: '2026-01-01' },
		)!;
		expect(sortQuestLog([daily, bounty])[0]?.tier).toBe('bounty');
	});

	it('maps lifecycle to CTA labels', () => {
		expect(questCtaLabel('accept')).toBe('Accept');
		expect(questCtaLabel('complete')).toBe('Complete');
		expect(questCtaLabel('claim')).toBe('Claim Reward');
		expect(questTerminalCmd('accept')).toBe('[ ACCEPT MISSION ]');
		expect(questTerminalCmd('claim')).toBe('[ CLAIM REWARD ]');
	});

	it('maps lifecycle to compact embedded HUD CTAs', () => {
		expect(questHudCtaShort('accept')).toBe('Accept');
		expect(questHudCtaShort('complete')).toBe('Complete');
		expect(questHudCtaShort('claim')).toBe('Claim');
	});

	it('uses Train CTA for Train-bound coach missions in complete state', () => {
		const coachIntent: QuestTask = {
			id: 'i1',
			tier: 'bounty',
			source: 'coach_intent',
			senderLabel: 'Coach Challenge',
			title: 'Ball Mastery · 500 XP goal',
			axisId: 'ACC',
			xpReward: 500,
			lifecycle: 'complete',
			actionHref: '/player/workout',
			sortKey: 1,
		};
		expect(questHudCtaFor(coachIntent)).toBe('Train');
		expect(questHudCtaFor({ ...coachIntent, lifecycle: 'accept' })).toBe('Accept');
	});

	it('progresses accept → complete → claim', () => {
		const progress = { acceptedIds: [], completedIds: [], claimedIds: [], claimedDateUtc: '2026-01-01' };
		expect(resolveQuestLifecycle('q1', progress)).toBe('accept');
		const accepted = { ...progress, acceptedIds: ['q1'] };
		expect(resolveQuestLifecycle('q1', accepted)).toBe('complete');
		const done = { ...accepted, completedIds: ['q1'] };
		expect(resolveQuestLifecycle('q1', done)).toBe('claim');
	});

	it('purgeCoachIntentIds drops local progress for cancelled coach intents', () => {
		const store = {
			acceptedIds: ['intent-a', 'daily-training-log'],
			completedIds: ['intent-a'],
			claimedIds: [],
			claimedDateUtc: '2026-01-01',
		};
		const next = purgeCoachIntentIds(store, ['intent-a']);
		expect(next.acceptedIds).toEqual(['daily-training-log']);
		expect(next.completedIds).toEqual([]);
	});

	it('builds daily habit quests with smaller XP', () => {
		const dailies = buildDailyQuests({ currentStreak: 3 }, {
			acceptedIds: [],
			completedIds: [],
			claimedIds: [],
			claimedDateUtc: '2026-01-01',
		});
		expect(dailies.length).toBeGreaterThan(0);
		expect(dailies.every((d) => d.tier === 'daily' && d.xpReward <= 40)).toBe(true);
	});

	it('caps visible quest log at 3', () => {
		expect(maxVisibleQuests()).toBe(3);
	});

	it('resolveHeroQuest picks daily-training-log when not trained today', () => {
		const trainingLog: QuestTask = {
			id: 'daily-training-log',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: "Log today's training session",
			axisId: 'STM',
			xpReward: 35,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 0,
		};
		const streakCheck: QuestTask = {
			id: 'daily-streak-check',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: 'Protect your 5-day streak',
			axisId: 'PAC',
			xpReward: 20,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 1,
		};
		const now = new Date(Date.UTC(2026, 4, 21));
		const hero = resolveHeroQuest([streakCheck, trainingLog], {
			lastTrainingUtc: '2026-05-20',
			now,
		});
		expect(hero?.id).toBe('daily-training-log');
	});

	it('resolveHeroQuest still picks daily-training-log when claimed but last_training_utc is stale', () => {
		const streakCheck: QuestTask = {
			id: 'daily-streak-check',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: 'Protect your 5-day streak',
			axisId: 'PAC',
			xpReward: 20,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 1,
		};
		const bounty: QuestTask = {
			id: 'coach-intent-1',
			tier: 'bounty',
			source: 'coach_intent',
			senderLabel: 'Coach Challenge',
			title: 'Pace · 200 XP goal',
			axisId: 'PAC',
			xpReward: 200,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 10,
		};
		const now = new Date(Date.UTC(2026, 4, 21));
		// daily-training-log absent — filtered by buildDailyQuests claimedIds
		const hero = resolveHeroQuest([bounty, streakCheck], {
			lastTrainingUtc: '2026-05-20',
			now,
		});
		expect(hero?.id).toBe('daily-training-log');
	});

	it('resolveHeroQuest prefers streak quest when trained today', () => {
		const trainingLog: QuestTask = {
			id: 'daily-training-log',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: "Log today's training session",
			axisId: 'STM',
			xpReward: 35,
			lifecycle: 'complete',
			actionHref: '/player/workout',
			sortKey: 0,
		};
		const streakCheck: QuestTask = {
			id: 'daily-streak-check',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: 'Protect your 5-day streak',
			axisId: 'PAC',
			xpReward: 20,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 1,
		};
		const now = new Date(Date.UTC(2026, 4, 21));
		const hero = resolveHeroQuest([trainingLog, streakCheck], {
			lastTrainingUtc: '2026-05-21',
			now,
		});
		expect(hero?.id).toBe('daily-streak-check');
	});

	it('excludeHeroFromRailQuests removes hero id from embedded rail feed', () => {
		const trainingLog: QuestTask = {
			id: 'daily-training-log',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: "Log today's training session",
			axisId: 'STM',
			xpReward: 35,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 0,
		};
		const streakCheck: QuestTask = {
			id: 'daily-streak-check',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: 'Protect your 5-day streak',
			axisId: 'PAC',
			xpReward: 20,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 1,
		};
		const hero = trainingLog;
		const rail = excludeHeroFromRailQuests([trainingLog, streakCheck], hero);
		expect(rail.some((q) => q.id === 'daily-training-log')).toBe(false);
		expect(rail.some((q) => q.id === 'daily-streak-check')).toBe(true);
	});

	it('formatQuestRewardLabel uses earn-on-completion copy for accept state', () => {
		const quest: QuestTask = {
			id: 'daily-training-log',
			tier: 'daily',
			source: 'daily_habit',
			senderLabel: 'Daily Habit',
			title: "Log today's training session",
			axisId: 'STM',
			xpReward: 35,
			lifecycle: 'accept',
			actionHref: '/player/workout',
			sortKey: 0,
		};
		expect(formatQuestRewardLabel(quest)).toBe('Earn +35 XP on completion');
		expect(formatQuestRewardLabel({ ...quest, lifecycle: 'claim' })).toBe('+35 XP');
		expect(formatQuestRewardLabel({ ...quest, lifecycle: 'complete' })).toMatch(/\+35 XP/);
	});
});

describe('B2 — countCadenceSessionsInWindow', () => {
	const NOW = 1_720_000_000_000; // fixed reference time

	it('counts completions matching attribute within window', () => {
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 1 * 86_400_000 },
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 3 * 86_400_000 },
			{ attributeId: 'pace', loggedAtMs: NOW - 1 * 86_400_000 },
		];
		expect(countCadenceSessionsInWindow(completions, 'ball_mastery', 7, NOW)).toBe(2);
	});

	it('excludes sessions outside the window', () => {
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 8 * 86_400_000 },
		];
		expect(countCadenceSessionsInWindow(completions, 'ball_mastery', 7, NOW)).toBe(0);
	});

	it('returns 0 for empty array', () => {
		expect(countCadenceSessionsInWindow([], 'ball_mastery', 7, NOW)).toBe(0);
	});

	it('boundary: session exactly at window start is included', () => {
		const completions = [
			{ attributeId: 'pace', loggedAtMs: NOW - 7 * 86_400_000 },
		];
		expect(countCadenceSessionsInWindow(completions, 'pace', 7, NOW)).toBe(1);
	});
});

describe('B2 — formatCadenceProgress', () => {
	it('uses "this week" label for 7-day windows', () => {
		expect(formatCadenceProgress(2, 3, 7)).toBe('2/3 sessions this week');
	});

	it('uses "in Nd" label for non-7-day windows', () => {
		expect(formatCadenceProgress(1, 5, 14)).toBe('1/5 sessions in 14 days');
	});

	it('zero-completed state', () => {
		expect(formatCadenceProgress(0, 3, 7)).toBe('0/3 sessions this week');
	});
});

describe('B2 — isHighPriorityQuest', () => {
	it('flags coach intents with sortKey 1', () => {
		const quest: QuestTask = {
			id: 'i1',
			tier: 'bounty',
			source: 'coach_intent',
			senderLabel: 'Coach',
			title: 'Pace',
			axisId: 'PAC',
			sortKey: 1,
			xpReward: 100,
			lifecycle: 'accept',
			actionHref: '/player/workout',
		};
		expect(isHighPriorityQuest(quest)).toBe(true);
		expect(isHighPriorityQuest({ ...quest, sortKey: 100 })).toBe(false);
	});
});

describe('B2 — questRailBorderState', () => {
	const coachQuest = (id: string): QuestTask => ({
		id,
		title: 'Pace',
		senderLabel: 'Coach',
		lifecycle: 'complete',
		source: 'coach_intent',
		tier: 'bounty',
		axisId: 'PAC',
		sortKey: 1,
		xpReward: 100,
		actionHref: '/player/workout',
		targetAttributeId: 'pace',
	});

	it('maps lifecycle to red / amber / green outlines', () => {
		expect(questRailBorderState({ ...coachQuest('a'), lifecycle: 'accept' })).toBe('accept');
		expect(questRailBorderState(coachQuest('b'))).toBe('progress');
		expect(questRailBorderState(coachQuest('c'), { loggedToday: true })).toBe('done');
		expect(questRailBorderState({ ...coachQuest('d'), lifecycle: 'claim' })).toBe('done');
	});
});

describe('B2 — formatCadenceProgressCompact', () => {
	it('shows session count only', () => {
		expect(formatCadenceProgressCompact(2, 5)).toBe('2/5');
		expect(formatCadenceProgressCompact(0, 3)).toBe('0/3');
	});
});

describe('B2 — formatCadenceAriaLabel', () => {
	it('mirrors full progress string', () => {
		expect(formatCadenceAriaLabel(2, 5, 14)).toBe('2/5 sessions in 14 days');
	});

	it('appends logged-today hint when cadence incomplete', () => {
		expect(formatCadenceAriaLabel(1, 5, 7, { loggedToday: true })).toBe(
			'1/5 sessions this week. Session logged today — resume tomorrow.',
		);
	});

	it('omits logged-today hint when cadence met', () => {
		expect(formatCadenceAriaLabel(5, 5, 7, { loggedToday: true })).toBe('5/5 sessions this week');
	});
});

describe('B2 — bountyFromCoachIntent carries cadence', () => {
	const progress = {
		acceptedIds: [],
		completedIds: [],
		claimedIds: [],
		claimedDateUtc: '2099-01-01',
	};

	it('extracts cadence from prescription sub-object', () => {
		const bounty = bountyFromCoachIntent(
			'intent-cadence',
			{
				targetAttributeId: 'ball_mastery',
				requiredXp: 200,
				prescription: { sets: 3, bilateral: false, cadence: { sessionsPerWindow: 3, windowDays: 7 } },
			},
			progress,
		);
		expect(bounty?.cadence).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
		expect(bounty?.targetAttributeId).toBe('ball_mastery');
	});

	it('cadence absent when prescription has none', () => {
		const bounty = bountyFromCoachIntent(
			'intent-nocadence',
			{ targetAttributeId: 'pace', requiredXp: 100 },
			progress,
		);
		expect(bounty?.cadence).toBeUndefined();
	});

	it('cadence absent when sessionsPerWindow is out of range', () => {
		const bounty = bountyFromCoachIntent(
			'intent-bad-cadence',
			{
				targetAttributeId: 'pace',
				requiredXp: 100,
				prescription: { sets: 1, bilateral: false, cadence: { sessionsPerWindow: 99, windowDays: 7 } },
			},
			progress,
		);
		expect(bounty?.cadence).toBeUndefined();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// B4b — advisory parent-verified badge: view-model contract
//
// The badge is driven by a Set<intentId> of approved completion_verifications
// records. These guards verify the advisory contract: the badge state is purely
// display-only and the bountyFromCoachIntent view-model is unaffected by it.
// ─────────────────────────────────────────────────────────────────────────────
describe('B4b — advisory parent-verified badge: bountyFromCoachIntent is unaffected', () => {
	const progress = {
		acceptedIds: [],
		completedIds: [],
		claimedIds: [],
		claimedDateUtc: '2099-01-01',
	};

	it('bountyFromCoachIntent does NOT include a parentVerified field (badge is component-layer only)', () => {
		const bounty = bountyFromCoachIntent(
			'intent-b4b',
			{ targetAttributeId: 'ball_mastery', requiredXp: 200 },
			progress,
		);
		// The view-model must NOT carry a parentVerified flag — the badge is derived
		// in the component from completion_verifications subscription, not baked in.
		expect(bounty).not.toHaveProperty('parentVerified');
	});

	it('bountyFromCoachIntent id is the intentId — used as key for approvedIntentIds lookup', () => {
		const bounty = bountyFromCoachIntent(
			'intent-key-check',
			{ targetAttributeId: 'pace', requiredXp: 100 },
			progress,
		);
		expect(bounty?.id).toBe('intent-key-check');
	});

	it('approvedIntentIds Set lookup: Set.has returns true for known id, false for unknown', () => {
		const approved = new Set(['intent-b4b', 'intent-other']);
		expect(approved.has('intent-b4b')).toBe(true);
		expect(approved.has('intent-not-there')).toBe(false);
	});

	it('approvedIntentIds Set lookup: empty Set never matches', () => {
		const empty = new Set<string>();
		expect(empty.has('intent-b4b')).toBe(false);
	});

	it('source-scan: ActiveBounties.svelte subscribes to completion_verifications for approved status', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		expect(AB_SRC).toMatch(/completion_verifications/);
		expect(AB_SRC).toMatch(/status.*==.*approved|approved.*status/);
		expect(AB_SRC).toMatch(/approvedIntentIds/);
	});

	it('source-scan: ActiveBounties.svelte shows parent-verified badge only for coach_intent quests', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		expect(AB_SRC).toMatch(/quest-row__parent-verified/);
		expect(AB_SRC).toMatch(/approvedIntentIds\.has\(quest\.id\)/);
	});

	it('source-scan: badge does NOT alter xpReward, lifecycle, or sortKey (advisory only)', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		// Badge section must NOT assign to xpReward, lifecycle, or sortKey.
		const badgeSection = (() => {
			const idx = AB_SRC.indexOf('approvedIntentIds');
			if (idx === -1) return '';
			return AB_SRC.slice(Math.max(0, idx - 200), idx + 400);
		})();
		expect(badgeSection).not.toMatch(/xpReward\s*=/);
		expect(badgeSection).not.toMatch(/lifecycle\s*=/);
		expect(badgeSection).not.toMatch(/sortKey\s*=/);
	});
});

describe('cadence intelligence — per-day sessions', () => {
	const coachQuest = (id: string): QuestTask => ({
		id,
		tier: 'bounty',
		source: 'coach_intent',
		senderLabel: 'Coach Challenge',
		title: 'Pace · 200 XP goal',
		axisId: 'PAC',
		xpReward: 200,
		lifecycle: 'complete',
		actionHref: '/player/workout',
		sortKey: 1,
		targetAttributeId: 'pace',
		cadence: { sessionsPerWindow: 5, windowDays: 14 },
	});

	it('countCadenceSessionsInWindow counts distinct UTC days only', () => {
		const day1 = Date.parse('2026-06-10T12:00:00.000Z');
		const day1b = Date.parse('2026-06-10T20:00:00.000Z');
		const day2 = Date.parse('2026-06-11T09:00:00.000Z');
		const now = Date.parse('2026-06-15T00:00:00.000Z');
		const completions = [
			{ attributeId: 'pace', loggedAtMs: day1 },
			{ attributeId: 'pace', loggedAtMs: day1b },
			{ attributeId: 'pace', loggedAtMs: day2 },
		];
		expect(countCadenceSessionsInWindow(completions, 'pace', 14, now)).toBe(2);
	});

	it('coachIntentSessionLoggedToday matches intentId for today', () => {
		const todayMs = Date.now();
		const quest = coachQuest('intent-1');
		expect(
			coachIntentSessionLoggedToday(
				quest,
				[{ attributeId: 'pace', loggedAtMs: todayMs, intentId: 'intent-1' }],
				todayMs,
			),
		).toBe(true);
		expect(questHudCtaFor(quest, { sessionLoggedToday: true })).toBe('Logged');
		expect(coachIntentCtaDisabled(quest, true)).toBe(true);
	});

	it('formatCadenceResumeHint after today session', () => {
		expect(formatCadenceResumeHint(true, 1, 5)).toBe('Session logged — resume tomorrow');
		expect(formatCadenceResumeHint(false, 1, 5)).toBeNull();
		expect(formatCadenceResumeHint(true, 5, 5)).toBeNull();
	});

	it('bountyFromCoachIntent surfaces intentXpByUid for player', () => {
		const bounty = bountyFromCoachIntent(
			'intent-x',
			{
				targetAttributeId: 'pace',
				requiredXp: 300,
				intentXpByUid: { player1: 120 },
			},
			{ acceptedIds: [], completedIds: [], claimedIds: [], claimedDateUtc: '2026-01-01' },
			'player1',
		)!;
		expect(bounty.intentXpEarned).toBe(120);
	});

	it('formatCadenceProgress uses session wording', () => {
		expect(formatCadenceProgress(2, 5, 14)).toContain('2/5 sessions');
	});
});
