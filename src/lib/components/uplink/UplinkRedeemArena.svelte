<script lang="ts">
	/**
	 * UplinkRedeemArena.svelte
	 * ─────────────────────────
	 * Glass layer — renders the uplink redemption experience.
	 * All states: redeeming · success · expired · consumed_elsewhere · revoked
	 *             · invalid_token · error
	 *
	 * Techno-futurist Vanguard aesthetic: neon-cyan glassmorphism, animated
	 * cyber glyph during load, clean feedback panels for each error state.
	 */

	import type { UplinkRedeemEngine, RedeemState } from './UplinkRedeemEngine.svelte.js';

	const { engine }: { engine: UplinkRedeemEngine } = $props();

	const state = $derived(engine.state);
	const errorMessage = $derived(engine.errorMessage);

	type StateConfig = {
		icon: string;
		title: string;
		body: string;
		color: 'cyan' | 'green' | 'amber' | 'red';
		showContact: boolean;
	};

	const STATE_CONFIG: Record<RedeemState, StateConfig> = {
		idle: {
			icon: '⚡',
			title: 'Preparing…',
			body: 'Initialising secure channel.',
			color: 'cyan',
			showContact: false,
		},
		redeeming: {
			icon: '⚡',
			title: 'Verifying uplink…',
			body: 'Authenticating your invite token with the Vanguard secure enclave.',
			color: 'cyan',
			showContact: false,
		},
		signing_in: {
			icon: '🔑',
			title: 'Signing you in…',
			body: 'Custom token received. Establishing your session.',
			color: 'cyan',
			showContact: false,
		},
		success: {
			icon: '✅',
			title: 'Access granted',
			body: 'Welcome. Redirecting you to your dashboard…',
			color: 'green',
			showContact: false,
		},
		expired: {
			icon: '⏱',
			title: 'Uplink expired',
			body: 'This invite link has passed its expiry date. Request a fresh one from your director or coach.',
			color: 'amber',
			showContact: true,
		},
		consumed_elsewhere: {
			icon: '🔒',
			title: 'Already used',
			body: 'This uplink was already redeemed. Each link is single-use. Contact your director if you need access.',
			color: 'amber',
			showContact: true,
		},
		revoked: {
			icon: '🚫',
			title: 'Uplink revoked',
			body: 'This invite was cancelled by your director or administrator. Please request a new invitation.',
			color: 'red',
			showContact: true,
		},
		invalid_token: {
			icon: '⚠',
			title: 'Invalid link',
			body: 'This uplink token is not recognised. Make sure you copied the full link from your email.',
			color: 'red',
			showContact: true,
		},
		error: {
			icon: '💥',
			title: 'Unexpected error',
			body: 'Something went wrong on our end. Please try again or contact your director.',
			color: 'red',
			showContact: true,
		},
	};

	const cfg = $derived(STATE_CONFIG[state] ?? STATE_CONFIG.error);
	const isLoading = $derived(state === 'idle' || state === 'redeeming' || state === 'signing_in');

	const colorVars: Record<'cyan' | 'green' | 'amber' | 'red', string> = {
		cyan:  '0,240,255',
		green: '0,230,130',
		amber: '240,199,94',
		red:   '255,77,106',
	};
	const rgb = $derived(colorVars[cfg.color]);
</script>

<div class="arena">
	<div class="card" style="--accent: {rgb}">
		<!-- Animated glyph / icon -->
		<div class="icon-wrap" class:pulse={isLoading}>
			<span class="glyph">{cfg.icon}</span>
			{#if isLoading}
				<div class="spinner" aria-hidden="true"></div>
			{/if}
		</div>

		<div class="badge">MAGIC UPLINK</div>
		<h1 class="title">{cfg.title}</h1>
		<p class="body-text">{cfg.body}</p>

		{#if state === 'error' && errorMessage}
			<pre class="error-detail">{errorMessage}</pre>
		{/if}

		{#if cfg.showContact}
			<div class="contact-block">
				<p class="contact-label">Need a new invitation?</p>
				<a href="mailto:?subject=Please%20resend%20my%20Vanguard%20invite" class="contact-link">
					Request a new uplink from your director
				</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.arena {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(16px, 5vw, 40px);
		background: radial-gradient(ellipse at 30% 20%, rgba(20, 184, 166,0.05), transparent 60%),
		            radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.06), transparent 60%),
		            #020208;
	}

	.card {
		--accent: 0,240,255;
		width: 100%;
		max-width: 520px;
		background: rgba(8,10,18,0.85);
		border: 1px solid rgba(var(--accent), 0.22);
		border-radius: 24px;
		padding: clamp(28px, 6vw, 48px);
		text-align: center;
		backdrop-filter: blur(20px);
		box-shadow:
			0 0 0 1px rgba(var(--accent), 0.08),
			0 8px 32px rgba(0,0,0,0.6),
			0 0 80px rgba(var(--accent), 0.04);
	}

	.icon-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		margin: 0 auto 20px;
		border-radius: 50%;
		background: rgba(var(--accent), 0.08);
		border: 1px solid rgba(var(--accent), 0.2);
	}

	.glyph {
		font-size: 32px;
		line-height: 1;
		position: relative;
		z-index: 1;
	}

	.spinner {
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 2px solid transparent;
		border-top-color: rgba(var(--accent), 0.8);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.pulse .icon-wrap {
		animation: pulse-glow 2s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent), 0.3); }
		50%       { box-shadow: 0 0 0 8px rgba(var(--accent), 0); }
	}

	.badge {
		display: inline-block;
		background: rgba(var(--accent), 0.1);
		border: 1px solid rgba(var(--accent), 0.3);
		border-radius: 6px;
		padding: 3px 10px;
		font-family: monospace;
		font-size: 10px;
		color: rgb(var(--accent));
		letter-spacing: 0.18em;
		margin-bottom: 14px;
	}

	.title {
		margin: 0 0 12px;
		font-size: clamp(20px, 4vw, 26px);
		font-weight: 900;
		color: #ffffff;
		letter-spacing: 0.03em;
	}

	.body-text {
		margin: 0 0 20px;
		font-size: 14px;
		line-height: 1.7;
		color: rgba(255,255,255,0.55);
	}

	.error-detail {
		background: rgba(255,77,106,0.06);
		border: 1px solid rgba(255,77,106,0.15);
		border-radius: 8px;
		padding: 12px;
		font-family: monospace;
		font-size: 11px;
		color: rgba(255,77,106,0.7);
		text-align: left;
		white-space: pre-wrap;
		word-break: break-all;
		margin-bottom: 16px;
	}

	.contact-block {
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid rgba(255,255,255,0.07);
	}

	.contact-label {
		margin: 0 0 8px;
		font-size: 12px;
		color: rgba(255,255,255,0.3);
	}

	.contact-link {
		font-size: 13px;
		color: rgba(var(--accent), 0.8);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.contact-link:hover {
		color: rgb(var(--accent));
	}
</style>
