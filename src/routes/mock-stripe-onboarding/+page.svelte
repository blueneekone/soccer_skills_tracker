<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	function handleSimulateComplete() {
		untrack(() => {
			goto('/director/billing?stripe=success', { replaceState: true });
		});
	}
</script>

<svelte:head>
	<title>Mock Stripe Express Gateway Onboarding</title>
</svelte:head>

<div class="tw-min-h-screen tw-bg-[#090a0f] tw-text-[#fafafa] tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-6 tw-font-mono">
	<div class="tw-max-w-md tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-8 tw-rounded-none tw-shadow-2xl tw-space-y-6">
		<div class="tw-border-b tw-border-[#334155] tw-pb-4">
			<span class="tw-text-[#fbbf24] tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase">
				[ STRIPE CONNECT EXPRESS SANDBOX ]
			</span>
			<h1 class="tw-text-xl tw-font-bold tw-text-white tw-mt-2">
				Mock Stripe Express Gateway Onboarding
			</h1>
		</div>

		<p class="tw-text-xs tw-text-slate-400 tw-leading-relaxed">
			This is an offline-safe local development environment simulating the Stripe Connect Merchant Express onboarding handshake flow.
		</p>

		<div class="tw-bg-[#020202] tw-border tw-border-[#334155] tw-p-4 tw-space-y-2">
			<div class="tw-flex tw-justify-between tw-text-xs">
				<span class="tw-text-slate-500">ACCOUNT STATUS:</span>
				<span class="tw-text-[#fbbf24] tw-font-bold">PENDING_VERIFICATION</span>
			</div>
			<div class="tw-flex tw-justify-between tw-text-xs">
				<span class="tw-text-slate-500">SPLIT GATEWAY:</span>
				<span class="tw-text-teal-400">5.0% PLATFORM CUT</span>
			</div>
		</div>

		<button
			type="button"
			onclick={handleSimulateComplete}
			class="tw-w-full tw-py-3 tw-px-4 tw-bg-[#fbbf24] tw-text-black tw-font-bold tw-text-sm tw-rounded-none hover:tw-bg-[#f59e0b] tw-transition-colors tw-border-none tw-cursor-pointer"
		>
			[ SIMULATE COMPLETE ONBOARDING ]
		</button>
	</div>
</div>
