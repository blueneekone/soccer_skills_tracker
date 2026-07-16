<script lang="ts">
	/**
	 * OpponentCard.svelte
	 * ────────────────────
	 * Trinity role: ARENA (pure presentation)
	 *
	 * Minimalist rival intelligence card displaying:
	 *  - Club name & brand color swatch
	 *  - Vanguard Threat Level (computed from H2H win/loss history)
	 *  - Win / Draw / Loss record strip
	 *  - Goal differential and win-rate meter
	 *  - Scout notes (collapsed by default, expandable)
	 *
	 * The "Vanguard Threat Level" is derived from our win rate against this
	 * opponent:
	 *   ≥ 60% → LOW     (green  — we have the edge)
	 *   40–59% → MEDIUM  (amber  — contested rivalry)
	 *   < 40% → HIGH    (red   — they have our number; pulsing beacon)
	 *   no data → UNKNOWN (slate)
	 *
	 * Usage:
	 *   <OpponentCard opponent={opp} onclick={() => viewHistory(opp.id)} />
	 *
	 * For a grid of cards, see OpponentTracker.svelte which maps over
	 *   LeagueManager.opponentsWithThreat and renders one OpponentCard each.
	 */

	import { computeThreatAssessment, type Opponent, type OpponentStats, type ThreatAssessment, type ThreatLevel } from '$lib/types/league';

	interface Props {
		opponent: Opponent & { threat?: ThreatAssessment };
		/** Invoked when the card is clicked (e.g. open history drawer). */
		onclick?: () => void;
		class?: string;
	}

	const { opponent, onclick, class: className = '' }: Props = $props();

	// Compute threat if not pre-computed by the parent (LeagueManager.opponentsWithThreat).
	const threat = $derived(opponent.threat ?? computeThreatAssessment(opponent.stats));

	// Scout notes: collapsed by default, expandable.
	let notesExpanded = $state(false);

	const hasNotes = $derived(
		Array.isArray(opponent.scoutNotes) && opponent.scoutNotes.length > 0,
	);

	function winBarWidth(stats: OpponentStats | undefined): number {
		if (!stats || stats.totalGames === 0) return 0;
		return (stats.wins / stats.totalGames) * 100;
	}

	function goalDiff(stats: OpponentStats | undefined): string {
		if (!stats || stats.totalGames === 0) return '—';
		const diff = stats.goalsFor - stats.goalsAgainst;
		return diff > 0 ? `+${diff}` : `${diff}`;
	}

	const THREAT_META: Record<
		ThreatLevel,
		{ label: string; pulse: boolean }
	> = {
		HIGH: { label: 'HIGH THREAT', pulse: true },
		MEDIUM: { label: 'MEDIUM', pulse: false },
		LOW: { label: 'LOW THREAT', pulse: false },
		UNKNOWN: { label: 'NO DATA', pulse: false },
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="oc-card {className}"
	class:oc-card--clickable={!!onclick}
	style:--threat={threat.color}
	onclick={onclick}
	role={onclick ? 'button' : 'article'}
	tabindex={onclick ? 0 : -1}
>
	<!-- ── Left accent ─────────────────────────────────────────────────────── -->
	<div class="oc-accent-bar"></div>

	<!-- ── Header row ─────────────────────────────────────────────────────── -->
	<div class="oc-header">
		<!-- Club color swatch -->
		<div
			class="oc-swatch"
			style:background={opponent.primaryColor ?? threat.color}
			title={opponent.clubName ?? opponent.name}
		></div>

		<!-- Names -->
		<div class="oc-names">
			<span class="oc-name">{opponent.name}</span>
			{#if opponent.clubName && opponent.clubName !== opponent.name}
				<span class="oc-club-name">{opponent.clubName}</span>
			{/if}
		</div>

		<!-- Threat badge -->
		<div class="oc-threat-wrap">
			<span
				class="oc-threat-beacon"
				class:oc-threat-beacon--pulse={THREAT_META[threat.level].pulse}
				style:color={threat.color}
			>●</span>
			<span class="oc-threat-label" style:color={threat.color}>
				{THREAT_META[threat.level].label}
			</span>
		</div>
	</div>

	<!-- ── Record strip ───────────────────────────────────────────────────── -->
	{#if opponent.stats && opponent.stats.totalGames > 0}
		<div class="oc-record">
			<span class="oc-stat">
				<span class="oc-stat-num oc-w">{opponent.stats.wins}</span>
				<span class="oc-stat-lbl">W</span>
			</span>
			<span class="oc-divider" aria-hidden="true">·</span>
			<span class="oc-stat">
				<span class="oc-stat-num">{opponent.stats.draws}</span>
				<span class="oc-stat-lbl">D</span>
			</span>
			<span class="oc-divider" aria-hidden="true">·</span>
			<span class="oc-stat">
				<span class="oc-stat-num oc-l">{opponent.stats.losses}</span>
				<span class="oc-stat-lbl">L</span>
			</span>

			<!-- Goal diff -->
			<span class="oc-gd">
				<span
					class="oc-stat-num"
					style:color={
						(opponent.stats.goalsFor ?? 0) > (opponent.stats.goalsAgainst ?? 0)
							? '#22c55e'
							: (opponent.stats.goalsFor ?? 0) < (opponent.stats.goalsAgainst ?? 0)
								? '#ef4444'
								: '#94a3b8'
					}
				>
					{goalDiff(opponent.stats)}
				</span>
				<span class="oc-stat-lbl">GD</span>
			</span>

			<!-- Games played -->
			<span class="oc-gp-label">
				{opponent.stats.totalGames} GP
			</span>
		</div>

		<!-- Win-rate meter -->
		<div class="oc-meter">
			<span class="oc-meter-lbl">WIN RATE</span>
			<div class="oc-meter-track" role="progressbar" aria-valuenow={winBarWidth(opponent.stats)} aria-valuemin={0} aria-valuemax={100}>
				<div class="oc-meter-fill" style:width="{winBarWidth(opponent.stats)}%"></div>
			</div>
			<span class="oc-meter-pct">{winBarWidth(opponent.stats)}%</span>
		</div>
	{:else}
		<p class="oc-no-history">NO MATCH HISTORY</p>
	{/if}

	<!-- ── Scout notes ─────────────────────────────────────────────────────── -->
	{#if hasNotes}
		<div class="oc-notes-section">
			<button
				class="oc-notes-toggle"
				onclick={(e) => {
					e.stopPropagation();
					notesExpanded = !notesExpanded;
				}}
			>
				<span class="oc-notes-toggle-icon">{notesExpanded ? '▾' : '▸'}</span>
				SCOUT NOTES ({opponent.scoutNotes!.length})
			</button>

			{#if notesExpanded}
				<ul class="oc-notes-list">
					{#each opponent.scoutNotes! as note, i (i)}
						<li class="oc-note-item">{note}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<!-- ── Threat score decorative bottom bar ────────────────────────────── -->
	<div class="oc-threat-bar" style:width="{threat.score}%"></div>
</div>

<style>
	/* ── Card ────────────────────────────────────────────────────────────── */
	.oc-card {
		position: relative;
		background: rgba(2, 6, 14, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 6px;
		padding: 1rem 1.1rem 0.85rem;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		color: #e2e8f0;
		overflow: hidden;
		transition: background 0.15s, border-color 0.15s;
	}
	.oc-card--clickable {
		cursor: pointer;
	}
	.oc-card--clickable:hover {
		background: rgba(20, 184, 166, 0.03);
		border-color: rgba(255, 255, 255, 0.1);
	}

	/* ── Left accent bar ─────────────────────────────────────────────────── */
	.oc-accent-bar {
		position: absolute;
		top: 0;
		left: 0;
		width: 2px;
		height: 100%;
		background: var(--threat);
		opacity: 0.55;
		border-radius: 6px 0 0 6px;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.oc-header {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-bottom: 0.8rem;
	}
	.oc-swatch {
		width: 30px;
		height: 30px;
		border-radius: 4px;
		flex-shrink: 0;
		margin-top: 1px;
	}
	.oc-names {
		flex: 1;
		min-width: 0;
	}
	.oc-name {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: #f1f5f9;
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.oc-club-name {
		font-size: 9px;
		color: #475569;
		letter-spacing: 0.08em;
		display: block;
		margin-top: 2px;
	}
	.oc-threat-wrap {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
		gap: 1px;
	}
	.oc-threat-beacon {
		font-size: 10px;
		line-height: 1;
	}
	.oc-threat-beacon--pulse {
		animation: oc-pulse 1.4s ease-in-out infinite;
	}
	.oc-threat-label {
		font-size: 8px;
		letter-spacing: 0.14em;
		white-space: nowrap;
	}

	/* ── Record strip ─────────────────────────────────────────────────────── */
	.oc-record {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 0.55rem;
	}
	.oc-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.oc-stat-num {
		font-size: 15px;
		font-weight: 700;
		line-height: 1;
		color: #94a3b8;
	}
	.oc-stat-lbl {
		font-size: 7px;
		letter-spacing: 0.12em;
		color: #334155;
		margin-top: 1px;
	}
	.oc-w {
		color: #22c55e;
	}
	.oc-l {
		color: #ef4444;
	}
	.oc-divider {
		color: #1e293b;
		font-size: 10px;
		align-self: center;
	}
	.oc-gd {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-left: 4px;
	}
	.oc-gp-label {
		font-size: 9px;
		color: #334155;
		letter-spacing: 0.1em;
		margin-left: auto;
		align-self: center;
	}

	/* ── Win-rate meter ──────────────────────────────────────────────────── */
	.oc-meter {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 0.5rem;
	}
	.oc-meter-lbl {
		font-size: 7px;
		letter-spacing: 0.14em;
		color: #334155;
		flex-shrink: 0;
	}
	.oc-meter-track {
		flex: 1;
		height: 3px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 2px;
		overflow: hidden;
	}
	.oc-meter-fill {
		height: 100%;
		background: var(--threat);
		border-radius: 2px;
		transition: width 0.6s ease;
	}
	.oc-meter-pct {
		font-size: 9px;
		color: #64748b;
		width: 26px;
		text-align: right;
		flex-shrink: 0;
	}

	/* ── No history ──────────────────────────────────────────────────────── */
	.oc-no-history {
		font-size: 9px;
		letter-spacing: 0.14em;
		color: #1e293b;
		margin: 0 0 0.5rem;
	}

	/* ── Scout notes ─────────────────────────────────────────────────────── */
	.oc-notes-section {
		border-top: 1px solid rgba(255, 255, 255, 0.04);
		padding-top: 0.5rem;
		margin-top: 0.25rem;
	}
	.oc-notes-toggle {
		font-family: inherit;
		font-size: 8px;
		letter-spacing: 0.14em;
		color: #475569;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		gap: 4px;
		transition: color 0.15s;
	}
	.oc-notes-toggle:hover {
		color: #94a3b8;
	}
	.oc-notes-toggle-icon {
		font-size: 10px;
		color: #14b8a6;
	}
	.oc-notes-list {
		margin: 0.4rem 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.oc-note-item {
		font-size: 10px;
		color: #64748b;
		line-height: 1.5;
		padding-left: 10px;
		position: relative;
	}
	.oc-note-item::before {
		content: '›';
		position: absolute;
		left: 0;
		color: #14b8a6;
		opacity: 0.5;
	}

	/* ── Threat score bar (decorative bottom edge) ───────────────────────── */
	.oc-threat-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 2px;
		background: var(--threat);
		opacity: 0.2;
		transition: opacity 0.2s, width 0.6s;
		pointer-events: none;
	}
	.oc-card--clickable:hover .oc-threat-bar {
		opacity: 0.45;
	}

	/* ── Animations ──────────────────────────────────────────────────────── */
	@keyframes oc-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
