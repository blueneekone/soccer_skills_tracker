<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
	import ClipAnalyzer from '$lib/components/player/ClipAnalyzer.svelte';
	import MediaVault from '$lib/components/player/MediaVault.svelte';
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
	<title>Training media · SSTRACKER</title>
</svelte:head>

<div class="pd-page-root player-dossier-root tw-min-w-0 tw-overflow-x-hidden" style="background: var(--pd-bg); color: var(--pd-text);">
	<div class="pd-content-wrap pd-route-stack">
		<PlayerOsPageStrap eyebrow="Execute / Film" title="Training media lab">
			{#snippet status()}
				<span class="pd-label">Upload · vault</span>
			{/snippet}
		</PlayerOsPageStrap>

		{#if !uid}
			<p class="pd-mono tw-text-sm tw-text-amber-300/90">Sign in to upload training clips.</p>
		{:else}
			<section class="pd-os-deck bento-span-12 tw-mb-4 tw-min-w-0" aria-label="Clip analyzer">
				<p class="pd-label tw-mb-3 tw-max-w-2xl tw-text-xs tw-leading-relaxed tw-text-[var(--text-secondary)]">
					Upload a clip for secure storage and safety scanning. When biomechanics analysis is enabled
					on the backend, results will appear here for you to confirm before XP is applied.
				</p>
				<ClipAnalyzer {armory} playerUid={uid} />
			</section>

			<section class="pd-os-deck bento-span-12 tw-min-w-0" aria-label="Media vault">
				<MediaVault playerUid={uid} playerEmail={email} />
			</section>
		{/if}
	</div>
</div>
