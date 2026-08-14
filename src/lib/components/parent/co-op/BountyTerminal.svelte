<script lang="ts">
	// Bounty Terminal - Tremendous Escrow Integration
	import type { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let {
		engine,
		escrowBalance = 150.00,
		activeBounties = 3
	} = $props<{
		engine?: CoOpEngine;
		escrowBalance?: number;
		activeBounties?: number;
	}>();

	const hasFunding = $derived(!!engine?.fundingSource);
	const fundingLabel = $derived(engine?.fundingSource?.label || 'None linked');
	let depositAmount = $state(50);

	function depositFunds() {
		// Mock logic: Initiate Stripe checkout for Tremendous Escrow deposit
		alert(`Initiating Stripe checkout to deposit $${depositAmount} into Tremendous Escrow.`);
	}
</script>

<div class="tw-bg-[#0f172a] tw-rounded-none" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); tw-border tw-border-[#334155] tw-p-6 tw-h-full tw-flex tw-flex-col">
	<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
		<h2 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2.5 tw-m-0" style="font-family: 'Geist Sans', sans-serif;">
			<Icon name={"sys.escrow" as IconName} size={20} class="tw-text-nuclear-yellow" />
			<span>Tremendous Escrow</span>
		</h2>
		<span class="tw-px-2 tw-py-0.5 tw-bg-nuclear-yellow/10 tw-border tw-border-nuclear-yellow/40 tw-text-nuclear-yellow tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded-none font-bold">
			BOUNTY TERMINAL
		</span>
	</div>

	<div class="bento-grid-container tw-grid-cols-2 tw-gap-4 tw-mb-6" style="grid-template-columns: repeat(2, minmax(0, 1fr)); width: auto;">
		<div class="tw-bg-[#1e293b] tw-p-4 tw-rounded-none tw-border tw-border-[#334155]">
			<p class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-mb-1">FUNDING SOURCE</p>
			<p class="tw-text-white tw-text-sm tw-font-bold tw-truncate" title={fundingLabel}>
				{hasFunding ? fundingLabel : 'No funding source linked'}
			</p>
		</div>
		<div class="tw-bg-[#1e293b] tw-p-4 tw-rounded-none tw-border tw-border-[#334155]">
			<p class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-mb-1">ACTIVE BOUNTIES</p>
			<p class="tw-text-nuclear-yellow tw-text-3xl tw-font-bold tw-font-mono">{activeBounties}</p>
		</div>
	</div>

	<div class="tw-mt-auto tw-pt-4 tw-border-t tw-border-[#334155]">
		<p class="tw-text-[#94a3b8] tw-text-xs tw-mb-4">Fund real-world rewards for your athlete's completed quests seamlessly.</p>
		
		<div class="tw-flex tw-gap-3">
			<select 
				bind:value={depositAmount}
				class="tw-bg-[#1e293b] tw-text-white tw-border tw-border-[#334155] tw-rounded-none tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-outline-none focus:tw-border-nuclear-yellow tw-transition-colors"
			>
				<option value={25}>$25.00</option>
				<option value={50}>$50.00</option>
				<option value={100}>$100.00</option>
				<option value={200}>$200.00</option>
			</select>
			
			<button 
				class="tw-flex-1 tw-bg-nuclear-yellow tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-py-2.5 tw-rounded-none hover:tw-bg-yellow-300 hover:tw-shadow-[0_0_15px_rgba(218,255,10,0.5)] tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2"
				onclick={depositFunds}
			>
				<Icon name={"sys.credit-card" as IconName} size={14} />
				<span>Deposit Funds via Stripe</span>
			</button>
		</div>
	</div>
</div>
