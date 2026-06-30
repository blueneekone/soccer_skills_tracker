<script>
	/**
	 * +error.svelte — VANGUARD SYSTEM ANOMALY
	 * ─────────────────────────────────────────
	 * Global SvelteKit error boundary. Rendered when any load(), action(),
	 * or server render throws an unhandled error.
	 *
	 * ZERO-TRUST DISPLAY POLICY
	 * ─────────────────────────
	 * • In production builds (import.meta.env.PROD): only the HTTP status code
	 *   and a sanitised "Signal" label are shown — no raw stack traces, no
	 *   internal paths, no DB credentials that may leak through error messages.
	 * • In development builds: the full error message is rendered for debugging.
	 * • The Firestore telemetry write captures the full message & stack server-
	 *   side (Admin SDK, bypasses rules) so no data is lost.
	 *
	 * AESTHETICS
	 * ──────────
	 * Deep critical red substrate (#3a0000) with a GLITCH animation on the
	 * Vanguard logo. The broken state must feel intentional and cinematic.
	 */

	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { telemetryTracker } from '$lib/services/telemetryTracker.svelte.js';
	import { collection, doc, serverTimestamp } from 'firebase/firestore';

	const isDev = import.meta.env.DEV;

	/** Stable key to write telemetry at-most-once per mount. */
	let loggedSignature = $state(/** @type {string} */(''));

	/**
	 * Safely extract a display-safe signal label from the error.
	 * In production: only the message, stripped of internal paths and stack lines.
	 * @param {App.Error | null | undefined} error
	 * @returns {string}
	 */
	function getSignal(error) {
		if (!error) return 'Unknown fault';
		if (typeof error === 'string') return isDev ? error.slice(0, 300) : 'Signal redacted in production.';
		if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
			const msg = error.message;
			// In production: strip anything that looks like an internal path or token
			if (!isDev) {
				const sanitised = msg.replace(/(?:at\s+\S+|\/.+?\.(?:js|ts|svelte):\d+)/g, '').trim();
				return sanitised.slice(0, 200) || 'Signal redacted in production.';
			}
			return msg.slice(0, 600);
		}
		return 'Signal redacted in production.';
	}

	/**
	 * Build the full diagnostic payload for Firestore telemetry.
	 * Captures full message + stack — only sent to Admin SDK, never displayed.
	 * @param {import('@sveltejs/kit').NumericRange<400, 599>} status
	 * @param {App.Error | null | undefined} error
	 * @param {URL} url
	 */
	function buildTelemetryPayload(status, error, url) {
		const message = (() => {
			if (!error) return 'Unknown error';
			if (typeof error === 'string') return error;
			if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
			try { return JSON.stringify(error).slice(0, 2000); } catch { return 'Unserializable error'; }
		})();
		let stack = null;
		try {
			if (error && typeof error === 'object' && 'stack' in error) {
				const raw = /** @type {{ stack?: unknown }} */(error).stack;
				stack = typeof raw === 'string' ? raw.slice(0, 8000) : null;
			}
		} catch { stack = null; }
		return {
			status: Number(status) || 500,
			message: String(message).slice(0, 2000),
			stack,
			path: url?.pathname || '(unknown)',
			search: url?.search || '',
			userAgent: browser ? String(navigator.userAgent || '').slice(0, 500) : null,
			actorEmail: authStore.user?.email || null,
			actorUid:   authStore.user?.uid   || null,
			occurredAt: new Date().toISOString(),
			createdAt:  serverTimestamp(),
			source:     'sveltekit.+error.svelte',
			env:        isDev ? 'development' : 'production',
		};
	}

	// ── Telemetry write — at-most-once per unique (status + message + path) ───
	$effect(() => {
		if (!browser) return;
		const status  = page.status;
		const error   = page.error;
		const url     = page.url;
		const pathKey = url?.pathname || '';
		const msgKey  = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
			? error.message
			: String(error || 'unknown');
		const signature = `${status}::${pathKey}::${msgKey}`;
		if (!error || signature === loggedSignature) return;
		loggedSignature = signature;
		void (async () => {
			try {
				const payload = buildTelemetryPayload(status, error, url);
				telemetryTracker.push({
					uid: authStore.user?.uid || 'ANONYMOUS',
					ref: doc(collection(db, 'system_telemetry')),
					type: 'set',
					data: payload
				});
			} catch (telemetryErr) {
				console.warn('[+error] telemetry write failed', telemetryErr);
			}
		})();
	});

	function reboot() {
		if (browser) window.location.reload();
	}

	function reportCriticalFailure() {
		if (!browser) return;
		const tenantId = authStore.userProfile?.clubId ?? authStore.tenantId ?? 'UNKNOWN';
		const uid      = authStore.user?.uid ?? 'ANONYMOUS';
		const path     = page.url?.pathname ?? '(unknown)';
		const status   = page.status ?? 500;
		const subject  = encodeURIComponent(`CRITICAL FAILURE — STATUS ${status} — ${path}`);
		const body     = encodeURIComponent(
			`[VANGUARD CRITICAL FAILURE REPORT]\n` +
			`──────────────────────────────────\n` +
			`Status:   ${status}\n` +
			`Path:     ${path}\n` +
			`Tenant:   ${tenantId}\n` +
			`UID:      ${uid}\n` +
			`Ref:      ${loggedSignature || 'NONE'}\n` +
			`Time:     ${new Date().toISOString()}\n\n` +
			`Describe what you were doing when this occurred:\n\n`,
		);
		window.open(`mailto:support@sstracker.app?subject=${subject}&body=${body}`, '_blank');
	}
</script>

<svelte:head>
	<title>SYSTEM ANOMALY · Vanguard Nexus</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="va-stage" role="alert" aria-live="assertive">

	<!-- Scanlines overlay -->
	<div class="va-scanlines" aria-hidden="true"></div>

	<!-- Ambient radial glow -->
	<div class="va-glow" aria-hidden="true"></div>

	<div class="va-card">

		<!-- Glitch logo -->
		<div class="va-logo" aria-hidden="true" data-text="VANGUARD NEXUS">
			VANGUARD NEXUS
		</div>

		<!-- Status badge -->
		<div class="va-badge">
			<span class="va-badge-dot"></span>
			SYSTEM ANOMALY · CODE {page.status || 500}
		</div>

		<!-- Primary message -->
		<h1 class="va-title">NEURAL LINK SEVERED.</h1>
		<p class="va-sub">
			A critical fault has interrupted your session. Telemetry has been
			dispatched to the on-call engineering team. No further action is
			required from you — or proceed to reboot the connection.
		</p>

		<!-- Diagnostic panel -->
		<div class="va-diag" aria-label="Fault diagnostics">
			<div class="va-diag-header">
				<span class="va-diag-label">FAULT RECORD</span>
				<span class="va-diag-ts">{new Date().toISOString().replace('T', ' ').slice(0,19)} UTC</span>
			</div>
			<div class="va-diag-row">
				<span class="va-diag-key">STATUS</span>
				<span class="va-diag-val va-diag-val--status">{page.status || 500}</span>
			</div>
			<div class="va-diag-row">
				<span class="va-diag-key">PATH</span>
				<code class="va-diag-val va-diag-val--mono">{page.url?.pathname || '(unknown)'}</code>
			</div>
			{#if page.error}
				<div class="va-diag-row">
					<span class="va-diag-key">SIGNAL</span>
					<span class="va-diag-val va-diag-val--signal">{getSignal(page.error)}</span>
				</div>
			{/if}
			{#if loggedSignature}
				<div class="va-diag-row">
					<span class="va-diag-key">REF</span>
					<code class="va-diag-val va-diag-val--mono va-diag-ref">{loggedSignature}</code>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="va-actions">
			<button type="button" class="va-btn va-btn--primary" onclick={reboot}>
				<span class="va-btn-icon">↺</span>
				[ INITIATE SYSTEM REBOOT ]
			</button>
			<button type="button" class="va-btn va-btn--ghost" onclick={reportCriticalFailure}>
				<span class="va-btn-icon">⚠</span>
				[ REPORT CRITICAL FAILURE ]
			</button>
		</div>

		<p class="va-foot">
			Fault telemetry recorded · REF: <code class="va-foot-code">{loggedSignature || '—'}</code>
		</p>
	</div>

</main>

<style>
	/* ── Reset ─────────────────────────────────────────────────────────────── */
	:global(html), :global(body) { margin: 0; padding: 0; }

	/* ── Stage ─────────────────────────────────────────────────────────────── */
	.va-stage {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 24px;
		/* Critical red — deep, intentional, not an accident */
		background:
			radial-gradient(ellipse 120% 80% at 50% 0%,   rgba(120, 0, 0, 0.7) 0%, transparent 60%),
			radial-gradient(ellipse 80% 60% at 50% 100%,  rgba(80, 0, 0, 0.5) 0%, transparent 55%),
			#1a0000;
		color: #fca5a5;
		font-family: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace;
		overflow: hidden;
		min-height: 100vh;
		min-height: 100dvh;
		box-sizing: border-box;
	}

	/* ── Scanline texture ──────────────────────────────────────────────────── */
	.va-scanlines {
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(
				to bottom,
				transparent 0px,
				transparent 2px,
				rgba(0, 0, 0, 0.15) 2px,
				rgba(0, 0, 0, 0.15) 4px
			);
		pointer-events: none;
		z-index: 0;
		mix-blend-mode: multiply;
	}

	/* ── Ambient glow ──────────────────────────────────────────────────────── */
	.va-glow {
		position: absolute;
		width: 800px; height: 800px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(200, 0, 0, 0.18) 0%, transparent 65%);
		filter: blur(60px);
		top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		z-index: 0;
		animation: va-glow-pulse 5s ease-in-out infinite;
	}
	@keyframes va-glow-pulse {
		0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
		50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.08); }
	}

	/* ── Card ──────────────────────────────────────────────────────────────── */
	.va-card {
		position: relative;
		z-index: 1;
		width: min(580px, 100%);
		padding: 32px 32px 28px;
		background:
			linear-gradient(135deg, rgba(60, 0, 0, 0.9), rgba(30, 0, 0, 0.95));
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 4px;
		box-shadow:
			0 0 0 1px rgba(239, 68, 68, 0.1),
			0 40px 100px -20px rgba(0, 0, 0, 0.9),
			inset 0 0 60px rgba(120, 0, 0, 0.12);
	}

	/* ── Glitch Logo ───────────────────────────────────────────────────────── */
	.va-logo {
		position: relative;
		font-size: 13px;
		font-weight: 900;
		letter-spacing: 0.35em;
		color: rgba(239, 68, 68, 0.6);
		text-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
		margin-bottom: 20px;
		user-select: none;
		animation: va-logo-glitch 4s steps(1) infinite;
	}
	/* Glitch pseudo-elements — shift horizontal slices at random steps */
	.va-logo::before,
	.va-logo::after {
		content: attr(data-text);
		position: absolute;
		top: 0; left: 0;
		width: 100%;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
	}
	.va-logo::before {
		clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
		animation: va-glitch-top 3.5s steps(1) infinite;
		color: rgba(255, 80, 80, 0.8);
	}
	.va-logo::after {
		clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
		animation: va-glitch-bot 4.2s steps(1) infinite;
		color: rgba(180, 0, 0, 0.7);
	}
	@keyframes va-logo-glitch {
		0%, 90%, 100% { transform: none; }
		92% { transform: translateX(-2px) skewX(-3deg); }
		94% { transform: translateX(3px) skewX(2deg); }
		96% { transform: translateX(-1px); }
	}
	@keyframes va-glitch-top {
		0%, 85%, 100% { transform: none; opacity: 0; }
		87% { transform: translateX(-4px); opacity: 1; }
		89% { transform: translateX(3px);  opacity: 1; }
		91% { opacity: 0; }
	}
	@keyframes va-glitch-bot {
		0%, 88%, 100% { transform: none; opacity: 0; }
		90% { transform: translateX(5px); opacity: 1; }
		92% { transform: translateX(-2px); opacity: 1; }
		94% { opacity: 0; }
	}

	/* ── Badge ─────────────────────────────────────────────────────────────── */
	.va-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 12px;
		font-size: 8px;
		font-weight: 800;
		letter-spacing: 0.22em;
		color: rgba(252, 165, 165, 0.9);
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.35);
		border-radius: 2px;
		margin-bottom: 16px;
	}
	.va-badge-dot {
		width: 6px; height: 6px;
		border-radius: 50%;
		background: #ef4444;
		box-shadow: 0 0 8px #ef4444;
		animation: va-dot-blink 1.2s steps(1) infinite;
	}
	@keyframes va-dot-blink {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.1; }
	}

	/* ── Primary text ──────────────────────────────────────────────────────── */
	.va-title {
		margin: 0 0 8px;
		font-size: 1.6rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		color: #fca5a5;
		line-height: 1.1;
		text-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
	}
	.va-sub {
		margin: 0 0 20px;
		font-size: 11px;
		line-height: 1.6;
		color: rgba(252, 165, 165, 0.5);
	}

	/* ── Diagnostic panel ──────────────────────────────────────────────────── */
	.va-diag {
		padding: 12px 14px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(239, 68, 68, 0.15);
		border-radius: 2px;
		margin-bottom: 20px;
	}
	.va-diag-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		padding-bottom: 6px;
		border-bottom: 1px solid rgba(239, 68, 68, 0.1);
	}
	.va-diag-label {
		font-size: 7px;
		letter-spacing: 0.25em;
		color: rgba(239, 68, 68, 0.5);
	}
	.va-diag-ts {
		font-size: 7px;
		color: rgba(239, 68, 68, 0.25);
	}
	.va-diag-row {
		display: grid;
		grid-template-columns: 64px 1fr;
		gap: 10px;
		align-items: baseline;
		padding: 3px 0;
		border-bottom: 1px solid rgba(239, 68, 68, 0.05);
	}
	.va-diag-row:last-child { border-bottom: none; }
	.va-diag-key {
		font-size: 7px;
		letter-spacing: 0.2em;
		color: rgba(239, 68, 68, 0.4);
	}
	.va-diag-val { font-size: 10px; color: rgba(252, 165, 165, 0.75); word-break: break-word; }
	.va-diag-val--status {
		font-size: 14px;
		font-weight: 900;
		color: #f87171;
		text-shadow: 0 0 10px rgba(248, 113, 113, 0.4);
	}
	.va-diag-val--mono {
		font-family: inherit;
		font-size: 9px;
		color: rgba(252, 165, 165, 0.5);
	}
	.va-diag-val--signal {
		color: rgba(251, 191, 36, 0.7);
		font-size: 10px;
	}

	/* ── Actions ───────────────────────────────────────────────────────────── */
	.va-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 0; }

	.va-btn {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 18px;
		font-family: inherit;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		cursor: pointer;
		border-radius: 2px;
		transition: background 0.15s, box-shadow 0.15s;
		min-height: 40px;
	}
	.va-btn-icon { font-size: 13px; }
	.va-btn--primary {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.55);
		color: #fca5a5;
	}
	.va-btn--primary:hover {
		background: rgba(239, 68, 68, 0.25);
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
	}
	.va-btn--ghost {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(239, 68, 68, 0.15);
		color: rgba(252, 165, 165, 0.45);
	}
	.va-btn--ghost:hover { color: rgba(252, 165, 165, 0.75); border-color: rgba(239, 68, 68, 0.3); }

	/* ── Footer ────────────────────────────────────────────────────────────── */
	.va-foot {
		margin: 16px 0 0;
		font-size: 8px;
		color: rgba(239, 68, 68, 0.2);
	}
	.va-foot-code {
		font-family: inherit;
		font-size: 7px;
		color: rgba(239, 68, 68, 0.25);
	}

	.va-diag-ref {
		font-size: 8px;
	}

	@media (max-width: 520px) {
		.va-card { padding: 24px 20px 22px; }
		.va-title { font-size: 1.25rem; }
	}
</style>
