<script>
	/** Field mode: responsive enterprise shell — enterprise-console.css + EnterpriseConsoleShell (max-width 1023px). */
	import { setContext } from 'svelte';
	import '$lib/styles/director-os.css';
	import '$lib/styles/director-command-center.css';
	import '$lib/styles/director-field-ops-map.css';
	import DirectorReadOnlyBanner from '$lib/components/director/DirectorReadOnlyBanner.svelte';
	import ReadOnlyUpgradeModal from '$lib/components/director/ReadOnlyUpgradeModal.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';
	import AlertMatrix from '$lib/components/layout/AlertMatrix.svelte';

	let { children } = $props();

	let upgradeModalOpen = $state(false);

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement,
			{
				clubInfinite: licenseEntitlementStore.isInfiniteClub,
				billingModel: licenseEntitlementStore.billingModel
			}
		)
	);

	setContext('openReadOnlyUpgrade', () => {
		upgradeModalOpen = true;
	});
</script>

<div class="tw-flex tw-w-full">
	<div class="director-os-root director-command-center-shell tw-flex-1 tw-min-w-0">
		{#if isReadOnly}
			<DirectorReadOnlyBanner onUpgrade={() => (upgradeModalOpen = true)} />
		{/if}
		<ReadOnlyUpgradeModal bind:open={upgradeModalOpen} />
		{@render children()}
	</div>
	{#if authStore.role === 'super_admin' || authStore.role === 'global_admin' || authStore.role === 'director'}
		<AlertMatrix />
	{/if}
</div>
