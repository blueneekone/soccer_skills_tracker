<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import DirectorCommandCenter from '$lib/components/director/os/DirectorCommandCenter.svelte';
	import FieldOpsModule from '$lib/components/director/os/FieldOpsModule.svelte';
	import TeamsTab from '$lib/components/director/TeamsTab.svelte';
	import BrandingTab from '$lib/components/director/BrandingTab.svelte';
	import ComplianceTab from '$lib/components/director/ComplianceTab.svelte';
	import UplinkTerminal from './dashboard/UplinkTerminal.svelte';
	import IntakePanopticon from './dashboard/IntakePanopticon.svelte';
	import VpcApprovalQueue from '$lib/components/director/os/VpcApprovalQueue.svelte';
	import RegistrarInviteTab from '$lib/components/director/RegistrarInviteTab.svelte';
	import TransferPortal from '$lib/components/player/TransferPortal.svelte';
	import PlaybookTab from '$lib/components/director/PlaybookTab.svelte';
	import LicensesTab from '$lib/components/director/LicensesTab.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import MissionControl from '$lib/components/director/MissionControl.svelte';
	import DirectorClubBroadcastComposer from '$lib/components/director/DirectorClubBroadcastComposer.svelte';
	import DirectorCommsCompliancePanel from '$lib/components/director/DirectorCommsCompliancePanel.svelte';
	import DirectorRetentionReport from '$lib/components/compliance/DirectorRetentionReport.svelte';
	import WeatherAlert from '$lib/components/weather/WeatherAlert.svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	const VALID_DIR_TABS = new Set([
		'home', 'teams', 'field', 'comms', 'registrars', 'brand', 'playbook', 'licenses', 'compliance', 'household',
		'vanguard',   // EPIC 4 — Director Mission Control
		'retention',  // EPIC 6 — PII Burn Protocol compliance dashboard
	]);

/** Effective tenant for Firestore; dynamically syncs with Context Switcher */
	let clubId = $state('');

	$effect(() => {
		if (!teamsStore.loaded || teamsStore.clubs.length === 0) return;

		const prof = authStore.userProfile;
		const activeCtx = workspaceContextStore.activeClubId?.trim();
		const rawProfileId = typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';

		let targetId = '';

		// Priority 1: Did the user click a club in the Context Switcher?
		if (activeCtx && teamsStore.clubs.some(c => c.id === activeCtx)) {
			targetId = activeCtx;
		} 
		// Priority 2: Are they hard-assigned to a club in their user profile?
		else if (rawProfileId && rawProfileId !== 'admin') {
			targetId = rawProfileId;
		} 
		// Priority 3: Fallback to the first available club
		else {
			targetId = teamsStore.clubs[0].id;
		}

		// Sync local state for the UI
		if (clubId !== targetId) clubId = targetId;
		
		// Force sync to global store so the Context Switcher highlights the correct club
		if (workspaceContextStore.activeClubId !== targetId) {
			workspaceContextStore.setActiveClubId(targetId);
		}
	});

	let activeTab = $state(page.url.searchParams.get('tab') || 'home');

	const clubTeams = $derived(
		teamsStore.teams
			.filter((t) => t.clubId === clubId)
			.map((t) => ({ id: t.id, name: t.name }))
	);

	const clubLabel = $derived(
		teamsStore.clubs.find((c) => c.id === clubId)?.name || clubId,
	);

	$effect(() => {
		const t = page.url.searchParams.get('tab') || 'home';
		if (!VALID_DIR_TABS.has(t)) return;
		if (untrack(() => activeTab) !== t) activeTab = t;
	});

	// Force teamsStore to reload whenever the Context Switcher pivots to a
	// different tenant so team dropdowns never show stale data from the
	// layout-level cache key.
	$effect(() => {
		if (!clubId) return;
		const role = authStore.role;
		if (role !== 'director' && role !== 'registrar') return;
		untrack(() => {
			void teamsStore.load(role, {
				clubId,
				scope: 'club',
				routePath: page.url.pathname,
			});
		});
	});
</script>

<!-- AEGIS Lightning Alert — directors and above only -->
<WeatherAlert />

<div class="director-console-page">
	<!-- Page identity row — sits directly inside ec-canvas (no subnav above it) -->
	<div class="director-console-page__header">
		{#if clubId}
			<ClubLogoMark size="md" />
		{/if}
		<h2 class="director-console-page__title">Director Portal</h2>
	</div>

	<!-- Z4 mobile tab rail -->
	<div class="director-z4-tab-rail" role="navigation" aria-label="Director sections">
		{#each [
			{ label: 'Home',     icon: 'nav.home' as IconName,            tab: 'home' },
			{ label: 'Roster',   icon: 'user.group' as IconName,          tab: 'teams' },
			{ label: 'Field',    icon: 'sys.map-pin' as IconName,         tab: 'field' },
			{ label: 'Comply',   icon: 'status.shield-check' as IconName, tab: 'compliance' },
			{ label: 'Families', icon: 'nav.home' as IconName,            tab: 'household' },
		] as item (item.tab)}
			<a
				href="/director?tab={item.tab}"
				class="director-z4-tab-rail__link"
				class:director-z4-tab-rail__link--active={activeTab === item.tab}
			>
				<Icon name={item.icon} size={18} />
				{item.label}
			</a>
		{/each}
	</div>

	{#if activeTab === 'home'}
		<section class="director-console-page__section">
			<DirectorCommandCenter {clubId} />
		</section>
	{:else if activeTab === 'field'}
		<section class="director-console-page__section director-console-page__section--full">
			<FieldOpsModule {clubId} />
		</section>
	{:else if activeTab === 'comms'}
		<section class="director-console-page__section">
			<DirectorClubBroadcastComposer {clubId} clubName={clubLabel} teams={clubTeams} />
			<DirectorCommsCompliancePanel {clubId} teams={clubTeams} />
		</section>
	{:else}
		<section class="director-console-page__section">
			{#if activeTab === 'teams'}
				<TeamsTab {clubId} />
			{:else if activeTab === 'registrars'}
				<RegistrarInviteTab {clubId} />
				<section class="director-console-page__section tw-mt-6" aria-label="Player transfer intake">
					<TransferPortal role="director" />
				</section>
			{:else if activeTab === 'brand'}
				<BrandingTab {clubId} />
			{:else if activeTab === 'playbook'}
				<PlaybookTab {clubId} />
			{:else if activeTab === 'licenses'}
				<LicensesTab {clubId} />
			{:else if activeTab === 'compliance'}
				<ComplianceTab {clubId} />
	{:else if activeTab === 'household'}
		<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
			<UplinkTerminal currentClubId={clubId} {clubTeams} />
			<IntakePanopticon currentClubId={clubId} />
			<VpcApprovalQueue {clubId} />
		</div>
		{:else if activeTab === 'vanguard'}
			<MissionControl />
		{:else if activeTab === 'retention'}
			<DirectorRetentionReport />
		{:else}
			<p class="director-console-fallback">Unknown section. Use the sidebar to navigate.</p>
		{/if}
		</section>
	{/if}
</div>
