<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import TabBar from '$lib/components/TabBar.svelte';
	import TeamsTab from '$lib/components/director/TeamsTab.svelte';
	import BrandingTab from '$lib/components/director/BrandingTab.svelte';
	import ComplianceTab from '$lib/components/director/ComplianceTab.svelte';

	const TABS = [
		{ id: 'teams', label: 'Teams & Coaches', icon: 'ph-users' },
		{ id: 'brand', label: 'Club Branding', icon: 'ph-palette' },
		{ id: 'compliance', label: 'Compliance & Clearances', icon: 'ph-shield-check' }
	];

	let activeTab = $state('teams');

	const clubId = $derived(authStore.userProfile?.clubId || authStore.userProfile?.teamId || '');
</script>

<div class="view-section">
	<h2 class="view-title">👔 Director Portal</h2>

	<TabBar tabs={TABS} bind:activeTab variant="director" />

	<div class="tab-content">
		{#if activeTab === 'teams'}
			<TeamsTab {clubId} />
		{:else if activeTab === 'brand'}
			<BrandingTab {clubId} />
		{:else if activeTab === 'compliance'}
			<ComplianceTab {clubId} />
		{/if}
	</div>
</div>

<style>
	.tab-content { margin-top: clamp(12px, 2vw, 20px); }
</style>
