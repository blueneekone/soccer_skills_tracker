<script lang="ts">
	import type { OperativeCardMetadata } from '$lib/gamification/cardCollectibleMetadata.js';

	let {
		cardMetadata = undefined,
		telemetryTitle = 'OPERATIVE TELEMETRY',
		hasTelemetryDetails = false,
		telemetryTotalXp = '',
		telemetryWorkouts = '',
		telemetryJoinDate = '',
		showIllustratorCredit = true,
	}: {
		cardMetadata?: OperativeCardMetadata;
		telemetryTitle?: string;
		hasTelemetryDetails?: boolean;
		telemetryTotalXp?: string;
		telemetryWorkouts?: string;
		telemetryJoinDate?: string;
		showIllustratorCredit?: boolean;
	} = $props();
</script>

<div class="ppc-back-root">
	<div class="ppc-back-watermark" aria-hidden="true">
		<span class="ppc-back-watermark__glyph">S1</span>
		<span class="ppc-back-watermark__deck">OPERATIVE DECK</span>
	</div>

	<p
		class="ppc-back-kicker tw-m-0 tw-mb-2 tw-shrink-0 tw-text-center tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.28em] tw-text-slate-500"
	>
		{telemetryTitle}
	</p>

	{#if cardMetadata?.flavorText}
		<p class="ppc-back-flavor qa-mono">{cardMetadata.flavorText}</p>
	{/if}

	{#if cardMetadata}
		<p class="ppc-back-collector qa-mono" aria-label="Collector number">
			{cardMetadata.setId} · {cardMetadata.collectorNumber}
		</p>
	{/if}

	{#if hasTelemetryDetails}
		<dl class="ppc-back-telemetry tw-m-0 tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-2 tw-overflow-y-auto tw-pr-1 tw-text-sm">
			{#if telemetryTotalXp !== ''}
				<div class="ppc-back-row">
					<dt class="tw-m-0 tw-text-slate-500">Total XP</dt>
					<dd class="tw-m-0 tw-font-mono tw-tabular-nums tw-text-cyan-300">{telemetryTotalXp}</dd>
				</div>
			{/if}
			{#if telemetryWorkouts !== ''}
				<div class="ppc-back-row">
					<dt class="tw-m-0 tw-text-slate-500">Workouts logged</dt>
					<dd class="tw-m-0 tw-font-mono tw-tabular-nums tw-text-cyan-300">{telemetryWorkouts}</dd>
				</div>
			{/if}
			{#if telemetryJoinDate !== ''}
				<div class="ppc-back-row">
					<dt class="tw-m-0 tw-text-slate-500">Join date</dt>
					<dd class="tw-m-0 tw-text-right tw-font-mono tw-text-xs tw-text-cyan-200/90 [overflow-wrap:anywhere]">
						{telemetryJoinDate}
					</dd>
				</div>
			{/if}
		</dl>
	{:else}
		<p class="ppc-back-empty tw-m-0 tw-flex-1 tw-text-center tw-font-mono tw-text-[11px] tw-text-slate-600">—</p>
	{/if}

	{#if showIllustratorCredit}
		<p class="ppc-back-credit qa-mono">Illus. SSTracker</p>
	{/if}

	{#if cardMetadata?.promoStamp}
		<p class="ppc-back-promo qa-mono">{cardMetadata.promoStamp}</p>
	{/if}
</div>

<style>
	.ppc-back-root {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}

	.ppc-back-watermark {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		opacity: 0.08;
		user-select: none;
	}

	.ppc-back-watermark__glyph {
		font-size: 4.5rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: #14b8a6;
		line-height: 1;
	}

	.ppc-back-watermark__deck {
		margin-top: 0.35rem;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		color: #94a3b8;
	}

	.ppc-back-flavor {
		position: relative;
		z-index: 1;
		margin: 0 0 0.65rem;
		padding: 0.55rem 0.65rem;
		font-size: 0.62rem;
		line-height: 1.45;
		letter-spacing: 0.04em;
		color: rgba(226, 232, 240, 0.82);
		border: 1px solid rgba(148, 163, 184, 0.22);
		border-radius: 0.35rem;
		background: rgba(15, 23, 42, 0.45);
	}

	.ppc-back-collector {
		position: relative;
		z-index: 1;
		margin: 0 0 0.75rem;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-align: center;
		color: rgba(148, 163, 184, 0.85);
	}

	.ppc-back-row {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(51, 65, 85, 0.9);
	}

	.ppc-back-credit,
	.ppc-back-promo {
		position: relative;
		z-index: 1;
		margin: 0.65rem 0 0;
		font-size: 0.52rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-align: right;
		color: rgba(100, 116, 139, 0.85);
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}
</style>
