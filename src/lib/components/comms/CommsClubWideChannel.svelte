<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		getDocs,
		limit,
		orderBy,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { COMMS_CHANNEL_TYPE_REGISTRY } from '$lib/comms/channelTypes.js';
	import { canPersonaPostChannel } from '$lib/comms/channelTypes.js';
	import DirectorClubBroadcastComposer from '$lib/components/director/DirectorClubBroadcastComposer.svelte';

	let {
		clubId = '',
		clubName = '',
		teams = [],
	}: {
		clubId?: string;
		clubName?: string;
		teams?: Array<{ id: string; name?: string }>;
	} = $props();

	const role = $derived(authStore.role);
	const def = COMMS_CHANNEL_TYPE_REGISTRY.club_wide;
	const canPost = $derived(canPersonaPostChannel('club_wide', role));
	const isParent = $derived(role === 'parent');

	type BroadcastRow = {
		id: string;
		teamId: string;
		subject: string | null;
		bodyPreview: string | null;
		fromEmail: string | null;
		messageHash: string | null;
		createdAtMs: number;
	};

	type FanoutGroup = {
		key: string;
		subject: string | null;
		bodyPreview: string | null;
		fromEmail: string | null;
		createdAtMs: number;
		teamIds: string[];
	};

	let historyLoading = $state(false);
	let historyError = $state('');
	let fanoutGroups = $state<FanoutGroup[]>([]);

	const FANOUT_WINDOW_MS = 120_000;

	function groupClubBroadcasts(rows: BroadcastRow[]): FanoutGroup[] {
		const clubRows = rows.filter((r) => r.createdAtMs > 0);
		clubRows.sort((a, b) => b.createdAtMs - a.createdAtMs);

		/** @type {FanoutGroup[]} */
		const groups: FanoutGroup[] = [];

		for (const row of clubRows) {
			const hashKey = row.messageHash || row.bodyPreview || row.id;
			const existing = groups.find(
				(g) =>
					g.subject === row.subject &&
					(g.bodyPreview === row.bodyPreview || hashKey === g.key) &&
					Math.abs(g.createdAtMs - row.createdAtMs) <= FANOUT_WINDOW_MS,
			);
			if (existing) {
				if (!existing.teamIds.includes(row.teamId)) existing.teamIds.push(row.teamId);
				continue;
			}
			groups.push({
				key: `${row.createdAtMs}:${hashKey}`,
				subject: row.subject,
				bodyPreview: row.bodyPreview,
				fromEmail: row.fromEmail,
				createdAtMs: row.createdAtMs,
				teamIds: [row.teamId],
			});
		}

		return groups.slice(0, 12);
	}

	$effect(() => {
		if (!browser || !clubId.trim() || !canPost || teams.length === 0) {
			fanoutGroups = [];
			historyLoading = false;
			return;
		}

		let cancelled = false;
		historyLoading = true;
		historyError = '';

		void (async () => {
			try {
				const rows: BroadcastRow[] = [];
				await Promise.all(
					teams.map(async (team) => {
						const qy = query(
							collection(db, 'team_broadcasts'),
							where('teamId', '==', team.id),
							orderBy('createdAt', 'desc'),
							limit(20),
						);
						const snap = await getDocs(qy);
						for (const d of snap.docs) {
							const data = d.data();
							if (data.source !== 'club_broadcast') continue;
							rows.push({
								id: d.id,
								teamId: team.id,
								subject: typeof data.subject === 'string' ? data.subject : null,
								bodyPreview:
									typeof data.bodyPreview === 'string' ? data.bodyPreview : null,
								fromEmail: typeof data.fromEmail === 'string' ? data.fromEmail : null,
								messageHash:
									typeof data.messageHash === 'string' ? data.messageHash : null,
								createdAtMs: data.createdAt?.toMillis?.() ?? 0,
							});
						}
					}),
				);
				if (!cancelled) fanoutGroups = groupClubBroadcasts(rows);
			} catch (e) {
				if (!cancelled) {
					historyError =
						e instanceof Error ? e.message : 'Could not load club broadcast history.';
				}
			} finally {
				if (!cancelled) historyLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function formatDate(ms: number) {
		if (!ms) return '—';
		return new Date(ms).toLocaleString();
	}

	function teamLabel(teamId: string) {
		return teams.find((t) => t.id === teamId)?.name || teamId;
	}
</script>

<section class="comms-club-wide" aria-labelledby="comms-club-wide-heading">
	<header class="comms-club-wide__head">
		<h2 id="comms-club-wide-heading" class="comms-club-wide__title">
			{def.label}
		</h2>
		<p class="comms-club-wide__sub">{def.description}</p>
	</header>

	{#if isParent}
		<div class="comms-club-wide__parent-note" role="note">
			<p>
				Club-wide messages from your director are delivered to each team&apos;s
				<strong>Announcements</strong> channel. Open Announcements for your child&apos;s team to read
				the latest copy — you do not need to check this channel separately.
			</p>
			<a class="comms-club-wide__cta" href="/messages?channel=announcements">
				Go to Announcements →
			</a>
		</div>
	{:else if canPost}
		<DirectorClubBroadcastComposer {clubId} {clubName} {teams} />

		<section class="comms-club-wide__history" aria-labelledby="comms-club-wide-history">
			<h3 id="comms-club-wide-history" class="comms-club-wide__history-title">
				Recent club fan-outs
			</h3>
			{#if historyLoading}
				<p class="comms-club-wide__muted">Loading history…</p>
			{:else if historyError}
				<p class="comms-club-wide__err" role="alert">{historyError}</p>
			{:else if fanoutGroups.length === 0}
				<p class="comms-club-wide__muted">No club-wide broadcasts yet.</p>
			{:else}
				<ul class="comms-club-wide__list">
					{#each fanoutGroups as group (group.key)}
						<li class="comms-club-wide__card">
							<div class="comms-club-wide__meta">
								<span>{formatDate(group.createdAtMs)}</span>
								{#if group.fromEmail}
									<span>· {group.fromEmail}</span>
								{/if}
							</div>
							{#if group.subject}
								<p class="comms-club-wide__subject">{group.subject}</p>
							{/if}
							<p class="comms-club-wide__preview">{group.bodyPreview ?? '—'}</p>
							<p class="comms-club-wide__teams">
								{group.teamIds.length} team{group.teamIds.length === 1 ? '' : 's'}:
								{group.teamIds.map(teamLabel).join(', ')}
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{:else}
		<p class="comms-club-wide__muted">
			Club-wide broadcasts are composed by directors in the unified Comms hub.
		</p>
	{/if}
</section>

<style>
	.comms-club-wide {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.comms-club-wide__head {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.comms-club-wide__title {
		margin: 0;
		font-size: 16px;
		font-weight: 800;
		color: #f8fafc;
	}

	.comms-club-wide__sub {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: #94a3b8;
		max-width: 42rem;
	}

	.comms-club-wide__parent-note {
		padding: 14px 16px;
		border: 1px solid #334155;
		border-radius: 10px;
		background: rgba(15, 23, 42, 0.6);
	}

	.comms-club-wide__parent-note p {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: #cbd5e1;
	}

	.comms-club-wide__cta {
		display: inline-flex;
		margin-top: 10px;
		font-size: 12px;
		font-weight: 800;
		color: #14b8a6;
		text-decoration: none;
	}

	.comms-club-wide__history-title {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-club-wide__muted {
		margin: 0;
		font-size: 13px;
		color: #94a3b8;
	}

	.comms-club-wide__err {
		margin: 0;
		font-size: 12px;
		color: #f87171;
	}

	.comms-club-wide__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.comms-club-wide__card {
		padding: 10px 12px;
		border: 1px solid #334155;
		border-radius: 10px;
		background: rgba(15, 23, 42, 0.5);
	}

	.comms-club-wide__meta {
		font-size: 11px;
		color: #64748b;
	}

	.comms-club-wide__subject {
		margin: 6px 0 0;
		font-size: 13px;
		font-weight: 700;
		color: #e2e8f0;
	}

	.comms-club-wide__preview {
		margin: 4px 0 0;
		font-size: 12px;
		color: #94a3b8;
		line-height: 1.4;
	}

	.comms-club-wide__teams {
		margin: 6px 0 0;
		font-size: 11px;
		color: #64748b;
	}
</style>
