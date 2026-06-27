<script lang="ts">
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import { submitBenchmarkSession } from '$lib/player/benchmark/submitBenchmarkSession.js';
	import { armedCadenceBlockedToday, type CadenceCompletionRow } from '$lib/player/dashboard/cadenceCompletions.js';
	import {
		coachCadenceLogSuccessSuffix,
	} from '$lib/player/workout/workoutSessionConstants.js';
	import { resolveMissionHandoffDisplayCadence, type MissionHandoff } from '$lib/player/workout/coachMissionFlow.js';
	import { workoutLogErrorMessage } from '$lib/player/workoutLog.js';
	import TrainBenchmarkPanel from '$lib/player/workout/TrainBenchmarkPanel.svelte';

	let {
		drill,
		handoff = null as MissionHandoff | null,
		activeMissionId = null as string | null,
		coachTargetValue = null as number | null,
		totalXpHud = 0,
		profile = null as Record<string, unknown> | null | undefined,
		cadenceCompletions = [] as CadenceCompletionRow[],
		logTrainingSession,
		writePlayerOsWorkout,
		commitWorkoutCompletion,
		dopamineOnCommit,
		dopamineOnCallable,
		bumpXp,
		authUser = null as { uid: string; email?: string | null } | null,
		onSuccess,
		onError,
		onCadenceBlocked,
		onQuestProgress,
		onClearMission,
		onParentProof,
		onRefreshProfile,
	} = $props();

	let submitting = $state(false);

	const armedDisplayCadence = $derived(resolveMissionHandoffDisplayCadence(handoff, handoff?.requiredXp));
	const cadenceBlocked = $derived(
		armedCadenceBlockedToday(
			armedDisplayCadence,
			handoff?.targetAttributeId,
			activeMissionId,
			cadenceCompletions,
		),
	);

	async function handleSubmit(numInput: number) {
		if (!authUser || submitting) return;
		if (cadenceBlocked) {
			onCadenceBlocked();
			return;
		}
		submitting = true;
		const oldLevel = getLevelProgressFromTotalXp(totalXpHud).level;
		const needsProof = handoff?.requiresParentVerification === true;
		try {
			const result = await submitBenchmarkSession({
				drill,
				numInput,
				handoff,
				activeMissionId,
				totalXpHud,
				oldLevel,
				user: authUser,
				profile,
				logTrainingSession,
				writePlayerOsWorkout,
				commitWorkoutCompletion,
				dopamineOnCommit,
				bumpXp,
			});
			onQuestProgress(result.clearMission ? handoff : null);
			if (result.clearMission) onClearMission();
			void dopamineOnCallable(Promise.resolve(result), { kind: 'drill' });
			const cadenceWeekNote = coachCadenceLogSuccessSuffix(handoff?.source ?? null, armedDisplayCadence);
			onSuccess({
				earned: result.earned,
				message: `+${result.earned} XP · ${drill.format(numInput)}${cadenceWeekNote}`,
				levelUp:
					result.levelUpFrom != null && result.levelUpTo != null ?
						{ from: result.levelUpFrom, to: result.levelUpTo, earned: result.earned }
					:	null,
			});
			onParentProof(activeMissionId, needsProof);
			await onRefreshProfile();
		} catch (e) {
			console.error(e);
			onError(workoutLogErrorMessage(e));
		} finally {
			submitting = false;
		}
	}
</script>

<div class="pw-theater__configure pd-os-deck__well bento-span-12">
	<TrainBenchmarkPanel
		{drill}
		{coachTargetValue}
		submitting={submitting}
		onSubmit={handleSubmit}
	/>
</div>
