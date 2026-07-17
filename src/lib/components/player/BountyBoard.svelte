<script lang="ts">
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { DopamineEngine } from './DopamineEngine.svelte';

	let { engine = new DopamineEngine(), playerId = '' } = $props();

	let bounties = $state<any[]>([]);
	let loading = $state(true);

	async function loadBounties() {
		if (!playerId) {
			loading = false;
			return;
		}
		try {
			// Integrate with Parent OS escrows.
			const q = query(
				collection(db, 'bounties'),
				where('playerId', '==', playerId),
				where('status', '==', 'active')
			);
			const snap = await getDocs(q);
			bounties = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
		} catch (e) {
			console.error('Failed to load bounties', e);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadBounties();
	});

	function handleClaim(bounty: any) {
		engine.triggerPulse();
		// Dispatch claim action
	}
</script>

<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-relative tw-z-30">
	<!-- Z3 Identity Panel -->
	<div class="bento-span-12 lg:tw-col-span-12 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-6 tw-shadow-2xl">
		<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
			<div class="tw-flex tw-items-center tw-gap-3">
				<Icon name={"action.dollar" as IconName} class="tw-w-6 tw-h-6 tw-text-[#fbbf24]" />
				<h2 class="tw-text-white tw-font-bold tw-text-xl">Bounty Board</h2>
			</div>
			<span class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest">PARENT ESCROWS</span>
		</div>

		{#if loading}
			<div class="tw-text-[#94a3b8] tw-font-mono tw-text-center tw-py-8">Syncing parent escrows...</div>
		{:else if bounties.length === 0}
			<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-6 tw-border tw-border-[#334155] tw-flex-1 tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
				<Icon name={"status.info" as IconName} class="tw-w-8 tw-h-8 tw-text-[#14b8a6] tw-mb-3" />
				<h3 class="tw-text-white tw-font-bold tw-mb-1">No Active Bounties</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm">Your parent hasn't set up any bounties. Keep grinding!</p>
			</div>
		{:else}
			<div class="tw-space-y-4">
				{#each bounties as b (b.id)}
					<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-between hover:tw-border-[#fbbf24] tw-transition-colors">
						<div class="tw-flex-1">
							<div class="tw-text-white tw-font-bold tw-text-lg">{b.title}</div>
							<div class="tw-text-[#94a3b8] tw-text-sm">{b.description}</div>
							<div class="tw-mt-2 tw-text-[#fbbf24] tw-font-mono tw-text-sm">REWARD: ${b.rewardAmount}</div>
						</div>
						<button 
							class="tw-ml-4 tw-px-6 tw-py-3 tw-bg-[#fbbf24] tw-text-black tw-font-bold tw-rounded-xl hover:tw-bg-[#f59e0b] tw-transition-colors"
							onclick={() => handleClaim(b)}
						>
							CLAIM
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
