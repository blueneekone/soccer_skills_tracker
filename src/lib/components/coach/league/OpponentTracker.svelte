<script lang="ts">
	/**
	 * OpponentTracker.svelte
	 * ──────────────────────
	 * Trinity role: ARENA (grid layout — delegates card rendering to OpponentCard)
	 *
	 * Scouting intelligence grid.  Accepts the pre-sorted `opponentsWithThreat`
	 * array from `LeagueManager` and renders one `OpponentCard` per rival.
	 *
	 * Props:
	 *   opponents       — opponents with pre-computed threat (from LeagueManager.opponentsWithThreat)
	 *   onOpponentClick — optional callback when a card is selected
	 */

	import { type Opponent, type ThreatAssessment } from '$lib/types/league';
	import OpponentCard from './OpponentCard.svelte';

	type OpponentWithThreat = Opponent & {
		threat?: ThreatAssessment;
	};

	interface Props {
		opponents?: OpponentWithThreat[];
		onOpponentClick?: (opponent: Opponent) => void;
		class?: string;
	}

	const { opponents = [], onOpponentClick, class: className = '' }: Props = $props();

	// ── Threat filter ─────────────────────────────────────────────────────────
	type ThreatFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
	let threatFilter = $state<ThreatFilter>('ALL');

	const filtered = $derived(
		threatFilter === 'ALL' ? opponents : opponents.filter((o) => o.threat.level === threatFilter),
	);

	const FILTER_TABS: { key: ThreatFilter; label: string; color: string }[] = [
		{ key: 'ALL', label: 'ALL', color: '#64748b' },
		{ key: 'HIGH', label: 'HIGH', color: '#ef4444' },
		{ key: 'MEDIUM', label: 'MED', color: '#f59e0b' },
		{ key: 'LOW', label: 'LOW', color: '#22c55e' },
		{ key: 'UNKNOWN', label: '?', color: '#475569' },
	];
</script>

<div class="ot-root {className}">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="ot-header">
		<div class="ot-header-left">
			<span class="ot-eyebrow">INTEL TERMINAL</span>
			<h2 class="ot-title">SCOUTING INTEL</h2>
		</div>
		<div class="ot-header-right">
			<span class="ot-stat"
				>{opponents.length}<span class="ot-stat-label">RIVALS</span></span
			>
		</div>
	</div>

	<!-- ── Threat filter ─────────────────────────────────────────────────────── -->
	<div class="ot-filter-bar">
		{#each FILTER_TABS as tab (tab.key)}
			<button
				class="ot-filter-btn"
				class:ot-filter-btn--active={threatFilter === tab.key}
				style:--tab-accent={tab.color}
				onclick={() => (threatFilter = tab.key)}
			>
				<span class="ot-filter-dot" style:background={tab.color}></span>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- ── Cards grid ─────────────────────────────────────────────────────────── -->
	{#if filtered.length === 0}
		<div class="ot-empty">
			<span class="ot-empty-icon" aria-hidden="true">◈</span>
			<p>No opponents in scouting directory.</p>
		</div>
	{:else}
		<div class="ot-grid">
			{#each filtered as opp (opp.id)}
				<OpponentCard
					opponent={opp}
					onclick={onOpponentClick ? () => onOpponentClick!(opp) : undefined}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.ot-root {
		background: rgba(1, 4, 9, 0.85);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 8px;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		color: #e2e8f0;
		overflow: hidden;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.ot-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding: 1.25rem 1.5rem 0.75rem;
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
	}
	.ot-eyebrow {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: #14b8a6;
		display: block;
		margin-bottom: 3px;
	}
	.ot-title {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		margin: 0;
		color: #f8fafc;
	}
	.ot-stat {
		font-size: 1.4rem;
		font-weight: 700;
		color: #14b8a6;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.ot-stat-label {
		font-size: 9px;
		letter-spacing: 0.2em;
		color: #475569;
	}

	/* ── Filter bar ──────────────────────────────────────────────────────── */
	.ot-filter-bar {
		display: flex;
		gap: 4px;
		padding: 0.6rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	.ot-filter-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.15em;
		padding: 3px 9px;
		border-radius: 2px;
		border: 1px solid transparent;
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
	}
	.ot-filter-btn:hover {
		color: #94a3b8;
	}
	.ot-filter-btn--active {
		background: rgba(from var(--tab-accent) r g b / 0.08);
		border-color: color-mix(in srgb, var(--tab-accent) 40%, transparent);
		color: var(--tab-accent);
	}
	.ot-filter-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* ── Card grid ───────────────────────────────────────────────────────── */
	.ot-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1px;
		background: rgba(255, 255, 255, 0.03);
		padding: 1px;
	}

	/* ── Empty state ─────────────────────────────────────────────────────── */
	.ot-empty {
		text-align: center;
		padding: 3rem 2rem;
		color: #475569;
		font-size: 12px;
		letter-spacing: 0.08em;
	}
	.ot-empty-icon {
		display: block;
		font-size: 2rem;
		margin-bottom: 0.75rem;
		opacity: 0.3;
	}
</style>
