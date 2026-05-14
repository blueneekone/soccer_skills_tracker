<script lang="ts">
	/**
	 * WeatherAlert.svelte — AEGIS Lightning Safety Banner
	 * ─────────────────────────────────────────────────────
	 * System-wide emergency override banner. Renders ONLY for coaches
	 * and directors. Explicitly returns nothing for player role.
	 *
	 * States:
	 *   DANGER  — pulsing Ares Red full-width banner with 30-min countdown
	 *   CAUTION — amber warning strip
	 *   ALL-CLEAR (countdown active) — dimmed yellow strip until 30 min elapsed
	 *
	 * The banner is designed to feel like a true system override:
	 * full-width, high-z-index, unavoidable, and persistent until safe.
	 */

	import { weatherAegis } from '$lib/services/weather.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	const role = $derived(authStore.role);

	// Strict role gate — players never see this component.
	const isVisible = $derived(
		role === 'coach' || role === 'director' ||
		role === 'global_admin' || role === 'super_admin',
	);

	const level = $derived(weatherAegis.alertLevel);
	const countdown = $derived(weatherAegis.allClearLabel);
	const lightningLabel = $derived(weatherAegis.lightningLabel);
	const nwsEvent = $derived(weatherAegis.snapshot?.lightning?.nwsEvent ?? null);
	const showBanner = $derived(
		isVisible && (level === 'DANGER' || level === 'CAUTION' || weatherAegis.allClearActive),
	);
</script>

{#if showBanner}
	<div
		class="wa-root"
		class:wa-root--danger={level === 'DANGER'}
		class:wa-root--caution={level === 'CAUTION' && !weatherAegis.allClearActive}
		class:wa-root--allclear={weatherAegis.allClearActive && level !== 'DANGER'}
		role="alert"
		aria-live="assertive"
		aria-atomic="true"
	>
		<!-- Left: icon + primary message -->
		<div class="wa-left">
			<span class="wa-icon" aria-hidden="true">
				{#if level === 'DANGER'}
					<Icon name="game.zap" size={16} />
				{:else if level === 'CAUTION'}
					<Icon name="status.warning" size={16} />
				{:else}
					<Icon name="status.pending" size={16} />
				{/if}
			</span>
			<div class="wa-msg">
				{#if level === 'DANGER'}
					<span class="wa-headline">
						CRITICAL: LIGHTNING DETECTED
						{#if lightningLabel}
							<span class="wa-distance">{lightningLabel}</span>
						{/if}
					</span>
					<span class="wa-sub">
						PROTOCOL: CLEAR PITCH IMMEDIATELY · ALL PLAYERS INDOORS
						{#if nwsEvent}· {nwsEvent.toUpperCase()}{/if}
					</span>
				{:else if level === 'CAUTION'}
					<span class="wa-headline">
						CAUTION: THUNDERSTORM ACTIVITY IN AREA
						{#if lightningLabel}<span class="wa-distance">{lightningLabel}</span>{/if}
					</span>
					<span class="wa-sub">
						{#if nwsEvent}{nwsEvent.toUpperCase()} · {/if}MONITOR CONDITIONS CLOSELY
					</span>
				{:else}
					<span class="wa-headline">ALL-CLEAR PROTOCOL ACTIVE</span>
					<span class="wa-sub">Lightning cleared. Wait for timer before resuming play (NSSL 30-30 Rule).</span>
				{/if}
			</div>
		</div>

		<!-- Right: countdown -->
		{#if weatherAegis.allClearActive}
			<div class="wa-countdown" aria-label="All-clear countdown">
				<span class="wa-countdown__label">RESUME IN</span>
				<span class="wa-countdown__time">{countdown}</span>
			</div>
		{/if}
	</div>
{/if}

<style>
	.wa-root {
		position: relative;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.65rem 1.25rem;
		font-family: 'JetBrains Mono', monospace;
		z-index: 900;
		overflow: hidden;
		border-bottom: 1px solid currentColor;
	}

	/* ── DANGER state — Ares Red system override ────────────────────────────── */
	.wa-root--danger {
		background: rgba(255, 0, 51, 0.12);
		border-color: rgba(255, 0, 51, 0.5);
		animation: aegisPulse 1.4s ease-in-out infinite;
	}
	.wa-root--danger::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 0, 51, 0.08) 50%,
			transparent 100%
		);
		animation: aegisScan 2.5s linear infinite;
		pointer-events: none;
	}

	/* ── CAUTION state — amber ──────────────────────────────────────────────── */
	.wa-root--caution {
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.35);
	}

	/* ── ALL-CLEAR state — dim yellow ──────────────────────────────────────── */
	.wa-root--allclear {
		background: rgba(234, 179, 8, 0.05);
		border-color: rgba(234, 179, 8, 0.2);
	}

	/* ── Left section ────────────────────────────────────────────────────────── */
	.wa-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.wa-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
		animation: none;
	}
	.wa-root--danger .wa-icon {
		color: #ff0033;
		filter: drop-shadow(0 0 6px rgba(255, 0, 51, 0.8));
		animation: iconFlash 0.7s step-end infinite;
	}
	.wa-root--caution .wa-icon { color: rgba(245, 158, 11, 0.9); }
	.wa-root--allclear .wa-icon { color: rgba(234, 179, 8, 0.6); }

	.wa-msg {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.wa-headline {
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.wa-root--danger .wa-headline { color: #ff0033; }
	.wa-root--caution .wa-headline { color: rgba(245, 158, 11, 0.95); }
	.wa-root--allclear .wa-headline { color: rgba(234, 179, 8, 0.75); }

	.wa-distance {
		display: inline-flex;
		align-items: center;
		padding: 1px 6px;
		border-radius: 3px;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.12em;
	}
	.wa-root--danger .wa-distance {
		background: rgba(255, 0, 51, 0.18);
		border: 1px solid rgba(255, 0, 51, 0.4);
		color: #ff4466;
	}
	.wa-root--caution .wa-distance {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.3);
		color: rgba(245, 158, 11, 0.9);
	}

	.wa-sub {
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Countdown ───────────────────────────────────────────────────────────── */
	.wa-countdown {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		flex-shrink: 0;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.08);
		min-width: 68px;
	}
	.wa-countdown__label {
		font-size: 0.45rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.3);
	}
	.wa-countdown__time {
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		font-variant-numeric: tabular-nums;
	}
	.wa-root--danger .wa-countdown__time { color: #ff4466; }
	.wa-root--caution .wa-countdown__time { color: rgba(245, 158, 11, 0.9); }
	.wa-root--allclear .wa-countdown__time { color: rgba(234, 179, 8, 0.7); }

	/* ── Animations ─────────────────────────────────────────────────────────── */
	@keyframes aegisPulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(255, 0, 51, 0); }
		50% {
			background: rgba(255, 0, 51, 0.18);
			box-shadow: 0 4px 30px rgba(255, 0, 51, 0.3);
		}
	}

	@keyframes aegisScan {
		from { transform: translateX(-100%); }
		to   { transform: translateX(200%); }
	}

	@keyframes iconFlash {
		0%, 49% { opacity: 1; }
		50%, 100% { opacity: 0.2; }
	}

	@media (max-width: 500px) {
		.wa-sub { display: none; }
		.wa-countdown { min-width: 56px; }
	}
</style>
