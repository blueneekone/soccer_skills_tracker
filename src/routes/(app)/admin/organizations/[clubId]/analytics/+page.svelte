<script lang="ts">
	import { page } from '$app/stores';
	import { createAnalyticsEngine } from './AnalyticsEngine.svelte';
	import AnalyticsArena from './AnalyticsArena.svelte';
	import AnalyticsHUD from './AnalyticsHUD.svelte';

	const clubId = $page.params.clubId;
	const engine = createAnalyticsEngine(clubId);
</script>

<svelte:head>
	<title>Analytics Command Center | Director OS</title>
</svelte:head>

<div class="tw-min-h-screen tw-bg-[#09090b] tw-p-8 tw-text-slate-300">
	<div class="tw-max-w-7xl tw-mx-auto tw-space-y-6">
		<header class="tw-mb-8">
			<h1 class="tw-text-3xl tw-font-bold tw-text-white tw-tracking-tight">Macro-Telemetry Dashboard</h1>
			<p class="tw-text-slate-400 tw-mt-2">Global organizational health and automated reporting pipeline.</p>
		</header>

		<!-- The Glass: Visualizes Telemetry Data -->
		<AnalyticsArena {engine} />

		<!-- The HUD: Interactive Controls -->
		<AnalyticsHUD {engine} />
	</div>
</div>
