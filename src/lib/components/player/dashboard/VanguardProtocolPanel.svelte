<script lang="ts">
	import AttributeRadar from '$lib/components/player/dashboard/AttributeRadar.svelte';
	import {
		buildVanguardProtocolRows,
		hasVanguardTelemetry,
		type VanguardAxisId,
	} from '$lib/player/dashboard/vanguardProtocol.js';

	let {
		prismValues = [],
	}: {
		prismValues?: number[];
	} = $props();

	const rows = $derived(buildVanguardProtocolRows(prismValues));
	const telemetryReady = $derived(hasVanguardTelemetry(prismValues));

	let expandedAxis = $state<VanguardAxisId | null>(null);

	function toggleAxis(id: VanguardAxisId) {
		expandedAxis = expandedAxis === id ? null : id;
	}
</script>

<section class="vpp-root" aria-labelledby="vpp-heading">
	<header class="vpp-head">
		<div class="vpp-head__copy">
			<p class="vpp-eyebrow">Vanguard Protocol</p>
			<h2 id="vpp-heading" class="vpp-title">TELEMETRY</h2>
			<p class="vpp-lede">
				PAC · ACC · POW · COMP · STM · AGI — synced from live coach telemetry. Tap a card for detail.
			</p>
		</div>
	</header>

	<div class="vpp-body">
		<div class="vpp-attributes">
			<ul class="vpp-grid" aria-label="Vanguard Protocol attribute cards">
				{#each rows as row (row.id)}
					<li class="vpp-grid__cell">
						<button
							type="button"
							class="vpp-card"
							class:vpp-card--open={expandedAxis === row.id}
							aria-expanded={expandedAxis === row.id}
							onclick={() => toggleAxis(row.id)}
						>
							<span class="vpp-card__code">{row.label}</span>
							<span class="vpp-card__score">{row.display}</span>
							<span class="vpp-card__name">{row.fullName}</span>
							<span
								class="vpp-card__bar"
								role="presentation"
								style={`--vpp-fill: ${row.pct}%;`}
							></span>
							{#if expandedAxis === row.id}
								<span class="vpp-card__detail">
									{row.fullName} rating {row.display} / 99 — {row.pct}% of peak.
								</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>

		<div class="vpp-chart" aria-label="Attribute radar">
			<AttributeRadar values={prismValues} />
		</div>
	</div>

	{#if !telemetryReady}
		<p class="vpp-awaiting" role="status">Awaiting coach telemetry — your prism will populate after verification.</p>
	{/if}
</section>

<style>
	.vpp-root {
		display: flex;
		flex-direction: column;
		gap: var(--player-hud-gap, var(--bento-gap-liquid));
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.vpp-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--bento-gap-sm, 0.75rem);
	}

	.vpp-eyebrow {
		margin: 0 0 0.25rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 70%, #94a3b8);
	}

	.vpp-title {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(1rem, 2.4vw, 1.125rem);
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.vpp-lede {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
		line-height: 1.4;
		color: #94a3b8;
		max-width: 36rem;
	}

	/* Two-column shell: attribute cards (left) + radar (right); stacks on mobile */
	.vpp-body {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
		width: 100%;
		min-width: 0;
		align-items: stretch;
	}

	@media (min-width: 768px) {
		.vpp-body {
			grid-template-columns: minmax(0, 1fr) minmax(0, clamp(220px, 38vw, 360px));
			align-items: center;
		}
	}

	.vpp-attributes {
		width: 100%;
		min-width: 0;
	}

	.vpp-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.vpp-grid__cell {
		min-width: 0;
	}

	.vpp-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		width: 100%;
		min-height: 72px;
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 16%, transparent);
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 90%, transparent);
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.12s ease;
	}

	.vpp-card:hover,
	.vpp-card--open {
		border-color: color-mix(in srgb, var(--color-structural, #3b82f6) 45%, transparent);
		background: color-mix(in srgb, var(--color-structural, #3b82f6) 10%, var(--color-dominant, #0f172a));
	}

	.vpp-card:active {
		transform: scale(0.98);
	}

	.vpp-card__code {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		color: var(--color-accent, #fbbf24);
	}

	.vpp-card__score {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(1.1rem, 3vw, 1.35rem);
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--vanguard-text-1, #f8fafc);
		line-height: 1;
	}

	.vpp-card__name {
		font-size: 0.65rem;
		font-weight: 600;
		color: #94a3b8;
	}

	.vpp-card__bar {
		display: block;
		width: 100%;
		height: 4px;
		margin-top: 0.35rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 40%, #1e293b);
		overflow: hidden;
	}

	.vpp-card__bar::after {
		content: '';
		display: block;
		height: 100%;
		width: var(--vpp-fill, 0%);
		border-radius: inherit;
		background: var(--color-structural, #3b82f6);
		transition: width 0.45s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.vpp-card__detail {
		margin-top: 0.35rem;
		font-size: 0.62rem;
		line-height: 1.35;
		color: #cbd5e1;
	}

	.vpp-chart {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-width: 0;
		padding: clamp(8px, 2vw, 16px);
		border-radius: 20px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 14%, transparent);
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 95%, #000);
		box-sizing: border-box;
	}

	.vpp-chart :global(.ar-root) {
		width: min(100%, 320px);
		max-width: 100%;
		margin-inline: auto;
	}

	.vpp-awaiting {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #64748b;
	}
</style>
