<script lang="ts">
	import AttributeRadar from '$lib/components/player/dashboard/AttributeRadar.svelte';
	import {
		buildVanguardProtocolRows,
		type VanguardAxisId,
	} from '$lib/player/dashboard/vanguardProtocol.js';

	let {
		prismValues = [],
		selectedAxis = $bindable<VanguardAxisId | null>(null),
		compact = false,
	}: {
		prismValues?: number[];
		selectedAxis?: VanguardAxisId | null;
		compact?: boolean;
	} = $props();

	const rows = $derived(buildVanguardProtocolRows(prismValues));
	const selectedRow = $derived(rows.find((r) => r.id === selectedAxis) ?? null);

	function handleAxisSelect(id: VanguardAxisId) {
		selectedAxis = selectedAxis === id ? null : id;
	}
</script>

<section class="vpp-root vpp-root--premium" class:vpp-root--compact={compact} aria-labelledby="vpp-heading">
	<header class="vpp-head vpp-head--premium">
		<div class="vpp-head__copy">
			<p class="vpp-eyebrow">Vanguard Protocol</p>
			<h2 id="vpp-heading" class="vpp-title">TELEMETRY</h2>
			{#if !compact}
				<p class="vpp-lede">
					Tap a vector in the hub or radar to inspect.
				</p>
			{/if}
		</div>
	</header>

	<div class="vpp-body">
		<div class="vpp-chart vpp-chart--premium" aria-label="Attribute radar">
			<AttributeRadar
				values={prismValues}
				{selectedAxis}
				onAxisSelect={handleAxisSelect}
			/>
		</div>

		<div
			class="vpp-inspector vpp-inspector--premium"
			class:vpp-inspector--selected={!!selectedRow}
			class:vpp-inspector--idle={!selectedRow}
			aria-label="Vector detail inspector"
		>
			{#if selectedRow}
				<div class="vpp-inspector__detail">
					<span class="vpp-inspector__code">{selectedRow.label}</span>
					<h3 class="vpp-inspector__name">{selectedRow.fullName}</h3>
					<p class="vpp-inspector__score">
						<span class="vpp-inspector__score-val">{selectedRow.display}</span>
						<span class="vpp-inspector__score-max">/99</span>
					</p>
					<span
						class="vpp-inspector__bar"
						role="presentation"
						style={`--vpp-fill: ${selectedRow.pct}%;`}
					></span>
					<p class="vpp-inspector__detail-text">
						{selectedRow.fullName} rating {selectedRow.display} / 99 — {selectedRow.pct}% of peak.
					</p>
				</div>
			{:else}
				<div
					class="vpp-inspector__empty vpp-inspector__empty--dossier"
					class:vpp-inspector__empty--compact={compact}
					role="status"
				>
					<div class="vpp-inspector__empty-icon" aria-hidden="true"></div>
					<div class="vpp-empty-state__copy">
						<p class="vpp-inspector__empty-title">Awaiting coach telemetry</p>
						<p class="vpp-inspector__empty-copy">Log a session to unlock vector detail.</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
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
		color: var(--pd-accent-data-bright, rgba(0, 212, 255, 0.55));
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
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		line-height: 1.4;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
		max-width: 36rem;
	}

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
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			align-items: center;
		}
	}

	.vpp-chart {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-width: 0;
		padding: clamp(8px, 2vw, 16px);
		border-radius: 0;
		box-sizing: border-box;
	}

	.vpp-chart :global(.ar-root) {
		width: min(100%, 320px);
		max-width: 100%;
		margin-inline: auto;
	}

	.vpp-inspector {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: auto;
		padding: clamp(8px, 1.5vw, 12px);
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		background: var(--pd-panel, #05050a);
	}

	.vpp-inspector__detail {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.vpp-inspector__code {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		color: var(--pd-accent-data, #14b8a6);
	}

	.vpp-inspector__name {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.9rem, 2vw, 1.05rem);
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.vpp-inspector__score {
		margin: 0.15rem 0 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		line-height: 1;
	}

	.vpp-inspector__score-val {
		font-size: clamp(1.25rem, 3.5vw, 1.6rem);
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.vpp-inspector__score-max {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
		margin-left: 0.15rem;
	}

	.vpp-inspector__bar {
		display: block;
		width: 100%;
		height: 4px;
		margin-top: 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--pd-panel, #05050a) 60%, transparent);
		overflow: hidden;
	}

	.vpp-inspector__bar::after {
		content: '';
		display: block;
		height: 100%;
		width: var(--vpp-fill, 0%);
		border-radius: inherit;
		background: var(--pd-accent-data, #14b8a6);
		transition: width 0.45s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.vpp-inspector__detail-text {
		margin: 0.5rem 0 0;
		font-size: 0.7rem;
		line-height: 1.4;
		color: #cbd5e1;
	}

	.vpp-inspector__ghost {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #475569;
	}
</style>
