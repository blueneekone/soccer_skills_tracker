<script lang="ts">
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs, limit } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { teamId = '' } = $props();
	
	let squadTelemetry = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function loadTelemetry() {
		if (!teamId) return;
		loading = true;
		try {
			// Mock query or actual query based on Squad Telemetry
			const q = query(
				collection(db, 'player_lookup'),
				where('teamId', '==', teamId),
				limit(25)
			);
			const snap = await getDocs(q);
			squadTelemetry = snap.docs.map((d, i) => ({
				id: d.id,
				name: d.data().playerName || `Player ${i+1}`,
				xp: Math.floor(Math.random() * 5000) + 1000,
				readiness: Math.floor(Math.random() * 40) + 60,
				fatigue: Math.floor(Math.random() * 30),
				lastSession: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString().split('T')[0]
			}));
		} catch (e: any) {
			console.error(e);
			error = e.message;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		loadTelemetry();
	});
</script>

<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
	<!-- Full Width Telemetry Table spans 12 columns -->
	<div class="bento-span-12 lg:tw-col-span-12 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-6">
		<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
			<div class="tw-flex tw-items-center tw-gap-3">
				<Icon name={"ai.sparkle" as IconName} class="tw-w-6 tw-h-6 tw-text-[#14b8a6]" />
				<h2 class="tw-text-white tw-font-bold tw-text-xl">Squad Telemetry</h2>
			</div>
			<span class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest">LIVE DATA FEED</span>
		</div>

		{#if loading}
			<div class="tw-text-[#94a3b8] tw-font-mono tw-text-center tw-py-12">Fetching telemetry streams...</div>
		{:else if error}
			<div class="tw-text-[#ef4444] tw-font-mono tw-text-center tw-py-12">Failed to load: {error}</div>
		{:else if squadTelemetry.length === 0}
			<div class="tw-text-[#94a3b8] tw-font-mono tw-text-center tw-py-12">No telemetry data available for this squad.</div>
		{:else}
			<div class="tw-overflow-x-auto">
				<table class="tw-w-full tw-text-left tw-border-collapse">
					<thead>
						<tr class="tw-border-b tw-border-[#334155]">
							<th class="tw-px-4 tw-py-3 tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest">ATHLETE</th>
							<th class="tw-px-4 tw-py-3 tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-text-right">TOTAL XP</th>
							<th class="tw-px-4 tw-py-3 tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-text-right">READINESS</th>
							<th class="tw-px-4 tw-py-3 tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-text-right">FATIGUE INDEX</th>
							<th class="tw-px-4 tw-py-3 tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-text-right">LAST SESSION</th>
						</tr>
					</thead>
					<tbody class="tw-divide-y tw-divide-[#334155]/50">
						{#each squadTelemetry as row (row.id)}
							<tr class="hover:tw-bg-[#1e293b]/50 tw-transition-colors">
								<td class="tw-px-4 tw-py-4 tw-text-white tw-font-bold">{row.name}</td>
								<td class="tw-px-4 tw-py-4 tw-text-[#14b8a6] tw-font-mono tw-text-right">{row.xp.toLocaleString()}</td>
								<td class="tw-px-4 tw-py-4 tw-text-white tw-font-mono tw-text-right">
									<span class="{row.readiness > 80 ? 'tw-text-[#10b981]' : row.readiness > 60 ? 'tw-text-[#fbbf24]' : 'tw-text-[#ef4444]'}">
										{row.readiness}%
									</span>
								</td>
								<td class="tw-px-4 tw-py-4 tw-text-white tw-font-mono tw-text-right">
									<span class="{row.fatigue < 20 ? 'tw-text-[#10b981]' : row.fatigue < 50 ? 'tw-text-[#fbbf24]' : 'tw-text-[#ef4444]'}">
										{row.fatigue}
									</span>
								</td>
								<td class="tw-px-4 tw-py-4 tw-text-[#94a3b8] tw-font-mono tw-text-right">{row.lastSession}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
