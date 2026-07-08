<script lang="ts">
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	
	const daysPastDue = $derived(licenseEntitlementStore.daysPastDue);
	const billingStatus = $derived(licenseEntitlementStore.billingStatus);
	const showBanner = $derived(billingStatus === 'past_due' && daysPastDue < 14);
	const daysRemaining = $derived(14 - daysPastDue);
</script>

{#if showBanner}
	<div class="tw-bg-[#f59e0b] tw-text-black tw-px-4 tw-py-2 tw-flex tw-items-center tw-justify-between tw-text-sm tw-font-bold tw-z-50 tw-relative">
		<div class="tw-flex tw-items-center tw-gap-2">
			<svg class="tw-w-5 tw-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
			</svg>
			<span>
				URGENT: Your billing account is past due. You have {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining until platform access is restricted.
			</span>
		</div>
		<a href={`/admin/organizations/${licenseEntitlementStore.clubIdResolved}/billing`} class="tw-bg-black tw-text-[#f59e0b] tw-px-4 tw-py-1 tw-rounded-md tw-hover:bg-gray-900 tw-transition-colors">
			Update Billing
		</a>
	</div>
{/if}
