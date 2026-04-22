<script>
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import DirectorCommandCenter from '$lib/components/director/os/DirectorCommandCenter.svelte';
	import FieldOpsModule from '$lib/components/director/os/FieldOpsModule.svelte';
	import TeamsTab from '$lib/components/director/TeamsTab.svelte';
	import BrandingTab from '$lib/components/director/BrandingTab.svelte';
	import ComplianceTab from '$lib/components/director/ComplianceTab.svelte';
	import HouseholdComplianceTab from '$lib/components/director/HouseholdComplianceTab.svelte';
	import RegistrarInviteTab from '$lib/components/director/RegistrarInviteTab.svelte';
	import PlaybookTab from '$lib/components/director/PlaybookTab.svelte';
	import LicensesTab from '$lib/components/director/LicensesTab.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	const VALID_DIR_TABS = new Set([
		'home', 'teams', 'field', 'registrars', 'brand', 'playbook', 'licenses', 'compliance', 'household',
	]);

	/** Effective tenant for Firestore; super_admin uses QA scope (active club or first org). */
	const clubId = $derived.by(() => {
		const role = authStore.role;
		const prof = authStore.userProfile;
		const raw = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';
		if (raw && raw !== 'admin') return raw;
		if (role === 'super_admin' || role === 'global_admin') {
			const a = workspaceContextStore.activeClubId?.trim();
			if (a) return a;
			const first = teamsStore.clubs[0]?.id;
			if (first) return first;
		}
		return '';
	});

	let activeTab = $state(page.url.searchParams.get('tab') || 'home');

	$effect(() => {
		const t = page.url.searchParams.get('tab') || 'home';
		if (!VALID_DIR_TABS.has(t)) return;
		if (untrack(() => activeTab) !== t) activeTab = t;
	});
</script>

<div class="director-console-page">
	<!-- Page identity row — sits directly inside ec-canvas (no subnav above it) -->
	<div class="director-console-page__header">
		{#if clubId}
			<ClubLogoMark size="md" />
		{/if}
		<h2 class="director-console-page__title">Director Portal</h2>
	</div>

	{#if activeTab === 'home'}
		<section class="director-console-page__section">
			<DirectorCommandCenter {clubId} />
		</section>
	{:else if activeTab === 'field'}
		<section class="director-console-page__section director-console-page__section--full">
			<FieldOpsModule {clubId} />
		</section>
	{:else}
		<section class="director-console-page__section">
			{#if activeTab === 'teams'}
				<TeamsTab {clubId} />
			{:else if activeTab === 'registrars'}
				<RegistrarInviteTab {clubId} />
			{:else if activeTab === 'brand'}
				<BrandingTab {clubId} />
			{:else if activeTab === 'playbook'}
				<PlaybookTab {clubId} />
			{:else if activeTab === 'licenses'}
				<LicensesTab {clubId} />
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

	/* Field Ops gets the full canvas width with no extra wrappers */
	.director-console-page__section--full {
		width: 100%;
		box-sizing: border-box;
	}

	.director-console-fallback {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}
</style>
