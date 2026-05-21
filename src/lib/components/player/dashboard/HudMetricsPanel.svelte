<script lang="ts">
	import {
		buildVanguardProtocolRows,
		extractPowerMetrics,
		hasVanguardTelemetry,
		type VanguardAxisId,
	} from '$lib/player/dashboard/vanguardProtocol.js';

	let {
		embedded = false,
		prismValues = [],
		statsRaw = null,
		selectedAxis = $bindable<VanguardAxisId | null>(null),
	}: {
		embedded?: boolean;
		prismValues?: number[];
		statsRaw?: Record<string, unknown> | null;
		selectedAxis?: VanguardAxisId | null;
	} = $props();

	const vectorRows = $derived(buildVanguardProtocolRows(prismValues));
	const telemetryReady = $derived(hasVanguardTelemetry(prismValues));
	const powerMetrics = $derived(extractPowerMetrics(statsRaw ?? null));

	function toggleAxis(id: VanguardAxisId) {
		selectedAxis = selectedAxis === id ? null : id;
	}
</script>

<div
	class="hmp-root"
	class:hmp-root--embedded={embedded}
	aria-label="HUD metrics panel"
>
	<section class="hmp-vectors" aria-label="Vanguard vectors">
		<dl class="hmp-grid hmp-grid--vectors">
			{#each vectorRows as row (row.id)}
				<div class="hmp-cell hmp-cell--selectable" class:hmp-cell--selected={selectedAxis === row.id}>
					<button
						type="button"
						class="hmp-cell__btn"
						aria-pressed={selectedAxis === row.id}
						aria-label="{row.label} {row.display}"
						onclick={() => toggleAxis(row.id)}
					>
						<span class="hmp-label">{row.label}</span>
						<span class="hmp-value">{row.display}</span>
					</button>
				</div>
			{/each}
		</dl>
	</section>

	{#if !telemetryReady}
		<p class="hmp-awaiting" role="status">AWAITING TELEMETRY</p>
	{/if}

	{#if powerMetrics.length > 0}
		<section class="hmp-power" aria-label="Match data">
			<p class="hmp-section-label">Match Data</p>
			<dl class="hmp-grid">
				{#each powerMetrics as m (m.key)}
					<div class="hmp-cell hmp-cell--secondary">
						<dt class="hmp-label">{m.label}</dt>
						<dd class="hmp-value">{m.display}</dd>
					</div>
				{/each}
			</dl>
		</section>
	{/if}
</div>

<style>
	.hmp-root {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.1em;
		padding: var(--player-hud-pad, clamp(10px, 2vw, 16px));
		border: 1px solid #334155;
		box-shadow: none;
		background: rgba(2, 2, 2, 0.7);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		display: flex;
		flex-direction: column;
		gap: clamp(6px, 1.2vw, 10px);
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.hmp-root--embedded {
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		border: none;
	}

	.hmp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
		gap: clamp(4px, 1vw, 8px);
		margin: 0;
		padding: 0;
	}

	.hmp-grid--vectors {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}

	.hmp-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0;
		border-radius: 0;
		border: 1px solid #334155;
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 88%, transparent);
		min-width: 0;
		clip-path: polygon(
			0 6px,
			6px 0,
			calc(100% - 6px) 0,
			100% 6px,
			100% calc(100% - 6px),
			calc(100% - 6px) 100%,
			6px 100%,
			0 calc(100% - 6px)
		);
	}

	.hmp-cell--selectable {
		padding: 0;
	}

	.hmp-cell__btn {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: clamp(5px, 1vw, 7px) clamp(4px, 0.8vw, 6px);
		border: none;
		background: transparent;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	.hmp-cell__btn:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent, #fbbf24) 55%, transparent);
		outline-offset: -2px;
	}

	.hmp-cell--secondary {
		padding: clamp(5px, 1vw, 7px) clamp(4px, 0.8vw, 6px);
		border-color: color-mix(in srgb, #334155 80%, transparent);
	}

	.hmp-label {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-accent, #fbbf24) 55%, #94a3b8);
	}

	.hmp-value {
		font-size: 13px;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--vanguard-text-1, #f8fafc);
		line-height: 1;
		margin: 0;
	}

	.hmp-section-label {
		margin: 0 0 clamp(4px, 0.8vw, 6px);
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-accent, #fbbf24) 45%, #64748b);
	}

	.hmp-awaiting {
		margin: 0;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #475569;
	}
</style>
