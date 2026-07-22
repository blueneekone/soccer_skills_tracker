<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { createTicketScanner } from '$lib/services/ticketScanner.svelte.js';

	const eventId = $derived(page.params.eventId);

	// Guard: director+ only
	$effect(() => {
		const role = authStore.userProfile?.role ?? '';
		if (!['director', 'super_admin', 'global_admin'].includes(role)) {
			goto('/director');
		}
	});

	let scanner: ReturnType<typeof createTicketScanner> | null = null;
	let scannerStarted = $state(false);

	$effect(() => {
		if (!eventId || !browser) return;
		scanner = createTicketScanner(eventId, 'qr-reader');
	});

	onDestroy(() => {
		scanner?.stop();
	});

	async function startScanning() {
		if (!scanner) return;
		await scanner.start();
		scannerStarted = true;
	}

	async function stopScanning() {
		await scanner?.stop();
		scannerStarted = false;
	}

	const s = $derived(scanner?.state ?? null);

	function resultClass(status: string | undefined): string {
		if (!status) return '';
		return { valid: 'result-valid', already_scanned: 'result-dupe', invalid: 'result-invalid', error: 'result-invalid' }[status] ?? '';
	}

	function resultIcon(status: string | undefined, queued?: boolean): string {
		if (queued) return '📶';
		return { valid: '✓', already_scanned: '⚠', invalid: '✗', error: '✗' }[status ?? ''] ?? '?';
	}

	function resultLabel(status: string | undefined, queued?: boolean): string {
		if (queued) return 'Queued (Offline)';
		return { valid: 'VALID', already_scanned: 'ALREADY SCANNED', invalid: 'INVALID', error: 'ERROR' }[status ?? ''] ?? '';
	}
</script>

<div class="scanner-page">
	<header class="scan-header">
		<button class="btn-back" onclick={() => goto('/director/events')}>← Events</button>
		<div class="header-center">
			<h1 class="scan-title">Gate Scanner</h1>
			{#if s}
				<div class="online-pill" class:offline={!s.isOnline}>
					{s.isOnline ? '🟢 Online' : '🔴 Offline'}
				</div>
			{/if}
		</div>
		{#if scannerStarted}
			<button class="btn-stop" onclick={stopScanning}>Stop</button>
		{:else}
			<div class="placeholder-action"></div>
		{/if}
	</header>

	{#if s?.queueSize > 0}
		<div class="queue-banner">
			⏳ {s.queueSize} scan{s.queueSize === 1 ? '' : 's'} queued — will sync when online.
		</div>
	{/if}

	{#if !scannerStarted}
		<div class="start-screen glass-panel">
			<div class="start-icon">📷</div>
			<h2>Ready to Scan</h2>
			<p>Tap the button below to activate the camera and begin scanning tickets for this event.</p>
			<p class="event-id-note">Event: <code>{eventId}</code></p>
			<button class="btn-start" onclick={startScanning}>Start Camera</button>
		</div>
	{:else}
		<div class="scan-viewport">
			<!-- html5-qrcode mounts here -->
			<div id="qr-reader"></div>

			<!-- Result overlay -->
			{#if s?.phase === 'result' && s.lastResult}
				<div class="result-overlay {resultClass(s.lastResult.status)}">
					<div class="result-icon">{resultIcon(s.lastResult.status, s.lastResult.queued)}</div>
					<div class="result-label">{resultLabel(s.lastResult.status, s.lastResult.queued)}</div>
					{#if s.lastResult.checkedInAt}
						<div class="result-sub">Previously scanned: {s.lastResult.checkedInAt}</div>
					{/if}
				</div>
			{/if}

			{#if s?.phase === 'verifying'}
				<div class="verifying-overlay">
					<div class="spinner"></div>
					<span>Verifying…</span>
				</div>
			{/if}
		</div>

		<!-- Stats bar -->
		{#if s}
			<div class="stats-bar glass-panel">
				<div class="stat-chip valid">
					<span class="stat-n">{s.stats.valid}</span>
					<span class="stat-l">Valid</span>
				</div>
				<div class="stat-chip dupe">
					<span class="stat-n">{s.stats.already_scanned}</span>
					<span class="stat-l">Dupe</span>
				</div>
				<div class="stat-chip invalid">
					<span class="stat-n">{s.stats.invalid}</span>
					<span class="stat-l">Invalid</span>
				</div>
				{#if s.stats.queued > 0}
					<div class="stat-chip queued">
						<span class="stat-n">{s.stats.queued}</span>
						<span class="stat-l">Queued</span>
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	{#if s?.phase === 'error'}
		<div class="error-banner">{s.errorMsg}</div>
	{/if}
</div>

<style>
	.scanner-page {
		max-width: 600px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-height: 100dvh;
	}

	.scan-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.header-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		flex: 1;
	}

	.scan-title {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0;
	}

	.btn-back, .btn-stop {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.12);
		color: var(--vanguard-text-muted, #94a3b8);
		border-radius: 10px;
		padding: 0.4rem 0.85rem;
		cursor: pointer;
		font-size: 0.82rem;
		transition: border-color 0.15s;
		white-space: nowrap;
	}
	.btn-back:hover, .btn-stop:hover { border-color: rgba(255,255,255,0.3); }

	.placeholder-action { width: 55px; }

	.online-pill {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 99px;
		background: rgba(52,211,153,0.12);
		color: #34d399;
		border: 1px solid rgba(52,211,153,0.25);
	}
	.online-pill.offline {
		background: rgba(239,68,68,0.12);
		color: #f87171;
		border-color: rgba(239,68,68,0.25);
	}

	.queue-banner {
		background: rgba(251,191,36,0.12);
		border: 1px solid rgba(251,191,36,0.3);
		border-radius: 10px;
		padding: 0.6rem 1rem;
		color: #fbbf24;
		font-size: 0.82rem;
		text-align: center;
	}

	.start-screen {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-radius: var(--vanguard-radius, 24px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.start-icon { font-size: 3.5rem; }

	.start-screen h2 {
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0;
	}

	.start-screen p {
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.9rem;
		margin: 0;
		max-width: 340px;
	}

	.event-id-note { font-size: 0.78rem; }
	.event-id-note code {
		background: rgba(255,255,255,0.07);
		border-radius: 5px;
		padding: 0.15rem 0.4rem;
		font-family: monospace;
	}

	.btn-start {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: white;
		border: none;
		border-radius: 14px;
		padding: 0.85rem 2rem;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(99,102,241,0.35);
		margin-top: 0.5rem;
		transition: opacity 0.15s, transform 0.15s;
	}
	.btn-start:hover { opacity: 0.88; transform: translateY(-1px); }

	.scan-viewport {
		position: relative;
		border-radius: var(--vanguard-radius, 24px);
		overflow: hidden;
		background: #000;
		min-height: 320px;
	}

	/* Override html5-qrcode default styles to fit our dark theme */
	.scan-viewport :global(#qr-reader) {
		border: none !important;
		padding: 0 !important;
		width: 100% !important;
	}
	.scan-viewport :global(#qr-reader video) {
		border-radius: var(--vanguard-radius, 24px);
	}
	.scan-viewport :global(#qr-reader__scan_region) {
		background: transparent !important;
	}

	/* Result overlay */
	.result-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: var(--vanguard-radius, 24px);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.result-valid   { background: rgba(52,211,153,0.7); }
	.result-dupe    { background: rgba(251,191,36,0.7); }
	.result-invalid { background: rgba(239,68,68,0.7); }

	.result-icon {
		font-size: 5rem;
		line-height: 1;
		color: white;
		font-weight: 900;
	}

	.result-label {
		font-size: 2rem;
		font-weight: 900;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.result-sub {
		font-size: 0.85rem;
		color: rgba(255,255,255,0.85);
	}

	/* Verifying overlay */
	.verifying-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: rgba(0,0,0,0.55);
		border-radius: var(--vanguard-radius, 24px);
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255,255,255,0.2);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	/* Stats bar */
	.stats-bar {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		padding: 0.85rem 1.25rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: var(--vanguard-radius, 24px);
		backdrop-filter: blur(12px);
	}

	.stat-chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		flex: 1;
	}

	.stat-n {
		font-size: 1.6rem;
		font-weight: 800;
		line-height: 1;
	}

	.stat-l {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.stat-chip.valid   .stat-n { color: #34d399; }
	.stat-chip.dupe    .stat-n { color: #fbbf24; }
	.stat-chip.invalid .stat-n { color: #f87171; }
	.stat-chip.queued  .stat-n { color: #a5b4fc; }

	.error-banner {
		background: rgba(239,68,68,0.12);
		border: 1px solid rgba(239,68,68,0.35);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		color: #fca5a5;
		font-size: 0.875rem;
	}
</style>
