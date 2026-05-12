<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

	interface Props {
		clubId: string;
	}

	const { clubId }: Props = $props();

	interface TicketDoc {
		ticketId: string;
		eventId: string;
		tierId: string;
		quantity: number;
		grossCents: number;
		paymentStatus: string;
		checkedInAt?: unknown;
	}

	interface EventSummary {
		eventId: string;
		sold: number;
		scanned: number;
		grossCents: number;
	}

	let summaries = $state<EventSummary[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	let unsubscribe: (() => void) | null = null;

	$effect(() => {
		if (!clubId) return;
		loading = true;
		const db = getFirestore();

		// Listen to all paid tickets for this host club, created today or later.
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const q = query(
			collection(db, 'tickets'),
			where('hostClubId', '==', clubId),
			where('paymentStatus', '==', 'paid'),
		);

		unsubscribe = onSnapshot(
			q,
			(snap) => {
				// Aggregate client-side by eventId
				const map: Record<string, EventSummary> = {};
				for (const d of snap.docs) {
					const t = d.data() as Omit<TicketDoc, 'ticketId'>;
					if (!map[t.eventId]) {
						map[t.eventId] = { eventId: t.eventId, sold: 0, scanned: 0, grossCents: 0 };
					}
					map[t.eventId].sold += t.quantity ?? 1;
					map[t.eventId].grossCents += t.grossCents ?? 0;
					if (t.checkedInAt) {
						map[t.eventId].scanned += t.quantity ?? 1;
					}
				}
				summaries = Object.values(map).sort((a, b) => b.sold - a.sold);
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

	function formatCents(cents: number): string {
		return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}

	function pct(a: number, b: number): string {
		if (b === 0) return '0%';
		return `${Math.round((a / b) * 100)}%`;
	}
</script>

<div class="recon-module">
	<div class="module-header">
		<h3 class="module-title">🎟 Event Reconciliation</h3>
		<a class="module-link" href="/director/events">Manage Events →</a>
	</div>

	{#if errorMsg}
		<div class="error-pill">{errorMsg}</div>
	{/if}

	{#if loading}
		<div class="skeleton-row"></div>
		<div class="skeleton-row"></div>
	{:else if summaries.length === 0}
		<div class="empty-state">
			No active ticket sales. <a href="/director/events" class="empty-link">Create an event.</a>
		</div>
	{:else}
		<div class="event-grid">
			{#each summaries as ev (ev.eventId)}
				<a class="event-tile" href="/director/scan/{ev.eventId}">
					<div class="tile-id">{ev.eventId}</div>
					<div class="tile-stats">
						<div class="tile-stat">
							<span class="tile-val">{ev.sold}</span>
							<span class="tile-lbl">Sold</span>
						</div>
						<div class="tile-stat">
							<span class="tile-val">{ev.scanned}</span>
							<span class="tile-lbl">Scanned</span>
						</div>
						<div class="tile-stat">
							<span class="tile-val">{formatCents(ev.grossCents)}</span>
							<span class="tile-lbl">Revenue</span>
						</div>
					</div>
					<div class="scan-bar-wrap">
						<div
							class="scan-bar-fill"
							style="width: {pct(ev.scanned, ev.sold)}"
						></div>
					</div>
					<div class="scan-pct">{pct(ev.scanned, ev.sold)} scanned</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.recon-module {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.module-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.module-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0;
	}

	.module-link {
		font-size: 0.78rem;
		color: #a5b4fc;
		text-decoration: none;
		transition: opacity 0.15s;
	}
	.module-link:hover { opacity: 0.75; }

	.error-pill {
		background: rgba(239,68,68,0.12);
		border: 1px solid rgba(239,68,68,0.3);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		color: #fca5a5;
		font-size: 0.78rem;
	}

	.event-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
		gap: 0.65rem;
	}

	.event-tile {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.07);
		border-radius: 16px;
		padding: 0.9rem;
		cursor: pointer;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.event-tile:hover {
		border-color: rgba(99,102,241,0.35);
		background: rgba(99,102,241,0.06);
	}

	.tile-id {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--vanguard-text-muted, #94a3b8);
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tile-stats {
		display: flex;
		gap: 0.85rem;
	}

	.tile-stat {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.tile-val {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		line-height: 1;
	}

	.tile-lbl {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.scan-bar-wrap {
		height: 4px;
		background: rgba(255,255,255,0.08);
		border-radius: 99px;
		overflow: hidden;
	}

	.scan-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #6366f1, #8b5cf6);
		border-radius: 99px;
		transition: width 0.5s ease;
	}

	.scan-pct {
		font-size: 0.68rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.skeleton-row {
		height: 90px;
		background: rgba(255,255,255,0.04);
		border-radius: 16px;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }

	.empty-state {
		text-align: center;
		padding: 1.5rem;
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.875rem;
		border: 1px dashed rgba(255,255,255,0.1);
		border-radius: 14px;
	}
	.empty-link { color: #a5b4fc; text-decoration: none; }
	.empty-link:hover { text-decoration: underline; }
</style>
