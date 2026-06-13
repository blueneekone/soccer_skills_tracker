<script lang="ts">
	import {
		loadHouseholdScheduleEvents,
		loadHouseholdMatchStreams,
		type HouseholdScheduleEvent,
		type HouseholdMatchStream,
	} from '$lib/parent/loadHouseholdScheduleEvents.js';
	import LiveStreamEmbed from '$lib/live-stream/LiveStreamEmbed.svelte';
	import { parseLiveStreamUrl } from '$lib/live-stream/liveStreamEmbed.js';

	let { childEmails = [] }: { childEmails?: string[] } = $props();

	type StreamRow = {
		key: string;
		label: string;
		when: string;
		url: string;
		source: 'event' | 'match';
	};

	let events = $state<HouseholdScheduleEvent[]>([]);
	let matchStreams = $state<HouseholdMatchStream[]>([]);
	let loading = $state(true);
	let err = $state('');
	let activeKey = $state<string | null>(null);

	const streamRows = $derived.by((): StreamRow[] => {
		const rows: StreamRow[] = [];
		for (const ev of events) {
			if (!ev.liveStreamUrl) continue;
			if (!parseLiveStreamUrl(ev.liveStreamUrl)) continue;
			rows.push({
				key: `ev:${ev.id}`,
				label: ev.name,
				when: new Date(ev.startMs).toLocaleString(),
				url: ev.liveStreamUrl,
				source: 'event',
			});
		}
		for (const ms of matchStreams) {
			if (!ms.liveStreamUrl) continue;
			if (!parseLiveStreamUrl(ms.liveStreamUrl)) continue;
			rows.push({
				key: `md:${ms.teamId}:${ms.matchId}`,
				label: 'Match day live',
				when: 'Today',
				url: ms.liveStreamUrl,
				source: 'match',
			});
		}
		return rows;
	});

	const activeRow = $derived(streamRows.find((r) => r.key === activeKey) ?? null);

	$effect(() => {
		const emails = childEmails.filter(Boolean);
		if (emails.length === 0) {
			events = [];
			matchStreams = [];
			loading = false;
			activeKey = null;
			return;
		}
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				const [foundEvents, foundMatch] = await Promise.all([
					loadHouseholdScheduleEvents(emails, { horizonDays: 14, maxEvents: 24 }),
					loadHouseholdMatchStreams(emails),
				]);
				if (cancelled) return;
				events = foundEvents;
				matchStreams = foundMatch;
				const keys = new Set<string>();
				for (const ev of foundEvents) {
					if (ev.liveStreamUrl) keys.add(`ev:${ev.id}`);
				}
				for (const ms of foundMatch) {
					if (ms.liveStreamUrl) keys.add(`md:${ms.teamId}:${ms.matchId}`);
				}
				if (activeKey && !keys.has(activeKey)) activeKey = null;
			} catch (e) {
				if (!cancelled) err = e instanceof Error ? e.message : 'Could not load live streams.';
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

{#if loading || streamRows.length === 0}
	<!-- Hidden when no streams — avoids empty chrome on dashboard -->
{:else}
	<section class="parent-live" aria-labelledby="parent-live-title">
		<h3 id="parent-live-title" class="parent-live__title">Watch live</h3>
		<p class="parent-live__sub">Club-approved YouTube, Vimeo, or Mux streams for upcoming games.</p>

		<ul class="parent-live__list">
			{#each streamRows as row (row.key)}
				<li class="parent-live__item">
					<div class="parent-live__meta">
						<strong>{row.label}</strong>
						<span class="parent-live__when">{row.when}</span>
					</div>
					<button
						type="button"
						class="parent-live__btn"
						class:parent-live__btn--active={activeKey === row.key}
						onclick={() => (activeKey = activeKey === row.key ? null : row.key)}
					>
						{activeKey === row.key ? 'Hide' : 'Watch live'}
					</button>
				</li>
			{/each}
		</ul>

		{#if activeRow}
			<div class="parent-live__player">
				<LiveStreamEmbed url={activeRow.url} title={activeRow.label} />
			</div>
		{/if}

		{#if err}
			<p class="parent-live__err" role="alert">{err}</p>
		{/if}
	</section>
{/if}

<style>
	.parent-live {
		border: 1px solid rgba(51, 65, 85, 0.45);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		background: rgba(15, 23, 42, 0.4);
	}

	.parent-live__title {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
		font-weight: 700;
		color: #f8fafc;
	}

	.parent-live__sub {
		margin: 0 0 0.85rem;
		font-size: 0.8125rem;
		color: #94a3b8;
	}

	.parent-live__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.parent-live__item {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		justify-content: space-between;
		align-items: center;
	}

	.parent-live__meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.parent-live__when {
		font-size: 0.75rem;
		color: #64748b;
	}

	.parent-live__btn {
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		border: 1px solid rgba(239, 68, 68, 0.45);
		background: rgba(239, 68, 68, 0.12);
		color: #fca5a5;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
		flex-shrink: 0;
	}

	.parent-live__btn--active {
		border-color: rgba(148, 163, 184, 0.35);
		background: rgba(148, 163, 184, 0.1);
		color: #cbd5e1;
	}

	.parent-live__player {
		margin-top: 0.85rem;
	}

	.parent-live__err {
		margin: 0.65rem 0 0;
		color: #fca5a5;
		font-size: 0.8125rem;
	}
</style>
