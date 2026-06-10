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
	import PlaybookTab from '$lib/components/director/PlaybookTab.svelte';
	import LicensesTab from '$lib/components/director/LicensesTab.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import MissionControl from '$lib/components/director/MissionControl.svelte';
	import DirectorClubBroadcastComposer from '$lib/components/director/DirectorClubBroadcastComposer.svelte';
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
		if (!clubId || authStore.role !== 'director') return;
		untrack(() => {
			void teamsStore.load(authStore.role, {
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

	<!-- Mobile-only horizontal tab strip -->
	<div class="dir-mobile-tabs">
		{#each [
			{ label: 'Home',     icon: 'nav.home' as IconName,            tab: 'home' },
			{ label: 'Roster',   icon: 'user.group' as IconName,          tab: 'teams' },
			{ label: 'Field',    icon: 'sys.map-pin' as IconName,         tab: 'field' },
			{ label: 'Comply',   icon: 'status.shield-check' as IconName, tab: 'compliance' },
			{ label: 'Families', icon: 'nav.home' as IconName,            tab: 'household' },
		] as item (item.tab)}
			<a
				href="/director?tab={item.tab}"
				class="dir-mobile-tabs__pill"
				class:dir-mobile-tabs__pill--active={activeTab === item.tab}
			>
				<Icon name={item.icon} size={18} class="dir-mobile-tabs__icon" />
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

	/* ── Mobile tab strip ─────────────────────────────────────────────────── */
	.dir-mobile-tabs {
		display: none; /* shown only on mobile via media query below */
		overflow-x: auto;
		scrollbar-width: none;
		height: 48px;
		align-items: center;
		gap: 6px;
		padding: 0 4px;
		margin-bottom: 12px;
	}

	.dir-mobile-tabs::-webkit-scrollbar {
		display: none;
	}

	.dir-mobile-tabs__pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-height: 36px;
		min-width: 36px;
		white-space: nowrap;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.5);
		font-family: monospace;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-decoration: none;
		flex-shrink: 0;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.dir-mobile-tabs__pill--active {
		background: rgba(20, 184, 166, 0.12);
		border-color: rgba(20, 184, 166, 0.4);
		color: #14b8a6;
	}

	.dir-mobile-tabs__pill :global(svg) {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	/* ── Responsive ───────────────────────────────────────────────────────── */
	@media (max-width: 767.98px) {
		.director-console-page__header {
			display: none;
		}

		.dir-mobile-tabs {
			display: flex;
		}
	}

	@media (max-width: 1023.98px) {
		.director-console-page {
			padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
		}
	}
</style>
