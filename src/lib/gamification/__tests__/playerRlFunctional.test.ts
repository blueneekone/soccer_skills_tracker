/**
 * playerRlFunctional.test.ts — Sprint RL-audit (adaptive homework wiring guards)
 * Heuristic mode at abPercent=0 is sufficient; no GCS-trained model required.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const FUNCTIONS_RL_INDEX = join(ROOT, '..', 'functions-rl/index.js');
const FUNCTIONS_INDEX = join(ROOT, '..', 'functions/index.js');
const ADAPTIVE_HOMEWORK = join(ROOT, 'routes/(app)/player/dashboard/AdaptiveHomework.svelte');
const DASHBOARD_PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const FUNCTIONAL_MVP = join(ROOT, '..', 'docs/vision/FUNCTIONAL_MVP.md');
const COACH_MISSION_FLOW = join(ROOT, 'lib/player/workout/coachMissionFlow.ts');
const RL_POLICY_CACHE = join(ROOT, 'lib/player/workout/rlPolicyCache.ts');
const TRAIN_PAGE = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const RL_POLICY_ENGINE = join(ROOT, 'routes/(app)/admin/rl-policy/RlPolicyEngine.svelte.ts');
const RL_POLICY_ARENA = join(ROOT, 'routes/(app)/admin/rl-policy/RlPolicyArena.svelte');
const TRANSITION_GUARD = join(ROOT, '..', 'functions/__tests__/transitionRecorder.guard.test.js');
const TRANSITION_RECORDER = join(ROOT, '..', 'functions/src/ml/transitionRecorder.js');

describe('Sprint RL-audit — getAdaptiveWorkoutPolicy export', () => {
	it('functions-rl/index.js exports getAdaptiveWorkoutPolicy', () => {
		expect(existsSync(FUNCTIONS_RL_INDEX)).toBe(true);
		const index = readFileSync(FUNCTIONS_RL_INDEX, 'utf-8');
		expect(index).toMatch(/exports\.getAdaptiveWorkoutPolicy\s*=\s*rlOps\.getAdaptiveWorkoutPolicy/);
		expect(index).toMatch(/exports\.rlOnWorkoutLogCreated\s*=\s*transitionRecorder\.onWorkoutLogCreated/);
	});

	it('functions/index.js documents RL split to functions-rl/', () => {
		expect(existsSync(FUNCTIONS_INDEX)).toBe(true);
		const index = readFileSync(FUNCTIONS_INDEX, 'utf-8');
		expect(index).toMatch(/DEPLOY-N: RL → functions-rl\//);
	});
});

describe('Sprint RL-audit — AdaptiveHomework callable wiring', () => {
	it('AdaptiveHomework calls httpsCallable getAdaptiveWorkoutPolicy', () => {
		expect(existsSync(ADAPTIVE_HOMEWORK)).toBe(true);
		const src = readFileSync(ADAPTIVE_HOMEWORK, 'utf-8');
		expect(src).toMatch(/httpsCallable/);
		expect(src).toMatch(/getAdaptiveWorkoutPolicy/);
		expect(src).not.toMatch(/team_assignments/);
		expect(src).toMatch(/SUGGESTED BY AI/);
	});

	it('AdaptiveHomework uses adaptive drill cascade (not global_drills-only)', () => {
		const src = readFileSync(ADAPTIVE_HOMEWORK, 'utf-8');
		expect(src).toMatch(/resolveAdaptiveDrill/);
		expect(src).toMatch(/loadTeamDrillsForIntent|resolveAdaptiveDrill/);
		expect(src).not.toMatch(/collection\(db,\s*'global_drills'\)/);
	});
});

describe('PRESCRIPTION-hq-cta — AdaptiveHomework Train handoff', () => {
	it('AdaptiveHomework shows Log on Train and stashes adaptive handoff (not coach intent)', () => {
		const src = readFileSync(ADAPTIVE_HOMEWORK, 'utf-8');
		expect(src).toMatch(/Log on Train/);
		expect(src).toMatch(/stashAdaptiveHomeworkHandoff/);
		expect(src).not.toMatch(/stashCoachIntentHandoffForAssignment/);
		expect(src).toMatch(/goto\(resolveAppPath\('\/player\/workout'\)/);
	});

	it('coachMissionFlow exposes stashAdaptiveHomeworkHandoff using MISSION_HANDOFF_KEY', () => {
		const src = readFileSync(COACH_MISSION_FLOW, 'utf-8');
		expect(src).toMatch(/export function stashAdaptiveHomeworkHandoff/);
		expect(src).toMatch(/source: 'adaptive_homework'/);
		expect(src).toMatch(/MISSION_HANDOFF_KEY/);
		expect(src).toMatch(/player_mission_handoff_v1/);
	});
});

describe('Sprint RL-inference-on-train — shared policy cache + Train fetch', () => {
	it('rlPolicyCache exposes player_rl_policy_cache_v1 with 24h TTL', () => {
		expect(existsSync(RL_POLICY_CACHE)).toBe(true);
		const src = readFileSync(RL_POLICY_CACHE, 'utf-8');
		expect(src).toMatch(/player_rl_policy_cache_v1/);
		expect(src).toMatch(/RL_POLICY_CACHE_TTL_MS\s*=\s*86_400_000/);
		expect(src).toMatch(/ensureRlPolicyCached/);
	});

	it('AdaptiveHomework reuses rlPolicyCache instead of bare session hints key', () => {
		const src = readFileSync(ADAPTIVE_HOMEWORK, 'utf-8');
		expect(src).toMatch(/ensureRlPolicyCached/);
		expect(src).toMatch(/readRlPolicyCache/);
		expect(src).not.toMatch(/cachePolicyHints/);
		expect(src).toMatch(/httpsCallable\(functions,\s*'getAdaptiveWorkoutPolicy'/);
		expect(src).not.toMatch(/getFunctions\(\)/);
	});

	it('Train page fetches getAdaptiveWorkoutPolicy when coach intent armed via cache helper', () => {
		expect(existsSync(TRAIN_PAGE)).toBe(true);
		const src = readFileSync(TRAIN_PAGE, 'utf-8');
		expect(src).toMatch(/ensureRlPolicyCached/);
		expect(src).toMatch(/getAdaptiveWorkoutPolicy/);
		expect(src).toMatch(/activeMissionId/);
	});

	it('coachMissionFlow readCachedPolicyHints reads from rlPolicyCache', () => {
		const src = readFileSync(COACH_MISSION_FLOW, 'utf-8');
		expect(src).toMatch(/readRlPolicyCache/);
		expect(src).not.toMatch(/player_policy_hints_v1/);
	});
});

describe('Sprint RL-dev-coldboot — admin initRlPolicy console', () => {
	it('RlPolicyEngine exposes initPolicy calling initRlPolicy callable', () => {
		expect(existsSync(RL_POLICY_ENGINE)).toBe(true);
		const src = readFileSync(RL_POLICY_ENGINE, 'utf-8');
		expect(src).toMatch(/async initPolicy/);
		expect(src).toMatch(/'initRlPolicy'/);
		expect(src).toMatch(/InitRlPolicyInput/);
	});

	it('RlPolicyArena shows Initialize policy (v1) when policyState is null', () => {
		expect(existsSync(RL_POLICY_ARENA)).toBe(true);
		const src = readFileSync(RL_POLICY_ARENA, 'utf-8');
		expect(src).toMatch(/Initialize policy \(v1\)/);
		expect(src).toMatch(/initPolicy/);
		expect(src).toMatch(/!engine\.policyState/);
		expect(src).toMatch(/abPercent = 0/);
	});

	it('FUNCTIONAL_MVP documents cold-boot QA steps for super_admin', () => {
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/Initialize policy \(v1\)/);
		expect(doc).toMatch(/super_admin/);
		expect(doc).toMatch(/rl_policy_state\/current/);
		expect(doc).toMatch(/abPercent.*0/);
	});
});

describe('Sprint RL-transition-guards — transition pipeline wiring', () => {
	it('transitionRecorder.guard.test.js exists and documents inference-log gate', () => {
		expect(existsSync(TRANSITION_GUARD)).toBe(true);
		const guard = readFileSync(TRANSITION_GUARD, 'utf-8');
		expect(guard).toMatch(/transitionRecorder\.js/);
		expect(guard).toMatch(/onWorkoutLogCreated/);
		expect(guard).toMatch(/rl_inference_log/);
		expect(guard).toMatch(/abPercent=0/);
	});

	it('transitionRecorder.js exports onWorkoutLogCreated with 24h inference match', () => {
		expect(existsSync(TRANSITION_RECORDER)).toBe(true);
		const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
		expect(src).toMatch(/exports\.onWorkoutLogCreated/);
		expect(src).toMatch(/Only record a transition if we have a matching inference log/);
		expect(src).toMatch(/rl_transitions/);
		expect(src).toMatch(/nextState:\s*null/);
	});

	it('functions-rl/index.js exports rlOnWorkoutLogCreated from transitionRecorder', () => {
		const index = readFileSync(FUNCTIONS_RL_INDEX, 'utf-8');
		expect(index).toMatch(/exports\.rlOnWorkoutLogCreated\s*=\s*transitionRecorder\.onWorkoutLogCreated/);
		expect(index).toMatch(/exports\.rlOnPhysioReportCreated\s*=\s*transitionRecorder\.onPhysioReportCreated/);
	});

	it('FUNCTIONAL_MVP documents transition smoke checklist and launch abPercent=0 expectation', () => {
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/Transition pipeline smoke/);
		expect(doc).toMatch(/rl_transitions/);
		expect(doc).toMatch(/nextState: null/);
		expect(doc).toMatch(/physio_self_reports/);
		expect(doc).toMatch(/abPercent: 0/);
	});

	it('Train page mounts readiness strip before transmit', () => {
		const src = readFileSync(TRAIN_PAGE, 'utf-8');
		const hook = readFileSync(
			join(ROOT, 'lib/player/workout/useTrainReadinessStrip.svelte.ts'),
			'utf-8',
		);
		expect(src).toMatch(/TrainReadinessStrip/);
		expect(src).toMatch(/useTrainReadinessStrip/);
		expect(hook).toMatch(/physioForTransmit/);
	});
});

describe('Sprint RL-audit — HQ visibility', () => {
	it('player dashboard mounts AdaptiveHomework for RL policy path', () => {
		expect(existsSync(DASHBOARD_PAGE)).toBe(true);
		const page = readFileSync(DASHBOARD_PAGE, 'utf-8');
		expect(page).toMatch(/import AdaptiveHomework from '\.\/AdaptiveHomework\.svelte'/);
		expect(page).toMatch(/<AdaptiveHomework\s*\/>/);
		expect(readFileSync(ADAPTIVE_HOMEWORK, 'utf-8')).toMatch(/aria-label="Adaptive homework"/);
	});

	it('FUNCTIONAL_MVP.md documents RL audit section', () => {
		expect(existsSync(FUNCTIONAL_MVP)).toBe(true);
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/## RL/);
		expect(doc).toMatch(/rl_policy_state\/current/);
		expect(doc).toMatch(/rlOnWorkoutLogCreated/);
		expect(doc).toMatch(/abPercent:\s*0/);
	});
});
