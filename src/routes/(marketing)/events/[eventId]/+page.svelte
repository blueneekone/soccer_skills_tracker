<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { createTicketCheckout } from '$lib/services/ticketCheckout.svelte.js';
	import type { TournamentEventDoc, TicketTier } from '$lib/types/tournamentEvent.js';
	import { isEventOpen } from '$lib/types/tournamentEvent.js';
	import { bracketHasStarted } from '$lib/tournament/tournamentBracket.js';
	import TournamentBracketPanel from '$lib/components/director/TournamentBracketPanel.svelte';

	const eventId = $derived(page.params.eventId);

	let event = $state<TournamentEventDoc | null>(null);
	let loadingEvent = $state(true);
	let notFound = $state(false);

	// Buyer form
	let selectedTierId = $state('');
	let quantity = $state(1);
	let buyerEmail = $state('');
	let checkoutStarted = $state(false);

	const checkout = createTicketCheckout();

	// Autofill email from auth
	$effect(() => {
		const email = authStore.userProfile?.email ?? '';
		if (email) buyerEmail = email;
	});

	let unsubscribe: (() => void) | null = null;

	$effect(() => {
		if (!eventId || !browser) return;
		const db = getFirestore();
		unsubscribe = onSnapshot(doc(db, 'tournament_events', eventId), (snap) => {
			if (!snap.exists()) {
				notFound = true;
				loadingEvent = false;
				return;
			}
			event = { id: snap.id, ...(snap.data() as Omit<TournamentEventDoc, 'id'>) };
			if (event.status !== 'published') {
				notFound = true;
			} else {
				notFound = false;
				// Auto-select first tier
				if (!selectedTierId && event.ticketTiers) {
					const firstId = Object.keys(event.ticketTiers)[0];
					if (firstId) selectedTierId = firstId;
				}
			}
			loadingEvent = false;
		});
		return () => unsubscribe?.();
	});

	onDestroy(() => unsubscribe?.());

	const selectedTier = $derived<TicketTier | null>(
		(event?.ticketTiers && selectedTierId) ? (event.ticketTiers[selectedTierId] ?? null) : null,
	);

	const availableSeats = $derived(
		selectedTier ? Math.max(0, selectedTier.capacity - selectedTier.soldCount) : 0,
	);

	const totalCents = $derived(
		selectedTier ? selectedTier.unitPriceCents * quantity : 0,
	);

	function formatCents(cents: number): string {
		return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
			});
		} catch { return iso; }
	}

	function formatTime(iso: string): string {
		try {
			return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		} catch { return ''; }
	}

	const returnUrl = $derived(
		browser ? `${window.location.origin}/events/${eventId}/receipt?ticketId=${checkout.state.ticketId}` : '',
	);

	async function startCheckout() {
		if (!event || !selectedTierId || !buyerEmail.trim()) return;
		checkoutStarted = true;
		await checkout.init(eventId, selectedTierId, quantity, buyerEmail.trim());
	}

	async function confirmPayment() {
		await checkout.confirm(returnUrl);
	}
</script>

<svelte:head>
	<title>{event ? event.name : 'Event'} — Vanguard</title>
</svelte:head>

<div class="buyer-page">
	{#if loadingEvent}
		<div class="loading-hero skeleton"></div>
	{:else if notFound}
		<div class="not-found">
			<div class="nf-icon">🎟️</div>
			<h1>Event not found</h1>
			<p>This event may no longer be available or hasn't been published yet.</p>
		</div>
	{:else if event}
		<!-- Hero -->
		<header class="event-hero glass-panel">
			<div class="hero-content">
				<h1 class="event-title">{event.name}</h1>
				{#if event.description}
					<p class="event-description">{event.description}</p>
				{/if}
				<div class="event-meta">
					{#if event.eventStartAt}
						<span class="meta-item">📅 {formatDate(event.eventStartAt)} at {formatTime(event.eventStartAt)}</span>
					{/if}
					{#if event.venue}
						<span class="meta-item">📍 {event.venue}</span>
					{/if}
				</div>
			</div>
			<div class="hero-badge">
				{#if isEventOpen(event)}
					<span class="open-badge">🟢 Tickets Available</span>
				{:else}
					<span class="closed-badge">🔴 Sold Out / Closed</span>
				{/if}
			</div>
		</header>

		{#if bracketHasStarted(event.bracket)}
			<section class="bracket-section glass-panel" aria-labelledby="buyer-bracket-heading">
				<header class="bracket-section-header">
					<h2 id="buyer-bracket-heading" class="bracket-section-title">Tournament Bracket</h2>
					<p class="bracket-section-subtitle">Live results — updated as matches finish</p>
				</header>
				<TournamentBracketPanel bracket={event.bracket ?? null} readonly />
			</section>
		{/if}

		<div class="checkout-grid">
			<!-- Tier selector -->
			<section class="glass-panel tier-section">
				<h2 class="section-title">Choose Tickets</h2>

				{#if Object.keys(event.ticketTiers ?? {}).length === 0}
					<p class="no-tiers">No ticket types available for this event.</p>
				{:else}
					<div class="tier-list">
						{#each Object.entries(event.ticketTiers) as [tierId, tier] (tierId)}
							{@const remaining = Math.max(0, tier.capacity - tier.soldCount)}
							<button
								class="tier-option"
								class:selected={selectedTierId === tierId}
								class:sold-out={remaining === 0}
								onclick={() => { if (remaining > 0) selectedTierId = tierId; }}
								disabled={remaining === 0 || checkoutStarted}
							>
								<div class="tier-main">
									<span class="tier-label">{tier.label}</span>
									<span class="tier-price">{formatCents(tier.unitPriceCents)}</span>
								</div>
								{#if tier.description}
									<p class="tier-desc">{tier.description}</p>
								{/if}
								<span class="tier-remaining">
									{remaining > 0 ? `${remaining} remaining` : 'Sold out'}
								</span>
							</button>
						{/each}
					</div>

					{#if selectedTier && availableSeats > 0}
						<div class="quantity-row">
							<label for="qty-input" class="field-label">Quantity</label>
							<div class="qty-control">
								<button class="qty-btn" onclick={() => { if (quantity > 1) quantity--; }} disabled={checkoutStarted}>−</button>
								<input
									id="qty-input"
									type="number"
									class="qty-input"
									bind:value={quantity}
									min="1"
									max={Math.min(availableSeats, 50)}
									disabled={checkoutStarted}
								/>
								<button class="qty-btn" onclick={() => { if (quantity < Math.min(availableSeats, 50)) quantity++; }} disabled={checkoutStarted}>+</button>
							</div>
						</div>
					{/if}

					<div class="buyer-email-row">
						<label for="buyer-email" class="field-label">Email for receipt</label>
						<input
							id="buyer-email"
							type="email"
							class="field-input"
							bind:value={buyerEmail}
							placeholder="you@example.com"
							disabled={checkoutStarted}
						/>
					</div>
				{/if}
			</section>

			<!-- Order summary + payment -->
			<section class="glass-panel payment-section">
				<h2 class="section-title">Order Summary</h2>

				{#if selectedTier && availableSeats > 0}
					<div class="summary-lines">
						<div class="summary-line">
							<span>{selectedTier.label} × {quantity}</span>
							<span>{formatCents(selectedTier.unitPriceCents * quantity)}</span>
						</div>
						<div class="summary-line total-line">
							<span>Total</span>
							<span>{formatCents(totalCents)}</span>
						</div>
					</div>

					{#if !checkoutStarted}
						<button
							class="btn-checkout"
							onclick={startCheckout}
							disabled={!buyerEmail.trim() || !selectedTierId}
						>
							Proceed to Payment →
						</button>
					{:else}
						<!-- Stripe Elements mount target -->
						{#if checkout.state.phase === 'loading'}
							<div class="stripe-loading">Loading payment form…</div>
						{/if}

						<div id="payment-element"></div>

						{#if checkout.state.errorMsg}
							<div class="error-msg">{checkout.state.errorMsg}</div>
						{/if}

						{#if checkout.state.phase === 'ready' || checkout.state.phase === 'error'}
							<button
								class="btn-checkout"
								onclick={confirmPayment}
							>
								Pay {formatCents(totalCents)}
							</button>
						{/if}
						{#if checkout.state.phase === 'confirming'}
							<button class="btn-checkout" disabled>Processing…</button>
						{/if}
					{/if}
				{:else if selectedTier}
					<div class="sold-out-msg">This tier is sold out.</div>
				{:else}
					<div class="select-prompt">Select a ticket type to continue.</div>
				{/if}

				<p class="secure-note">🔒 Payments are processed securely via Stripe.</p>
			</section>
		</div>
	{/if}
</div>

<style>
	.buyer-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem);
		display: flex;
		flex-direction: column;
		gap: clamp(1.25rem, 3vw, 2rem);
	}

	.glass-panel {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-radius: var(--vanguard-radius, 24px);
		padding: clamp(1.25rem, 3vw, 2rem);
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.35),
			0 6px 20px rgba(0, 0, 0, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.07);
	}

	.loading-hero {
		height: 220px;
		border-radius: var(--vanguard-radius, 24px);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }

	.not-found {
		text-align: center;
		padding: 4rem 2rem;
	}
	.nf-icon { font-size: 3.5rem; margin-bottom: 1rem; }
	.not-found h1 { color: var(--vanguard-text-primary, #e2e8f0); margin: 0 0 0.5rem; }
	.not-found p { color: var(--vanguard-text-muted, #94a3b8); }

	.event-hero {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.event-title {
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 0.5rem;
		line-height: 1.2;
	}

	.event-description {
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 1rem;
		margin: 0 0 1rem;
	}

	.event-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.meta-item {
		font-size: 0.9rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.open-badge {
		background: rgba(52, 211, 153, 0.15);
		color: #34d399;
		border: 1px solid rgba(52, 211, 153, 0.3);
		border-radius: 99px;
		padding: 0.4rem 1rem;
		font-size: 0.82rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.closed-badge {
		background: rgba(239, 68, 68, 0.12);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 99px;
		padding: 0.4rem 1rem;
		font-size: 0.82rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.bracket-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.bracket-section-header {
		margin-bottom: 0.25rem;
	}

	.bracket-section-title {
		margin: 0;
		font-size: clamp(1.1rem, 2.5vw, 1.35rem);
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
	}

	.bracket-section-subtitle {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.bracket-section :global(.bracket-panel) {
		background: transparent;
		border: none;
		padding: 0;
		box-shadow: none;
	}

	.bracket-section :global(.panel-header) {
		display: none;
	}

	.checkout-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
		gap: clamp(1rem, 3vw, 1.75rem);
		align-items: start;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 1rem;
	}

	.tier-list { display: flex; flex-direction: column; gap: 0.65rem; }

	.tier-option {
		width: 100%;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 0.9rem 1rem;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, background 0.15s;
		color: inherit;
	}
	.tier-option:hover:not(:disabled):not(.sold-out) {
		border-color: rgba(99, 102, 241, 0.45);
		background: rgba(99, 102, 241, 0.06);
	}
	.tier-option.selected {
		border-color: rgba(99, 102, 241, 0.65);
		background: rgba(99, 102, 241, 0.12);
	}
	.tier-option.sold-out { opacity: 0.45; cursor: not-allowed; }

	.tier-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.tier-label { font-weight: 600; color: var(--vanguard-text-primary, #e2e8f0); }
	.tier-price { font-weight: 700; color: #a5b4fc; font-size: 1.05rem; }
	.tier-desc { font-size: 0.82rem; color: var(--vanguard-text-muted, #94a3b8); margin: 0.25rem 0 0; }
	.tier-remaining { font-size: 0.75rem; color: var(--vanguard-text-muted, #94a3b8); margin-top: 0.3rem; display: block; }

	.quantity-row, .buyer-email-row {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--vanguard-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.qty-control {
		display: flex;
		align-items: center;
		gap: 0;
		width: fit-content;
	}

	.qty-btn {
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--vanguard-text-primary, #e2e8f0);
		width: 36px;
		height: 36px;
		cursor: pointer;
		font-size: 1.1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.12s;
	}
	.qty-btn:first-child { border-radius: 8px 0 0 8px; }
	.qty-btn:last-child  { border-radius: 0 8px 8px 0; }
	.qty-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); }

	.qty-input {
		width: 56px;
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-left: none;
		border-right: none;
		padding: 0.4rem;
		color: var(--vanguard-text-primary, #e2e8f0);
		font-size: 0.95rem;
		height: 36px;
	}
	.qty-input::-webkit-inner-spin-button { display: none; }

	.field-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 0.55rem 0.85rem;
		color: var(--vanguard-text-primary, #e2e8f0);
		font-size: 0.9rem;
		width: 100%;
		box-sizing: border-box;
	}
	.field-input:focus { outline: none; border-color: rgba(99, 102, 241, 0.5); }

	.summary-lines {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.summary-line {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.total-line {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 0.65rem;
		margin-top: 0.25rem;
	}

	.btn-checkout {
		width: 100%;
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: white;
		border: none;
		border-radius: 14px;
		padding: 0.9rem 1.5rem;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
		transition: opacity 0.15s, transform 0.15s;
		margin-bottom: 0.75rem;
	}
	.btn-checkout:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
	.btn-checkout:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

	.stripe-loading, .sold-out-msg, .select-prompt, .no-tiers {
		text-align: center;
		padding: 1.5rem;
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.875rem;
	}

	.error-msg {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.35);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		color: #fca5a5;
		font-size: 0.85rem;
		margin: 0.75rem 0;
	}

	.secure-note {
		text-align: center;
		font-size: 0.75rem;
		color: rgba(148, 163, 184, 0.6);
		margin: 0.5rem 0 0;
	}
</style>
