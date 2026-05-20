import { describe, it, expect } from 'vitest';
import {
	mapAttributeToVanguardAxis,
	sortQuestLog,
	bountyFromCoachIntent,
	buildDailyQuests,
	questCtaLabel,
	questTerminalCmd,
	resolveQuestLifecycle,
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
});
