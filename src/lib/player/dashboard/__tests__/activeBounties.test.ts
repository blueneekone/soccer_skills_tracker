import { describe, it, expect } from 'vitest';
import { normalizeCadenceAttributeId } from '../cadenceCompletions.js';
import {
	mapAttributeToVanguardAxis,
	sortQuestLog,
	bountyFromCoachIntent,
	buildDailyQuests,
	coachIntentReadyToClaim,
	coachIntentCreditedToday,
	COACH_INTENT_TODAY_COMPLETE,
	computeCoachIntentEarnedXp,
	countCadenceSessionsInWindow,
	formatCadenceProgress,
	formatIntentXpProgressLine,
	hasCadenceCreditToday,
	questCadenceBlockedToday,
	questHudCtaBlockedCadence,
	missionRailEmptyCopy,
	COACH_MISSION_RAIL_HINT,
	resolveMissionRailEmptyReason,
	questCtaLabel,
	questHudCtaShort,
	questHudCtaFor,
	questTerminalCmd,
	formatQuestRewardLabel,
	resolveCoachIntentLifecycle,
	resolveQuestLifecycle,
	resolveHeroQuest,
	excludeHeroFromRailQuests,
	maxVisibleQuests,
	purgeCoachIntentIds,
	intentAssignmentVisibleToPlayer,
	questVisibleInMissionRail,
	type QuestTask,
} from '../activeBounties.js';

describe('FORGE-MISSION-RAIL-VISIBILITY — coach intent visibility', () => {
	const progress = {
		acceptedIds: [],
		completedIds: [],
		claimedIds: [],
		claimedDateUtc: '2026-01-01',
	};

	it('intentAssignmentVisibleToPlayer allows team scope for any player', () => {
		expect(intentAssignmentVisibleToPlayer({ scope: 'team' }, 'uid-a')).toBe(true);
		expect(intentAssignmentVisibleToPlayer({}, 'uid-a')).toBe(true);
	});

	it('intentAssignmentVisibleToPlayer requires uid in targetUids for players scope', () => {
		expect(
			intentAssignmentVisibleToPlayer({ scope: 'players', targetUids: ['uid-a'] }, 'uid-a'),
		).toBe(true);
		expect(
			intentAssignmentVisibleToPlayer({ scope: 'players', targetUids: ['uid-b'] }, 'uid-a'),
		).toBe(false);
	});

	it('COACH-INTENT-PERSIST-ACTIVE: bountyFromCoachIntent maps active row as complete without sessionStorage', () => {
		const bounty = bountyFromCoachIntent(
			'intent-a',
			{ targetAttributeId: 'pace', requiredXp: 200, priority: 10, scope: 'team' },
			progress,
			'uid-a',
		);
		expect(bounty?.source).toBe('coach_intent');
		expect(bounty?.senderLabel).toBe('Coach Challenge');
		expect(bounty?.lifecycle).toBe('complete');
	});

	it('bountyFromCoachIntent read-repairs attributeId alias', () => {
		const bounty = bountyFromCoachIntent(
			'intent-b',
			{ attributeId: 'ball_mastery', requiredXp: 100, priority: 5 },
			progress,
			'uid-a',
		);
		expect(bounty?.source).toBe('coach_intent');
		expect(bounty?.axisId).toBe('ACC');
	});

	it('questVisibleInMissionRail keeps active coach intent when claimedIds is stale', () => {
		const quest: QuestTask = {
			id: 'intent-a',
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
		const store = { ...progress, claimedIds: ['intent-a'] };
		expect(questVisibleInMissionRail(quest, store, new Set(['intent-a']))).toBe(true);
		expect(questVisibleInMissionRail(quest, store, new Set())).toBe(false);
	});
});

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
		expect(questHudCtaShort('accept')).toBe('Accept →');
		expect(questHudCtaShort('complete')).toBe('Complete →');
		expect(questHudCtaShort('claim')).toBe('Claim →');
	});

	it('uses Start session CTA for Train-bound coach missions in complete state', () => {
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
		expect(questHudCtaFor(coachIntent)).toBe('Start session →');
		expect(questHudCtaFor({ ...coachIntent, lifecycle: 'accept' })).toBe('Accept →');
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

	it('resolveHeroQuest prefers coach_intent over daily training when coach bounty present', () => {
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
		const hero = resolveHeroQuest([bounty, trainingLog], {
			lastTrainingUtc: '2026-05-20',
			now,
		});
		expect(hero?.id).toBe('coach-intent-1');
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

	it('resolveHeroQuest synthesizes daily-training-log when stale last_training_utc and no coach bounty', () => {
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
		const hero = resolveHeroQuest([streakCheck], {
			lastTrainingUtc: '2026-05-20',
			now,
		});
		expect(hero?.id).toBe('daily-training-log');
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

	it('counts distinct UTC days matching attribute within window', () => {
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 1 * 86_400_000 },
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 1 * 86_400_000 + 3_600_000 },
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

	it('filters by intentId when present (ignores other intents same attribute)', () => {
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 1 * 86_400_000, intentId: 'intent-a' },
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 2 * 86_400_000, intentId: 'intent-b' },
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 3 * 86_400_000, intentId: 'intent-a' },
		];
		expect(countCadenceSessionsInWindow(completions, 'ball_mastery', 7, NOW, 'intent-a')).toBe(2);
		expect(countCadenceSessionsInWindow(completions, 'ball_mastery', 7, NOW, 'intent-b')).toBe(1);
	});

	it('intent-scoped count excludes attribute-only rows (cancelled challenge bleed)', () => {
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 1 * 86_400_000 },
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 2 * 86_400_000, intentId: 'old-intent' },
			{ attributeId: 'ball_mastery', loggedAtMs: NOW, intentId: 'new-intent' },
		];
		expect(countCadenceSessionsInWindow(completions, 'ball_mastery', 7, NOW, 'new-intent')).toBe(1);
	});

	it('normalizeCadenceAttributeId matches server sanitization (case + punctuation)', () => {
		expect(normalizeCadenceAttributeId('Ball_Mastery')).toBe('ball_mastery');
		expect(normalizeCadenceAttributeId('Ball-Mastery')).toBe('ballmastery');
		expect(
			countCadenceSessionsInWindow(
				[{ attributeId: 'ballmastery', loggedAtMs: NOW }],
				'Ball-Mastery',
				7,
				NOW,
			),
		).toBe(1);
	});
});

describe('COACH-INTENT-PERSIST-ACTIVE — coach challenge stays active across sign-in', () => {
	const emptyProgress = {
		acceptedIds: [] as string[],
		completedIds: [] as string[],
		claimedIds: [] as string[],
		claimedDateUtc: '2026-06-25',
	};

	it('active coach intent without sessionStorage acceptedIds → lifecycle complete', () => {
		const bounty = bountyFromCoachIntent(
			'intent-persist',
			{ targetAttributeId: 'ball_mastery', requiredXp: 500, scope: 'team' },
			emptyProgress,
			'uid-player',
		);
		expect(bounty?.lifecycle).toBe('complete');
		expect(resolveCoachIntentLifecycle('intent-persist', emptyProgress)).toBe('complete');
		expect(questHudCtaFor(bounty!)).toBe('Start session →');
	});

	it('fulfilled coach intent → claim lifecycle', () => {
		const bounty = bountyFromCoachIntent(
			'intent-done',
			{
				targetAttributeId: 'pace',
				requiredXp: 200,
				fulfilledByUids: ['uid-player'],
			},
			emptyProgress,
			'uid-player',
		);
		expect(bounty?.lifecycle).toBe('claim');
	});

	it('with today cadence credit → questCadenceBlockedToday → Next session tomorrow CTA', () => {
		const NOW = Date.UTC(2026, 5, 21, 15, 0, 0);
		const bounty = bountyFromCoachIntent(
			'intent-cadence',
			{
				targetAttributeId: 'ball_mastery',
				requiredXp: 500,
				prescription: { sets: 2, bilateral: false, cadence: { sessionsPerWindow: 5, windowDays: 7 } },
			},
			emptyProgress,
			'uid-player',
		)!;
		expect(bounty.lifecycle).toBe('complete');
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW, intentId: 'intent-cadence' },
		];
		expect(questCadenceBlockedToday(bounty, completions, NOW)).toBe(true);
		expect(questHudCtaFor(bounty)).toBe('Start session →');
		expect(questHudCtaBlockedCadence()).toBe('Next session tomorrow');
	});

	it('belt-and-suspenders: partial XP progress resolves complete without acceptedIds', () => {
		expect(
			resolveCoachIntentLifecycle('intent-xp', emptyProgress, { earnedXp: 42 }),
		).toBe('complete');
	});

	it('belt-and-suspenders: drill_completions flag resolves complete without acceptedIds', () => {
		expect(
			resolveCoachIntentLifecycle('intent-drill', emptyProgress, {
				hasIntentCompletions: true,
			}),
		).toBe('complete');
	});
});

describe('B2 — hasCadenceCreditToday + questCadenceBlockedToday', () => {
	const NOW = Date.UTC(2026, 5, 21, 15, 0, 0);

	it('hasCadenceCreditToday ignores attribute-only rows when intent scoped', () => {
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW, intentId: 'old-intent' },
			{ attributeId: 'ball_mastery', loggedAtMs: NOW - 3_600_000 },
		];
		expect(hasCadenceCreditToday(completions, 'ball_mastery', 'new-intent', NOW)).toBe(false);
	});

	it('hasCadenceCreditToday matches attribute + intent on same UTC day', () => {
		const completions = [
			{
				attributeId: 'ball_mastery',
				loggedAtMs: NOW - 2 * 3_600_000,
				intentId: 'intent-a',
			},
		];
		expect(hasCadenceCreditToday(completions, 'ball_mastery', 'intent-a', NOW)).toBe(true);
		expect(hasCadenceCreditToday(completions, 'ball_mastery', 'intent-b', NOW)).toBe(false);
	});

	it('questCadenceBlockedToday gates complete-state cadence missions only', () => {
		const quest: QuestTask = {
			id: 'intent-a',
			tier: 'bounty',
			source: 'coach_intent',
			senderLabel: 'Coach Challenge',
			title: 'Ball Mastery',
			axisId: 'ACC',
			xpReward: 200,
			lifecycle: 'complete',
			actionHref: '/player/workout',
			sortKey: 1,
			targetAttributeId: 'ball_mastery',
			cadence: { sessionsPerWindow: 5, windowDays: 7 },
		};
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW, intentId: 'intent-a' },
		];
		expect(questCadenceBlockedToday(quest, completions, NOW)).toBe(true);
		expect(questCadenceBlockedToday({ ...quest, lifecycle: 'accept' }, completions, NOW)).toBe(
			false,
		);
	});

	it('questHudCtaBlockedCadence returns tomorrow copy', () => {
		expect(questHudCtaBlockedCadence()).toBe('Next session tomorrow');
	});
});

describe('BOUNTY-DAILY-ACK — XP progress + today complete helpers', () => {
	const NOW = Date.UTC(2026, 5, 21, 15, 0, 0);

	const cadenceQuest: QuestTask = {
		id: 'intent-a',
		tier: 'bounty',
		source: 'coach_intent',
		senderLabel: 'Coach Challenge',
		title: 'Ball Mastery · 500 XP goal',
		axisId: 'ACC',
		xpReward: 500,
		lifecycle: 'complete',
		actionHref: '/player/workout',
		sortKey: 1,
		targetAttributeId: 'ball_mastery',
		cadence: { sessionsPerWindow: 5, windowDays: 7 },
	};

	it('formatIntentXpProgressLine formats earned vs required', () => {
		expect(formatIntentXpProgressLine(240, 500)).toBe('240 / 500 XP');
		expect(formatIntentXpProgressLine(0, 500)).toBe('0 / 500 XP');
		expect(formatIntentXpProgressLine(240, 0)).toBe('');
	});

	it('computeCoachIntentEarnedXp uses xpBaselineByUid delta', () => {
		const earned = computeCoachIntentEarnedXp(
			{
				targetAttributeId: 'ball_mastery',
				xpBaselineByUid: { 'uid-a': 300 },
			},
			'uid-a',
			{ ball_mastery: 540 },
		);
		expect(earned).toBe(240);
	});

	it('computeCoachIntentEarnedXp returns 0 without baseline or attribute', () => {
		expect(computeCoachIntentEarnedXp(undefined, 'uid-a', { pace: 100 })).toBe(0);
		expect(
			computeCoachIntentEarnedXp({ targetAttributeId: 'pace' }, '', { pace: 100 }),
		).toBe(0);
	});

	it('coachIntentCreditedToday true when cadence credit exists today', () => {
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW, intentId: 'intent-a' },
		];
		expect(coachIntentCreditedToday(cadenceQuest, completions, NOW)).toBe(true);
	});

	it('coachIntentCreditedToday false without cadence or prior credit', () => {
		expect(coachIntentCreditedToday({ ...cadenceQuest, cadence: undefined }, [], NOW)).toBe(
			false,
		);
		expect(coachIntentCreditedToday(cadenceQuest, [], NOW)).toBe(false);
	});

	it('coachIntentCreditedToday works with inferred high-XP cadence (no prescription.cadence)', () => {
		const inferredQuest: QuestTask = {
			...cadenceQuest,
			cadence: { sessionsPerWindow: 5, windowDays: 7 },
		};
		const completions = [
			{ attributeId: 'ball_mastery', loggedAtMs: NOW, intentId: 'intent-a' },
		];
		expect(coachIntentCreditedToday(inferredQuest, completions, NOW)).toBe(true);
	});

	it('COACH_INTENT_TODAY_COMPLETE is acknowledgment copy (not claim)', () => {
		expect(COACH_INTENT_TODAY_COMPLETE).toMatch(/Today's session complete/);
		expect(COACH_INTENT_TODAY_COMPLETE).not.toMatch(/claim/i);
	});

	it('source-scan: questCardContent applies cadenceBlocked to hero CTA', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		const heroBlock = AB_SRC.slice(
			AB_SRC.indexOf('{#snippet questCardContent'),
			AB_SRC.indexOf('{#snippet questHeroCard'),
		);
		expect(heroBlock).toMatch(/questCadenceBlockedToday/);
		expect(heroBlock).toMatch(/disabled=\{cadenceBlocked\}/);
		expect(heroBlock).toMatch(/questHudCtaBlockedCadence/);
		expect(heroBlock).toMatch(/formatIntentXpProgressLine/);
		expect(heroBlock).toMatch(/COACH_INTENT_TODAY_COMPLETE/);
	});

	it('source-scan: cadence subscribe uses playerUid-only query (no composite index hard-fail)', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const SRC = readFileSync(join(__dirname, '../cadenceCompletions.ts'), 'utf-8');
		expect(SRC).toMatch(/where\('playerUid', '==', playerUid\)/);
		expect(SRC).not.toMatch(/where\('loggedAt', '>=', windowStart\)/);
		expect(SRC).toMatch(/cadenceCompletionMatchesIntent/);
		expect(SRC).toMatch(/row\.intentId === scope/);
	});

	it('source-scan: cadence completions subscribe when coach_intent armed on Train', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const TRAIN_SRC = readFileSync(
			join(__dirname, '../../../../routes/(app)/player/workout/+page.svelte'),
			'utf-8',
		);
		expect(TRAIN_SRC).toMatch(/!activeMissionId \|\| armedHandoff\?\.source !== 'coach_intent'/);
		expect(TRAIN_SRC).toMatch(/resolveMissionHandoffDisplayCadence/);
		expect(TRAIN_SRC).toMatch(/armedDisplayCadence/);
	});
});

describe('B2 — formatCadenceProgress', () => {
	it('uses "this week" label for 7-day windows', () => {
		expect(formatCadenceProgress(2, 3, 7)).toBe('2/3 this week');
	});

	it('uses "in Nd" label for non-7-day windows', () => {
		expect(formatCadenceProgress(1, 5, 14)).toBe('1/5 in 14d');
	});

	it('zero-completed state', () => {
		expect(formatCadenceProgress(0, 3, 7)).toBe('0/3 this week');
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

	it('cadence absent when prescription has none and requiredXp below threshold', () => {
		const bounty = bountyFromCoachIntent(
			'intent-nocadence',
			{ targetAttributeId: 'pace', requiredXp: 100 },
			progress,
		);
		expect(bounty?.cadence).toBeUndefined();
	});

	it('infers 5×/week display cadence when requiredXp ≥ 300 and prescription has no cadence', () => {
		const bounty = bountyFromCoachIntent(
			'intent-high-xp',
			{ targetAttributeId: 'ball_mastery', requiredXp: 500, prescription: { sets: 2, bilateral: false } },
			progress,
		);
		expect(bounty?.cadence).toEqual({ sessionsPerWindow: 5, windowDays: 7 });
	});

	it('explicit prescription cadence wins over high-XP default', () => {
		const bounty = bountyFromCoachIntent(
			'intent-explicit',
			{
				targetAttributeId: 'pace',
				requiredXp: 500,
				prescription: { sets: 1, bilateral: false, cadence: { sessionsPerWindow: 3, windowDays: 7 } },
			},
			progress,
		);
		expect(bounty?.cadence).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
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

	it('GP-ACQ-04a: missionRailEmptyCopy explains coach Forge deploy path', () => {
		expect(missionRailEmptyCopy({ reason: 'no_intents' })).toBe(COACH_MISSION_RAIL_HINT);
		expect(missionRailEmptyCopy({ reason: 'no_intents' })).toMatch(/Forge/);
		expect(missionRailEmptyCopy({ reason: 'sync_blocked' })).toMatch(/sign out/i);
		expect(missionRailEmptyCopy({ reason: 'no_team' })).toMatch(/Awaiting team assignment/i);
		expect(missionRailEmptyCopy({ reason: 'team_link_mismatch' })).toMatch(/Team link mismatch/i);
		expect(missionRailEmptyCopy({ reason: 'scoped_out' })).toMatch(/other operatives/i);
		expect(missionRailEmptyCopy({ reason: 'mapping_incomplete' })).toMatch(/REFRESH/i);
	});

	it('resolveMissionRailEmptyReason distinguishes failure modes', () => {
		expect(
			resolveMissionRailEmptyReason({
				missionSyncBlocked: true,
				authLoaded: true,
				teamIdUsed: 'team-a',
				intentSnapshotCount: 0,
				intentScopedCount: 0,
				profileTeamId: 'team-a',
				tokenTeamId: 'team-a',
			}),
		).toBe('sync_blocked');
		expect(
			resolveMissionRailEmptyReason({
				missionSyncBlocked: false,
				authLoaded: true,
				teamIdUsed: '',
				intentSnapshotCount: 0,
				intentScopedCount: 0,
				profileTeamId: '',
				tokenTeamId: '',
			}),
		).toBe('no_team');
		expect(
			resolveMissionRailEmptyReason({
				missionSyncBlocked: false,
				authLoaded: true,
				teamIdUsed: 'team-jwt',
				intentSnapshotCount: 0,
				intentScopedCount: 0,
				profileTeamId: 'team-profile',
				tokenTeamId: 'team-jwt',
			}),
		).toBe('team_link_mismatch');
		expect(
			resolveMissionRailEmptyReason({
				missionSyncBlocked: false,
				authLoaded: true,
				teamIdUsed: 'team-a',
				intentSnapshotCount: 2,
				intentScopedCount: 0,
				profileTeamId: 'team-a',
				tokenTeamId: 'team-a',
			}),
		).toBe('scoped_out');
		expect(
			resolveMissionRailEmptyReason({
				missionSyncBlocked: false,
				authLoaded: true,
				teamIdUsed: 'team-a',
				intentSnapshotCount: 1,
				intentScopedCount: 1,
				mappedQuestCount: 0,
				visibleBountyCount: 0,
				profileTeamId: 'team-a',
				tokenTeamId: 'team-a',
			}),
		).toBe('mapping_incomplete');
	});

	it('GP-ACQ-04a: coachIntentReadyToClaim gates claim on fulfilledByUids', () => {
		expect(coachIntentReadyToClaim(undefined, 'uid-a')).toBe(false);
		expect(coachIntentReadyToClaim({ fulfilledByUids: ['uid-b'] }, 'uid-a')).toBe(false);
		expect(coachIntentReadyToClaim({ fulfilledByUids: ['uid-a'] }, 'uid-a')).toBe(true);
	});

	it('source-scan: GP-ACQ-04a coach assign hint in ActiveBounties mission rail', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		expect(AB_SRC).toMatch(/missionRailDiagnostics/);
		expect(AB_SRC).toMatch(/data-mission-rail-state/);
		expect(AB_SRC).toMatch(/buildMissionRailDiagnostic/);
		expect(AB_SRC).toMatch(/logMissionRailSnapshotOnce/);
		expect(AB_SRC).toMatch(/showCoachAssignHint/);
		expect(AB_SRC).toMatch(/coachIntentReadyToClaim/);
		expect(AB_SRC).not.toMatch(/NO ACTIVE MISSIONS/);
	});

	it('GP-ACQ-04b: WORKOUT_HQ_RETURN_PATH targets player HQ', async () => {
		const { WORKOUT_HQ_RETURN_PATH } = await import('../activeBounties.js');
		expect(WORKOUT_HQ_RETURN_PATH).toBe('/player/dashboard');
	});

	it('source-scan: GP-ACQ-04b Train success returns to HQ for XP pulse', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const WORKOUT_SRC = readFileSync(
			join(__dirname, '../../../../routes/(app)/player/workout/+page.svelte'),
			'utf-8',
		);
		expect(WORKOUT_SRC).toMatch(/WORKOUT_HQ_RETURN_PATH/);
		expect(WORKOUT_SRC).toMatch(/pendingHqReturn/);
		expect(WORKOUT_SRC).toMatch(/returnToHq:\s*true/);
		expect(WORKOUT_SRC).toMatch(/goto\(resolveAppPath\(WORKOUT_HQ_RETURN_PATH\)\)/);
	});

	it('GP-ACQ-03: ActiveBounties resolves teamId via pickMissionRailTeamId + fetchCoachIntentQuests', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		const RAIL_SRC = readFileSync(
			join(__dirname, '../missionRailCoachIntents.ts'),
			'utf-8',
		);
		expect(AB_SRC).toMatch(/missionClaimsSync\.resolveTeamId/);
		expect(AB_SRC).toMatch(/runCoachIntentRefetch/);
		expect(AB_SRC).toMatch(/deduplicateById\(sortedQuests\)/);
		expect(RAIL_SRC).toMatch(/collection\(db,\s*['"]team_assignments['"]\)/);
		expect(RAIL_SRC).toMatch(/getDocsFromServer/);
	});

	it('P5-AEGIS: weather service uses us-east1 functions export, not us-central1', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const WEATHER_SRC = readFileSync(
			join(__dirname, '../../../services/weather.svelte.ts'),
			'utf-8',
		);
		const FIREBASE_SRC = readFileSync(
			join(__dirname, '../../../firebase.js'),
			'utf-8',
		);
		expect(WEATHER_SRC).toMatch(/from '\$lib\/firebase\.js'/);
		expect(WEATHER_SRC).toMatch(/httpsCallable\(functions,\s*'getWeatherConditions'\)/);
		expect(WEATHER_SRC).not.toMatch(/us-central1/);
		expect(FIREBASE_SRC).toMatch(/getFunctions\(app,\s*'us-east1'\)/);
	});

	it('TRAIN-MISSION-ARM-EXPLICIT — Accept does not stash on HQ (source scan)', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		const acceptBlock = AB_SRC.slice(
			AB_SRC.indexOf("quest.lifecycle === 'accept'"),
			AB_SRC.indexOf("quest.lifecycle === 'complete'"),
		);
		expect(acceptBlock).not.toMatch(/stashQuestHandoff|stashQuestTrainHandoff/);
	});

	it('TRAIN-MISSION-ARM-EXPLICIT — Start session stashes with armExplicit and nav state', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const AB_SRC = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		expect(AB_SRC).toMatch(/stashQuestHandoff\(quest,\s*true\)/);
		expect(AB_SRC).toMatch(/state:\s*navHandoff\s*\?\s*\{\s*missionHandoff:\s*navHandoff\s*\}/);
	});
});
