import { getBenchmarkDrillById } from '$lib/player/benchmark/benchmarkDrillCatalog.js';
import {
	isBenchmarkMissionHandoff,
	resolveBenchmarkDrillIdFromHandoff,
	type MissionHandoff,
} from '$lib/player/workout/coachMissionFlow.js';
import type { IntentPrescription } from '$lib/types/intent.js';

export function resolveTrainBenchmarkContext(handoff: MissionHandoff | null | undefined) {
	const isBenchmarkSession = isBenchmarkMissionHandoff(handoff);
	const drillId = resolveBenchmarkDrillIdFromHandoff(handoff);
	const armedBenchmarkDrill = drillId ? getBenchmarkDrillById(drillId) : undefined;
	const rx = handoff?.prescription as IntentPrescription | undefined;
	const target =
		handoff?.benchmarkTargetValue ?? rx?.benchmarkTargetValue ?? null;
	const armedBenchmarkTarget = target != null && target > 0 ? target : null;
	return { isBenchmarkSession, armedBenchmarkDrill, armedBenchmarkTarget };
}
