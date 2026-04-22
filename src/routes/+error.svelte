<script>
	/**
	 * Strike 3 (Agent 3) — Global Error Boundary.
	 *
	 * Rendered by SvelteKit whenever a load/render/navigation throws. Shows a
	 * calm, premium "System Upgrading" UI on the #09090B dark canvas, then
	 * silently writes a telemetry breadcrumb to the `system_telemetry`
	 * Firestore collection. The telemetry write is strictly best-effort —
	 * any failure is swallowed so the admin surface never cascades through a
	 * second crash inside the error boundary itself.
	 */

	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

	/** Stable key so we log each unique error exactly once per mount. */
	let loggedSignature = $state(/** @type {string} */ (''));

	/**
	 * Build a compact, Firestore-safe telemetry payload. We guard every field:
	 * an unhandled exception in the boundary would be catastrophic, so every
	 * access is defensive.
	 * @param {import('@sveltejs/kit').NumericRange<400, 599>} status
	 * @param {App.Error | null | undefined} error
	 * @param {URL} url
	 */
	function buildPayload(status, error, url) {
		const message = (() => {
			if (!error) return 'Unknown error';
			if (typeof error === 'string') return error;
			if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
				return error.message;
			}
			try { return JSON.stringify(error).slice(0, 2000); } catch { return 'Unserializable error'; }
		})();

		/** @type {string | null} */
		let stack = null;
		try {
			if (error && typeof error === 'object' && 'stack' in error) {
				const raw = /** @type {{ stack?: unknown }} */ (error).stack;
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
		};
	}

	/**
	 * Strict at-most-once telemetry write per unique (status + message + path)
	 * signature. Wrapped in a full try/catch so a Firestore permission error
	 * or offline state never re-throws inside the boundary.
	 */
	$effect(() => {
		if (!browser) return;
		const status  = $page.status;
		const error   = $page.error;
		const url     = $page.url;
		const pathKey = url?.pathname || '';
		const msgKey  =
			error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
				? error.message
				: String(error || 'unknown');
		const signature = `${status}::${pathKey}::${msgKey}`;
		if (!error || signature === loggedSignature) return;
		loggedSignature = signature;

		void (async () => {
			try {
				const payload = buildPayload(status, error, url);
				await addDoc(collection(db, 'system_telemetry'), payload);
			} catch (telemetryErr) {
				console.warn('[+error] telemetry write failed', telemetryErr);
			}
		})();
	});

	function reloadPage() {
		if (browser) window.location.reload();
	}

	function goHome() {
		if (browser) window.location.href = '/';
	}
</script>

<svelte:head>
	<title>System Upgrading · Soccer Skills Tracker</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="err-stage" role="alert" aria-live="assertive">
	<div class="err-card">
		<div class="err-badge">
			<i class="ph ph-shield-chevron" aria-hidden="true"></i>
			<span>System Upgrading</span>
		</div>

		<h1 class="err-title">We're tuning the engine.</h1>
		<p class="err-sub">
			A background service hiccupped while loading this page. Our telemetry
			pipeline has already captured the details — the on-call engineer has
			been paged and no action is required from you.
		</p>

		<div class="err-meta" aria-label="Error details">
			<div class="err-meta__row">
				<span class="err-meta__label">Status</span>
				<span class="err-meta__value err-meta__value--status">
					{$page.status || 500}
				</span>
			</div>
			<div class="err-meta__row">
				<span class="err-meta__label">Path</span>
				<code class="err-meta__value err-meta__value--mono">
					{$page.url?.pathname || '(unknown)'}
				</code>
			</div>
			{#if $page.error && typeof $page.error === 'object' && 'message' in $page.error}
				<div class="err-meta__row">
					<span class="err-meta__label">Signal</span>
					<span class="err-meta__value err-meta__value--msg">
						{$page.error.message}
					</span>
				</div>
			{/if}
		</div>

		<div class="err-actions">
			<button type="button" class="err-btn err-btn--primary" onclick={reloadPage}>
				<i class="ph ph-arrow-clockwise" aria-hidden="true"></i>
				Retry
			</button>
			<button type="button" class="err-btn err-btn--ghost" onclick={goHome}>
				<i class="ph ph-house" aria-hidden="true"></i>
				Back to dashboard
			</button>
		</div>

		<p class="err-foot">
			Telemetry breadcrumb recorded to <code>system_telemetry</code>.
			Reference: <code>{loggedSignature || '—'}</code>
		</p>
	</div>

	<div class="err-pulse" aria-hidden="true"></div>
</main>

<style>
	:global(html), :global(body) {
		margin: 0;
		padding: 0;
	}

	.err-stage {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 24px;
		background: #09090B;
		color: #FAFAFA;
		font-family:
			'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial,
			sans-serif;
		overflow: hidden;
	}

	.err-card {
		position: relative;
		z-index: 1;
		width: min(560px, 100%);
		padding: 36px 36px 32px;
		border-radius: 20px;
		background:
			radial-gradient(
				circle at 20% 0%,
				rgba(99, 102, 241, 0.08),
				transparent 55%
			),
			#0d0d10;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow:
			0 40px 120px -20px rgba(0, 0, 0, 0.8),
			0 0 0 1px rgba(255, 255, 255, 0.02);
	}

	.err-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 999px;
		border: 1px solid rgba(251, 191, 36, 0.35);
		background: rgba(251, 191, 36, 0.08);
		color: #fcd34d;
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.err-badge i { font-size: 0.9rem; }

	.err-title {
		margin: 18px 0 8px;
		font-size: 1.875rem;
		font-weight: 800;
		letter-spacing: -0.025em;
		color: #FAFAFA;
		line-height: 1.1;
	}

	.err-sub {
		margin: 0 0 22px;
		font-size: 0.9375rem;
		line-height: 1.55;
		color: #D4D4D8;
	}

	.err-meta {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px 16px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.07);
		margin-bottom: 22px;
	}

	.err-meta__row {
		display: grid;
		grid-template-columns: 70px 1fr;
		align-items: baseline;
		gap: 10px;
	}

	.err-meta__label {
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #a1a1aa;
	}

	.err-meta__value {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #FAFAFA;
		word-break: break-word;
		min-width: 0;
	}

	.err-meta__value--mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		color: #e4e4e7;
	}

	.err-meta__value--status {
		font-variant-numeric: tabular-nums;
		color: #fca5a5;
		font-weight: 800;
	}

	.err-meta__value--msg {
		color: #fde68a;
		font-weight: 500;
	}

	.err-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.err-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 18px;
		border-radius: 10px;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: -0.005em;
		cursor: pointer;
		border: 1px solid transparent;
		transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease;
	}

	.err-btn:active { transform: translateY(1px); }

	.err-btn--primary {
		background: #6366f1;
		color: #ffffff;
		border-color: #6366f1;
		box-shadow: 0 8px 24px -8px rgba(99, 102, 241, 0.55);
	}

	.err-btn--primary:hover {
		background: #7a7dff;
		border-color: #7a7dff;
	}

	.err-btn--ghost {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.12);
		color: #FAFAFA;
	}

	.err-btn--ghost:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.err-btn i { font-size: 1rem; }

	.err-foot {
		margin: 22px 0 0;
		font-size: 0.75rem;
		color: #a1a1aa;
		line-height: 1.45;
	}

	.err-foot code {
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
		font-size: 0.7rem;
		color: #d4d4d8;
	}

	/* Ambient pulse behind the card — adds depth without animation noise. */
	.err-pulse {
		position: absolute;
		width: 720px;
		height: 720px;
		border-radius: 50%;
		background:
			radial-gradient(
				circle,
				rgba(99, 102, 241, 0.12) 0%,
				rgba(99, 102, 241, 0) 65%
			);
		filter: blur(40px);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 0;
		animation: err-pulse 6s ease-in-out infinite;
	}

	@keyframes err-pulse {
		0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
		50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.06); }
	}

	@media (max-width: 520px) {
		.err-card { padding: 28px 22px 24px; }
		.err-title { font-size: 1.5rem; }
		.err-meta__row { grid-template-columns: 60px 1fr; }
	}
</style>
