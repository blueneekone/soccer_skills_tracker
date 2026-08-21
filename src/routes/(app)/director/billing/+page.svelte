<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	let isConnecting = $state(false);
	let error = $state('');

	// Check for returning search query parameters indicating Stripe onboarding completion
	const stripeStatus = $derived.by(() => {
		const s = page.url.searchParams.get('stripe');
		const status = page.url.searchParams.get('stripe_status');
		return s === 'success' || status === 'completed' || status === 'success';
	});

	let isConnected = $state(false);

	$effect(() => {
		if (stripeStatus) {
			isConnected = true;
		}
	});

	async function handleInitiateGateway() {
		if (isConnecting) return;
		isConnecting = true;
		error = '';

		try {
			const res = await fetch('/api/stripe/connect', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				throw new Error('Failed to connect to Stripe gateway');
			}

			const data = await res.json();
			if (data.url) {
				untrack(() => {
					if (data.url.startsWith('http://') || data.url.startsWith('https://')) {
						window.location.href = data.url;
					} else {
						goto(data.url);
					}
				});
			} else {
				throw new Error('No redirect URL provided by API');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown connection error';
		} finally {
			isConnecting = false;
		}
	}
</script>

<svelte:head>
	<title>Billing Portal — Director OS</title>
</svelte:head>

<div class="pd-page-root tw-h-[100dvh] tw-overflow-hidden tw-bg-[#000000] tw-text-[#FAFAFA] tw-flex tw-flex-col tw-font-mono tw-p-6">
	<div class="tw-max-w-4xl tw-w-full tw-mx-auto tw-space-y-6">
		<header class="tw-border-b tw-border-[#334155] tw-pb-4 tw-flex tw-items-center tw-justify-between">
			<div>
				<span class="tw-text-[#fbbf24] tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase">
					[ DIRECTOR OS · BILLING GATEWAY ]
				</span>
				<h1 class="tw-text-2xl tw-font-bold tw-text-white tw-mt-1">
					Merchant Payment & Payout Hub
				</h1>
			</div>
			{#if isConnected || stripeStatus}
				<span class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-rounded-none">
					[ ACTIVE / CONNECTED ]
				</span>
			{/if}
		</header>

		{#if isConnected || stripeStatus}
			<div class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6] tw-p-4 tw-rounded-none tw-flex tw-items-center tw-justify-between">
				<div class="tw-flex tw-items-center tw-gap-3">
					<span class="tw-w-3 tw-h-3 tw-bg-[#14b8a6] tw-inline-block"></span>
					<div>
						<h2 class="tw-text-sm tw-font-bold tw-text-[#14b8a6]">GATEWAY SECURED</h2>
						<p class="tw-text-xs tw-text-slate-300">Stripe Connect Account active. Payouts enabled with 5% transaction split.</p>
					</div>
				</div>
			</div>
		{/if}

		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-rounded-none tw-space-y-4">
			<h2 class="tw-text-lg tw-font-bold tw-text-white">Stripe Express Gateway Onboarding</h2>
			<p class="tw-text-xs tw-text-slate-400 tw-leading-relaxed">
				SSTracker enforces a strict $0 base platform fee model with a 5% transaction split on registration revenues. Connect your club account to process season fees securely.
			</p>

			{#if error}
				<div class="tw-bg-red-500/10 tw-border tw-border-red-500 tw-text-red-400 tw-p-3 tw-text-xs">
					{error}
				</div>
			{/if}

			{#if !isConnected && !stripeStatus}
				<button
					type="button"
					onclick={handleInitiateGateway}
					disabled={isConnecting}
					style="border-radius: 0px;"
					class="tw-py-3 tw-px-6 tw-bg-[#fbbf24] tw-text-black tw-font-bold tw-text-sm tw-rounded-none hover:tw-bg-[#f59e0b] tw-transition-colors tw-border-none tw-cursor-pointer disabled:tw-opacity-50"
				>
					{isConnecting ? '[ CONNECTING... ]' : '[ SECURE STRIPE GATEWAY ]'}
				</button>
			{:else}
				<div class="tw-pt-2">
					<span
						style="border-radius: 0px;"
						class="tw-inline-block tw-py-3 tw-px-6 tw-bg-[#14b8a6] tw-text-black tw-font-bold tw-text-sm tw-rounded-none"
					>
						[ ACTIVE / CONNECTED ]
					</span>
				</div>
			{/if}
		</div>
	</div>
</div>
