<script lang="ts">
	import { browser } from '$app/environment';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import VanguardPrismChart from './VanguardPrismChart.svelte';

	let loading = $state(true);
	// Ordered by ['POW', 'AGI', 'ACC', 'PAC', 'STM', 'COMP']
	let progressionData = $state([50, 50, 50, 50, 50, 50]);
	let lastUpdated = $state<Date | null>(null);

	$effect(() => {
		if (!browser || !authStore.user?.uid) {
			loading = false;
			return;
		}

		const uid = authStore.user.uid;
		const progRef = doc(db, 'player_progression', uid);

		const unsub = onSnapshot(progRef, (snap) => {
			loading = false;
			if (snap.exists()) {
				const data = snap.data();
				if (data.percentiles) {
					progressionData = [
						data.percentiles.POW ?? 50,
						data.percentiles.AGI ?? 50,
						data.percentiles.ACC ?? 50,
						data.percentiles.PAC ?? 50,
						data.percentiles.STM ?? 50,
						data.percentiles.COMP ?? 50,
					];
				}
				if (data.updatedAt) {
					lastUpdated = data.updatedAt.toDate();
				}
			}
		}, (err) => {
			console.error('[TelemetryPanel] Error reading progression:', err);
		});

		return () => unsub();
	});
</script>

<div class="telemetry-panel">
	<div class="telemetry-panel__header">
		<h2 class="telemetry-panel__title pw-mono">YoY Progression & Parity</h2>
		{#if loading}
			<span class="telemetry-panel__status pw-mono">Syncing...</span>
		{:else if lastUpdated}
			<span class="telemetry-panel__status pw-mono">Last updated: {lastUpdated.toLocaleDateString()}</span>
		{/if}
	</div>

	<VanguardPrismChart data={progressionData} />
</div>

<style>
	.telemetry-panel {
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: #09090b;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 24px;
	}

	.telemetry-panel__header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.telemetry-panel__title {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #f8fafc;
		margin: 0;
	}

	.telemetry-panel__status {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.75rem;
		color: #94a3b8;
	}
</style>
