<script lang="ts">
	import { getContext } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { getFunctions } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { ADMIN_CLUB_CTX_KEY } from '../adminClubCtx.js';
	import type { AdminClubCtx } from '../adminClubCtx.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import '$lib/styles/enterprise-console.css';

	const ctx = getContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY);

	let invoices = $state<any[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Operational Dashboard Modals
	let isCreditModalOpen = $state(false);
	let isTrialModalOpen = $state(false);
	let isRevokeModalOpen = $state(false);

	// Dunning Engine Auto-Chase Toggle
	let autoChaseEnabled = $state(true);
	let dunningStatus = $state('Grace Period'); // Mock status

	// Financial Routing (Phase 2)
	let isStripeConnected = $state(false);
	let stripePayoutsEnabled = $state(false);
	let isConnecting = $state(false);

	$effect(() => {
		let cancelled = false;
		if (!ctx.clubId) return;

		async function fetchLedger() {
			try {
				if (!db || !authStore.isAuthenticated) return;
				const q = query(
					collection(db, 'clubs', ctx.clubId, 'stripe_invoices'),
					orderBy('created', 'desc'),
					limit(25)
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				
				const results: any[] = [];
				snap.forEach((doc) => {
					results.push({ id: doc.id, ...doc.data() });
				});
				invoices = results;
			} catch (err: any) {
				if (!cancelled) errorMsg = err.message || 'Failed to fetch ledger.';
			} finally {
				if (!cancelled) loading = false;
			}
		}

		async function fetchCredentials() {
			try {
				const snap = await getDoc(doc(db, 'integration_credentials', ctx.clubId));
				if (cancelled) return;
				if (snap.exists()) {
					isStripeConnected = snap.data().stripeOnboardingComplete ?? false;
					stripePayoutsEnabled = snap.data().stripePayoutsEnabled ?? false;
				}
			} catch (err: any) {
				console.error(err);
			}
		}

		fetchLedger();
		fetchCredentials();
		return () => {
			cancelled = true;
		};
	});

	function handleAction(type: string) {
		// Mock handlers for Cloud Function execution
		if (type === 'credit') isCreditModalOpen = false;
		if (type === 'trial') isTrialModalOpen = false;
		if (type === 'revoke') isRevokeModalOpen = false;
	}

	async function handleConnectBank() {
		isConnecting = true;
		try {
			const functions = getFunctions(undefined, 'us-east1');
			const initiateStripeConnect = httpsCallable(functions, 'initiateStripeConnect');
			 
			const result = await initiateStripeConnect({ }) as any;
			if (result.data && result.data.url) {
				window.location.href = result.data.url;
			}
		} catch (e) {
			console.error(e);
			alert('Failed to initiate onboarding');
		} finally {
			isConnecting = false;
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
	
	<!-- ── Financial Routing (Stripe Connect) ───────────────────────── -->
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-p-6">
		<h2 class="tw-text-[#FAFAFA] tw-font-bold tw-text-lg tw-m-0 tw-mb-4">Financial Routing</h2>
		{#if !isStripeConnected}
			<div class="tw-flex tw-items-center tw-justify-between">
				<p class="tw-text-[#A1A1AA] tw-text-sm">Bank account is unconnected. Platform revenue splitting requires an active Stripe Express account.</p>
				<button 
					class="tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-[#0f172a] tw-px-6 tw-py-3 tw-rounded-none tw-font-bold tw-text-sm tw-transition-colors disabled:tw-opacity-50"
					onclick={handleConnectBank}
					disabled={isConnecting}
				>
					{isConnecting ? 'Connecting...' : 'Connect Bank Account'}
				</button>
			</div>
		{:else}
			<div class="tw-flex tw-items-center tw-gap-8 tw-font-mono tw-text-sm">
				<div class="tw-flex tw-flex-col">
					<span class="tw-text-[#A1A1AA] tw-text-xs tw-mb-1 tw-tracking-widest">STATUS</span>
					<span class="tw-text-[#10b981] tw-font-bold">CONNECTED</span>
				</div>
				<div class="tw-flex tw-flex-col">
					<span class="tw-text-[#A1A1AA] tw-text-xs tw-mb-1 tw-tracking-widest">PAYOUTS</span>
					<span class={stripePayoutsEnabled ? "tw-text-[#10b981] tw-font-bold" : "tw-text-[#f59e0b] tw-font-bold"}>
						{stripePayoutsEnabled ? 'ACTIVE' : 'PENDING VERIFICATION'}
					</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- ── Operations Dashboard & Dunning Engine ─────────────────────── -->
	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
		
		<!-- Financial Interventions (8-col) -->
		<div class="tw-col-span-1 lg:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-p-6">
			<h2 class="tw-text-[#FAFAFA] tw-font-bold tw-text-lg tw-mb-4 tw-m-0">Financial Interventions</h2>
			<div class="tw-flex tw-gap-4 tw-flex-wrap">
				<button class="tw-bg-[#334155] hover:tw-bg-[#475569] tw-text-[#FAFAFA] tw-px-4 tw-py-2 tw-rounded-none tw-font-bold tw-text-sm tw-transition-colors" onclick={() => isCreditModalOpen = true}>
					Apply Credit
				</button>
				<button class="tw-bg-[#334155] hover:tw-bg-[#475569] tw-text-[#FAFAFA] tw-px-4 tw-py-2 tw-rounded-none tw-font-bold tw-text-sm tw-transition-colors" onclick={() => isTrialModalOpen = true}>
					Extend Trial
				</button>
				<button class="tw-bg-[#7f1d1d] hover:tw-bg-[#991b1b] tw-text-[#FAFAFA] tw-px-4 tw-py-2 tw-rounded-none tw-font-bold tw-text-sm tw-transition-colors tw-ml-auto" onclick={() => isRevokeModalOpen = true}>
					Force Revoke License
				</button>
			</div>
		</div>

		<!-- Dunning Engine (4-col) -->
		<div class="tw-col-span-1 lg:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-p-6 tw-flex tw-flex-col tw-gap-4">
			<div class="tw-flex tw-items-center tw-justify-between">
				<h2 class="tw-text-[#FAFAFA] tw-font-bold tw-text-lg tw-m-0">Auto-Chase Engine</h2>
				<button 
					aria-label="Toggle Auto-Chase Engine"
					class="tw-w-10 tw-h-5 tw-rounded-full tw-relative tw-transition-colors {autoChaseEnabled ? 'tw-bg-[#14b8a6]' : 'tw-bg-[#334155]'}"
					onclick={() => autoChaseEnabled = !autoChaseEnabled}
				>
					<div class="tw-absolute tw-w-4 tw-h-4 tw-bg-white tw-rounded-full tw-top-0.5 tw-transition-transform {autoChaseEnabled ? 'tw-translate-x-5' : 'tw-translate-x-1'}"></div>
				</button>
			</div>
			
			<div class="tw-mt-auto tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-none tw-p-3">
				<span class="tw-text-[#A1A1AA] tw-text-xs tw-font-bold tw-tracking-widest tw-block tw-mb-1">CURRENT STATUS</span>
				<span class="tw-text-[#f59e0b] tw-font-bold tw-text-sm">{dunningStatus}</span>
			</div>
		</div>
	</div>

	<!-- ── Stripe Transaction Ledger ─────────────────────────────────── -->
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-overflow-hidden">
		<div class="tw-p-4 tw-border-b tw-border-[#334155] tw-flex tw-items-center tw-justify-between">
			<h2 class="tw-text-[#FAFAFA] tw-font-bold tw-text-lg tw-m-0">Transaction Ledger</h2>
			{#if loading}
				<span class="tw-text-[#A1A1AA] tw-text-sm tw-italic">Syncing...</span>
			{/if}
		</div>
		
		<div class="tw-w-full tw-overflow-x-auto">
			<table class="tw-w-full tw-text-left tw-border-collapse tw-min-w-[700px]">
				<thead class="tw-bg-[#020617]">
					<tr>
						<th class="tw-py-3 tw-px-4 tw-text-xs tw-font-bold tw-text-[#A1A1AA] tw-uppercase tw-tracking-widest tw-border-b tw-border-[#334155]">Invoice ID</th>
						<th class="tw-py-3 tw-px-4 tw-text-xs tw-font-bold tw-text-[#A1A1AA] tw-uppercase tw-tracking-widest tw-border-b tw-border-[#334155]">Amount</th>
						<th class="tw-py-3 tw-px-4 tw-text-xs tw-font-bold tw-text-[#A1A1AA] tw-uppercase tw-tracking-widest tw-border-b tw-border-[#334155]">Status</th>
						<th class="tw-py-3 tw-px-4 tw-text-xs tw-font-bold tw-text-[#A1A1AA] tw-uppercase tw-tracking-widest tw-border-b tw-border-[#334155]">Timestamp</th>
					</tr>
				</thead>
				<tbody>
					{#if errorMsg}
						<tr><td colspan="4" class="tw-p-6 tw-text-center tw-text-[#ef4444]">{errorMsg}</td></tr>
					{:else if invoices.length === 0 && !loading}
						<tr><td colspan="4" class="tw-p-8 tw-text-center tw-text-[#A1A1AA] tw-font-mono tw-text-sm">NO INVOICES FOUND</td></tr>
					{:else}
						{#each invoices as invoice}
							<tr class="tw-border-b tw-border-[#334155] hover:tw-bg-[#1E293B] tw-transition-colors">
								<td class="tw-py-3 tw-px-4 tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[#FAFAFA] tw-text-sm">{invoice.id}</td>
								<td class="tw-py-3 tw-px-4 tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[#FAFAFA] tw-text-sm">
									${(invoice.amount_due / 100 || 0).toFixed(2)}
								</td>
								<td class="tw-py-3 tw-px-4">
									<span class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest {invoice.status === 'paid' ? 'tw-text-[#10b981]' : 'tw-text-[#f59e0b]'}">
										{invoice.status || 'open'}
									</span>
								</td>
								<td class="tw-py-3 tw-px-4 tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[#A1A1AA] tw-text-sm">
									{invoice.created ? new Date(invoice.created * 1000).toLocaleString() : 'N/A'}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- ── Double Confirmation Modals ───────────────────────────────── -->
{#if isCreditModalOpen}
	<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-[#0B0F19]/80 tw-backdrop-blur-sm">
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-p-6 tw-max-w-md tw-w-full">
			<h3 class="tw-text-[#FAFAFA] tw-font-bold tw-text-xl tw-mb-2">Confirm Action</h3>
			<p class="tw-text-[#D4D4D8] tw-text-sm tw-mb-6">Are you sure you want to apply a Stripe credit to this organization?</p>
			<div class="tw-flex tw-gap-3 tw-justify-end">
				<button class="tw-text-[#D4D4D8] hover:tw-text-[#FAFAFA] tw-font-bold tw-text-sm tw-px-4 tw-py-2" onclick={() => isCreditModalOpen = false}>Cancel</button>
				<button class="tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] tw-text-[#020617] tw-font-bold tw-text-sm tw-px-4 tw-py-2 tw-rounded-none" onclick={() => handleAction('credit')}>Confirm</button>
			</div>
		</div>
	</div>
{/if}

{#if isTrialModalOpen}
	<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-[#0B0F19]/80 tw-backdrop-blur-sm">
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-p-6 tw-max-w-md tw-w-full">
			<h3 class="tw-text-[#FAFAFA] tw-font-bold tw-text-xl tw-mb-2">Confirm Action</h3>
			<p class="tw-text-[#D4D4D8] tw-text-sm tw-mb-6">Extend the current trial period for this club?</p>
			<div class="tw-flex tw-gap-3 tw-justify-end">
				<button class="tw-text-[#D4D4D8] hover:tw-text-[#FAFAFA] tw-font-bold tw-text-sm tw-px-4 tw-py-2" onclick={() => isTrialModalOpen = false}>Cancel</button>
				<button class="tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] tw-text-[#020617] tw-font-bold tw-text-sm tw-px-4 tw-py-2 tw-rounded-none" onclick={() => handleAction('trial')}>Confirm</button>
			</div>
		</div>
	</div>
{/if}

{#if isRevokeModalOpen}
	<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-[#0B0F19]/80 tw-backdrop-blur-sm">
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#ef4444] tw-rounded-none tw-p-6 tw-max-w-md tw-w-full">
			<h3 class="tw-text-[#ef4444] tw-font-bold tw-text-xl tw-mb-2">DESTRUCTIVE ACTION</h3>
			<p class="tw-text-[#D4D4D8] tw-text-sm tw-mb-6">You are about to force-revoke this club's license. This will immediately lock out all directors and staff. Confirm?</p>
			<div class="tw-flex tw-gap-3 tw-justify-end">
				<button class="tw-text-[#D4D4D8] hover:tw-text-[#FAFAFA] tw-font-bold tw-text-sm tw-px-4 tw-py-2" onclick={() => isRevokeModalOpen = false}>Cancel</button>
				<button class="tw-bg-[#7f1d1d] hover:tw-bg-[#991b1b] tw-text-[#FAFAFA] tw-font-bold tw-text-sm tw-px-4 tw-py-2 tw-rounded-none" onclick={() => handleAction('revoke')}>FORCE REVOKE</button>
			</div>
		</div>
	</div>
{/if}
