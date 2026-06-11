<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
	import ProvingGrounds from '$lib/components/player/ProvingGrounds.svelte';
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
	import '$lib/styles/player-dashboard-hud.css';

	const armory = new ArmoryEngine();
	const uid = $derived(authStore.user?.uid ?? '');
	const email = $derived((authStore.user?.email ?? '').trim().toLowerCase());

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (uid && email) armory.loadPlayerData(uid, email);
	});
</script>

<svelte:head>
	<title>Proving grounds · SSTRACKER</title>
</svelte:head>

<div class="pd-page-root player-dossier-root tw-min-w-0 tw-overflow-x-hidden" style="background: var(--pd-bg); color: var(--pd-text);">
	<div class="pd-content-wrap pd-route-stack">
		<PlayerOsPageStrap eyebrow="Execute / Benchmarks" title="Proving grounds">
			{#snippet status()}
				<span class="pd-label">Self-report · Scouts Six</span>
			{/snippet}
		</PlayerOsPageStrap>

		<section class="pd-os-deck bento-span-12 tw-min-w-0" aria-label="Benchmark drills">
			<p class="pd-label tw-mb-3 tw-max-w-2xl tw-text-xs tw-leading-relaxed tw-text-white/50">
				Log official combine-style numbers. Results write to your operative profile and award XP —
				same engine as coach-assigned missions.
			</p>
			{#if uid}
				<ProvingGrounds engine={armory} />
			{:else}
				<p class="pd-mono tw-text-sm tw-text-amber-300/90">Sign in to log benchmark results.</p>
			{/if}
		</section>
	</div>
</div>
