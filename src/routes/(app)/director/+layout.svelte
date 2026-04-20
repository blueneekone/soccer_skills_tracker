<script>
	/** Field mode: responsive enterprise shell — enterprise-console.css + EnterpriseConsoleShell (max-width 1023px). */
	import { setContext } from 'svelte';
	import '$lib/styles/director-os.css';
	import DirectorReadOnlyBanner from '$lib/components/director/DirectorReadOnlyBanner.svelte';
	import ReadOnlyUpgradeModal from '$lib/components/director/ReadOnlyUpgradeModal.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';

	let { children } = $props();

	let upgradeModalOpen = $state(false);

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement
		)
	);

	setContext('openReadOnlyUpgrade', () => {
		upgradeModalOpen = true;
	});
</script>

<div class="director-os-root">
	{#if isReadOnly}
		<DirectorReadOnlyBanner onUpgrade={() => (upgradeModalOpen = true)} />
	{/if}
	<ReadOnlyUpgradeModal bind:open={upgradeModalOpen} />
	{@render children()}
</div>
