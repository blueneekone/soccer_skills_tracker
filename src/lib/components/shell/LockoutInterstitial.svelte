<script lang="ts">
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	
	const daysPastDue = $derived(licenseEntitlementStore.daysPastDue);
	const billingStatus = $derived(licenseEntitlementStore.billingStatus);
	const isLockedOut = $derived(billingStatus === 'past_due' && daysPastDue >= 14);
</script>

{#if isLockedOut}
	<div class="tw-fixed tw-inset-0 tw-z-[9999] tw-bg-[#0f172a]/95 tw-backdrop-blur-md tw-flex tw-items-center tw-justify-center tw-p-4">
		<div class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-8 tw-max-w-2xl tw-w-full tw-shadow-2xl">
			<div class="tw-flex tw-items-center tw-gap-4 tw-mb-6">
				<div class="tw-w-12 tw-h-12 tw-rounded-full tw-bg-red-500/20 tw-flex tw-items-center tw-justify-center tw-border tw-border-red-500/50">
					<svg class="tw-w-6 tw-h-6 tw-text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
					</svg>
				</div>
				<div>
					<h2 class="tw-text-2xl tw-font-bold tw-text-white">Platform Access Restricted</h2>
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-sm tw-mt-1">BILLING_STATUS: PAST_DUE</p>
				</div>
			</div>
			
			<div class="tw-prose tw-prose-invert tw-max-w-none tw-mb-8">
				<p class="tw-text-gray-300">
					Your organization's billing account has been past due for over 14 days. To protect data integrity, all mutation actions have been frozen. You may continue to view read-only telemetry, but you must update your payment method to restore full operational capability.
				</p>
			</div>

			<div class="tw-flex tw-justify-end tw-gap-4">
				<a href={`/admin/organizations/${licenseEntitlementStore.clubIdResolved}/billing`} class="tw-bg-[#fbbf24] tw-text-black tw-px-6 tw-py-2 tw-rounded-lg tw-font-bold tw-hover:bg-[#f59e0b] tw-transition-colors">
					Update Payment Method
				</a>
			</div>
		</div>
	</div>
{/if}
