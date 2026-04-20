<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import TabBar from '$lib/components/TabBar.svelte';
	import DirectorCommandCenter from '$lib/components/director/os/DirectorCommandCenter.svelte';
	import TeamsTab from '$lib/components/director/TeamsTab.svelte';
	import BrandingTab from '$lib/components/director/BrandingTab.svelte';
	import ComplianceTab from '$lib/components/director/ComplianceTab.svelte';
	import HouseholdComplianceTab from '$lib/components/director/HouseholdComplianceTab.svelte';
	import RegistrarInviteTab from '$lib/components/director/RegistrarInviteTab.svelte';
	import MarketingTab from '$lib/components/director/MarketingTab.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';

	const TABS = [
		{ id: 'teams', label: 'Teams & Coaches', icon: 'ph-users' },
		{ id: 'registrars', label: 'Registrars', icon: 'ph-swap' },
		{ id: 'brand', label: 'Club Branding', icon: 'ph-palette' },
		{ id: 'marketing', label: 'Marketing & Campaigns', icon: 'ph-megaphone' },
		{ id: 'compliance', label: 'Compliance & Clearances', icon: 'ph-shield-check' },
		{ id: 'household', label: 'Households & COPPA', icon: 'ph-house-line' }
	];

	let activeTab = $state('teams');

	const clubId = $derived(authStore.userProfile?.clubId || authStore.userProfile?.teamId || '');

	function navigateDirectorTab(/** @type {string} */ id) {
		if (TABS.some((t) => t.id === id)) activeTab = id;
	}
</script>

<div class="view-section locked-dashboard-view">
	<div class="dashboard-portal-title">
		{#if clubId}
			<ClubLogoMark size="lg" />
		{/if}
		<h2 class="view-title dashboard-portal-title__h">Director Portal</h2>
	</div>

	<DirectorCommandCenter {clubId} onNavigateTab={navigateDirectorTab} />

	<TabBar tabs={TABS} bind:activeTab variant="director" />

	<div class="tab-content">
		{#if activeTab === 'teams'}
			<TeamsTab {clubId} />
		{:else if activeTab === 'registrars'}
			<RegistrarInviteTab {clubId} />
		{:else if activeTab === 'brand'}
			<BrandingTab {clubId} />
		{:else if activeTab === 'marketing'}
			<MarketingTab {clubId} />
		{:else if activeTab === 'compliance'}
			<ComplianceTab {clubId} />
		{:else if activeTab === 'household'}
			<HouseholdComplianceTab {clubId} />
		{/if}
	</div>
</div>

<style>
	.dashboard-portal-title {
		display: flex;
		align-items: center;
		gap: clamp(10px, 2vw, 16px);
		flex-wrap: wrap;
		margin-bottom: clamp(8px, 1.5vw, 14px);
	}

	.dashboard-portal-title__h {
		margin: 0;
	}

	.tab-content {
		margin-top: clamp(12px, 2vw, 20px);
	}
</style>
