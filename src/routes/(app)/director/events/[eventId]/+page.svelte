<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { getActiveDb } from '$lib/firebase';
	import type { TournamentEventDoc, TicketTier, TournamentBracket } from '$lib/types/tournamentEvent.js';
	import { labelToTierId } from '$lib/types/tournamentEvent.js';
	import TournamentBracketPanel from '$lib/components/director/TournamentBracketPanel.svelte';

	const eventId = $derived(page.params.eventId);

	let event = $state<TournamentEventDoc | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let publishing = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	// Form state mirroring the live doc
	let name = $state('');
	let description = $state('');
	let venue = $state('');
	let eventStartAt = $state('');
	let eventEndAt = $state('');

	// Tier editor
	interface TierDraft {
		id: string;
		label: string;
		unitPriceDollars: string;
		capacity: string;
		description: string;
		gateOpensAt: string;
	}
	let tiers = $state<TierDraft[]>([]);
	let bracket = $state<TournamentBracket | null>(null);

	let unsubscribe: (() => void) | null = null;

	$effect(() => {
		if (!eventId) return;
		const db = getActiveDb();
		unsubscribe = onSnapshot(doc(db, 'tournament_events', eventId), (snap) => {
			if (!snap.exists()) { loading = false; return; }
			const data = snap.data() as Omit<TournamentEventDoc, 'id'>;
			event = { id: snap.id, ...data };
			// Populate form on first load only (avoid clobbering in-progress edits)
			if (loading) {
				name = data.name ?? '';
				description = data.description ?? '';
				venue = data.venue ?? '';
				eventStartAt = isoToDatetimeLocal(data.eventStartAt ?? '');
				eventEndAt = isoToDatetimeLocal(data.eventEndAt ?? '');
				tiers = Object.entries(data.ticketTiers ?? {}).map(([id, t]) => ({
					id,
					label: t.label,
					unitPriceDollars: (t.unitPriceCents / 100).toFixed(2),
					capacity: String(t.capacity),
					description: t.description ?? '',
					gateOpensAt: isoToDatetimeLocal(t.gateOpensAt ?? ''),
				}));
				bracket = data.bracket ?? null;
			}
			loading = false;
		});
		return () => unsubscribe?.();
	});

	onDestroy(() => unsubscribe?.());

	function isoToDatetimeLocal(iso: string): string {
		if (!iso) return '';
		try {
			const d = new Date(iso);
			return d.toISOString().slice(0, 16);
		} catch { return ''; }
	}

	function datetimeLocalToIso(local: string): string {
		if (!local) return '';
		return new Date(local).toISOString();
	}

	function addTier() {
		tiers = [
			...tiers,
			{ id: '', label: '', unitPriceDollars: '10.00', capacity: '100', description: '', gateOpensAt: '' },
		];
	}

	function removeTier(idx: number) {
		tiers = tiers.filter((_, i) => i !== idx);
	}

	function autoFillTierId(idx: number) {
		const t = tiers[idx];
		if (!t.id && t.label) {
			tiers[idx] = { ...t, id: labelToTierId(t.label) };
		}
	}

	function buildTierMap(): Record<string, Omit<TicketTier, 'soldCount'>> {
		const map: Record<string, Omit<TicketTier, 'soldCount'>> = {};
		for (const t of tiers) {
			const tierId = t.id.trim() || labelToTierId(t.label);
			if (!tierId) continue;
			const entry: Omit<TicketTier, 'soldCount'> = {
				label: t.label.trim(),
				unitPriceCents: Math.round(parseFloat(t.unitPriceDollars) * 100) || 0,
				capacity: parseInt(t.capacity, 10) || 1,
			};
			if (t.description.trim()) entry.description = t.description.trim();
			if (t.gateOpensAt) entry.gateOpensAt = datetimeLocalToIso(t.gateOpensAt);
			map[tierId] = entry;
		}
		return map;
	}

	async function save() {
		saving = true;
		errorMsg = '';
		successMsg = '';
		try {
			const fns = getFunctions(undefined, 'us-east1');
			const upsert = httpsCallable(fns, 'upsertTournamentEvent');
			await upsert({
				eventId,
				name: name.trim(),
				description: description.trim() || undefined,
				venue: venue.trim() || undefined,
				eventStartAt: datetimeLocalToIso(eventStartAt),
				eventEndAt: eventEndAt ? datetimeLocalToIso(eventEndAt) : undefined,
				ticketTiers: buildTierMap(),
				bracket: bracket ?? null,
			});
			successMsg = 'Event saved.';
			setTimeout(() => { successMsg = ''; }, 3000);
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function publish() {
		publishing = true;
		errorMsg = '';
		successMsg = '';
		try {
			const fns = getFunctions(undefined, 'us-east1');
			const pub = httpsCallable(fns, 'publishTournamentEvent');
			await pub({ eventId });
			successMsg = 'Event published — buyers can now find it.';
			setTimeout(() => { successMsg = ''; }, 4000);
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : String(e);
		} finally {
			publishing = false;
		}
	}

	const canPublish = $derived(event?.status === 'draft' || event?.status === 'concluded');

	function formatCents(cents: number): string {
		return (Math.abs(cents) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}
</script>

<div class="builder-page">
	<header class="page-header">
		<button class="btn-back" onclick={() => goto('/director/events')}>← Events</button>
		<div class="header-actions">
			<span class="status-badge status-{event?.status ?? 'draft'}">{event?.status ?? 'draft'}</span>
			<button class="btn-save" onclick={save} disabled={saving || loading}>
				{saving ? 'Saving…' : 'Save Draft'}
			</button>
			{#if canPublish}
				<button class="btn-publish" onclick={publish} disabled={publishing || loading}>
					{publishing ? 'Publishing…' : 'Publish Event'}
				</button>
			{/if}
		</div>
	</header>

	{#if errorMsg}
		<div class="alert alert-error">{errorMsg}</div>
	{/if}
	{#if successMsg}
		<div class="alert alert-success">{successMsg}</div>
	{/if}

	{#if loading}
		<div class="skeleton-block"></div>
	{:else}
		<div class="builder-grid">
			<!-- Event details card -->
			<section class="glass-panel card">
				<h2 class="card-title">Event Details</h2>
				<div class="field-group">
					<label for="ev-name" class="field-label">Event Name <span class="required">*</span></label>
					<input id="ev-name" class="field-input" type="text" bind:value={name} placeholder="Spring Invitational 2026" maxlength="120" />
				</div>
				<div class="field-group">
					<label for="ev-desc" class="field-label">Description</label>
					<textarea id="ev-desc" class="field-input" rows="3" bind:value={description} placeholder="Short event description shown on the buyer page."></textarea>
				</div>
				<div class="field-group">
					<label for="ev-venue" class="field-label">Venue</label>
					<input id="ev-venue" class="field-input" type="text" bind:value={venue} placeholder="Soccer Complex, City, State" />
				</div>
				<div class="field-row">
					<div class="field-group">
						<label for="ev-start" class="field-label">Start Date & Time <span class="required">*</span></label>
						<input id="ev-start" class="field-input" type="datetime-local" bind:value={eventStartAt} />
					</div>
					<div class="field-group">
						<label for="ev-end" class="field-label">End Date & Time</label>
						<input id="ev-end" class="field-input" type="datetime-local" bind:value={eventEndAt} />
					</div>
				</div>
			</section>

			<!-- Ticket tiers card -->
			<section class="glass-panel card">
				<div class="card-header-row">
					<h2 class="card-title">Ticket Tiers</h2>
					<button class="btn-add-tier" onclick={addTier}>+ Add Tier</button>
				</div>

				{#if tiers.length === 0}
					<div class="tier-empty">No tiers yet. Add at least one to publish.</div>
				{/if}

				{#each tiers as tier, idx (idx)}
					<div class="tier-card">
						<div class="tier-header">
							<span class="tier-num">Tier {idx + 1}</span>
							<button class="btn-remove" onclick={() => removeTier(idx)} aria-label="Remove tier">×</button>
						</div>
						<div class="field-row">
							<div class="field-group">
								<label class="field-label" for="tier-label-{idx}">Label <span class="required">*</span></label>
								<input
									id="tier-label-{idx}"
									class="field-input"
									type="text"
									bind:value={tier.label}
									onblur={() => autoFillTierId(idx)}
									placeholder="General Admission"
									maxlength="80"
								/>
							</div>
							<div class="field-group">
								<label class="field-label" for="tier-id-{idx}">Tier ID <span class="required">*</span></label>
								<input
									id="tier-id-{idx}"
									class="field-input"
									type="text"
									bind:value={tier.id}
									placeholder="general"
									maxlength="32"
									pattern="[a-z0-9_]+"
								/>
							</div>
						</div>
						<div class="field-row">
							<div class="field-group">
								<label class="field-label" for="tier-price-{idx}">Price (USD)</label>
								<div class="input-prefix-wrap">
									<span class="input-prefix">$</span>
									<input
										id="tier-price-{idx}"
										class="field-input"
										type="number"
										min="0"
										step="0.01"
										bind:value={tier.unitPriceDollars}
										placeholder="10.00"
									/>
								</div>
							</div>
							<div class="field-group">
								<label class="field-label" for="tier-cap-{idx}">Capacity</label>
								<input
									id="tier-cap-{idx}"
									class="field-input"
									type="number"
									min="1"
									step="1"
									bind:value={tier.capacity}
									placeholder="100"
								/>
							</div>
						</div>
						<div class="field-group">
							<label class="field-label" for="tier-desc-{idx}">Description</label>
							<input
								id="tier-desc-{idx}"
								class="field-input"
								type="text"
								bind:value={tier.description}
								placeholder="Optional one-liner shown to buyers"
								maxlength="500"
							/>
						</div>
						<div class="field-group">
							<label class="field-label" for="tier-gate-{idx}">Gate Opens At</label>
							<input
								id="tier-gate-{idx}"
								class="field-input"
								type="datetime-local"
								bind:value={tier.gateOpensAt}
							/>
						</div>
						{#if event?.ticketTiers?.[tier.id]}
							<div class="tier-sold-info">
								Sold: {event.ticketTiers[tier.id].soldCount ?? 0} / {tier.capacity}
							</div>
						{/if}
					</div>
				{/each}
			</section>

			<TournamentBracketPanel
				{bracket}
				onchange={(next) => { bracket = next; }}
			/>

			<!-- Hotel rebates sub-section (Session B6) -->
			{#if event?.hotelRebates && event.hotelRebates.length > 0}
				<section class="glass-panel card">
					<h2 class="card-title">🏨 Hotel Rebates Linked</h2>
					<div class="rebate-list">
						{#each event.hotelRebates as rebate}
							<div class="rebate-item">
								<span class="rebate-partner">{rebate.partnerId}</span>
								<span class="rebate-credit">{formatCents(rebate.ngbCreditCents)} NGB credit</span>
								{#if rebate.roomNights}
									<span class="rebate-rooms">{rebate.roomNights} rooms</span>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	{/if}
</div>

<style>
	.rebate-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.rebate-item {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		font-size: 0.85rem;
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.03);
		border-radius: 10px;
		border: 1px solid rgba(255,255,255,0.06);
	}
	.rebate-partner { color: var(--vanguard-text-primary, #e2e8f0); font-weight: 600; flex: 1; }
	.rebate-credit  { color: #34d399; font-weight: 700; }
	.rebate-rooms   { color: var(--vanguard-text-muted, #94a3b8); font-size: 0.78rem; }

	.builder-page {
		padding: 2rem;
		max-width: 1100px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.75rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.btn-back {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.12);
		color: var(--vanguard-text-muted, #94a3b8);
		border-radius: 12px;
		padding: 0.45rem 1rem;
		cursor: pointer;
		font-size: 0.85rem;
		transition: border-color 0.15s, color 0.15s;
	}
	.btn-back:hover { border-color: rgba(255,255,255,0.3); color: var(--vanguard-text-primary, #e2e8f0); }

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.status-badge {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.7rem;
		border-radius: 99px;
	}
	.status-draft     { background: rgba(148,163,184,0.15); color: #94a3b8; }
	.status-published { background: rgba(52,211,153,0.15);  color: #34d399; }
	.status-concluded { background: rgba(251,191,36,0.15);  color: #fbbf24; }
	.status-archived  { background: rgba(239,68,68,0.12);   color: #f87171; }

	.btn-save {
		background: rgba(99,102,241,0.15);
		border: 1px solid rgba(99,102,241,0.4);
		color: #a5b4fc;
		border-radius: 12px;
		padding: 0.5rem 1.2rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-save:hover:not(:disabled) { background: rgba(99,102,241,0.28); }
	.btn-save:disabled { opacity: 0.45; cursor: not-allowed; }

	.btn-publish {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		border: none;
		color: white;
		border-radius: 12px;
		padding: 0.5rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 14px rgba(99,102,241,0.35);
		transition: opacity 0.15s, transform 0.15s;
	}
	.btn-publish:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
	.btn-publish:disabled { opacity: 0.45; cursor: not-allowed; }

	.alert {
		border-radius: 12px;
		padding: 0.85rem 1.2rem;
		margin-bottom: 1.25rem;
		font-size: 0.875rem;
	}
	.alert-error   { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); color: #fca5a5; }
	.alert-success { background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.35); color: #6ee7b7; }

	.builder-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 480px), 1fr));
		gap: clamp(1rem, 2.5vw, 1.75rem);
	}

	.glass-panel.card {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: var(--vanguard-radius, 24px);
		padding: clamp(1.25rem, 2.5vw, 1.75rem);
		box-shadow:
			0 1px 3px rgba(0,0,0,0.3),
			0 4px 16px rgba(0,0,0,0.2),
			inset 0 1px 0 rgba(255,255,255,0.06);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0;
	}

	.card-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--vanguard-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.required { color: #f87171; }

	.field-input {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 10px;
		padding: 0.55rem 0.85rem;
		color: var(--vanguard-text-primary, #e2e8f0);
		font-size: 0.9rem;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}
	.field-input:focus {
		outline: none;
		border-color: rgba(99,102,241,0.5);
	}
	.field-input::placeholder { color: rgba(148,163,184,0.5); }

	textarea.field-input { resize: vertical; }

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.input-prefix-wrap {
		display: flex;
		align-items: center;
		gap: 0;
	}
	.input-prefix {
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
		border-right: none;
		border-radius: 10px 0 0 10px;
		padding: 0.55rem 0.75rem;
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.9rem;
	}
	.input-prefix + .field-input {
		border-radius: 0 10px 10px 0;
	}

	.btn-add-tier {
		background: rgba(99,102,241,0.12);
		border: 1px solid rgba(99,102,241,0.3);
		color: #a5b4fc;
		border-radius: 10px;
		padding: 0.35rem 0.85rem;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-add-tier:hover { background: rgba(99,102,241,0.22); }

	.tier-card {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.07);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.tier-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.tier-num {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--vanguard-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.btn-remove {
		background: transparent;
		border: 1px solid rgba(239,68,68,0.3);
		color: #f87171;
		border-radius: 8px;
		width: 26px;
		height: 26px;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s;
	}
	.btn-remove:hover { background: rgba(239,68,68,0.15); }

	.tier-sold-info {
		font-size: 0.78rem;
		color: #34d399;
		background: rgba(52,211,153,0.08);
		border-radius: 8px;
		padding: 0.3rem 0.6rem;
	}

	.tier-empty {
		text-align: center;
		padding: 1.5rem;
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.875rem;
		border: 1px dashed rgba(255,255,255,0.1);
		border-radius: 12px;
	}

	.skeleton-block {
		height: 400px;
		background: rgba(255,255,255,0.04);
		border-radius: var(--vanguard-radius, 24px);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0.3; }
	}
</style>
