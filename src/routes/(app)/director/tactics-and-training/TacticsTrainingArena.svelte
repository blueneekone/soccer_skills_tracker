<script lang="ts">
	import type { TacticsTrainingEngine } from './TacticsTrainingEngine.svelte.js';
	import MissionControl from '$lib/components/director/MissionControl.svelte';
	import PlaybookTab from '$lib/components/director/PlaybookTab.svelte';
	import TournamentBracketPanel from '$lib/components/director/TournamentBracketPanel.svelte';
	import FieldOpsModule from '$lib/components/director/os/FieldOpsModule.svelte';
	import DirectorWarRoomView from '$lib/components/director/DirectorWarRoomView.svelte';

	let { engine }: { engine: TacticsTrainingEngine } = $props();
</script>

<div class="tw-h-[100dvh] tw-w-full tw-p-6 lg:tw-p-10 tw-bg-[#0a0a0a]">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-flex tw-flex-col tw-gap-8 tw-min-h-full">
		{#if engine.activeTab === 'mission-control'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<MissionControl />
			</section>
		{:else if engine.activeTab === 'playbook'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<PlaybookTab clubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'tournaments'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<TournamentBracketPanel />
			</section>
		{:else if engine.activeTab === 'field'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<FieldOpsModule clubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'war-room'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full tw-h-[100dvh]">
				<DirectorWarRoomView />
			</section>
		{/if}
	</div>
</div>
