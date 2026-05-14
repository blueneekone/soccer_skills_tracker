<script lang="ts">
	/**
	 * WeatherWidget.svelte — AEGIS Live Weather Display Cards
	 * ─────────────────────────────────────────────────────────
	 * Drop-in replacement for the mocked weather section on the coach page.
	 * Accepts `lat` and `lng` props; binds to the shared `weatherAegis`
	 * singleton.
	 *
	 * Renders:
	 *   • 4 metric cards: Temperature, Wind, Humidity, Precip Risk
	 *   • GO / HOLD / NO-GO deployment status badge
	 *   • LIGHTNING status pill when CAUTION or DANGER
	 *   • Coordinate display
	 *   • Refresh button (manual force-poll)
	 */

	import { weatherAegis } from '$lib/services/weather.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		lat?: number;
		lng?: number;
		/** Override coordinates display label. E.g. "LAT 41.633° N  ·  LON 111.851° W" */
		coordsLabel?: string;
	}

	const { lat = 41.633, lng = -111.851, coordsLabel }: Props = $props();

	const role = $derived(authStore.role ?? '');
	const snap = $derived(weatherAegis.snapshot);
	const level = $derived(weatherAegis.alertLevel);
	const status = $derived(weatherAegis.deploymentStatus);
	const loading = $derived(weatherAegis.loading);
	const err = $derived(weatherAegis.error);

	const displayCoords = $derived(
		coordsLabel ??
		`LAT ${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}  ·  LON ${Math.abs(lng).toFixed(3)}° ${lng >= 0 ? 'E' : 'W'}`,
	);

	const statusClass = $derived(
		status === 'GO' ? 'ww-badge--go' :
		status === 'HOLD' ? 'ww-badge--hold' : 'ww-badge--nogo',
	);

	const headerBorderClass = $derived(
		level === 'DANGER' ? 'ww-article--danger' :
		level === 'CAUTION' ? 'ww-article--caution' : '',
	);

	function fmtTemp(f: number | undefined): string {
		return f !== undefined ? String(Math.round(f)) : '--';
	}
	function fmtNum(n: number | undefined): string {
		return n !== undefined ? String(Math.round(n)) : '--';
	}

	$effect(() => {
		weatherAegis.init(lat, lng, role);
		return () => weatherAegis.destroy();
	});
</script>

<article
	class="ww-article {headerBorderClass}"
	aria-label="Live Weather Monitoring"
>
	<header class="ww-header">
		<div class="ww-header__left">
		{#if level === 'DANGER'}
			<Icon name={"game.zap" as IconName} size={16} style="color:#ff0033;" aria-hidden="true" />
		{:else if level === 'CAUTION'}
			<Icon name={"status.warning" as IconName} size={16} style="color:rgba(245,158,11,0.9);" aria-hidden="true" />
		{:else}
			<Icon name={"env.weather" as IconName} size={16} class="tw-text-[#00f0ff]" aria-hidden="true" />
		{/if}
			<h2 class="ww-title">
				Weather Monitoring ·
				<span class="ww-live">{loading ? 'UPDATING…' : 'LIVE'}</span>
			</h2>
		</div>

		<div class="ww-header__right">
			<!-- Lightning pill -->
			{#if level !== 'NORMAL'}
				<span class="ww-lightning-pill" class:ww-lightning-pill--danger={level === 'DANGER'}>
					<span class="ww-lightning-pill__dot"></span>
					{level === 'DANGER' ? `⚡ LIGHTNING ${weatherAegis.lightningLabel ?? ''}` : '⚠ STORM WATCH'}
				</span>
			{/if}

			<!-- GO/HOLD/NO-GO badge -->
			<span class="ww-badge {statusClass}">
				<span class="ww-badge__dot"></span>
				DEPLOYMENT · {status}
			</span>

			<!-- Manual refresh -->
			<button
				class="ww-refresh"
				onclick={() => weatherAegis.refresh()}
				disabled={loading}
				aria-label="Refresh weather"
				title="Refresh weather data"
			>
				<Icon name={"nav.refresh" as IconName} class={loading ? 'ww-spin' : ''} aria-hidden="true" />
			</button>
		</div>
	</header>

	{#if err}
	<p class="ww-error">
		<Icon name={"status.warning-circle" as IconName} aria-hidden="true" />
		{err}
			<button class="ww-error__retry" onclick={() => weatherAegis.refresh()}>RETRY</button>
		</p>
	{/if}

	<!-- Metric cards -->
	<div class="ww-grid">
		<div class="ww-card">
			<span class="ww-card__label">TEMPERATURE</span>
			<span class="ww-card__value">{fmtTemp(snap?.current?.temperatureF)}<span class="ww-card__unit">°F</span></span>
			<span class="ww-card__sub">{snap?.current?.conditionsLabel ?? '—'}</span>
		</div>
		<div class="ww-card">
			<span class="ww-card__label">WIND</span>
			<span class="ww-card__value">{fmtNum(snap?.current?.windMph)}<span class="ww-card__unit"> MPH</span></span>
			<span class="ww-card__sub">{snap?.current?.windDirection ?? '—'} · {(snap?.current?.windMph ?? 0) < 10 ? 'CALM' : (snap?.current?.windMph ?? 0) < 20 ? 'LIGHT BREEZE' : (snap?.current?.windMph ?? 0) < 30 ? 'MODERATE' : 'STRONG'}</span>
		</div>
		<div class="ww-card">
			<span class="ww-card__label">HUMIDITY</span>
			<span class="ww-card__value">{fmtNum(snap?.current?.humidity)}<span class="ww-card__unit">%</span></span>
			<span class="ww-card__sub">UV INDEX {fmtNum(snap?.current?.uvIndex)}</span>
		</div>
		<div class="ww-card" class:ww-card--warning={((snap?.current?.precipProbability ?? 0) >= 50)}>
			<span class="ww-card__label">PRECIP RISK</span>
			<span class="ww-card__value">{fmtNum(snap?.current?.precipProbability)}<span class="ww-card__unit">%</span></span>
			<span class="ww-card__sub">NEXT 6H</span>
		</div>
	</div>

	<!-- Coordinates footer -->
	<div class="ww-footer">
		<span class="ww-coords">{displayCoords}</span>
		{#if snap?.fetchedAt}
			<span class="ww-fetchtime">
				UPDATED {new Date(snap.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
			</span>
		{:else if !loading}
			<span class="ww-fetchtime">NOT YET FETCHED</span>
		{/if}
	</div>

	<!-- All-clear countdown bar -->
	{#if weatherAegis.allClearActive}
		<div class="ww-allclear">
			<span class="ww-allclear__icon">◷</span>
			<span class="ww-allclear__text">ALL-CLEAR IN <strong>{weatherAegis.allClearLabel}</strong> (NSSL 30-30 RULE)</span>
		</div>
	{/if}
</article>

<style>
	.ww-article {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 280px;
		overflow: hidden;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(2, 2, 2, 0.8);
		padding: 1.25rem;
		backdrop-filter: blur(24px);
		box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.06);
		transition: border-color 0.4s ease, box-shadow 0.4s ease;
	}
	.ww-article--danger {
		border-color: rgba(255, 0, 51, 0.5);
		box-shadow: 0 0 40px rgba(255, 0, 51, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.06);
		animation: ww-dangerPulse 1.6s ease-in-out infinite;
	}
	.ww-article--caution {
		border-color: rgba(245, 158, 11, 0.4);
		box-shadow: 0 0 30px rgba(245, 158, 11, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.06);
	}

	/* ── Header ──────────────────────────────────────────────────────────────── */
	.ww-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 0.75rem;
		margin-bottom: 1rem;
	}
	.ww-header__left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.ww-header__right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.ww-title {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: white;
	}
	.ww-live {
		color: rgba(0, 240, 255, 0.7);
	}

	/* ── Lightning pill ─────────────────────────────────────────────────────── */
	.ww-lightning-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 2px 8px;
		border-radius: 9999px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		border: 1px solid rgba(245, 158, 11, 0.4);
		background: rgba(245, 158, 11, 0.08);
		color: rgba(245, 158, 11, 0.9);
	}
	.ww-lightning-pill--danger {
		border-color: rgba(255, 0, 51, 0.5);
		background: rgba(255, 0, 51, 0.1);
		color: #ff4466;
		animation: ww-dangerPulse 1s ease-in-out infinite;
	}
	.ww-lightning-pill__dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 4px currentColor;
	}

	/* ── GO / HOLD / NO-GO badge ────────────────────────────────────────────── */
	.ww-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 4px 10px;
		border-radius: 9999px;
		border: 1px solid;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.25em;
		text-transform: uppercase;
	}
	.ww-badge--go {
		border-color: rgba(0, 240, 255, 0.55);
		background: rgba(0, 240, 255, 0.1);
		color: #00f0ff;
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.3);
	}
	.ww-badge--hold {
		border-color: rgba(245, 158, 11, 0.5);
		background: rgba(245, 158, 11, 0.08);
		color: rgba(245, 158, 11, 0.9);
	}
	.ww-badge--nogo {
		border-color: rgba(255, 0, 51, 0.55);
		background: rgba(255, 0, 51, 0.1);
		color: #ff0033;
		box-shadow: 0 0 12px rgba(255, 0, 51, 0.25);
		animation: ww-badgePulse 1.4s ease-in-out infinite;
	}
	.ww-badge__dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 4px currentColor;
	}
	.ww-badge--nogo .ww-badge__dot,
	.ww-badge--go .ww-badge__dot {
		animation: ww-dotPulse 1.2s ease-in-out infinite;
	}

	/* ── Refresh button ─────────────────────────────────────────────────────── */
	.ww-refresh {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.3);
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
		font-size: 0.85rem;
	}
	.ww-refresh:hover:not(:disabled) {
		color: #00f0ff;
		border-color: rgba(0, 240, 255, 0.4);
	}
	.ww-refresh:disabled { opacity: 0.4; cursor: not-allowed; }
	.ww-spin { animation: ww-spin 0.8s linear infinite; }

	/* ── Error strip ─────────────────────────────────────────────────────────── */
	.ww-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(255, 0, 51, 0.08);
		border: 1px solid rgba(255, 0, 51, 0.2);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		color: rgba(255, 80, 100, 0.9);
	}
	.ww-error__retry {
		margin-left: auto;
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 0, 51, 0.3);
		background: rgba(255, 0, 51, 0.1);
		color: rgba(255, 80, 100, 0.9);
		font-family: inherit;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
	}

	/* ── Metric grid ─────────────────────────────────────────────────────────── */
	.ww-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--bento-gap-sm);
		flex: 1;
	}
	@media (min-width: 30rem) {
		.ww-grid { grid-template-columns: repeat(4, 1fr); }
	}

	.ww-card {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(0, 0, 0, 0.3);
		padding: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		transition: border-color 0.3s;
	}
	.ww-card--warning {
		border-color: rgba(245, 158, 11, 0.25);
		background: rgba(245, 158, 11, 0.04);
	}
	.ww-card__label {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.35);
		text-transform: uppercase;
	}
	.ww-card__value {
		font-size: 1.5rem;
		font-weight: 900;
		color: white;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.ww-card__unit {
		font-size: 0.8rem;
		color: rgba(0, 240, 255, 0.7);
	}
	.ww-card__sub {
		font-size: 0.55rem;
		color: rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-top: 0.15rem;
	}
	.ww-card--warning .ww-card__value {
		color: rgba(245, 158, 11, 0.9);
	}

	/* ── Footer ──────────────────────────────────────────────────────────────── */
	.ww-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.6rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		font-family: 'JetBrains Mono', monospace;
	}
	.ww-coords {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.06em;
	}
	.ww-fetchtime {
		font-size: 0.5rem;
		color: rgba(255, 255, 255, 0.2);
		letter-spacing: 0.08em;
	}

	/* ── All-clear bar ───────────────────────────────────────────────────────── */
	.ww-allclear {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.6rem;
		padding: 0.4rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(234, 179, 8, 0.05);
		border: 1px solid rgba(234, 179, 8, 0.2);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		color: rgba(234, 179, 8, 0.7);
	}
	.ww-allclear__icon {
		font-size: 0.85rem;
		color: rgba(234, 179, 8, 0.6);
	}
	.ww-allclear__text strong {
		font-weight: 900;
		color: rgba(234, 179, 8, 0.9);
		font-variant-numeric: tabular-nums;
	}

	/* ── Keyframes ───────────────────────────────────────────────────────────── */
	@keyframes ww-dangerPulse {
		0%, 100% { box-shadow: 0 0 40px rgba(255, 0, 51, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.06); }
		50% { box-shadow: 0 0 60px rgba(255, 0, 51, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.06); }
	}
	@keyframes ww-badgePulse {
		0%, 100% { box-shadow: 0 0 12px rgba(255, 0, 51, 0.25); }
		50% { box-shadow: 0 0 22px rgba(255, 0, 51, 0.5); }
	}
	@keyframes ww-dotPulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}
	@keyframes ww-spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
</style>
