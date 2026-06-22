import { describe, it, expect, vi } from 'vitest';
import {
	applyCoachIntentPurge,
	applyCoachIntentRefetch,
	coachIntentRemovalDelta,
	mapCoachIntentRows,
	mergeCoachIntentsIntoQuestLog,
} from '../missionRailCoachIntents.js';
import type { QuestTask } from '../activeBounties.js';
import { MISSION_HANDOFF_KEY } from '$lib/player/workout/coachMissionFlow.js';

const baseProgress = {
	acceptedIds: ['intent-a'],
	completedIds: ['intent-a'],
	claimedIds: [],
	claimedDateUtc: '2026-01-01',
};

function coachQuest(id: string): QuestTask {
	return {
		id,
		tier: 'bounty',
		source: 'coach_intent',
		senderLabel: 'Coach Challenge',
		title: 'Pace · 200 XP goal',
		axisId: 'PAC',
		xpReward: 200,
		lifecycle: 'complete',
		actionHref: '/player/workout',
		sortKey: 10,
	};
}

function dailyQuest(id: string): QuestTask {
	return {
		id,
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
}

describe('missionRailCoachIntents — GP-ACQ-03 cancel sync', () => {
	it('coachIntentRemovalDelta detects removed ids', () => {
		const { removed, nextIds } = coachIntentRemovalDelta(['intent-a', 'intent-b'], new Set(['intent-b']));
		expect(removed).toEqual(['intent-a']);
		expect(nextIds).toEqual(['intent-b']);
	});

	it('mergeCoachIntentsIntoQuestLog drops coach_intent when snapshot empty', () => {
		const existing = [coachQuest('intent-a'), dailyQuest('daily-training-log')];
		const merged = mergeCoachIntentsIntoQuestLog([], existing, baseProgress);
		expect(merged.some((q) => q.source === 'coach_intent')).toBe(false);
		expect(merged.some((q) => q.id === 'daily-training-log')).toBe(true);
	});

	it('applyCoachIntentRefetch uses purged questProgress when merging', () => {
		const existing = [coachQuest('intent-a'), dailyQuest('daily-training-log')];
		const applied = applyCoachIntentRefetch({
			snapshot: { quests: [], intentDataById: {}, activeIds: new Set() },
			lastCoachIntentIds: ['intent-a'],
			internalQuests: existing,
			questProgress: baseProgress,
		});
		expect(applied.questProgress.acceptedIds).toEqual([]);
		expect(applied.questProgress.completedIds).toEqual([]);
		expect(applied.internalQuests.some((q) => q.source === 'coach_intent')).toBe(false);
	});

	it('applyCoachIntentRefetch purges orphan coach_intent ids not tracked in lastCoachIntentIds', () => {
		const existing = [coachQuest('intent-stale'), dailyQuest('daily-training-log')];
		const progress = {
			acceptedIds: ['intent-stale'],
			completedIds: [],
			claimedIds: [],
			claimedDateUtc: '2026-01-01',
		};
		const applied = applyCoachIntentRefetch({
			snapshot: { quests: [], intentDataById: {}, activeIds: new Set() },
			lastCoachIntentIds: [],
			internalQuests: existing,
			questProgress: progress,
		});
		expect(applied.questProgress.acceptedIds).toEqual([]);
		expect(applied.internalQuests.some((q) => q.id === 'intent-stale')).toBe(false);
	});

	it('fetchCoachIntentDocsFromServer does not fall back to cached getDocs', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const src = readFileSync(
			join(__dirname, '../missionRailCoachIntents.ts'),
			'utf-8',
		);
		expect(src).toMatch(/getDocsFromServer/);
		expect(src).not.toMatch(/getDocs\(/);
	});

	it('applyCoachIntentPurge clears sessionStorage handoff for removed missionId', () => {
		const storage = new Map<string, string>();
		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => {
				storage.set(key, value);
			},
			removeItem: (key: string) => {
				storage.delete(key);
			},
		});

		storage.set(
			MISSION_HANDOFF_KEY,
			JSON.stringify({ missionId: 'intent-a', source: 'coach_intent' }),
		);

		applyCoachIntentPurge(baseProgress, ['intent-a']);
		expect(storage.has(MISSION_HANDOFF_KEY)).toBe(false);

		vi.unstubAllGlobals();
	});
});

describe('FORGE-MISSION-RAIL-VISIBILITY — coach intent merge', () => {
	const progress = {
		acceptedIds: [],
		completedIds: [],
		claimedIds: [],
		claimedDateUtc: '2026-01-01',
	};

	it('mapCoachIntentRows maps active team-scope snapshot to coach quest', () => {
		const snapshot = mapCoachIntentRows(
			[
				{
					id: 'intent-live',
					targetAttributeId: 'pace',
					requiredXp: 200,
					priority: 10,
					scope: 'team',
					status: 'active',
				},
			],
			progress,
			'player-uid',
		);
		expect(snapshot.quests).toHaveLength(1);
		expect(snapshot.quests[0]?.source).toBe('coach_intent');
		expect(snapshot.quests[0]?.lifecycle).toBe('accept');
		expect(snapshot.activeIds.has('intent-live')).toBe(true);
	});

	it('mergeCoachIntentsIntoQuestLog drops coach rows when snapshot empty', () => {
		const existing = [coachQuest('intent-gone'), dailyQuest('daily-training-log')];
		const merged = mergeCoachIntentsIntoQuestLog([], existing, progress);
		expect(merged.some((q) => q.source === 'coach_intent')).toBe(false);
		expect(merged.some((q) => q.id === 'daily-training-log')).toBe(true);
	});

	it('mergeCoachIntentsIntoQuestLog keeps active coach intent despite stale claimedIds', () => {
		const progressWithStaleClaim = { ...progress, claimedIds: ['intent-live'] };
		const merged = mergeCoachIntentsIntoQuestLog(
			[coachQuest('intent-live')],
			[dailyQuest('daily-training-log')],
			progressWithStaleClaim,
		);
		expect(merged.some((q) => q.id === 'intent-live')).toBe(true);
	});

	it('source-scan: ActiveBounties exposes mission rail diagnostic state', () => {
		const { readFileSync } = require('fs');
		const { join } = require('path');
		const src = readFileSync(
			join(__dirname, '../../../components/hud/ActiveBounties.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/data-mission-rail-state/);
		expect(src).toMatch(/intentSnapshotCount/);
		expect(src).toMatch(/coachIntentListenerAttached/);
		expect(src).toMatch(/subscribeCoachIntentSnapshot/);
	});
});
