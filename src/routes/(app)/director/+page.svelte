<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import DirectorCommandCenter from '$lib/components/director/os/DirectorCommandCenter.svelte';
	import FieldOpsModule from '$lib/components/director/os/FieldOpsModule.svelte';
	import TeamsTab from '$lib/components/director/TeamsTab.svelte';
	import BrandingTab from '$lib/components/director/BrandingTab.svelte';
	import ComplianceTab from '$lib/components/director/ComplianceTab.svelte';
	import HouseholdComplianceTab from '$lib/components/director/HouseholdComplianceTab.svelte';
	import RegistrarInviteTab from '$lib/components/director/RegistrarInviteTab.svelte';
	import MarketingTab from '$lib/components/director/MarketingTab.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';

	const clubId = $derived(authStore.userProfile?.clubId || authStore.userProfile?.teamId || '');

	const activeTab = $derived($page.url.searchParams.get('tab') || 'home');

	function navigateDirectorTab(/** @type {string} */ id) {
		goto(`/director?tab=${encodeURIComponent(id)}`, { replaceState: true, noScroll: true });
	}
</script>

<div class="director-console-page">
	<div class="director-console-page__header">
		{#if clubId}
			<ClubLogoMark size="md" />
		{/if}
		<h2 class="director-console-page__title">Director Portal</h2>
	</div>

	{#if activeTab === 'home'}
		<section class="director-console-page__section director-console-page__section--flush">
			<DirectorCommandCenter {clubId} onNavigateTab={navigateDirectorTab} />
		</section>
	{:else if activeTab === 'field'}
		<section class="director-console-page__section">
			<div class="glass-panel director-console-panel">
				<FieldOpsModule {clubId} />
			</div>
		</section>
	{:else}
		<section class="director-console-page__section">
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
			{:else}
				<p class="director-console-fallback">Unknown section. Use the sidebar to navigate.</p>
			{/if}
		</section>
	{/if}
</div>

<style>
	.director-console-page__header {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 16px;
	}

	.director-console-page__title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	.director-console-page__section {
		margin-top: 0;
	}

	.director-console-page__section--flush {
		margin-left: -4px;
		margin-right: -4px;
	}

	.director-console-panel {
		padding: 16px;
	}

	.director-console-fallback {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}
</style>
