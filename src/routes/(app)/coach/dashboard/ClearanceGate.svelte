<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import CheckrEmbed from '$lib/components/compliance/CheckrEmbed.svelte';
	import type { DashboardEngine } from './DashboardEngine.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let { engine }: { engine: DashboardEngine } = $props();
</script>

<div class="clearance-gate" aria-live="assertive" role="alert">
	<!-- Ambient threat grid -->
	<div class="clearance-gate__grid" aria-hidden="true"></div>

	<!-- Pulsing shield icon -->
	<div class="clearance-gate__shield" aria-hidden="true">
		<Icon name={"status.shield-alert" as IconName} size={48} style="color: var(--vanguard-red);" />
	</div>

	<!-- Status text -->
	<div class="clearance-gate__status">CLEARANCE {engine.clearanceStep.replace('_', ' ').toUpperCase()}</div>
	<h1 class="clearance-gate__title">ACCESS RESTRICTED</h1>
	
	<div class="tw-w-full tw-max-w-2xl tw-mx-auto tw-mt-8">
		{#if engine.clearanceStep === 'not_started'}
			<CheckrEmbed context={engine.clearanceContext} mode="invitation" />
		{:else}
			<CheckrEmbed context={engine.clearanceContext} mode="reports" />
		{/if}
	</div>

	<!-- Diagnostic strip -->
	<div class="clearance-gate__diag tw-mt-8">
		<span>UID: {authStore.user?.uid?.slice(0, 12) ?? '—'}…</span>
		<span>CLUB: {authStore.tenantId || '—'}</span>
		<span>STATUS: BGC PENDING</span>
	</div>

	<!-- Contact CTA -->
	<a
		href="mailto:compliance@vanguard.app?subject=BGC%20Clearance%20Inquiry&body=UID%3A%20{authStore.user?.uid ?? ''}"
		class="clearance-gate__contact"
	>
		[ CONTACT COMPLIANCE OFFICER ]
	</a>
</div>
