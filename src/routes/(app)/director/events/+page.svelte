<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { getFirestore, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import type { TournamentEventDoc } from '$lib/types/tournamentEvent.js';

	let events = $state<TournamentEventDoc[]>([]);
	let loading = $state(true);
	let creating = $state(false);
	let errorMsg = $state('');

	let unsubscribe: (() => void) | null = null;

	const clubId = $derived(authStore.userProfile?.clubId ?? '');

	$effect(() => {
		if (!clubId) return;
		loading = true;
		const db = getFirestore();
		const q = query(
			collection(db, 'tournament_events'),
			where('hostClubId', '==', clubId),
			orderBy('eventStartAt', 'desc'),
		);
		unsubscribe = onSnapshot(
			q,
			(snap) => {
				events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TournamentEventDoc, 'id'>) }));
				loading = false;
			},
			(err) => {
				errorMsg = err.message;
				loading = false;
			},
		);
		return () => unsubscribe?.();
	});

	onDestroy(() => unsubscribe?.());

	async function createEvent() {
		creating = true;
		errorMsg = '';
		try {
			const fns = getFunctions(undefined, 'us-east1');
			const upsert = httpsCallable<Record<string, unknown>, { eventId: string }>(fns, 'upsertTournamentEvent');
			const now = new Date();
			const startAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
			const res = await upsert({
				name: 'New Event',
				eventStartAt: startAt,
				ticketTiers: {
					general: { label: 'General Admission', unitPriceCents: 1000, capacity: 100 },
				},
			});
			goto(`/director/events/${res.data.eventId}`);
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : String(e);
		} finally {
			creating = false;
		}
	}

	function statusBadgeClass(status: string): string {
		return {
			draft: 'badge-draft',
			published: 'badge-published',
			concluded: 'badge-concluded',
			archived: 'badge-archived',
		}[status] ?? 'badge-draft';
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				year: 'numeric', month: 'short', day: 'numeric',
			});
		} catch {
			return iso;
		}
	}
</script>

<div class="events-page">
	<header class="page-header">
		<div class="header-content">
			<h1 class="page-title">Events</h1>
			<p class="page-subtitle">Manage tournament events and ticket tiers for your club.</p>
		</div>
		<button class="btn-create" onclick={createEvent} disabled={creating}>
			{creating ? 'Creating…' : '+ New Event'}
		</button>
	</header>

	{#if errorMsg}
		<div class="error-banner">{errorMsg}</div>
	{/if}

	{#if loading}
		<div class="loading-grid">
			{#each [1, 2, 3] as _}
				<div class="event-card skeleton"></div>
			{/each}
		</div>
	{:else if events.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🎟️</div>
			<h2>No events yet</h2>
			<p>Create your first event to start selling tickets.</p>
			<button class="btn-create" onclick={createEvent} disabled={creating}>
				{creating ? 'Creating…' : 'Create Event'}
			</button>
		</div>
	{:else}
		<div class="events-grid">
			{#each events as event (event.id)}
				<a class="event-card glass-panel" href="/director/events/{event.id}">
					<div class="card-top">
						<span class="badge {statusBadgeClass(event.status)}">{event.status}</span>
						<span class="event-date">{formatDate(event.eventStartAt)}</span>
					</div>
					<h2 class="event-name">{event.name}</h2>
					{#if event.venue}
						<p class="event-venue">📍 {event.venue}</p>
					{/if}
					<div class="card-stats">
						<div class="stat">
							<span class="stat-value">{event.totalSold ?? 0}</span>
							<span class="stat-label">Sold</span>
						</div>
						<div class="stat">
							<span class="stat-value">{Object.keys(event.ticketTiers ?? {}).length}</span>
							<span class="stat-label">Tiers</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.events-page {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 2rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.page-title {
		font-size: clamp(1.5rem, 3vw, 2.25rem);
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 0.25rem;
	}

	.page-subtitle {
		color: var(--vanguard-text-muted, #94a3b8);
		margin: 0;
		font-size: 0.9rem;
	}

	.btn-create {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: white;
		border: none;
		border-radius: 24px;
		padding: 0.65rem 1.4rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.15s, transform 0.15s;
		box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
	}

	.btn-create:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
	.btn-create:disabled { opacity: 0.5; cursor: not-allowed; }

	.error-banner {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.4);
		border-radius: 12px;
		padding: 0.85rem 1.2rem;
		color: #fca5a5;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.events-grid,
	.loading-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
		gap: clamp(1rem, 2vw, 1.5rem);
	}

	.event-card {
		border-radius: var(--vanguard-radius, 24px);
		padding: clamp(1.25rem, 2.5vw, 1.75rem);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.3),
			0 4px 16px rgba(0, 0, 0, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.07);
	}

	.event-card:hover {
		border-color: rgba(99, 102, 241, 0.4);
		transform: translateY(-2px);
		box-shadow:
			0 4px 12px rgba(99, 102, 241, 0.2),
			0 8px 24px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.event-card.skeleton {
		min-height: 180px;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0.3; }
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.badge {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2rem 0.6rem;
		border-radius: 99px;
	}

	.badge-draft     { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
	.badge-published { background: rgba(52, 211, 153, 0.15);  color: #34d399; }
	.badge-concluded { background: rgba(251, 191, 36, 0.15);  color: #fbbf24; }
	.badge-archived  { background: rgba(239, 68, 68, 0.12);   color: #f87171; }

	.event-date {
		font-size: 0.78rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.event-name {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0;
		line-height: 1.3;
	}

	.event-venue {
		font-size: 0.82rem;
		color: var(--vanguard-text-muted, #94a3b8);
		margin: 0;
	}

	.card-stats {
		display: flex;
		gap: 1.5rem;
		margin-top: 0.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.stat-value {
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		line-height: 1;
	}

	.stat-label {
		font-size: 0.72rem;
		color: var(--vanguard-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: var(--vanguard-radius, 24px);
	}

	.empty-icon { font-size: 3rem; margin-bottom: 1rem; }

	.empty-state h2 {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 0.5rem;
	}

	.empty-state p {
		color: var(--vanguard-text-muted, #94a3b8);
		margin: 0 0 1.5rem;
	}
</style>
