<script>
	import { onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';

	interface TicketDoc {
		ticketId: string;
		eventId: string;
		tierId: string;
		quantity: number;
		unitPriceCents: number;
		grossCents: number;
		purchaserEmail: string;
		hostClubId: string;
		paymentStatus: 'pending' | 'paid' | 'failed';
		qrToken: string | null;
		checkedInAt?: unknown;
		paidAt?: unknown;
		// Denorm from event (may be missing for old tickets)
		eventName?: string;
		eventStartAt?: string;
		venue?: string;
	}

	let tickets = $state<TicketDoc[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Map from ticketId → rendered QR data URL
	let qrDataUrls = $state<Record<string, string>>({});

	let unsubscribe: (() => void) | null = null;

	const emailKey = $derived(
		authStore.userProfile?.email ? authStore.userProfile.email.toLowerCase() : '',
	);

	$effect(() => {
		if (!emailKey || !browser) return;
		loading = true;
		const db = getFirestore();
		const q = query(
			collection(db, 'tickets'),
			where('purchaserEmail', '==', emailKey),
			where('paymentStatus', '==', 'paid'),
			orderBy('paidAt', 'desc'),
		);
		unsubscribe = onSnapshot(
			q,
			async (snap) => {
				tickets = snap.docs.map((d) => ({ ticketId: d.id, ...(d.data() as Omit<TicketDoc, 'ticketId'>) }));
				loading = false;
				// Render QR codes for any ticket that has a qrToken
				await tick();
				for (const t of tickets) {
					if (t.qrToken && !qrDataUrls[t.ticketId]) {
						renderQr(t.ticketId, t.qrToken);
					}
				}
			},
			(err) => {
				errorMsg = err.message;
				loading = false;
			},
		);
		return () => unsubscribe?.();
	});

	onDestroy(() => unsubscribe?.());

	async function renderQr(ticketId: string, qrToken: string) {
		try {
			const QRCode = (await import('qrcode')).default;
			const dataUrl = await QRCode.toDataURL(qrToken, {
				width: 256,
				margin: 2,
				color: { dark: '#0f0f1e', light: '#e2e8f0' },
			});
			qrDataUrls = { ...qrDataUrls, [ticketId]: dataUrl };
		} catch (e) {
			console.warn('[tickets] QR render failed', e);
		}
	}

	function formatCents(cents: number): string {
		return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}

	function formatDate(isoOrTimestamp: unknown): string {
		if (!isoOrTimestamp) return '';
		try {
			const d =
				typeof isoOrTimestamp === 'string'
					? new Date(isoOrTimestamp)
					: typeof (isoOrTimestamp as { toDate?: () => Date }).toDate === 'function'
					? (isoOrTimestamp as { toDate: () => Date }).toDate()
					: new Date(isoOrTimestamp as number);
			return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
		} catch { return ''; }
	}
</script>

<div class="tickets-page">
	<header class="page-header">
		<h1 class="page-title">My Tickets</h1>
		<p class="page-subtitle">Show the QR code at the gate for entry.</p>
	</header>

	{#if errorMsg}
		<div class="error-banner">{errorMsg}</div>
	{/if}

	{#if loading}
		<div class="tickets-grid">
			{#each [1, 2] as _}
				<div class="boarding-pass skeleton"></div>
			{/each}
		</div>
	{:else if tickets.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🎟️</div>
			<h2>No tickets yet</h2>
			<p>Find an event and purchase tickets to see them here.</p>
			<a class="btn-find" href="/events">Find Events</a>
		</div>
	{:else}
		<div class="tickets-grid">
			{#each tickets as ticket (ticket.ticketId)}
				<div class="boarding-pass glass-panel" class:checked-in={!!ticket.checkedInAt}>
					<div class="pass-left">
						<div class="pass-header">
							<span class="pass-label">EVENT</span>
							<h2 class="pass-event-name">{ticket.eventName ?? ticket.eventId}</h2>
							{#if ticket.eventStartAt}
								<p class="pass-date">{formatDate(ticket.eventStartAt)}</p>
							{/if}
							{#if ticket.venue}
								<p class="pass-venue">📍 {ticket.venue}</p>
							{/if}
						</div>
						<div class="pass-details">
							<div class="detail-row">
								<span class="detail-label">Tier</span>
								<span class="detail-value">{ticket.tierId}</span>
							</div>
							<div class="detail-row">
								<span class="detail-label">Qty</span>
								<span class="detail-value">{ticket.quantity}</span>
							</div>
							<div class="detail-row">
								<span class="detail-label">Paid</span>
								<span class="detail-value">{formatCents(ticket.grossCents)}</span>
							</div>
							{#if ticket.paidAt}
								<div class="detail-row">
									<span class="detail-label">Purchased</span>
									<span class="detail-value">{formatDate(ticket.paidAt)}</span>
								</div>
							{/if}
						</div>
						{#if ticket.checkedInAt}
							<div class="checked-in-badge">✓ Checked In — {formatDate(ticket.checkedInAt)}</div>
						{/if}
					</div>

					<div class="pass-divider">
						<div class="perforation"></div>
					</div>

					<div class="pass-right">
						{#if ticket.qrToken}
							{#if qrDataUrls[ticket.ticketId]}
								<img
									class="qr-image"
									src={qrDataUrls[ticket.ticketId]}
									alt="Ticket QR code for {ticket.eventId}"
								/>
							{:else}
								<div class="qr-loading">Generating QR…</div>
							{/if}
							<p class="qr-caption">Scan at gate</p>
						{:else}
							<div class="qr-pending">
								<div class="qr-icon">⏳</div>
								<p>Ticket processing…</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tickets-page {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem);
	}

	.page-header { margin-bottom: 2rem; }

	.page-title {
		font-size: clamp(1.5rem, 3vw, 2.25rem);
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 0.25rem;
	}

	.page-subtitle {
		color: var(--vanguard-text-muted, #94a3b8);
		margin: 0;
		font-size: 0.9rem;
	}

	.error-banner {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.35);
		border-radius: 12px;
		padding: 0.85rem 1.2rem;
		color: #fca5a5;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.tickets-grid {
		display: flex;
		flex-direction: column;
		gap: clamp(1rem, 2.5vw, 1.5rem);
	}

	/* Boarding pass */
	.boarding-pass {
		display: flex;
		align-items: stretch;
		border-radius: var(--vanguard-radius, 24px);
		overflow: hidden;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.35),
			0 8px 24px rgba(0, 0, 0, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.07);
		transition: box-shadow 0.2s;
	}

	.boarding-pass.checked-in {
		border-color: rgba(52, 211, 153, 0.3);
		box-shadow:
			0 2px 6px rgba(52, 211, 153, 0.12),
			0 8px 24px rgba(0, 0, 0, 0.25);
	}

	.boarding-pass.skeleton {
		height: 200px;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }

	.pass-left {
		flex: 1;
		padding: clamp(1.25rem, 3vw, 1.75rem);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.pass-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.pass-event-name {
		font-size: clamp(1rem, 2.5vw, 1.3rem);
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0.2rem 0 0;
		line-height: 1.25;
	}

	.pass-date, .pass-venue {
		font-size: 0.82rem;
		color: var(--vanguard-text-muted, #94a3b8);
		margin: 0.15rem 0 0;
	}

	.pass-details {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.5rem 1.5rem;
	}

	.detail-row { display: flex; flex-direction: column; gap: 0.1rem; }
	.detail-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--vanguard-text-muted, #94a3b8);
	}
	.detail-value {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--vanguard-text-primary, #e2e8f0);
	}

	.checked-in-badge {
		font-size: 0.78rem;
		font-weight: 600;
		color: #34d399;
		background: rgba(52, 211, 153, 0.1);
		border: 1px solid rgba(52, 211, 153, 0.25);
		border-radius: 8px;
		padding: 0.3rem 0.75rem;
		width: fit-content;
	}

	/* Perforated divider */
	.pass-divider {
		width: 1px;
		position: relative;
		margin: 1rem 0;
		background: repeating-linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0.12) 0px,
			rgba(255, 255, 255, 0.12) 4px,
			transparent 4px,
			transparent 10px
		);
	}

	.perforation { display: none; }

	/* QR section */
	.pass-right {
		width: clamp(120px, 20vw, 180px);
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.qr-image {
		width: clamp(100px, 16vw, 148px);
		height: clamp(100px, 16vw, 148px);
		border-radius: 10px;
		object-fit: contain;
		background: #e2e8f0;
	}

	.qr-caption {
		font-size: 0.68rem;
		color: var(--vanguard-text-muted, #94a3b8);
		text-align: center;
		margin: 0;
	}

	.qr-loading {
		font-size: 0.75rem;
		color: var(--vanguard-text-muted, #94a3b8);
		text-align: center;
	}

	.qr-pending {
		text-align: center;
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.78rem;
	}
	.qr-icon { font-size: 2rem; margin-bottom: 0.4rem; }

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: var(--vanguard-radius, 24px);
	}
	.empty-icon { font-size: 3rem; margin-bottom: 1rem; }
	.empty-state h2 { font-size: 1.3rem; font-weight: 700; color: var(--vanguard-text-primary, #e2e8f0); margin: 0 0 0.5rem; }
	.empty-state p { color: var(--vanguard-text-muted, #94a3b8); margin: 0 0 1.5rem; }

	.btn-find {
		display: inline-block;
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: white;
		text-decoration: none;
		border-radius: 14px;
		padding: 0.7rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
		transition: opacity 0.15s, transform 0.15s;
	}
	.btn-find:hover { opacity: 0.88; transform: translateY(-1px); }
</style>
