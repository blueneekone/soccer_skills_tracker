<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import AnnouncementsInbox from '$lib/components/comms/AnnouncementsInbox.svelte';
	import ParentAnnouncementCompose from '$lib/components/coach/ParentAnnouncementCompose.svelte';
	import ParentLoungePanel from '$lib/components/comms/ParentLoungePanel.svelte';
	import HouseholdThreadPanel from '$lib/components/comms/HouseholdThreadPanel.svelte';
	import CommsOutbox from '$lib/components/comms/CommsOutbox.svelte';
	import CommsLogisticsChannel from '$lib/components/comms/CommsLogisticsChannel.svelte';
	import CommsRegistrationChannel from '$lib/components/comms/CommsRegistrationChannel.svelte';
	import CommsTryoutsEventsChannel from '$lib/components/comms/CommsTryoutsEventsChannel.svelte';
	import CommsMatchDayChannel from '$lib/components/comms/CommsMatchDayChannel.svelte';
	import CommsClubWideChannel from '$lib/components/comms/CommsClubWideChannel.svelte';
	import CommsEmergencyChannel from '$lib/components/comms/CommsEmergencyChannel.svelte';
	import CommsComplianceChannel from '$lib/components/comms/CommsComplianceChannel.svelte';
	import CommsStaffInternalChannel from '$lib/components/comms/CommsStaffInternalChannel.svelte';
	import ReportMessageIncident from '$lib/components/comms/ReportMessageIncident.svelte';
	import {
		COMMS_CHANNEL_TYPE_REGISTRY,
		canPersonaReadChannel,
		canPersonaPostChannel,
		type CommsChannelTypeId,
	} from '$lib/comms/channelTypes.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import type { Snippet } from 'svelte';

	export type CommsChannelId =
		| CommsChannelTypeId
		| 'outbox'
		| 'direct_mail';

	let {
		parentLounges = [],
		parentLoungeLoading = false,
		dmItems = [],
		dmLoading = false,
		dmKind = 'staff',
		directMailSnippet,
	}: {
		parentLounges?: Array<{ clubId: string; teamId: string }>;
		parentLoungeLoading?: boolean;
		dmLoading?: boolean;
		dmItems?: Array<Record<string, unknown> & { id: string }>;
		dmKind?: string;
		directMailSnippet?: Snippet;
	} = $props();

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const householdId = $derived(profile?.householdId ? String(profile.householdId) : '');
	const clubId = $derived(profile?.clubId ? String(profile.clubId) : '');
	const teamId = $derived(profile?.teamId ? String(profile.teamId) : '');
	const teamClubId = $derived(clubId);
	const teamName = $derived(teamId);

	const isStaff = $derived(
		role === 'coach' ||
			role === 'director' ||
			role === 'registrar' ||
			role === 'team_manager',
	);
	const showHousehold = $derived(
		(role === 'parent' || role === 'player') && Boolean(householdId),
	);
	const showParentLounge = $derived(role === 'parent' && parentLounges.length > 0);
	const showDirectMail = $derived(
		role === 'coach' || role === 'player' || role === 'director',
	);
	const showOutbox = $derived(isStaff);
	const showCompose = $derived(
		(role === 'coach' || role === 'director') && teamId && teamId !== 'admin',
	);
	const showTeamLogistics = $derived(canPersonaReadChannel('team_logistics', role));
	const showRegistration = $derived(canPersonaReadChannel('registration', role));
	const showTryouts = $derived(canPersonaReadChannel('tryouts_events', role));
	const showMatchDay = $derived(canPersonaReadChannel('match_day', role));
	const showClubWide = $derived(canPersonaReadChannel('club_wide', role));
	const showEmergency = $derived(canPersonaPostChannel('emergency', role));
	const showCompliance = $derived(
		canPersonaReadChannel('compliance', role) &&
			(role === 'director' ||
				role === 'registrar' ||
				role === 'admin' ||
				(role === 'parent' && Boolean(householdId))),
	);
	const showStaffInternal = $derived(canPersonaReadChannel('staff_internal', role));
	const deepLinkClubId = $derived(page.url.searchParams.get('clubId') || clubId || '');
	const hubClubId = $derived(deepLinkClubId);
	const hubClubName = $derived(
		teamsStore.clubs.find((c) => c.id === hubClubId)?.name || hubClubId,
	);
	const hubClubTeams = $derived(
		teamsStore.teams
			.filter((t) => t.clubId === hubClubId)
			.map((t) => ({ id: t.id, name: t.name })),
	);

	const channels = $derived(
		(() => {
			/** @type {Array<{ id: CommsChannelId, label: string }>} */
			const list = [{ id: 'announcements' as CommsChannelId, label: 'Announcements' }];
			if (showTeamLogistics) {
				list.push({
					id: 'team_logistics',
					label: COMMS_CHANNEL_TYPE_REGISTRY.team_logistics.label,
				});
			}
			if (showRegistration) {
				list.push({
					id: 'registration',
					label: COMMS_CHANNEL_TYPE_REGISTRY.registration.label,
				});
			}
			if (showTryouts) {
				list.push({
					id: 'tryouts_events',
					label: COMMS_CHANNEL_TYPE_REGISTRY.tryouts_events.label,
				});
			}
			if (showMatchDay) {
				list.push({
					id: 'match_day',
					label: COMMS_CHANNEL_TYPE_REGISTRY.match_day.label,
				});
			}
			if (showClubWide) {
				list.push({
					id: 'club_wide',
					label: COMMS_CHANNEL_TYPE_REGISTRY.club_wide.label,
				});
			}
			if (showEmergency) {
				list.push({
					id: 'emergency',
					label: COMMS_CHANNEL_TYPE_REGISTRY.emergency.label,
				});
			}
			if (showCompliance) {
				list.push({
					id: 'compliance',
					label: COMMS_CHANNEL_TYPE_REGISTRY.compliance.label,
				});
			}
			if (showStaffInternal) {
				list.push({
					id: 'staff_internal',
					label: COMMS_CHANNEL_TYPE_REGISTRY.staff_internal.label,
				});
			}
			if (showParentLounge || role === 'parent') {
				list.push({ id: 'parent_lounge', label: 'Parent Lounge' });
			}
			if (showHousehold) {
				list.push({ id: 'household', label: 'Household' });
			}
			if (showDirectMail && dmKind !== 'parent_cc') {
				list.push({ id: 'direct_mail', label: 'Direct mail' });
			}
			if (showOutbox) {
				list.push({ id: 'outbox', label: 'Outbox' });
			}
			return list;
		})(),
	);

	const activeChannel = $derived.by(() => {
		const param = page.url.searchParams.get('channel') as CommsChannelId | null;
		if (param && channels.some((c) => c.id === param)) return param;
		return channels[0]?.id ?? 'announcements';
	});

	const deepLinkTeamId = $derived(page.url.searchParams.get('teamId') || teamId || '');
	const deepLinkProgramId = $derived(page.url.searchParams.get('programId') || '');
	const logisticsSub = $derived(page.url.searchParams.get('sub') || 'game-day');

	let mobilePickerOpen = $state(false);

	function selectChannel(id: CommsChannelId) {
		mobilePickerOpen = false;
		const url = new URL(page.url);
		url.searchParams.set('channel', id);
		if ((id === 'announcements' || id === 'team_logistics' || id === 'match_day') && deepLinkTeamId) {
			url.searchParams.set('teamId', deepLinkTeamId);
		}
		if (id === 'team_logistics' && logisticsSub) {
			url.searchParams.set('sub', logisticsSub);
		}
		if (id === 'tryouts_events' && deepLinkProgramId) {
			url.searchParams.set('programId', deepLinkProgramId);
		}
		if (id === 'club_wide' && hubClubId) {
			url.searchParams.set('clubId', hubClubId);
		}
		if (id === 'emergency' && hubClubId) {
			url.searchParams.set('clubId', hubClubId);
		}
		if (id === 'compliance' && hubClubId) {
			url.searchParams.set('clubId', hubClubId);
		}
		if (id === 'staff_internal' && deepLinkTeamId) {
			url.searchParams.set('teamId', deepLinkTeamId);
		}
		void goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true });
	}

	function formatDate(ts: unknown) {
		const t = ts as { toDate?: () => Date } | undefined;
		if (t && typeof t.toDate === 'function') return t.toDate().toLocaleString();
		return '—';
	}
</script>

<div class="comms-hub-shell">
	<nav class="comms-hub-shell__rail" aria-label="Comms channels">
		{#each channels as ch (ch.id)}
			<button
				type="button"
				class="comms-hub-shell__rail-btn"
				class:comms-hub-shell__rail-btn--active={activeChannel === ch.id}
				aria-current={activeChannel === ch.id ? 'page' : undefined}
				onclick={() => selectChannel(ch.id)}
			>
				{ch.label}
			</button>
		{/each}
	</nav>

	{#if browser}
		<div class="comms-hub-shell__mobile-picker">
			<button
				type="button"
				class="comms-hub-shell__mobile-trigger"
				aria-expanded={mobilePickerOpen}
				onclick={() => (mobilePickerOpen = !mobilePickerOpen)}
			>
				{channels.find((c) => c.id === activeChannel)?.label ?? 'Channel'}
			</button>
			{#if mobilePickerOpen}
				<ul class="comms-hub-shell__mobile-menu" role="listbox">
					{#each channels as ch (ch.id)}
						<li role="option" aria-selected={activeChannel === ch.id}>
							<button type="button" onclick={() => selectChannel(ch.id)}>{ch.label}</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<main class="comms-hub-shell__main">
		{#if activeChannel === 'announcements'}
			{#if showCompose}
				<ParentAnnouncementCompose
					teamId={deepLinkTeamId}
					clubId={teamClubId}
					teamName={teamName}
				/>
			{/if}
			<AnnouncementsInbox />
		{:else if activeChannel === 'team_logistics' && showTeamLogistics}
			<CommsLogisticsChannel teamId={deepLinkTeamId} clubId={teamClubId} />
		{:else if activeChannel === 'registration' && showRegistration}
			<CommsRegistrationChannel clubId={teamClubId} {householdId} />
		{:else if activeChannel === 'tryouts_events' && showTryouts}
			<CommsTryoutsEventsChannel
				clubId={teamClubId}
				programId={deepLinkProgramId}
				{householdId}
			/>
		{:else if activeChannel === 'match_day' && showMatchDay}
			<CommsMatchDayChannel clubId={teamClubId} teamId={deepLinkTeamId} />
		{:else if activeChannel === 'club_wide' && showClubWide}
			<CommsClubWideChannel
				clubId={hubClubId}
				clubName={hubClubName}
				teams={hubClubTeams}
			/>
		{:else if activeChannel === 'emergency' && showEmergency}
			<CommsEmergencyChannel
				clubId={hubClubId}
				clubName={hubClubName}
				teams={hubClubTeams}
			/>
		{:else if activeChannel === 'compliance' && showCompliance}
			<CommsComplianceChannel clubId={hubClubId} />
		{:else if activeChannel === 'staff_internal' && showStaffInternal}
			<CommsStaffInternalChannel
				clubId={teamClubId || hubClubId}
				teamId={deepLinkTeamId}
				teamName={teamName}
			/>
		{:else if activeChannel === 'parent_lounge'}
			{#if role === 'parent'}
				{#if parentLoungeLoading}
					<p class="comms-hub-muted">Loading lounges…</p>
				{:else if parentLounges.length === 0}
					<p class="comms-hub-muted">
						No team lounges yet — your coach will provision one once your child's team is active.
					</p>
				{:else}
					{#each parentLounges as lounge (`${lounge.clubId}:${lounge.teamId}`)}
						<ParentLoungePanel clubId={lounge.clubId} teamId={lounge.teamId} />
					{/each}
				{/if}
			{:else}
				<p class="comms-hub-muted">Parent Lounge is available to guardians on linked teams.</p>
			{/if}
		{:else if activeChannel === 'household' && showHousehold}
			<HouseholdThreadPanel {householdId} />
		{:else if activeChannel === 'outbox' && showOutbox}
			<CommsOutbox />
		{:else if activeChannel === 'direct_mail' && showDirectMail}
			<section class="comms-hub-z3-inbox" aria-labelledby="comms-dm-heading">
				<header class="comms-hub-z3-inbox__head">
					<h2 id="comms-dm-heading" class="comms-hub-z3-inbox__title">Direct mail</h2>
				</header>
				<div class="comms-hub-z3-inbox__body">
					{#if directMailSnippet}
						{@render directMailSnippet()}
					{:else if dmLoading}
						<p class="comms-hub-muted">Loading…</p>
					{:else if dmItems.length === 0}
						<p class="comms-hub-muted">No direct messages yet.</p>
					{:else}
						<p class="comms-hub-hint">
							{#if dmKind === 'player'}
								Messages from your coaching staff appear here.
							{:else if dmKind === 'director'}
								Club-wide staff → athlete messages (read-only oversight).
							{:else}
								Adult athlete direct mail you sent from Coach tools.
							{/if}
						</p>
						<ul class="comms-hub-z2-msg-list">
							{#each dmItems as m (m.id)}
								<li class="comms-hub-z2-msg-card">
									<div class="comms-hub-msg-meta">
										<span class="comms-hub-msg-date">{formatDate(m.createdAt)}</span>
									</div>
									<div class="comms-hub-msg-parties">
										<span class="comms-hub-lbl">From</span> {String(m.fromEmail ?? '—')}
										<br />
										<span class="comms-hub-lbl">To</span>
										{String(m.toPlayerName ?? '—')}
									</div>
									<p class="comms-hub-msg-text">{String(m.body ?? '')}</p>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>
		{/if}

		{#if (clubId || parentLounges[0]?.clubId) && role !== 'super_admin' && role !== 'global_admin'}
			<ReportMessageIncident
				clubId={clubId || parentLounges[0]?.clubId || ''}
				teamId={teamId || parentLounges[0]?.teamId || ''}
				messageKind="other"
			/>
		{/if}
	</main>
</div>

<style>
	.comms-hub-shell {
		display: grid;
		grid-template-columns: minmax(9rem, 11rem) minmax(0, 1fr);
		gap: 16px;
		min-width: 0;
		align-items: start;
	}

	.comms-hub-shell__rail {
		display: flex;
		flex-direction: column;
		gap: 6px;
		position: sticky;
		top: 0;
	}

	.comms-hub-shell__rail-btn {
		text-align: left;
		padding: 10px 12px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.5);
		color: #94a3b8;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.comms-hub-shell__rail-btn--active {
		border-color: #14b8a6;
		color: #e2e8f0;
		background: rgba(20, 184, 166, 0.12);
	}

	.comms-hub-shell__mobile-picker {
		display: none;
	}

	.comms-hub-shell__main {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	@media (max-width: 640px) {
		.comms-hub-shell {
			grid-template-columns: 1fr;
		}

		.comms-hub-shell__rail {
			display: none;
		}

		.comms-hub-shell__mobile-picker {
			display: block;
			position: relative;
		}

		.comms-hub-shell__mobile-trigger {
			width: 100%;
			padding: 12px 14px;
			border: 1px solid #334155;
			background: #0f172a;
			color: #e2e8f0;
			font-weight: 700;
			text-align: left;
		}

		.comms-hub-shell__mobile-menu {
			position: absolute;
			z-index: 20;
			top: 100%;
			left: 0;
			right: 0;
			margin: 4px 0 0;
			padding: 4px;
			list-style: none;
			border: 1px solid #334155;
			background: #0f172a;
		}

		.comms-hub-shell__mobile-menu button {
			width: 100%;
			padding: 10px 12px;
			text-align: left;
			border: none;
			background: transparent;
			color: #e2e8f0;
			font-size: 13px;
		}
	}
</style>
