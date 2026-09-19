<script lang="ts">
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
	import type { StatsEngine } from './StatsEngine.svelte.js';

	let { engine }: { engine: StatsEngine } = $props();
</script>

{#if engine.isPlayerRole}
	<PlayerOsPageStrap eyebrow="Progress / Analytics" title="Operative analytics">
		{#snippet status()}
			<span class="pd-label">LV {engine.dossierLevel}</span>
		{/snippet}
	</PlayerOsPageStrap>
{:else}
	<h1 class="tw-text-2xl tw-font-bold tw-text-[#fafafa] tw-mb-6">Operative Analytics</h1>
{/if}

<style>
	.pd-label {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}
</style>
