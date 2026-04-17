<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
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

	const isSuperAdmin = $derived(authStore.role === 'super_admin');

	// Super admins pick a club from the selector; directors use their profile clubId
	let selectedClubId = $state('');

	// Auto-select first club for super_admin once clubs are loaded
	$effect(() => {
		if (isSuperAdmin && teamsStore.loaded && teamsStore.clubs.length > 0 && !selectedClubId) {
			selectedClubId = teamsStore.clubs[0].id;
		}
	});

	const clubId = $derived(
		isSuperAdmin
			? selectedClubId
			: (authStore.userProfile?.clubId || '')
	);
</script>

<div class="view-section">
	<h2 class="view-title">👔 Director Portal</h2>

	{#if isSuperAdmin}
		<div class="card club-picker-card">
			<div class="card-header">Global Club Selector</div>
			<div class="card-body">
				<label for="dirClubSelect">Managing Club</label>
				<select id="dirClubSelect" bind:value={selectedClubId}>
					{#if teamsStore.clubs.length === 0}
						<option value="">Loading clubs...</option>
					{:else}
						{#each teamsStore.clubs as club}
							<option value={club.id}>{club.name} ({club.id})</option>
						{/each}
					{/if}
				</select>
			</div>
		</div>
	{/if}

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
	.tab-content {
		margin-top: clamp(12px, 2vw, 20px);
	}
	.club-picker-card {
		border: 2px solid var(--aggie-gold);
	}
	select {
		margin-bottom: 0;
	}
</style>
