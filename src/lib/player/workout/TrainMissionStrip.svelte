<script lang="ts">
	import type { TrainMissionStripItem } from './trainMissionPicker.js';

	let {
		missions,
		onContinue,
	}: {
		missions: TrainMissionStripItem[];
		onContinue: (missionId: string) => void;
	} = $props();
</script>

{#if missions.length > 0}
	<div class="pw-mission-armed pd-os-deck__well bento-span-12" aria-label="Active missions">
		<div class="pw-mission-armed__head">
			<span class="pw-eyebrow">Active missions</span>
		</div>
		<ul class="pw-mission-strip tw-list-none tw-space-y-2 tw-p-0">
			{#each missions as mission (mission.id)}
				<li class="pw-mission-strip__row tw-flex tw-items-center tw-justify-between tw-gap-3">
					<span class="pw-mono pw-data">{mission.title}</span>
					<button
						type="button"
						class="pw-mission-armed__clear pw-mono"
						onclick={() => onContinue(mission.id)}
					>
						Continue
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
