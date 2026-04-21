<script>
	import { getContext } from 'svelte';
	import PendingInvitesList from './PendingInvitesList.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';

	let {
		clubId = '',
		onCreateTeam = () => {},
		onInviteCoach = () => {}
	} = $props();

	/** @type {() => void} */
	const openReadOnlyUpgrade = getContext('openReadOnlyUpgrade') || (() => {});

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement,
			{ clubInfinite: licenseEntitlementStore.isInfiniteClub }
		)
	);

	function clickCreate() {
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		onCreateTeam();
	}

	function clickInvite() {
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		onInviteCoach();
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-h-full">
	<h3 class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight qa-title">
		Staff & invites
	</h3>
	<p class="tw-m-0 tw-text-sm tw-leading-relaxed qa-muted">
		Create structure, send coach invites, and monitor pending seat holds.
	</p>
	<div class="tw-flex tw-flex-col tw-gap-3">
		<button
			type="button"
			class="dir-os-btn-primary"
			class:dir-os-btn--readonly={isReadOnly}
			onclick={clickCreate}
		>
			Create new team
		</button>
		<button
			type="button"
			class="dir-os-btn-primary"
			class:dir-os-btn--readonly={isReadOnly}
			onclick={clickInvite}
		>
			Invite coach
		</button>
	</div>
	<div class="tw-pt-2 tw-border-t tw-mt-1 qa-border">
		<PendingInvitesList {clubId} />
	</div>
</div>

<style>
	.qa-title  { color: var(--text-primary); }
	.qa-muted  { color: var(--text-secondary); }
	.qa-border { border-color: rgba(15, 23, 42, 0.08); }
</style>
