/**
 * playerHudSprint314.test.ts — QA-142 coach mission → Train handoff
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const ACTIVE_BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const ADAPTIVE_HW = join(ROOT, 'routes/(app)/player/dashboard/AdaptiveHomework.svelte');
const FLOW = join(ROOT, 'lib/player/workout/coachMissionFlow.ts');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const bountiesSrc = existsSync(ACTIVE_BOUNTIES) ? readFileSync(ACTIVE_BOUNTIES, 'utf-8') : '';
const adaptiveSrc = existsSync(ADAPTIVE_HW) ? readFileSync(ADAPTIVE_HW, 'utf-8') : '';
const flowSrc = existsSync(FLOW) ? readFileSync(FLOW, 'utf-8') : '';

describe('QA-142 — coach mission Train handoff', () => {
	it('workout page waits for team_assignments snapshot before clearing armed handoff', () => {
		expect(workoutSrc).toMatch(/incomingMissionsReady/);
		expect(workoutSrc).toMatch(/if \(!incomingMissionsReady\) return;/);
	});

	it('coach missions skip MissionHeroModal; Start session stashes via stashQuestTrainHandoff', () => {
		const activeBountiesTs = readFileSync(
			join(ROOT, 'lib/player/dashboard/activeBounties.ts'),
			'utf-8',
		);
		expect(bountiesSrc).toMatch(/shouldOpenMissionRailHeroModal/);
		expect(activeBountiesTs).toMatch(/quest\.source !== 'coach_intent'/);
		expect(bountiesSrc).toMatch(/stashQuestTrainHandoff/);
		expect(bountiesSrc).toMatch(/stashQuestHandoff\(quest,\s*true\)/);
		expect(bountiesSrc).toMatch(/missionHandoff:\s*navHandoff/);
	});

	it('TRAIN-MISSION-ARM-EXPLICIT — Accept on HQ does not write mission handoff', () => {
		const acceptBlock = bountiesSrc.slice(
			bountiesSrc.indexOf("quest.lifecycle === 'accept'"),
			bountiesSrc.indexOf("quest.lifecycle === 'complete'"),
		);
		expect(acceptBlock).not.toMatch(/stashQuestHandoff|stashQuestTrainHandoff/);
	});

	it('TRAIN-MISSION-ARM-EXPLICIT — shell Train entry does not auto-arm from sessionStorage alone', () => {
		expect(workoutSrc).toMatch(/resolveWorkoutMountHandoff/);
		expect(workoutSrc).toMatch(/resolveWorkoutMountHandoff\([\s\S]*missionHandoff/);
		expect(workoutSrc).not.toMatch(/incomingMissions\.some\(\(m\) => m\.id === activeMissionId\)/);
	});

	it('TRAIN-MISSION-ARM-EXPLICIT — Train mission strip Continue arms explicit handoff', () => {
		expect(workoutSrc).toMatch(/trainMissionStripItems/);
		expect(workoutSrc).toMatch(/TrainMissionStrip/);
		expect(workoutSrc).toMatch(/continueTrainMission/);
		expect(workoutSrc).toMatch(/continueCoachIntentOnTrain/);
	});

	it('TRAIN-MISSION-ARM-EXPLICIT — isCoachDirectedSession requires armed coach handoff', () => {
		expect(workoutSrc).toMatch(/armedHandoff\.missionId\s*!==\s*activeMissionId/);
		expect(workoutSrc).toMatch(/isCoachDirectedHandoff\(armedHandoff\.source\)/);
	});

	it('Adaptive Homework no longer gates on Morning Readiness', () => {
		expect(adaptiveSrc).not.toMatch(/MorningReadinessCard/);
		expect(adaptiveSrc).not.toMatch(/shouldShowReadiness/);
	});

	it('Train page shows inline readiness strip wired to workout log', () => {
		const readinessHook = readFileSync(
			join(ROOT, 'lib/player/workout/useTrainReadinessStrip.svelte.ts'),
			'utf-8',
		);
		expect(workoutSrc).toMatch(/TrainReadinessStrip/);
		expect(workoutSrc).toMatch(/useTrainReadinessStrip/);
		expect(readinessHook).toMatch(/physio_self_reports/);
		expect(readinessHook).toMatch(/physioForTransmit/);
	});

	it('logTrainingSession writes drill_completions for cadence when attributeId is set', () => {
		const trainingOps = readFileSync(
			join(ROOT, '..', 'functions/src/domains/trainingOps.js'),
			'utf-8',
		);
		expect(trainingOps).toMatch(/drill_completions/);
		expect(trainingOps).toMatch(/countCadenceSessionsForIntent/);
		expect(trainingOps).toMatch(/onDrillCompletionIntentLifecycle/);
	});

	it('workout log marks coach intent accepted after session (Start session again)', () => {
		const activeBounties = readFileSync(
			join(ROOT, 'lib/player/dashboard/activeBounties.ts'),
			'utf-8',
		);
		expect(activeBounties).toMatch(/source === 'coach_intent'/);
		expect(activeBounties).toMatch(/markQuestAccepted/);
	});

	it('ActiveBounties subscribes to cadence completions for mission progress', () => {
		expect(bountiesSrc).toMatch(/subscribePlayerCadenceCompletions/);
		expect(bountiesSrc).toMatch(/formatCadenceProgress/);
		expect(bountiesSrc).toMatch(/hasCoachIntentQuests/);
	});

	it('BOUNTY-DAILY-ACK: Train success appends cadence week note for coach_intent', () => {
		const constants = readFileSync(
			join(ROOT, 'lib/player/workout/workoutSessionConstants.ts'),
			'utf-8',
		);
		expect(constants).toMatch(/coachCadenceLogSuccessSuffix/);
		expect(workoutSrc).toMatch(/coachCadenceLogSuccessSuffix/);
		expect(workoutSrc).toMatch(/cadenceWeekNote/);
	});

	it('workout page omits DrillExecution panel — coach sessions are Transmit-only', () => {
		expect(workoutSrc).not.toMatch(/CoachMissionDrillExecutionPanel/);
		expect(workoutSrc).not.toMatch(/DrillExecution/);
		expect(workoutSrc).toMatch(/EXEC_COMMIT|logWorkout/);
	});

	it('workout page captures parent-proof intent before clearArmedMission', () => {
		expect(workoutSrc).toMatch(/const proofIntentId = activeMissionId/);
		expect(workoutSrc).toMatch(/const needsProof = armedHandoff\?\.requiresParentVerification === true/);
		expect(workoutSrc).toMatch(/armParentProofAfterLog\(proofIntentId, needsProof\)/);
	});

	it('workout page shows B4 pre-commit advisory when parent verification is armed', () => {
		expect(workoutSrc).toMatch(/requiresParentVerification === true/);
		expect(workoutSrc).toMatch(/After transmit, optional proof for parent — XP not gated/);
	});

	it('buildCoachIntentHandoff always carries a drillId fallback for execution panel', () => {
		expect(flowSrc).toMatch(/input\.missionId/);
	});

	it('GP-ACQ-03 / QA-142: mission rail refresh uses getDocsFromServer after coach cancel', () => {
		const rail = readFileSync(join(ROOT, 'lib/player/dashboard/missionRailCoachIntents.ts'), 'utf-8');
		expect(rail).toMatch(/getDocsFromServer/);
		expect(rail).toMatch(/fetchCoachIntentDocsFromServer/);
		expect(bountiesSrc).toMatch(/runCoachIntentRefetch/);
		expect(bountiesSrc).toMatch(/attachMissionQuestSubscriptions/);
	});
});
