<script lang="ts">
	import CoachScoutingView from '$lib/coach/scouting/CoachScoutingView.svelte';
	import CoachTryoutEvalPanel from '$lib/coach/scouting/CoachTryoutEvalPanel.svelte';
</script>

<svelte:head>
	<title>Coach • Scouting Dossier & Talent Matrix • SSTracker</title>
</svelte:head>

<div class="pd-page-root tw-min-h-screen tw-bg-[#000000] tw-text-[#fafafa] tw-flex tw-flex-col tw-overflow-x-hidden">
	<!-- Primary Scouting Surface (Prospect Matrix & Roster Quick Log) -->
	<CoachScoutingView />

	<!-- Club Tryout Pipeline Evaluation Section -->
	<div class="tw-max-w-[1700px] tw-mx-auto tw-w-full tw-px-4 sm:tw-px-6 tw-pb-12">
		<CoachTryoutEvalPanel />
	</div>
</div>
