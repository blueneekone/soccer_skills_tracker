<script lang="ts">
	import { browser } from '$app/environment';
	import ParentAnnouncementCompose from '$lib/components/coach/ParentAnnouncementCompose.svelte';
	import ParentCoachDmPanel from '$lib/components/comms/ParentCoachDmPanel.svelte';
	import AnnouncementsInbox from '$lib/components/comms/AnnouncementsInbox.svelte';
	import CommsLogisticsChannel from '$lib/components/comms/CommsLogisticsChannel.svelte';
	import CommsWorkspaceShell from '$lib/components/comms/CommsWorkspaceShell.svelte';
	import { CommsEngine } from '$lib/services/comms.svelte.js';
	import { page } from '$app/state';
	import { defaultTeamLogisticsSubchannels } from '$lib/comms/channelTypes.js';

	type CoachTeamChannel = 'parent_coach_dm' | 'announcements' | 'team_logistics';

	let {
		teamId = '',
		clubId = '',
		teamName = '',
	}: {
		teamId?: string;
		clubId?: string;
		teamName?: string;
	} = $props();

	const subChannels = defaultTeamLogisticsSubchannels();
	const engine = new CommsEngine();

	let activeChannel = $state<CoachTeamChannel>('parent_coach_dm');
	let activeSub = $state('game-day');
	let parentChannelUnread = $state(false);

	const urlSection = $derived(page.url.searchParams.get('section'));
	const urlChannel = $derived(page.url.searchParams.get('channel'));
	const urlSub = $derived(page.url.searchParams.get('sub'));

	const workspaceCategories = $derived([
		{
			id: 'families',
			label: 'Families',
			channels: [
				{ id: 'parent_coach_dm', label: 'Parent messages', unread: parentChannelUnread },
				{ id: 'announcements', label: 'Broadcast' },
			],
		},
		{
			id: 'logistics',
			label: 'Logistics',
			channels: [{ id: 'team_logistics', label: 'Logistics threads' }],
		},
	]);

	const spaceLabel = $derived(teamName ? `Team · ${teamName}` : teamId ? `Team · ${teamId}` : '');

	function resolveChannelFromUrl(): CoachTeamChannel | null {
		if (urlChannel === 'parent_coach_dm' || urlSection === 'parents') return 'parent_coach_dm';
		if (
			urlChannel === 'announcements' ||
			urlSection === 'broadcast' ||
			urlChannel === 'team_broadcast'
		) {
			return 'announcements';
		}
		if (urlChannel === 'team_logistics' || urlSection === 'logistics' || urlSub) {
			return 'team_logistics';
		}
		return null;
	}

	$effect(() => {
		const resolved = resolveChannelFromUrl();
		if (resolved) activeChannel = resolved;
	});

	$effect(() => {
		if (urlSub && subChannels.some((c) => c.id === urlSub)) {
			activeSub = urlSub;
		}
	});

	function parseLastMessageAt(raw: unknown): number {
		if (!raw) return 0;
		if (typeof raw === 'object' && raw !== null) {
			const o = raw as Record<string, unknown>;
			if (typeof o.toDate === 'function') return (o.toDate as () => Date)().getTime();
			if (typeof o._seconds === 'number') return o._seconds * 1000;
			if (typeof o.seconds === 'number') return o.seconds * 1000;
		}
		return 0;
	}

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		if (!browser || !cId || !tId) {
			parentChannelUnread = false;
			return;
		}

		void engine
			.listParentCoachDmThreads({ clubId: cId, teamId: tId })
			.then((res) => {
				const seenKey = `coach-dm-seen-${tId}`;
				const seenAt = Number(localStorage.getItem(seenKey) || 0);
				parentChannelUnread = res.threads.some(
					(t) => parseLastMessageAt(t.lastMessageAt) > seenAt,
				);
			})
			.catch(() => {
				parentChannelUnread = false;
			});
	});

	$effect(() => {
		const tId = teamId?.trim();
		if (activeChannel === 'parent_coach_dm' && browser && tId) {
			localStorage.setItem(`coach-dm-seen-${tId}`, String(Date.now()));
			parentChannelUnread = false;
		}
	});

	function onChannelSelect(id: string) {
		if (id === 'parent_coach_dm' || id === 'announcements' || id === 'team_logistics') {
			activeChannel = id;
		}
	}
</script>

<div class="ec-page coach-team-comms">
	<CommsWorkspaceShell
		variant="coach-team"
		categories={workspaceCategories}
		bind:activeChannel
		{spaceLabel}
		onChannelSelect={onChannelSelect}
	>
		{#if activeChannel === 'parent_coach_dm'}
			<ParentCoachDmPanel {clubId} {teamId} {teamName} workspaceMode />
		{:else if activeChannel === 'announcements'}
			<ParentAnnouncementCompose {teamId} {clubId} {teamName} />
			<section class="coach-os-well coach-team-comms__inbox-strip" aria-labelledby="coach-inbox-h">
				<h2 id="coach-inbox-h" class="coach-team-comms__inbox-title">Recent announcements</h2>
				<AnnouncementsInbox {teamId} readOnlyStrip />
			</section>
		{:else}
			<CommsLogisticsChannel {teamId} embedMode bind:activeSub />
		{/if}
	</CommsWorkspaceShell>
</div>

<style>
	.coach-team-comms {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.coach-team-comms__inbox-strip {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 14px;
		min-width: 0;
	}

	.coach-team-comms__inbox-title {
		margin: 0;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #94a3b8;
	}

	.coach-team-comms :global(.ann-root) {
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		box-shadow: none;
	}

	.coach-team-comms :global(.ann-head) {
		display: none;
	}

	/* Thread shell — flat coach analytics inside workspace main */
	.coach-team-comms :global(.plp-root) {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		box-shadow: none;
		clip-path: none;
		min-height: 0;
		flex: 1;
	}

	.coach-team-comms :global(.plp-title) {
		margin: 0;
		font-size: 13px;
		font-weight: 700;
		font-family: inherit;
		letter-spacing: normal;
		text-transform: none;
		color: #e2e8f0;
	}

	.coach-team-comms :global(.plp-sub),
	.coach-team-comms :global(.plp-hint) {
		margin: 4px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: #94a3b8;
	}

	.coach-team-comms :global(.plp-scroll) {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		min-height: 200px;
		max-height: 420px;
		overflow-y: auto;
		padding: 4px 0;
		border: 1px solid var(--pd-grey-trim, #334155);
		border-radius: var(--pd-chamfer-sm, 4px);
		background: var(--pd-void-base, #000);
	}

	.coach-team-comms :global(.plp-row) {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 0 10px;
	}

	.coach-team-comms :global(.plp-row--mine) {
		justify-content: flex-end;
	}

	.coach-team-comms :global(.plp-bubble) {
		max-width: min(100%, 520px);
		padding: 10px 12px;
		border-radius: var(--pd-chamfer-sm, 4px);
		border: 1px solid var(--pd-grey-trim, #334155);
		background: rgba(15, 23, 42, 0.65);
		clip-path: none;
	}

	.coach-team-comms :global(.plp-bubble--mine) {
		border-color: var(--pd-data-cyan, #14b8a6);
		background: rgba(20, 184, 166, 0.1);
	}

	.coach-team-comms :global(.plp-bubble--deleted) {
		font-size: 12px;
		font-style: italic;
		color: #64748b;
	}

	.coach-team-comms :global(.plp-bubble-top) {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-bottom: 4px;
		flex-wrap: wrap;
	}

	.coach-team-comms :global(.plp-name) {
		font-size: 12px;
		font-weight: 800;
		color: #cbd5e1;
	}

	.coach-team-comms :global(.plp-role) {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
	}

	.coach-team-comms :global(.plp-text) {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: #e2e8f0;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.coach-team-comms :global(.plp-time) {
		display: block;
		margin-top: 6px;
		font-size: 10px;
		color: #64748b;
	}

	.coach-team-comms :global(.plp-footer) {
		display: flex;
		gap: 8px;
		align-items: flex-end;
		margin-top: 4px;
	}

	.coach-team-comms :global(.plp-input) {
		flex: 1;
		min-width: 0;
		border: 1px solid var(--pd-grey-trim, #334155);
		border-radius: var(--pd-chamfer-sm, 4px);
		padding: 8px 10px;
		font: inherit;
		font-size: 13px;
		background: var(--pd-void-base, #000);
		color: #e2e8f0;
		resize: vertical;
	}

	.coach-team-comms :global(.plp-send) {
		flex-shrink: 0;
		border: 1px solid var(--pd-data-cyan, #14b8a6);
		border-radius: var(--pd-chamfer-sm, 4px);
		padding: 10px 16px;
		font-size: 13px;
		font-weight: 700;
		background: rgba(20, 184, 166, 0.15);
		color: #e2e8f0;
		cursor: pointer;
	}

	.coach-team-comms :global(.plp-send:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.coach-team-comms :global(.plp-err) {
		margin: 0;
		font-size: 12px;
		color: #f87171;
	}
</style>
