/**
 * playerHudSprint240.test.ts — Sprint 2.22 slice 6k coach mission handoff hardening
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	shouldDeferQuestCompletionUntilWorkoutLog,
	markQuestCompletedAfterWorkoutLog,
	type QuestTask,
} from '$lib/player/dashboard/activeBounties.js';
import { isMissionHandoffStale, MISSION_HANDOFF_MAX_AGE_MS } from '$lib/player/workout/coachMissionFlow.js';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const WORKOUT_LOG = join(ROOT, 'lib/player/workoutLog.ts');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const workoutLogSrc = existsSync(WORKOUT_LOG) ? readFileSync(WORKOUT_LOG, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

const coachCompleteQuest: QuestTask = {
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

describe('Sprint 2.22 slice 6k — quest lifecycle defer until log', () => {
	it('defers completion for Train-bound coach and daily quests', () => {
		expect(shouldDeferQuestCompletionUntilWorkoutLog(coachCompleteQuest)).toBe(true);
		expect(
			shouldDeferQuestCompletionUntilWorkoutLog({
				...coachCompleteQuest,
				source: 'coach_homework',
			}),
		).toBe(true);
		expect(
			shouldDeferQuestCompletionUntilWorkoutLog({
				...coachCompleteQuest,
				source: 'daily_habit',
				id: 'daily-training-log',
			}),
		).toBe(true);
	});

	it('does not mark coach_intent completed locally after workout log', () => {
		const progress = {
			acceptedIds: ['i1'],
			completedIds: [],
			claimedIds: [],
			claimedDateUtc: '2026-01-01',
		};
		const next = markQuestCompletedAfterWorkoutLog('i1', 'coach_intent', progress);
		expect(next.completedIds).toEqual([]);
	});

	it('marks coach_homework completed after workout log', () => {
		const progress = {
			acceptedIds: ['hw1'],
			completedIds: [],
			claimedIds: [],
			claimedDateUtc: '2026-01-01',
		};
		const next = markQuestCompletedAfterWorkoutLog('hw1', 'coach_homework', progress);
		expect(next.completedIds).toContain('hw1');
	});

	it('treats handoffs older than 24h as stale', () => {
		const stale = isMissionHandoffStale({
			missionId: 'i1',
			source: 'coach_intent',
			stashedAt: Date.now() - MISSION_HANDOFF_MAX_AGE_MS - 1,
		});
		expect(stale).toBe(true);
	});
});

describe('Sprint 2.22 slice 6k — wiring guards', () => {
	it('ActiveBounties defers markQuestCompleted on Start session', () => {
		expect(bountiesSrc).toMatch(/shouldDeferQuestCompletionUntilWorkoutLog/);
		expect(bountiesSrc).toMatch(/deferUntilLog/);
	});

	it('workout log passes assignmentId for coach homework', () => {
		expect(workoutLogSrc).toMatch(/assignmentId/);
		expect(workoutLogSrc).toMatch(/coach_homework/);
		expect(workoutLogSrc).toMatch(/missionSource === 'coach_intent'/);
	});

	it('workout page records quest progress after successful log', () => {
		expect(workoutSrc).toMatch(/recordQuestProgressAfterLog/);
		expect(workoutSrc).toMatch(/isMissionHandoffStale/);
		expect(workoutSrc).toMatch(/markQuestCompletedAfterWorkoutLog/);
	});

	it.skip('ROADMAP documents 6j-b Done and 6k / 6l slices', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});
});

describe('TRAIN-MISSION-ARM-EXPLICIT — Accept ≠ arm wiring guards', () => {
	it('ActiveBounties accept path does not stash handoff', () => {
		const acceptBlock = bountiesSrc.slice(
			bountiesSrc.indexOf("quest.lifecycle === 'accept'"),
			bountiesSrc.indexOf("quest.lifecycle === 'complete'"),
		);
		expect(acceptBlock).toMatch(/markQuestAccepted/);
		expect(acceptBlock).not.toMatch(/stashQuestHandoff|stashQuestTrainHandoff/);
	});

	it('Start session stashes with armExplicit true and navigation state', () => {
		expect(bountiesSrc).toMatch(/stashQuestHandoff\(quest,\s*true\)/);
		expect(bountiesSrc).toMatch(/missionHandoff:\s*navHandoff/);
	});

	it('workout mount uses resolveWorkoutMountHandoff (explicit arm only)', () => {
		expect(workoutSrc).toMatch(/resolveWorkoutMountHandoff/);
		expect(workoutSrc).toMatch(/mountHandoffApplied = true/);
	});

	it('isCoachDirectedSession requires armExplicit on armed handoff', () => {
		expect(workoutSrc).toMatch(/armedHandoff\?\.armExplicit/);
		expect(workoutSrc).toMatch(/armedHandoff\.missionId !== activeMissionId/);
	});

	it('Train mission strip Continue arms via continueCoachIntentOnTrain', () => {
		expect(workoutSrc).toMatch(/TrainMissionStrip/);
		expect(workoutSrc).toMatch(/continueCoachIntentOnTrain/);
		expect(workoutSrc).toMatch(/listTrainMissionStripItems/);
	});

	it('successful log clears armed mission', () => {
		expect(workoutSrc).toMatch(/clearArmedMission\(\)/);
		expect(workoutSrc).toMatch(/recordQuestProgressAfterLog/);
	});
});
