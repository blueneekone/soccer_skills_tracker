/**
 * Benchmark submit via Train — primary XP path is logTrainingSession;
 * Scouts Six display stat is dual-written to users.armory.stats (see PLAYER_OS.md note).
 */

import type { HttpsCallableResult } from 'firebase/functions';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { calculateTrainingSessionEarnedXp } from '$lib/gamification/level.js';
import {
	computeBenchmarkXp,
	type BenchmarkDrill,
	resolveBenchmarkLogVolume,
} from '$lib/player/benchmark/benchmarkDrillCatalog.js';
import { executePlayerWorkoutLog } from '$lib/player/workoutLog.js';
import type { MissionHandoff } from '$lib/player/workout/coachMissionFlow.js';

export function syncBenchmarkStatDisplay(
	userEmail: string,
	statKey: BenchmarkDrill['statKey'],
	formattedValue: string,
): void {
	const key = userEmail.trim().toLowerCase();
	if (!key) return;
	const ref = doc(db, 'users', key);
	const patch = { [`armory.stats.${statKey}`]: formattedValue };
	updateDoc(ref, patch).catch((err: unknown) => {
		const code = (err as { code?: string })?.code;
		if (code === 'not-found') {
			setDoc(ref, { armory: { stats: { [statKey]: formattedValue } } }, { merge: true }).catch(
				() => {},
			);
		}
	});
}

export async function submitBenchmarkSession(input: {
	drill: BenchmarkDrill;
	numInput: number;
	handoff: MissionHandoff | null;
	activeMissionId: string | null;
	totalXpHud: number;
	oldLevel: number;
	user: { uid: string; email?: string | null };
	profile: Record<string, unknown> | null | undefined;
	logTrainingSession: (payload: Record<string, unknown>) => Promise<HttpsCallableResult<unknown>>;
	writePlayerOsWorkout: (...args: unknown[]) => Promise<void>;
	commitWorkoutCompletion: (...args: unknown[]) => Promise<unknown>;
	dopamineOnCommit: (...args: unknown[]) => Promise<unknown>;
	bumpXp: (delta: number) => void;
}): Promise<{
	earned: number;
	level: number | undefined;
	missionCloseNote: string;
	clearMission: boolean;
	levelUpFrom: number | null;
	levelUpTo: number | null;
}> {
	const catalogXp = computeBenchmarkXp(input.drill, input.numInput);
	const vol = resolveBenchmarkLogVolume(catalogXp);
	const serverEarned = calculateTrainingSessionEarnedXp(vol);
	const formatted = input.drill.format(input.numInput);
	const drillType = `[BENCHMARK] ${input.drill.label} · ${formatted}`.slice(0, 200);
	const email = (input.user.email ?? '').trim().toLowerCase();

	input.bumpXp(serverEarned);
	try {
		const result = await executePlayerWorkoutLog({
			drillType,
			durationMin: vol.duration,
			totalReps: vol.reps,
			intensityCall: vol.intensity,
			focusLabel: 'physical',
			selectedDrill: input.drill.label,
			activeMissionId: input.activeMissionId,
			missionSource: input.handoff?.source ?? 'coach_intent',
			targetAttributeId: input.handoff?.targetAttributeId ?? undefined,
			totalXpHud: input.totalXpHud,
			oldLevel: input.oldLevel,
			intensityStep: 8,
			sessionNotes: `Benchmark result: ${formatted}`,
			authUser: { uid: input.user.uid, email: input.user.email },
			profile: input.profile as { teamId?: unknown; playerName?: unknown },
			logTrainingSession: input.logTrainingSession,
			writePlayerOsWorkout: input.writePlayerOsWorkout as Parameters<
				typeof executePlayerWorkoutLog
			>[0]['writePlayerOsWorkout'],
			commitWorkoutCompletion: input.commitWorkoutCompletion as Parameters<
				typeof executePlayerWorkoutLog
			>[0]['commitWorkoutCompletion'],
			dopamineOnCommit: input.dopamineOnCommit as Parameters<
				typeof executePlayerWorkoutLog
			>[0]['dopamineOnCommit'],
		});
		if (email) {
			syncBenchmarkStatDisplay(email, input.drill.statKey, formatted);
		}
		return result;
	} catch (e) {
		input.bumpXp(-serverEarned);
		throw e;
	}
}
