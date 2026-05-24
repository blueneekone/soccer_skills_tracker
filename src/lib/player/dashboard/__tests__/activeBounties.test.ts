import { describe, it, expect } from 'vitest';
import {
	mapAttributeToVanguardAxis,
	sortQuestLog,
	bountyFromCoachIntent,
	buildDailyQuests,
	questCtaLabel,
	questHudCtaShort,
	questTerminalCmd,
	formatQuestRewardLabel,
	resolveQuestLifecycle,
	resolveHeroQuest,
	excludeHeroFromRailQuests,
	maxVisibleQuests,
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
		expect(questHudCtaShort('accept')).toBe('Accept →');
		expect(questHudCtaShort('complete')).toBe('Complete →');
		expect(questHudCtaShort('claim')).toBe('Claim →');
	});

	it('progresses accept → complete → claim', () => {
		const progress = { acceptedIds: [], completedIds: [], claimedIds: [], claimedDateUtc: '2026-01-01' };
		expect(resolveQuestLifecycle('q1', progress)).toBe('accept');
		const accepted = { ...progress, acceptedIds: ['q1'] };
		expect(resolveQuestLifecycle('q1', accepted)).toBe('complete');
		const done = { ...accepted, completedIds: ['q1'] };
		expect(resolveQuestLifecycle('q1', done)).toBe('claim');
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
