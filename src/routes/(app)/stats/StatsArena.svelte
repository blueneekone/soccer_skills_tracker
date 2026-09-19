<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import VanguardProtocolPanel from '$lib/components/player/dashboard/VanguardProtocolPanel.svelte';
	import type { StatsEngine } from './StatsEngine.svelte.js';

	let { engine }: { engine: StatsEngine } = $props();
</script>

<div
	class="dossier-grid tw-font-mono"
	class:bento-grid={engine.isPlayerRole}
	class:bento-grid--12col={engine.isPlayerRole}
	class:bento-grid--liquid={engine.isPlayerRole}
	role="region"
	aria-label="Skill radar and analytics"
>
	<section
		class="stats-analytics-void pd-os-deck pd-os-deck--recessed bento-span-12 tw-font-mono"
		class:stats-analytics-void--compact={!engine.telemetryReady}
		data-region="stats-analytics-void"
		aria-label="Vanguard protocol telemetry"
	>
		<header class="pd-hq-section-head stats-analytics-void__head tw-font-mono">
			<h2 class="pd-hq-section-head__title stats-analytics-void__title tw-font-mono">Vanguard telemetry</h2>
			<p class="pd-hq-section-head__eyebrow pd-label stats-analytics-void__eyebrow tw-font-mono">Performance</p>
		</header>
		<VanguardProtocolPanel
			prismValues={engine.attrRadarValues}
			bind:selectedAxis={engine.selectedVanguardAxis}
			compact={!engine.telemetryReady}
			hideHeadTitle={true}
		/>
	</section>

	<div class={engine.isPlayerRole ? "pd-os-deck-shadow-wrap" : ""} style={engine.isPlayerRole ? "filter: drop-shadow(12px 12px 0 var(--pd-void-base, #000000));" : ""}>
	<section
		class="dossier-workout pd-panel-section"
		class:stats-workout-band={engine.isPlayerRole}
		class:pd-os-deck={engine.isPlayerRole}
		class:pd-os-deck--hero={engine.isPlayerRole}
		class:bento-span-12={engine.isPlayerRole}
		class:dossier-panel={!engine.isPlayerRole}
		class:pd-page-panel={!engine.isPlayerRole}
		aria-label="Workout telemetry"
	>
		{#if engine.isPlayerRole}
			<header class="pd-hq-section-head stats-workout-band__head tw-font-mono">
				<h2 class="pd-hq-section-head__title stats-workout-band__title tw-font-mono">Workout telemetry</h2>
				<p class="pd-hq-section-head__eyebrow pd-label stats-workout-band__eyebrow tw-font-mono">Training</p>
			</header>
		{:else}
		<div class="dossier-radar__head">
			<span class="dossier-label">Workout telemetry</span>
			<span class="dossier-mono dossier-tx-tag">
				{engine.workoutViewMode === 'daily' ?
					'WX_DAILY_14' :
					engine.workoutViewMode === 'weekly' ?
						'WX_WEEK_8' :
						'WX_MONTHLY'}
			</span>
		</div>
		{/if}
		<div
			class="dossier-workout__seg"
			class:stats-chip-rail={engine.isPlayerRole}
			role="group"
			aria-label="Workout aggregation window"
		>
			<button
				type="button"
				class:dossier-seg={!engine.isPlayerRole}
				class:dossier-seg--on={!engine.isPlayerRole && engine.workoutViewMode === 'daily'}
				class:stats-chip={engine.isPlayerRole}
				class:stats-chip--on={engine.isPlayerRole && engine.workoutViewMode === 'daily'}
				onclick={() => (engine.workoutViewMode = 'daily')}
			>
				Daily
			</button>
			<button
				type="button"
				class:dossier-seg={!engine.isPlayerRole}
				class:dossier-seg--on={!engine.isPlayerRole && engine.workoutViewMode === 'weekly'}
				class:stats-chip={engine.isPlayerRole}
				class:stats-chip--on={engine.isPlayerRole && engine.workoutViewMode === 'weekly'}
				onclick={() => (engine.workoutViewMode = 'weekly')}
			>
				Weekly
			</button>
			<button
				type="button"
				class:dossier-seg={!engine.isPlayerRole}
				class:dossier-seg--on={!engine.isPlayerRole && engine.workoutViewMode === 'monthly'}
				class:stats-chip={engine.isPlayerRole}
				class:stats-chip--on={engine.isPlayerRole && engine.workoutViewMode === 'monthly'}
				onclick={() => (engine.workoutViewMode = 'monthly')}
			>
				Monthly
			</button>
		</div>
		<p class="dossier-radar__hint no-print" class:stats-workout-band__hint={engine.isPlayerRole}>
			Training XP from workout logs — UTC day / Monday-week / calendar-month buckets (toggle above)
		</p>
		<div
			class="dossier-workout__chart tw-min-w-0 tw-h-[300px] tw-relative"
			class:pd-os-deck__well={engine.isPlayerRole}
		>
			<canvas
				bind:this={engine.workoutCanvas}
				class="dossier-canvas"
				aria-label="Training XP trend by selected period"
			></canvas>
		</div>
		{#if !engine.isPlayerRole}
		<div class="dossier-radar__footer font-mono dossier-radar__footer-tx">
			{#if engine.workoutViewMode === 'daily'}
				SERIES=DAILY · N={engine.dailyPerformance.length} · UTC · XP
			{:else if engine.workoutViewMode === 'weekly'}
				SERIES=WEEKLY · N={engine.weeklyPerformance.length} · MON_START · XP
			{:else}
				SERIES=MONTHLY · N={engine.monthlyPerformance.length} · YYYY-MM · XP
			{/if}
		</div>
		{/if}
	</section>
	</div>
</div>

<section
	class="pd-panel-section bento-span-12"
	class:stats-achievement-deck={engine.isPlayerRole}
	class:dossier-panel={!engine.isPlayerRole}
	class:dossier-badges={!engine.isPlayerRole}
	class:pd-page-panel={!engine.isPlayerRole}
	id="trophy-room"
	aria-label="Achievement matrix"
>
	{#if engine.isPlayerRole}
		<header class="pd-hq-section-head stats-achievement-deck__head tw-font-mono">
			<div class="stats-achievement-deck__id tw-font-mono">
				<h2 class="pd-hq-section-head__title stats-achievement-deck__title tw-font-mono">Achievement matrix</h2>
				<p class="pd-hq-section-head__eyebrow pd-label stats-achievement-deck__eyebrow tw-font-mono">Asset registry</p>
			</div>
			<div class="stats-achievement-deck__status tw-font-mono" role="status">
				<p class="pd-label pd-mono">
					UNL={engine.badges.filter((b) => b.unlocked).length} · LCK={engine.badges.filter((b) => !b.unlocked).length}
				</p>
			</div>
		</header>
	{:else}
	<div class="dossier-badges__head">
		<div>
			<span class="dossier-label">Asset registry</span>
			<h3 class="dossier-badges__title">ACHIEVEMENT_MATRIX</h3>
		</div>
		<div class="dossier-badges__stat font-mono dossier-statline">
			UNL={engine.badges.filter((b) => b.unlocked).length} · LCK={engine.badges.filter((b) => !b.unlocked).length}
		</div>
	</div>
	{/if}
	<div
		class="dossier-badges__grid tw-font-mono"
		class:stats-achievement-deck__grid={engine.isPlayerRole}
		role="list"
	>
		{#each engine.badges as b, i (b.id)}
			<div
				class="dossier-badge"
				class:pd-os-deck={engine.isPlayerRole}
				class:stats-achievement-row={engine.isPlayerRole}
				class:stats-achievement-row--unlocked={engine.isPlayerRole && b.unlocked}
				class:stats-achievement-row--elite={engine.isPlayerRole && b.unlocked && b.tier === 'elite'}
				class:dossier-badge--unlocked={!engine.isPlayerRole && b.unlocked}
				class:dossier-badge--elite={!engine.isPlayerRole && b.unlocked && b.tier === 'elite'}
				role="listitem"
			>
				<div
					class="dossier-badge__icon"
					aria-hidden="true"
					class:dossier-badge__icon--locked={!b.unlocked}
				>
					<Icon name={b.icon} />
				</div>
				<div class="dossier-badge__text font-mono">
					{#if b.unlocked}
						<span class="dossier-badge__label">{b.title}</span>
					{:else}
						<span class="dossier-badge__obscure">{engine.lockedLine(b, i)}</span>
					{/if}
				</div>
				<div class="dossier-badge__meta font-mono">
					{b.unlocked ? 'SIG_OK' : 'LOCKED'}
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.dossier-label {
		display: block;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}

	.dossier-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--bento-gap-sm);
		margin-bottom: var(--bento-gap-sm);
	}

	:global(.player-hud-root.pos-stats) .dossier-grid {
		grid-template-columns: 1fr;
	}

	:global(.player-hud-root.pos-stats) .dossier-grid > :is(.stats-analytics-void, .dossier-workout) {
		grid-column: 1 / -1;
		min-width: 0;
		width: 100%;
	}

	@media (min-width: 60rem) {
		.dossier-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.dossier-workout {
			grid-column: 1 / -1;
		}

		:global(.player-hud-root.pos-stats) .dossier-grid {
			grid-template-columns: 1fr;
		}
	}

	.dossier-panel {
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		border-radius: 0;
		padding: var(--bento-pad-sm);
		min-width: 0;
	}

	.dossier-mono {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.7);
	}
	.dossier-tx-tag {
		color: rgba(110, 231, 183, 0.85);
	}
	.dossier-statline {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.4);
	}
	.dossier-radar__footer-tx {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.35);
	}

	.dossier-radar__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.dossier-workout__seg {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0 0 0.5rem;
	}

	.dossier-seg {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding: 6px 10px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(0, 0, 0, 0.35);
		color: rgba(226, 232, 240, 0.75);
		border-radius: 0;
		cursor: pointer;
	}

	.dossier-seg--on {
		border-color: rgba(45, 212, 191, 0.75);
		color: rgba(167, 243, 208, 0.95);
		background: rgba(6, 78, 59, 0.25);
	}

	.dossier-radar__hint {
		margin: 0 0 0.5rem;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		font-weight: 600;
	}

	.dossier-canvas {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}

	.dossier-radar__footer {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.dossier-badges__head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	.dossier-badges__title {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		color: rgba(255, 255, 255, 0.9);
	}

	.dossier-badges__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--bento-gap-xs);
	}

	@media (min-width: 40rem) {
		.dossier-badges__grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 69rem) {
		.dossier-badges__grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.dossier-badge {
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		background: #000;
		padding: 0.5rem 0.45rem 0.4rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		text-align: center;
	}

	.dossier-badge--unlocked {
		border-color: rgba(20, 184, 166, 0.28);
		box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.15);
	}

	.dossier-badge--elite {
		border-color: rgba(0, 255, 200, 0.45);
		box-shadow:
			0 0 0 1px rgba(0, 255, 200, 0.25),
			0 0 18px rgba(0, 255, 200, 0.2);
	}

	.dossier-badge--unlocked .dossier-badge__label {
		color: #e0f2fe;
		text-shadow: 0 0 8px rgba(20, 184, 166, 0.35);
	}

	.dossier-badge--elite .dossier-badge__icon {
		color: #5eead4;
		filter: drop-shadow(0 0 6px rgba(0, 255, 200, 0.55));
	}

	.dossier-badge__icon :global(svg) {
		width: 1.45rem;
		height: 1.45rem;
		color: rgba(20, 184, 166, 0.9);
	}
	.dossier-badge__icon--locked {
		color: rgba(255, 255, 255, 0.2);
		filter: grayscale(1) brightness(0.6);
	}

	.dossier-badge__text {
		font-size: 0.6rem;
		letter-spacing: 0.04em;
		line-height: 1.25;
		word-break: break-all;
	}

	.dossier-badge__obscure {
		color: rgba(255, 255, 255, 0.32);
		letter-spacing: 0.08em;
	}

	.dossier-badge__meta {
		font-size: 0.5rem;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.12em;
	}

	.dossier-badge--unlocked .dossier-badge__meta {
		color: rgba(52, 211, 153, 0.65);
	}

	.font-mono {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}
	.tw-min-w-0 {
		min-width: 0;
	}
	.tw-h-\[300px\] {
		height: 300px;
	}
	.tw-relative {
		position: relative;
	}

	.dossier-workout__chart {
		width: 100%;
		min-height: 300px;
	}

	.dossier-workout .dossier-canvas {
		width: 100% !important;
		height: 100% !important;
	}
</style>
