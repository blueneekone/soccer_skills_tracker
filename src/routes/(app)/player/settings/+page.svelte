<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
	import PlayerSettingsPanel from '$lib/components/player/PlayerSettingsPanel.svelte';

	const profile = $derived(authStore.userProfile);
	const role = $derived(authStore.role ?? '');
	const callsign = $derived(String(profile?.playerName ?? '').trim());
</script>

<svelte:head>
	<title>Settings · SSTRACKER</title>
</svelte:head>

<div class="pd-page-root player-dossier-root ps-settings-root tw-min-w-0 tw-overflow-x-hidden">
	<div class="pd-content-wrap pd-route-stack">
		<PlayerOsPageStrap
			eyebrow="Profile / Settings"
			title={callsign || 'Operative settings'}
		>
			{#snippet status()}
				<span class="pd-label">{role.toUpperCase()}</span>
			{/snippet}
		</PlayerOsPageStrap>

		<PlayerSettingsPanel />
	</div>
</div>
