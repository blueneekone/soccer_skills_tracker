<script lang="ts">
	import {
		extractPowerMetrics,
	} from '$lib/player/dashboard/vanguardProtocol.js';
	import { formatCompactXp } from '$lib/player/dashboard/playerHudMetrics.js';

	let {
		statsRaw = null,
		level = 1,
		rankName = '',
		totalXp = 0,
		streak = 0,
		longestStreak = 0,
	}: {
		statsRaw?: Record<string, unknown> | null;
		level?: number;
		rankName?: string;
		totalXp?: number;
		streak?: number;
		longestStreak?: number;
	} = $props();

	const powerMetrics = $derived(extractPowerMetrics(statsRaw ?? null));
	const xpLabel = $derived(formatCompactXp(totalXp));
</script>

<div class="hmp-root" aria-label="HUD metrics panel">
	<section class="hmp-primary" aria-label="Primary stats">
		<dl class="hmp-grid">
			<div class="hmp-cell">
				<dt class="hmp-label">LVL</dt>
				<dd class="hmp-value">{String(level).padStart(2, '0')}</dd>
			</div>
			<div class="hmp-cell">
				<dt class="hmp-label">Rank</dt>
				<dd class="hmp-value hmp-value--rank">{rankName || '—'}</dd>
			</div>
			<div class="hmp-cell">
				<dt class="hmp-label">Total XP</dt>
				<dd class="hmp-value">{xpLabel}</dd>
			</div>
			<div class="hmp-cell">
				<dt class="hmp-label">Streak</dt>
				<dd class="hmp-value hmp-value--streak">{streak}d</dd>
			</div>
			<div class="hmp-cell">
				<dt class="hmp-label">Best</dt>
				<dd class="hmp-value">{longestStreak}d</dd>
			</div>
		</dl>
	</section>

	{#if powerMetrics.length > 0}
		<section class="hmp-power" aria-label="Match data">
			<p class="hmp-section-label">Match Data</p>
			<dl class="hmp-grid">
				{#each powerMetrics as m (m.key)}
					<div class="hmp-cell">
						<dt class="hmp-label">{m.label}</dt>
						<dd class="hmp-value">{m.display}</dd>
					</div>
				{/each}
			</dl>
		</section>
	{:else}
		<p class="hmp-awaiting" role="status">Awaiting match data</p>
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
		gap: clamp(8px, 1.5vw, 12px);
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.hmp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: clamp(6px, 1.2vw, 10px);
		margin: 0;
		padding: 0;
	}

	.hmp-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: clamp(6px, 1.2vw, 8px) clamp(5px, 1vw, 7px);
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 14%, transparent);
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 85%, transparent);
	}

	.hmp-label {
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-structural, #3b82f6);
	}

	.hmp-value {
		font-size: 13px;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--vanguard-text-1, #f8fafc);
		line-height: 1;
		margin: 0;
	}

	.hmp-value--rank {
		font-size: 10px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hmp-value--streak {
		color: var(--color-accent, #fbbf24);
	}

	.hmp-section-label {
		margin: 0 0 clamp(6px, 1vw, 8px);
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 60%, #94a3b8);
	}

	.hmp-awaiting {
		margin: 0;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #475569;
	}
</style>
