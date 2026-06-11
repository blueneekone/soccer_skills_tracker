<script lang="ts">
	import DrillExecution from '../../../routes/(app)/player/dashboard/DrillExecution.svelte';
	import { isCoachDirectedHandoff } from '$lib/player/workout/workoutSessionConstants.js';
	import type { MissionHandoff } from '$lib/player/workout/coachMissionFlow.js';

	let {
		armedHandoff = null,
		armedMissionTitle = 'Coach mission',
	}: {
		armedHandoff?: MissionHandoff | null;
		armedMissionTitle?: string;
	} = $props();

	const coachDrillExecution = $derived.by(() => {
		if (!armedHandoff || !isCoachDirectedHandoff(armedHandoff.source)) return null;
		const drillTitle =
			armedHandoff.drillTitle ??
			armedHandoff.prescription?.drillTitle ??
			armedMissionTitle;
		const drillId =
			armedHandoff.drillId ??
			armedHandoff.prescription?.teamDrillId ??
			armedHandoff.prescription?.clubDrillId ??
			armedHandoff.missionId;
		const attributeId = armedHandoff.targetAttributeId ?? 'technical';
		if (!drillTitle || !drillId) return null;
		const rankRaw = /** @type {Record<string, unknown> | undefined} */ (armedHandoff.prescription)
			?.complexityRank;
		const complexityRank = rankRaw === 2 || rankRaw === 3 ? rankRaw : 1;
		return { drillId, drillTitle, attributeId, complexityRank };
	});
</script>

{#if coachDrillExecution}
	<div class="bento-span-12 tw-min-w-0">
		<DrillExecution
			drillId={coachDrillExecution.drillId}
			drillTitle={coachDrillExecution.drillTitle}
			attributeId={coachDrillExecution.attributeId}
			complexityRank={coachDrillExecution.complexityRank}
		/>
	</div>
{/if}
