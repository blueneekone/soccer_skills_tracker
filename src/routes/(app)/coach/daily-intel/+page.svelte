<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import '$lib/styles/enterprise-console.css';

	// ─── Vanguard Trinity: Glass ──────────────────────────────────────────────
	import SquadReadinessCard from './SquadReadinessCard.svelte';
	import FieldOpsSchedule from './FieldOpsSchedule.svelte';

	// ─── Vanguard Trinity: HUD (reuse existing coach components) ─────────────
	import WeatherHub from '$lib/components/coach/WeatherHub.svelte';
	import SquadMatrix from '$lib/components/coach/SquadMatrix.svelte';

	// ─── Brain ────────────────────────────────────────────────────────────────
	// (DailyIntelEngine exports are used by child Glass/HUD components directly)

	// ─── State ────────────────────────────────────────────────────────────────
	let loading = $state(true);

	// ─── B815 Hydration Guard ─────────────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated || !workspaceContextStore.activeTeamId) return;
		if (!browser) return;
		loading = false;
	});
</script>

<svelte:head>
	<title>Daily Intel · Coach OS</title>
</svelte:head>

<!-- Viewport Lockdown (100dvh App Flow) -->
<div class="tw-h-[100dvh] tw-w-full tw-flex tw-flex-col tw-overflow-hidden tw-bg-[#020617] tw-text-[#fafafa]">

	<div class="tw-flex-1 tw-overflow-y-auto tw-p-[clamp(16px,2vw,24px)] tw-flex tw-flex-col">

		<!-- Breadcrumb -->
		<header class="tw-py-3 tw-mb-4 tw-flex tw-justify-center tw-items-center">
			<div class="tw-text-xs tw-font-mono tw-tracking-widest tw-uppercase tw-text-[#d4d4d8]">
				COACH OS <span class="tw-text-[#a1a1aa] tw-mx-2">//</span>
				<span class="tw-text-[#14b8a6]">APEX COMMAND CENTER</span>
			</div>
		</header>

		{#if loading}
			<div class="tw-flex tw-items-center tw-justify-center tw-flex-1">
				<p class="tw-font-mono tw-text-[#14b8a6] tw-animate-pulse">VERIFYING HYDRATION LOCK...</p>
			</div>
		{:else}
			<!-- Asymmetric 8/4 Bento Grid -->
			<main class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-w-full tw-min-w-0" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">

				<!-- ═══ LEFT COLUMN (8 cols) ═══ -->
				<div class="tw-col-span-1 lg:tw-col-span-8 tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-min-w-0">
					<!-- Glass: Squad Readiness Chart -->
					<SquadReadinessCard />

					<!-- HUD: SIEM Squad Matrix (full player HUD modal is inside SquadMatrix) -->
					<SquadMatrix />
				</div>

				<!-- ═══ RIGHT COLUMN (4 cols) ═══ -->
				<div class="tw-col-span-1 lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-min-w-0">
					<!-- HUD: Ares Protocol Weather Radar (live production service) -->
					<WeatherHub />

					<!-- HUD: Field Ops Schedule -->
					<FieldOpsSchedule />
				</div>

			</main>
		{/if}
	</div>
</div>
