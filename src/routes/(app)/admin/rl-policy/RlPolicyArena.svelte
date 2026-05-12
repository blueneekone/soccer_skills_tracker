<script lang="ts">
	/**
	 * RlPolicyArena.svelte
	 * ─────────────────────
	 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S10)
	 *
	 * Main content area for the RL policy admin console:
	 *   • Training run table (date, accepted/rejected, KL, meanQ, samples, action histogram)
	 *   • Policy controls (A/B percent slider, freeze/unfreeze toggle, rollback input)
	 */
	import type { RlPolicyEngine } from './RlPolicyEngine.svelte.js';

	type Props = { engine: RlPolicyEngine };
	const { engine }: Props = $props();

	function fmtDate(d: unknown): string {
		return String(d ?? '—');
	}
	function fmtNum(n: unknown, dp = 3): string {
		const v = Number(n);
		return Number.isFinite(v) ? v.toFixed(dp) : '—';
	}
</script>

<div class="arena">

	<!-- ── Policy Controls ─────────────────────────────────────────────────── -->
	<section class="glass-panel">
		<h2 class="panel-title">[ POLICY CONTROLS ]</h2>

		<!-- A/B percent slider -->
		<div class="control-row">
			<label class="ctrl-label">
				<span>ROLLOUT %</span>
				<span class="ctrl-val">{engine.draftAbPercent}%</span>
			</label>
			<input
				type="range"
				min="0"
				max="100"
				step="5"
				bind:value={engine.draftAbPercent}
				class="ctrl-slider"
				disabled={engine.frozen}
				aria-label="A/B rollout percentage"
			/>
			<div class="ctrl-range-ends"><span>0% (off)</span><span>100% (all)</span></div>
			<button
				type="button"
				class="ctrl-btn"
				disabled={engine.saveState === 'saving' || engine.frozen}
				onclick={() => engine.setAbPercent(engine.draftAbPercent)}
			>
				APPLY
			</button>
		</div>

		<!-- Freeze toggle -->
		<div class="control-row tw-mt-4">
			<div class="ctrl-label">
				<span>KILL SWITCH</span>
				<span class="ctrl-val" class:frozen={engine.frozen}>
					{engine.frozen ? 'FROZEN — ALL HEURISTIC' : 'ACTIVE'}
				</span>
			</div>
			<button
				type="button"
				class="ctrl-btn"
				class:ctrl-btn--danger={!engine.frozen}
				disabled={engine.saveState === 'saving'}
				onclick={() => engine.toggleFreeze()}
			>
				{engine.frozen ? 'UNFREEZE POLICY' : 'FREEZE POLICY'}
			</button>
		</div>

		<!-- Rollback -->
		<div class="control-row tw-mt-4">
			<label class="ctrl-label">
				<span>ROLLBACK TO VERSION</span>
				<span class="ctrl-val">v{engine.draftRollbackVersion}</span>
			</label>
			<div class="ctrl-inline">
				<input
					type="number"
					min="1"
					bind:value={engine.draftRollbackVersion}
					class="ctrl-input"
					aria-label="Rollback target version"
				/>
				<button
					type="button"
					class="ctrl-btn ctrl-btn--danger"
					disabled={engine.saveState === 'saving' || engine.draftRollbackVersion >= engine.policyVersion}
					onclick={() => engine.rollback(engine.draftRollbackVersion)}
				>
					ROLLBACK
				</button>
			</div>
		</div>

		{#if engine.saveState === 'error' && engine.saveError}
			<p class="ctrl-error">{engine.saveError}</p>
		{/if}
	</section>

	<!-- ── Training Runs Table ─────────────────────────────────────────────── -->
	<section class="glass-panel">
		<h2 class="panel-title">[ NIGHTLY TRAINING RUNS — LAST 30 ]</h2>

		{#if engine.trainingRuns.length === 0}
			<div class="empty-state">[ NO TRAINING RUNS YET. RUN initRlPolicy + WAIT FOR 04:00 UTC. ]</div>
		{:else}
			<div class="runs-table-wrap">
				<table class="runs-table">
					<thead>
						<tr>
							<th>DATE</th>
							<th>RESULT</th>
							<th>SAMPLES</th>
							<th>STEPS</th>
							<th>TD ERR</th>
							<th>Q ERR</th>
							<th>KL DIV</th>
							<th>DUR</th>
							<th>V BEFORE</th>
							<th>V AFTER</th>
						</tr>
					</thead>
					<tbody>
						{#each engine.trainingRuns as run}
							<tr class:accepted={run.accepted} class:rejected={!run.accepted}>
								<td class="mono">{fmtDate(run.runDate)}</td>
								<td>
									<span class="badge" class:badge-ok={run.accepted} class:badge-fail={!run.accepted}>
										{run.accepted ? 'ACCEPTED' : 'REJECTED'}
									</span>
								</td>
								<td class="mono">{run.sampleCount?.toLocaleString() ?? '—'}</td>
								<td class="mono">{run.gradientSteps ?? '—'}</td>
								<td class="mono">{fmtNum(run.meanTdError)}</td>
								<td class="mono">{fmtNum(run.meanQError)}</td>
								<td class="mono">{fmtNum(run.klDivergence)}</td>
								<td class="mono">{run.durationSeconds ?? '—'}s</td>
								<td class="mono">v{run.policyVersionBefore ?? '—'}</td>
								<td class="mono">{run.policyVersionAfter != null ? `v${run.policyVersionAfter}` : '—'}</td>
							</tr>
							{#if !run.accepted && run.rejectionReason}
								<tr class="rejection-row">
									<td colspan="10" class="rejection-reason">↳ {run.rejectionReason}</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

</div>

<style>
	.arena {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.glass-panel {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--vanguard-radius, 24px);
		backdrop-filter: blur(16px) saturate(180%);
		-webkit-backdrop-filter: blur(16px) saturate(180%);
		padding: 1.5rem;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.04) inset,
			0 8px 32px rgba(0, 0, 0, 0.25);
	}

	.panel-title {
		font-family: monospace;
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		color: rgba(0, 212, 255, 0.6);
		margin: 0 0 1.25rem;
		text-transform: uppercase;
	}

	.control-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ctrl-label {
		display: flex;
		justify-content: space-between;
		font-family: monospace;
		font-size: 0.7rem;
		font-weight: 700;
		color: rgba(226, 232, 240, 0.55);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.ctrl-val {
		color: #00d4ff;
	}

	.ctrl-val.frozen {
		color: #ff6b6b;
	}

	.ctrl-slider {
		width: 100%;
		accent-color: #00d4ff;
		cursor: pointer;
	}

	.ctrl-range-ends {
		display: flex;
		justify-content: space-between;
		font-family: monospace;
		font-size: 0.6rem;
		color: rgba(226, 232, 240, 0.25);
	}

	.ctrl-btn {
		align-self: flex-start;
		padding: 0.5rem 1.25rem;
		font-family: monospace;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		background: rgba(0, 212, 255, 0.12);
		color: #00d4ff;
		border: 1px solid rgba(0, 212, 255, 0.3);
		border-radius: 8px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.ctrl-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.ctrl-btn--danger {
		background: rgba(255, 107, 107, 0.1);
		color: #ff6b6b;
		border-color: rgba(255, 107, 107, 0.25);
	}

	.ctrl-inline {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.ctrl-input {
		width: 80px;
		padding: 0.4rem 0.6rem;
		font-family: monospace;
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #e2e8f0;
	}

	.ctrl-error {
		font-family: monospace;
		font-size: 0.7rem;
		color: #ff6b6b;
		margin: 0.5rem 0 0;
	}

	.empty-state {
		font-family: monospace;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.2);
		letter-spacing: 0.08em;
		padding: 1rem 0;
	}

	.runs-table-wrap {
		overflow-x: auto;
	}

	.runs-table {
		width: 100%;
		border-collapse: collapse;
		font-family: monospace;
		font-size: 0.65rem;
	}

	.runs-table th {
		text-align: left;
		padding: 0.35rem 0.6rem;
		color: rgba(226, 232, 240, 0.35);
		letter-spacing: 0.08em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		font-weight: 700;
		white-space: nowrap;
	}

	.runs-table td {
		padding: 0.35rem 0.6rem;
		color: rgba(226, 232, 240, 0.65);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		white-space: nowrap;
	}

	.runs-table tr.accepted td {
		border-left: 2px solid rgba(57, 255, 20, 0.3);
	}

	.runs-table tr.rejected td {
		border-left: 2px solid rgba(255, 107, 107, 0.3);
	}

	.mono {
		font-family: monospace;
	}

	.badge {
		display: inline-block;
		padding: 0.1rem 0.5rem;
		border-radius: 4px;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.1em;
	}

	.badge-ok {
		background: rgba(57, 255, 20, 0.1);
		color: #39ff14;
		border: 1px solid rgba(57, 255, 20, 0.25);
	}

	.badge-fail {
		background: rgba(255, 107, 107, 0.1);
		color: #ff6b6b;
		border: 1px solid rgba(255, 107, 107, 0.25);
	}

	.rejection-row td {
		padding: 0 0.6rem 0.4rem 1.4rem;
		color: rgba(255, 107, 107, 0.6);
		font-size: 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}
</style>
