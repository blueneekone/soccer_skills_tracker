<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import AnnouncementsInbox from '$lib/components/comms/AnnouncementsInbox.svelte';
	import ParentAnnouncementCompose from '$lib/components/coach/ParentAnnouncementCompose.svelte';
	import ParentLoungePanel from '$lib/components/comms/ParentLoungePanel.svelte';
	import ParentCoachDmPanel from '$lib/components/comms/ParentCoachDmPanel.svelte';
	import ParentVoiceSessionLobby from '$lib/components/comms/ParentVoiceSessionLobby.svelte';
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
	import {
		groupChannelsByCategory,
		resolveActiveSpace,
		type CommsNavChannelRef,
		type CommsSpaceRef,
	} from '$lib/comms/commsNavCategories.js';
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
	const showParentCoachDm = $derived(
		canPersonaReadChannel('parent_coach_dm', role) &&
			(role === 'parent' || role === 'coach' || role === 'director'),
	);
	const showParentVoiceSession = $derived(
		canPersonaReadChannel('parent_voice_session', role) &&
			(role === 'parent' || role === 'coach' || role === 'director'),
	);
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
	const deepLinkTeamId = $derived(page.url.searchParams.get('teamId') || teamId || '');
	const resolvedTeamId = $derived(deepLinkTeamId);
	const resolvedTeamName = $derived(
		teamsStore.teams.find((t) => t.id === resolvedTeamId)?.name || resolvedTeamId,
	);
	const deepLinkProgramId = $derived(page.url.searchParams.get('programId') || '');
	const deepLinkCalendarEventId = $derived(page.url.searchParams.get('calendarEventId') || '');
	const logisticsSub = $derived(page.url.searchParams.get('sub') || 'game-day');

	const sidebarChannels = $derived(
		(() => {
			/** @type {CommsNavChannelRef[]} */
			const list: CommsNavChannelRef[] = [
				{ id: 'announcements', label: COMMS_CHANNEL_TYPE_REGISTRY.announcements.label },
			];
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
				list.push({
					id: 'parent_lounge',
					label: COMMS_CHANNEL_TYPE_REGISTRY.parent_lounge.label,
				});
			}
			if (showParentCoachDm) {
				list.push({
					id: 'parent_coach_dm',
					label: COMMS_CHANNEL_TYPE_REGISTRY.parent_coach_dm.label,
				});
			}
			if (showParentVoiceSession) {
				list.push({
					id: 'parent_voice_session',
					label: COMMS_CHANNEL_TYPE_REGISTRY.parent_voice_session.label,
				});
			}
			if (showHousehold) {
				list.push({ id: 'household', label: 'Household' });
			}
			if (showDirectMail && dmKind !== 'parent_cc') {
				list.push({ id: 'direct_mail', label: 'Direct mail' });
			}
			return list;
		})(),
	);

	const categorizedNav = $derived(groupChannelsByCategory(sidebarChannels));

	const availableSpaces = $derived.by(() => {
		/** @type {CommsSpaceRef[]} */
		const spaces: CommsSpaceRef[] = [];
		const isClubStaff =
			role === 'director' || role === 'registrar' || role === 'admin';

		if (isClubStaff && hubClubId) {
			spaces.push({
				kind: 'club',
				id: hubClubId,
				label: hubClubName || hubClubId,
			});
		}

		if (role === 'parent') {
			const loungeTeams = parentLounges.length
				? parentLounges
				: teamId
					? [{ clubId: teamClubId, teamId }]
					: [];
			for (const lounge of loungeTeams) {
				if (deepLinkTeamId && lounge.teamId !== deepLinkTeamId) continue;
				const team = teamsStore.teams.find((t) => t.id === lounge.teamId);
				spaces.push({
					kind: 'team',
					id: lounge.teamId,
					label: team?.name || lounge.teamId,
				});
			}
			if (!spaces.some((s) => s.kind === 'team') && deepLinkTeamId) {
				const team = teamsStore.teams.find((t) => t.id === deepLinkTeamId);
				spaces.push({
					kind: 'team',
					id: deepLinkTeamId,
					label: team?.name || deepLinkTeamId,
				});
			}
		} else if (role === 'coach' || role === 'team_manager') {
			const tId = deepLinkTeamId || teamId;
			if (tId) {
				const team = teamsStore.teams.find((t) => t.id === tId);
				spaces.push({ kind: 'team', id: tId, label: team?.name || teamName || tId });
			}
		} else if (isClubStaff && deepLinkTeamId) {
			const team = teamsStore.teams.find((t) => t.id === deepLinkTeamId);
			spaces.push({
				kind: 'team',
				id: deepLinkTeamId,
				label: team?.name || deepLinkTeamId,
			});
		}

		if (showHousehold && householdId) {
			spaces.push({ kind: 'household', id: householdId, label: 'Household' });
		}

		return spaces;
	});

	const activeSpace = $derived(
		resolveActiveSpace(
			availableSpaces,
			page.url.searchParams.get('space') ||
				(deepLinkTeamId ? `team:${deepLinkTeamId}` : null) ||
				(showHousehold && householdId ? `household:${householdId}` : null) ||
				(hubClubId && (role === 'director' || role === 'registrar' || role === 'admin')
					? `club:${hubClubId}`
					: null),
		),
	);
	const showSpaceContext = $derived(role !== 'player' && Boolean(activeSpace));

	const activeChannel = $derived.by(() => {
		const param = page.url.searchParams.get('channel') as CommsChannelId | null;
		if (param === 'outbox' && showOutbox) return 'outbox';
		if (param && sidebarChannels.some((c) => c.id === param)) return param;
		return (sidebarChannels[0]?.id ?? 'announcements') as CommsChannelId;
	});

	const activeChannelLabel = $derived(
		sidebarChannels.find((c) => c.id === activeChannel)?.label ??
			(activeChannel === 'outbox' ? 'Outbox' : 'Channel'),
	);

	let mobilePickerOpen = $state(false);

	function spaceContextLabel(space: CommsSpaceRef): string {
		if (space.kind === 'club') return `Club · ${space.label}`;
		if (space.kind === 'household') return 'Household';
		return `Team · ${space.label}`;
	}

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
		if (id === 'parent_coach_dm' && deepLinkTeamId) {
			url.searchParams.set('teamId', deepLinkTeamId);
		}
		void goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true });
	}

	function selectPrimaryChannel() {
		const first = sidebarChannels[0]?.id;
		if (first) selectChannel(first as CommsChannelId);
	}

	function formatDate(ts: unknown) {
		const t = ts as { toDate?: () => Date } | undefined;
		if (t && typeof t.toDate === 'function') return t.toDate().toLocaleString();
		return '—';
	}
</script>

<div
	class="comms-hub-shell"
	class:comms-hub-shell--parent={role === 'parent'}
	class:comms-hub-shell--player={role === 'player'}
>
	<nav class="comms-hub-shell__rail" aria-label="Comms channels">
		{#if showSpaceContext && activeSpace}
			<p class="comms-hub-shell__space-context">{spaceContextLabel(activeSpace)}</p>
		{/if}

		{#each categorizedNav as group (group.category.id)}
			<section class="comms-hub-shell__category" aria-labelledby="comms-cat-{group.category.id}">
				<h3 id="comms-cat-{group.category.id}" class="comms-hub-shell__category-label">
					{group.category.label}
				</h3>
				<div class="comms-hub-shell__category-channels">
					{#each group.channels as ch (ch.id)}
						<button
							type="button"
							class="comms-hub-shell__rail-btn"
							class:comms-hub-shell__rail-btn--active={activeChannel === ch.id}
							aria-current={activeChannel === ch.id ? 'page' : undefined}
							onclick={() => selectChannel(ch.id as CommsChannelId)}
						>
							{ch.label}
						</button>
					{/each}
				</div>
			</section>
		{/each}
	</nav>

	{#if browser}
		<div class="comms-hub-shell__mobile-picker">
			{#if showSpaceContext && activeSpace}
				<p class="comms-hub-shell__space-context comms-hub-shell__space-context--mobile">
					{spaceContextLabel(activeSpace)}
				</p>
			{/if}
			<button
				type="button"
				class="comms-hub-shell__mobile-trigger"
				aria-expanded={mobilePickerOpen}
				onclick={() => (mobilePickerOpen = !mobilePickerOpen)}
			>
				{activeChannelLabel}
			</button>
			{#if mobilePickerOpen}
				<ul class="comms-hub-shell__mobile-menu" role="listbox">
					{#each categorizedNav as group (group.category.id)}
						{#each group.channels as ch (ch.id)}
							<li role="option" aria-selected={activeChannel === ch.id}>
								<button type="button" onclick={() => selectChannel(ch.id as CommsChannelId)}>
									<span class="comms-hub-shell__mobile-cat">{group.category.label}</span>
									{ch.label}
								</button>
							</li>
						{/each}
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<main class="comms-hub-shell__main">
		{#if showOutbox}
			<div class="comms-hub-shell__main-tabs" role="tablist" aria-label="Main view">
				<button
					type="button"
					role="tab"
					class="comms-hub-shell__main-tab"
					class:comms-hub-shell__main-tab--active={activeChannel !== 'outbox'}
					aria-selected={activeChannel !== 'outbox'}
					onclick={selectPrimaryChannel}
				>
					Channels
				</button>
				<button
					type="button"
					role="tab"
					class="comms-hub-shell__main-tab"
					class:comms-hub-shell__main-tab--active={activeChannel === 'outbox'}
					aria-selected={activeChannel === 'outbox'}
					onclick={() => selectChannel('outbox')}
				>
					Outbox
				</button>
			</div>
		{/if}

		{#if activeChannel === 'outbox' && showOutbox}
			<CommsOutbox />
		{:else if activeChannel === 'announcements'}
			{#if showCompose}
				<ParentAnnouncementCompose
					teamId={resolvedTeamId}
					clubId={teamClubId}
					teamName={resolvedTeamName}
				/>
			{/if}
			<AnnouncementsInbox />
		{:else if activeChannel === 'team_logistics' && showTeamLogistics}
			<CommsLogisticsChannel teamId={resolvedTeamId} clubId={teamClubId} />
		{:else if activeChannel === 'registration' && showRegistration}
			<CommsRegistrationChannel clubId={teamClubId} {householdId} />
		{:else if activeChannel === 'tryouts_events' && showTryouts}
			<CommsTryoutsEventsChannel
				clubId={teamClubId}
				programId={deepLinkProgramId}
				{householdId}
			/>
		{:else if activeChannel === 'match_day' && showMatchDay}
			<CommsMatchDayChannel clubId={teamClubId} teamId={resolvedTeamId} />
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
				teamId={resolvedTeamId}
				teamName={resolvedTeamName}
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
		{:else if activeChannel === 'parent_coach_dm' && showParentCoachDm}
			{#if role === 'parent'}
				{#if parentLoungeLoading}
					<p class="comms-hub-muted">Loading teams…</p>
				{:else if parentLounges.length === 0}
					<ParentCoachDmPanel clubId={teamClubId} teamId={resolvedTeamId} teamName={resolvedTeamName} />
				{:else}
					{#each parentLounges as lounge (`${lounge.clubId}:${lounge.teamId}`)}
						<ParentCoachDmPanel clubId={lounge.clubId} teamId={lounge.teamId} />
					{/each}
				{/if}
			{:else if (role === 'coach' || role === 'director') && resolvedTeamId}
				<ParentCoachDmPanel
					clubId={teamClubId || hubClubId}
					teamId={resolvedTeamId}
					teamName={resolvedTeamName}
				/>
			{:else}
				<p class="comms-hub-muted">Select a team to open parent↔coach messages.</p>
			{/if}
		{:else if activeChannel === 'parent_voice_session' && showParentVoiceSession}
			{#if role === 'parent'}
				{#if parentLoungeLoading}
					<p class="comms-hub-muted">Loading teams…</p>
				{:else if parentLounges.length === 0}
					<ParentVoiceSessionLobby
						clubId={teamClubId}
						teamId={resolvedTeamId}
						teamName={resolvedTeamName}
						calendarEventId={deepLinkCalendarEventId}
					/>
				{:else}
					{#each parentLounges as lounge (`${lounge.clubId}:${lounge.teamId}`)}
						<ParentVoiceSessionLobby
							clubId={lounge.clubId}
							teamId={lounge.teamId}
							calendarEventId={deepLinkCalendarEventId}
						/>
					{/each}
				{/if}
			{:else if (role === 'coach' || role === 'director') && resolvedTeamId}
				<ParentVoiceSessionLobby
					clubId={teamClubId || hubClubId}
					teamId={resolvedTeamId}
					teamName={resolvedTeamName}
					calendarEventId={deepLinkCalendarEventId}
				/>
			{:else}
				<p class="comms-hub-muted">Select a team to open parent voice sessions.</p>
			{/if}
		{:else if activeChannel === 'household' && showHousehold}
			<HouseholdThreadPanel {householdId} />
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
		grid-template-columns: minmax(10rem, 13rem) minmax(0, 1fr);
		gap: 16px;
		min-width: 0;
		align-items: start;
	}

	.comms-hub-shell__main {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.comms-hub-shell__mobile-picker {
		display: none;
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
	}

	.comms-hub-shell__space-context {
		margin: 0 0 8px;
		padding: 8px 10px;
		border: 1px solid var(--pd-grey-trim, #334155);
		background: rgba(15, 23, 42, 0.35);
		font-size: 11px;
		font-weight: 700;
		color: #94a3b8;
	}

	.comms-hub-shell__space-context--mobile {
		margin-bottom: 10px;
	}
</style>
