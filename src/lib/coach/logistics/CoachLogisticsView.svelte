<script lang="ts">
	import { dev } from '$app/environment';
	import CoachTeamSchedulePanel from '$lib/coach/logistics/CoachTeamSchedulePanel.svelte';
	import CoachTeamRosterPanel from '$lib/coach/logistics/CoachTeamRosterPanel.svelte';
	import CoachTeamAttendancePanel from '$lib/coach/logistics/CoachTeamAttendancePanel.svelte';
	import CoachTeamCommsPanel from '$lib/coach/logistics/CoachTeamCommsPanel.svelte';
	import CoachTeamMatchesPanel from '$lib/coach/logistics/CoachTeamMatchesPanel.svelte';
	import { page } from '$app/state';
	import { teamsStore, resolveTeamsLoadScope } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getActiveDb } from '$lib/firebase.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';

	const teamScope = new CoachTeamScope({ preferProfileTeam: true });

	$effect(() => {
		const db = getActiveDb();
		if (!db || !authStore.isAuthenticated) return;
		teamScope.syncSelectedTeam();
	});

	$effect(() => {
		if (!authStore.isAuthenticated || authStore.isLoading) return;
		const coachEmail = authStore.user?.email || authStore.userProfile?.email;
		if (coachEmail) {
			const scope = resolveTeamsLoadScope(page.url.pathname, authStore.role);
			void teamsStore.load(authStore.role, {
				clubId: authStore.userProfile?.clubId,
				coachEmail,
				scope,
				routePath: page.url.pathname,
			});
		}
	});

	// Override selected team when ?teamId= is present in URL
	const teamIdFromUrl = $derived(page.url.searchParams.get('teamId'));
	$effect(() => {
		const urlTeam = teamIdFromUrl?.trim();
		if (!urlTeam) return;
		if (teamScope.myTeams.some((t) => t.id === urlTeam)) {
			if (teamScope.selectedTeamId !== urlTeam) teamScope.selectedTeamId = urlTeam;
		}
	});

	const myTeams = $derived(teamScope.myTeams);
	const currentTeam = $derived(teamScope.currentTeam);
	const teamClubId = $derived(teamScope.teamClubId);
	const teamLabel = $derived(teamScope.teamLabel);

	type TabId = 'comms' | 'schedule' | 'roster' | 'attendance' | 'matches';
	let activeTab = $state<TabId>('comms');

	const tabs: { id: TabId; label: string; icon: string; accent: string }[] = [
		{ id: 'comms',      label: 'COMMS',         icon: '💬', accent: '#14b8a6' },
		{ id: 'schedule',   label: 'SCHEDULE',       icon: '📅', accent: '#14b8a6' },
		{ id: 'roster',     label: 'ROSTER',         icon: '📋', accent: '#daff0a' },
		{ id: 'attendance', label: 'ATTENDANCE',     icon: '✅', accent: '#14b8a6' },
		{ id: 'matches',    label: 'MATCH REVIEWS',  icon: '⚽', accent: '#fbbf24' },
	];

	const tabFromUrl = $derived(page.url.searchParams.get('tab'));
	$effect(() => {
		if (tabFromUrl && tabs.some((t) => t.id === tabFromUrl)) {
			activeTab = tabFromUrl as TabId;
		}
	});

	const activeTabMeta = $derived(tabs.find((t) => t.id === activeTab) ?? tabs[0]);
</script>

<div class="team-ops-root">
	<!-- Ambient Background Grid -->
	<div
		class="tw-pointer-events-none tw-fixed tw-inset-0 tw-z-0 tw-opacity-[0.04]"
		style="background-image: linear-gradient(#14b8a6 1px, transparent 1px), linear-gradient(90deg, #14b8a6 1px, transparent 1px); background-size: 40px 40px;"
		aria-hidden="true"
	></div>

	<!-- ── COMMAND HUD HEADER ─────────────────────────────────────────────── -->
	<header class="team-ops-header tw-relative tw-z-10">
		<!-- Left: Identity & Status Beacon -->
		<div class="team-ops-header__identity">
			<div class="team-ops-header__beacon" aria-hidden="true">
				<span class="team-ops-header__beacon-pulse"></span>
			</div>
			<div>
				<div class="tw-flex tw-items-center tw-gap-2.5 tw-flex-wrap">
					<span class="tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.25em] tw-text-[#14b8a6]">
						● TEAM OPS COMMAND
					</span>
					{#if dev}
						<span class="tw-font-mono tw-text-[9px] tw-text-slate-600 tw-border tw-border-slate-800 tw-px-1.5 tw-py-0.5">
							Epic 4.7
						</span>
					{/if}
				</div>
				<h1 class="team-ops-header__title">TEAM OPS</h1>
				<p class="team-ops-header__sub">
					Coach-delegated logistics — schedule, roster, attendance, and parent-targeted comms
				</p>
			</div>
		</div>

		<!-- Right: Mission Metrics + Team Selector -->
		<div class="team-ops-header__controls">
			<!-- Live Mission Metrics Strip -->
			<div class="team-ops-metrics-strip">
				<div class="team-ops-metric">
					<span class="team-ops-metric__label">ATHLETES</span>
					<span class="team-ops-metric__value">{myTeams.length > 0 ? '—' : '0'}</span>
				</div>
				<div class="team-ops-metric team-ops-metric--divider"></div>
				<div class="team-ops-metric">
					<span class="team-ops-metric__label">SQUAD STATUS</span>
					<span class="team-ops-metric__value tw-text-[#14b8a6]">LIVE</span>
				</div>
			</div>

			<!-- Team Selector -->
			{#if myTeams.length > 1}
				<div class="team-ops-selector-wrap">
					<label class="team-ops-selector-label" for="team-ops-team-select">ACTIVE SQUAD</label>
					<select
						id="team-ops-team-select"
						class="team-ops-selector"
						bind:value={teamScope.selectedTeamId}
					>
						{#each myTeams as team (team.id)}
							<option value={team.id}>{team.name || team.id}</option>
						{/each}
					</select>
				</div>
			{:else if currentTeam}
				<div class="team-ops-squad-badge">
					<span class="tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-500">SQUAD</span>
					<span class="tw-font-mono tw-text-sm tw-font-black tw-text-white tw-truncate">{teamLabel}</span>
				</div>
			{/if}
		</div>
	</header>

	<!-- ── STATES: Loading / Empty / Main ──────────────────────────────────── -->
	{#if !teamsStore.loaded}
		<div class="team-ops-state">
			<div class="tw-flex tw-items-center tw-gap-3">
				<span class="tw-inline-block tw-w-2 tw-h-2 tw-rounded-full tw-bg-[#14b8a6] tw-animate-ping"></span>
				<span class="tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-tracking-widest">
					Syncing squad data…
				</span>
			</div>
		</div>
	{:else if myTeams.length === 0}
		<div class="team-ops-state">
			<div class="tw-text-center">
				<span class="tw-text-3xl tw-mb-4 tw-block">🔒</span>
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-1">
					No Squad Assigned
				</p>
				<p class="tw-text-[11px] tw-text-slate-600">
					Contact your director to link a roster to this account.
				</p>
			</div>
		</div>
	{:else}
		<!-- ── SEGMENTED COMMAND RAIL (Navigation) ─────────────────────────── -->
		<nav class="team-ops-rail" aria-label="Team Ops command sections">
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					id="team-ops-tab-{tab.id}"
					class="team-ops-rail__tab"
					class:active={activeTab === tab.id}
					style:--tab-accent={tab.accent}
					aria-current={activeTab === tab.id ? 'page' : undefined}
					onclick={() => (activeTab = tab.id)}
				>
					<span class="team-ops-rail__icon">{tab.icon}</span>
					<span>{tab.label}</span>
				</button>
			{/each}
		</nav>

		<!-- ── PANEL CONTENT SURFACE ────────────────────────────────────────── -->
		<div class="team-ops-panel">
			<!-- Panel Header Strip -->
			<div class="team-ops-panel__header">
				<div class="tw-flex tw-items-center tw-gap-2.5">
					<span
						class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full"
						style="background: {activeTabMeta.accent}; box-shadow: 0 0 8px {activeTabMeta.accent}80;"
					></span>
					<span class="tw-font-mono tw-text-[11px] tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-white">
						{activeTabMeta.icon} {activeTabMeta.label}
					</span>
				</div>
				<span class="tw-font-mono tw-text-[10px] tw-text-slate-500 tw-uppercase tw-tracking-wider">
					{teamLabel}
				</span>
			</div>

			<!-- Panel Body -->
			<div class="team-ops-panel__body">
				{#if activeTab === 'comms'}
					<CoachTeamCommsPanel
						teamId={teamScope.selectedTeamId}
						clubId={teamClubId}
						teamName={teamLabel}
					/>
				{:else if activeTab === 'schedule'}
					<CoachTeamSchedulePanel teamId={teamScope.selectedTeamId} />
				{:else if activeTab === 'roster'}
					<CoachTeamRosterPanel teamId={teamScope.selectedTeamId} />
				{:else if activeTab === 'attendance'}
					<CoachTeamAttendancePanel teamId={teamScope.selectedTeamId} />
				{:else if activeTab === 'matches'}
					<CoachTeamMatchesPanel teamId={teamScope.selectedTeamId} />
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Root Canvas ─────────────────────────────────────────────────────── */
	.team-ops-root {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: clamp(16px, 2.5vw, 24px);
		min-width: 0;
		min-height: 100%;
		background: #000000;
		padding: clamp(16px, 3vw, 28px);
		padding-bottom: calc(clamp(16px, 3vw, 28px) + 84px + env(safe-area-inset-bottom, 0px));
	}

	/* ── Command HUD Header ───────────────────────────────────────────────── */
	.team-ops-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: clamp(16px, 3vw, 24px);
		background: linear-gradient(135deg, rgba(20, 184, 166, 0.06) 0%, rgba(15, 23, 42, 0.9) 50%, rgba(218, 255, 10, 0.03) 100%);
		border: 1px solid #334155;
		padding: clamp(16px, 2.5vw, 24px);
	}

	.team-ops-header__identity {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		min-width: 0;
		flex: 1;
	}

	.team-ops-header__beacon {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.3);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.team-ops-header__beacon-pulse {
		display: block;
		width: 10px;
		height: 10px;
		background: #14b8a6;
		border-radius: 50%;
		box-shadow: 0 0 12px rgba(20, 184, 166, 0.7);
		animation: ops-pulse 2s ease-in-out infinite;
	}

	@keyframes ops-pulse {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.25); opacity: 0.7; }
	}

	.team-ops-header__title {
		margin: 4px 0 2px;
		font-family: 'Geist Mono', monospace;
		font-size: clamp(22px, 4vw, 32px);
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #fafafa;
		line-height: 1;
	}

	.team-ops-header__sub {
		margin: 0;
		font-family: 'Switzer', sans-serif;
		font-size: 12px;
		color: #64748b;
		max-width: 480px;
	}

	.team-ops-header__controls {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 10px;
		flex-shrink: 0;
	}

	/* ── Mission Metrics Strip ────────────────────────────────────────────── */
	.team-ops-metrics-strip {
		display: flex;
		align-items: center;
		gap: 0;
		background: #020617;
		border: 1px solid #334155;
	}

	.team-ops-metric {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 6px 14px;
		gap: 2px;
	}

	.team-ops-metric--divider {
		width: 1px;
		height: 28px;
		background: #334155;
		padding: 0;
	}

	.team-ops-metric__label {
		font-family: 'Geist Mono', monospace;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #4b5563;
	}

	.team-ops-metric__value {
		font-family: 'Geist Mono', monospace;
		font-size: 14px;
		font-weight: 900;
		color: #fafafa;
		line-height: 1;
	}

	/* ── Team Selector ────────────────────────────────────────────────────── */
	.team-ops-selector-wrap {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.team-ops-selector-label {
		font-family: 'Geist Mono', monospace;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: #4b5563;
		text-transform: uppercase;
	}

	.team-ops-selector {
		background: #0f172a;
		border: 1px solid #334155;
		color: #e2e8f0;
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		font-weight: 700;
		padding: 7px 12px;
		cursor: pointer;
		transition: border-color 150ms ease;
		outline: none;
	}

	.team-ops-selector:focus {
		border-color: #14b8a6;
		box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.2);
	}

	.team-ops-squad-badge {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		background: #020617;
		border: 1px solid #334155;
		padding: 8px 14px;
	}

	/* ── State Panels (loading / empty) ──────────────────────────────────── */
	.team-ops-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		background: #0f172a;
		border: 1px solid #334155;
		padding: 40px;
	}

	/* ── Segmented Command Rail (Tabs) ────────────────────────────────────── */
	.team-ops-rail {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		background: #0f172a;
		border: 1px solid #334155;
	}

	.team-ops-rail__tab {
		display: flex;
		align-items: center;
		gap: 7px;
		flex: 1 0 auto;
		padding: clamp(10px, 2vw, 13px) clamp(12px, 2.5vw, 20px);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		border-right: 1px solid #1e293b;
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #4b5563;
		cursor: pointer;
		transition: all 120ms ease;
		white-space: nowrap;
	}

	.team-ops-rail__tab:last-child {
		border-right: none;
	}

	.team-ops-rail__tab:hover {
		color: #94a3b8;
		background: rgba(255, 255, 255, 0.02);
	}

	.team-ops-rail__tab.active {
		color: var(--tab-accent, #14b8a6);
		border-bottom-color: var(--tab-accent, #14b8a6);
		background: color-mix(in srgb, var(--tab-accent, #14b8a6) 6%, transparent);
	}

	.team-ops-rail__icon {
		font-size: 13px;
		line-height: 1;
	}

	/* ── Content Panel ────────────────────────────────────────────────────── */
	.team-ops-panel {
		background: #0f172a;
		border: 1px solid #334155;
		min-width: 0;
	}

	.team-ops-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px clamp(12px, 2.5vw, 20px);
		border-bottom: 1px solid #1e293b;
		background: rgba(2, 6, 23, 0.6);
	}

	.team-ops-panel__body {
		padding: clamp(16px, 3vw, 28px);
		min-width: 0;
	}
</style>
