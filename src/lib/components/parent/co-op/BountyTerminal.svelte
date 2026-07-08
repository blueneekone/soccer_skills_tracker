<script lang="ts">
	// Bounty Terminal - Tremendous Escrow Integration
	let {
		escrowBalance = 150.00,
		activeBounties = 3
	} = $props<{
		escrowBalance?: number;
		activeBounties?: number;
	}>();

	let depositAmount = $state(50);

	function depositFunds() {
		// Mock logic: Initiate Stripe checkout for Tremendous Escrow deposit
		alert(`Initiating Stripe checkout to deposit $${depositAmount} into Tremendous Escrow.`);
	}
</script>

<div class="tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6 tw-h-full tw-flex tw-flex-col">
	<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
		<h2 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2">
			<span class="tw-text-[#14b8a6]">●</span> Tremendous Escrow
		</h2>
		<span class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest">BOUNTY TERMINAL</span>
	</div>

	<div class="tw-grid tw-grid-cols-2 tw-gap-4 tw-mb-6">
		<div class="tw-bg-[#1e293b] tw-p-4 tw-rounded-xl tw-border tw-border-[#334155]">
			<p class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-mb-1">ESCROW BALANCE</p>
			<p class="tw-text-white tw-text-3xl tw-font-bold">${escrowBalance.toFixed(2)}</p>
		</div>
		<div class="tw-bg-[#1e293b] tw-p-4 tw-rounded-xl tw-border tw-border-[#334155]">
			<p class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-mb-1">ACTIVE BOUNTIES</p>
			<p class="tw-text-white tw-text-3xl tw-font-bold">{activeBounties}</p>
		</div>
	</div>

	<div class="tw-mt-auto tw-pt-4 tw-border-t tw-border-[#334155]">
		<p class="tw-text-[#94a3b8] tw-text-sm tw-mb-4">Fund real-world rewards for your athlete's completed quests seamlessly.</p>
		
		<div class="tw-flex tw-gap-3">
			<select 
				bind:value={depositAmount}
				class="tw-bg-[#1e293b] tw-text-white tw-border tw-border-[#334155] tw-rounded-lg tw-px-4 tw-py-2 tw-font-mono focus:tw-outline-none focus:tw-border-[#14b8a6] tw-transition-colors"
			>
				<option value={25}>$25.00</option>
				<option value={50}>$50.00</option>
				<option value={100}>$100.00</option>
				<option value={200}>$200.00</option>
			</select>
			
			<button 
				class="tw-flex-1 tw-bg-white tw-text-black tw-font-bold tw-rounded-lg tw-hover:bg-gray-200 tw-transition-colors"
				onclick={depositFunds}
			>
				Deposit Funds via Stripe
			</button>
		</div>
	</div>
</div>
