<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * VanguardEmptyState.svelte — "Blank Slate" Day-Zero UI
	 * ───────────────────────────────────────────────────────
	 * Renders an intentional, highly-technical placeholder when a data array
	 * is empty. Never shows a blank screen.
	 *
	 * AESTHETIC
	 * ─────────
	 * - Low-opacity cyan dot-grid CSS background
	 * - Glowing diamond icon that pulses slowly
	 * - Monospaced telemetry text with blinking cursor
	 * - Single primary CTA button (link or callback)
	 *
	 * USAGE
	 * ─────
	 *   <VanguardEmptyState
	 *     title="FIXTURE TELEMETRY EMPTY"
	 *     cta="[ CREATE FIXTURE ]"
	 *     href="/coach/schedule"
	 *   />
	 *
	 *   <VanguardEmptyState
	 *     title="ROSTER GRID EMPTY"
	 *     cta="[ DEPLOY SQUAD INVITE ]"
	 *     onAction={() => openInviteModal()}
	 *   />
	 */


	interface Props {
		/** Main headline — should be SHORT_CAPS. */
		title?: string;
		/** Sub-line detail text. */
		message?: string;
		/** CTA button label. */
		cta?: string;
		/** Navigate to this href when CTA is clicked (preferred over onAction for links). */
		href?: string;
		/** Callback alternative to href. */
		onAction?: () => void;
		/** Optional override for the hex corner ref code (visual noise for authenticity). */
		refCode?: string;
	}

	const {
		title = 'VANGUARD TELEMETRY EMPTY',
		message = 'AWAITING DATA INPUT.',
		cta,
		href,
		onAction,
		refCode,
	}: Props = $props();

	// Blinking cursor
	let cursorVisible = $state(true);
	const cursorTimer = setInterval(() => { cursorVisible = !cursorVisible; }, 600);
	$effect(() => () => clearInterval(cursorTimer));

	// Corner reference code — looks like a classified document ref
	const cornerRef = $derived(
		refCode ?? '0x' + Math.abs(title.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)).toString(16).toUpperCase().padStart(6, '0').slice(0, 6),
	);
</script>

<div
	class="ves-root"
	role="status"
	aria-label={title}
>
	<!-- Dot-grid background -->
	<div class="ves-grid" aria-hidden="true"></div>

	<!-- Corner refs (top-left and bottom-right) -->
	<span class="ves-corner ves-corner--tl" aria-hidden="true">{cornerRef}</span>
	<span class="ves-corner ves-corner--br" aria-hidden="true">NULL_DATASET</span>

	<!-- Content -->
	<div class="ves-body">
		<!-- Icon: glowing diamond -->
		<div class="ves-icon" aria-hidden="true">
			<Icon name="game.diamond" size={48} class="tw-text-teal-500/70" />
		</div>

		<!-- Title + cursor -->
		<p class="ves-title">
			{title}<span class="ves-cursor" class:ves-cursor--hidden={!cursorVisible} aria-hidden="true">▋</span>
		</p>

		<!-- Message line -->
		<p class="ves-message">{message}</p>

		<!-- CTA -->
		{#if cta}
			{#if href}
				<a class="ves-cta" {href}>{cta}</a>
			{:else if onAction}
				<button class="ves-cta" onclick={onAction}>{cta}</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.ves-root {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 220px;
		overflow: hidden;
		border-radius: 4px;
		background: rgba(0, 8, 20, 0.7);
	}

	/* Dot-grid — subtle cyan dots every 20px */
	.ves-grid {
		position: absolute;
		inset: 0;
		background-image:
			radial-gradient(circle, rgba(0,255,255,0.12) 1px, transparent 1px);
		background-size: 20px 20px;
		mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent);
		pointer-events: none;
	}

	/* Corner reference codes */
	.ves-corner {
		position: absolute;
		font-family: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace;
		font-size: 9px;
		letter-spacing: 0.12em;
		color: rgba(0, 255, 255, 0.18);
		pointer-events: none;
	}
	.ves-corner--tl { top: 10px; left: 12px; }
	.ves-corner--br { bottom: 10px; right: 12px; }

	/* Content column */
	.ves-body {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 2rem;
		text-align: center;
	}

	/* Diamond icon — pulsing glow */
	.ves-icon {
		animation: ves-pulse 3s ease-in-out infinite;
		filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.3));
	}
	@keyframes ves-pulse {
		0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.25)); }
		50%       { opacity: 1;   filter: drop-shadow(0 0 18px rgba(0, 255, 255, 0.55)); }
	}

	/* Title */
	.ves-title {
		margin: 0;
		font-family: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(0, 255, 255, 0.85);
		text-shadow: 0 0 18px rgba(0, 255, 255, 0.35);
		white-space: nowrap;
	}

	/* Blinking cursor */
	.ves-cursor {
		display: inline-block;
		width: 8px;
		color: rgba(0, 255, 255, 0.9);
		transition: opacity 0.05s;
	}
	.ves-cursor--hidden { opacity: 0; }

	/* Message */
	.ves-message {
		margin: 0;
		font-family: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.15em;
		color: rgba(0, 255, 255, 0.35);
		max-width: 320px;
	}

	/* CTA button / link */
	.ves-cta {
		display: inline-flex;
		align-items: center;
		margin-top: 4px;
		padding: 8px 20px;
		font-family: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: #00ffff;
		background: rgba(0, 255, 255, 0.07);
		border: 1px solid rgba(0, 255, 255, 0.35);
		border-radius: 2px;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s, box-shadow 0.15s;
	}
	.ves-cta:hover,
	.ves-cta:focus-visible {
		background: rgba(0, 255, 255, 0.14);
		box-shadow: 0 0 16px rgba(0, 255, 255, 0.2);
		outline: none;
	}
</style>
