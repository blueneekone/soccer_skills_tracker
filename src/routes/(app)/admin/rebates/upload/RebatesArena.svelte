<script lang="ts">
	import type { RebatesEngine } from './RebatesEngine.svelte.js';

	let { engine }: { engine: RebatesEngine } = $props();

	function formatCents(cents: number): string {
		return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}
</script>

{#if engine.phase === 'idle' || engine.phase === 'parsing'}
	<div
		class="drop-zone glass-panel"
		class:drag-active={engine.dragOver}
		role="region"
		aria-label="CSV drop zone"
		ondragover={(e) => { e.preventDefault(); engine.dragOver = true; }}
		ondragleave={() => { engine.dragOver = false; }}
		ondrop={(e) => void engine.onDrop(e)}
	>
		<div class="drop-icon">📄</div>
		<p class="drop-label">Drop a CSV file here, or</p>
		<label class="btn-browse">
			Browse File
			<input type="file" accept=".csv" style="display:none" onchange={(e) => void engine.onFileInput(e)} />
		</label>
		<p class="drop-hint">
			Required columns: <code>idempotencyKey</code>, <code>tenantId</code>,
			<code>hotelPartnerId</code>, <code>partnerCommissionCents</code><br />
			Optional: <code>periodStart</code>, <code>periodEnd</code>, <code>roomNights</code>,
			<code>linkedEventId</code>
		</p>
	</div>
{:else if engine.phase === 'previewing'}
	<div class="preview-section">
		<div class="preview-summary glass-panel">
			<div class="summary-stat">
				<span class="stat-val">{engine.rows.length}</span>
				<span class="stat-lbl">Total Rows</span>
			</div>
			<div class="summary-stat">
				<span class="stat-val ok">{engine.validRows.length}</span>
				<span class="stat-lbl">Valid</span>
			</div>
			<div class="summary-stat">
				<span class="stat-val err">{engine.errorRows.length}</span>
				<span class="stat-lbl">Errors</span>
			</div>
		</div>

		{#if engine.errorRows.length > 0}
			<div class="error-list glass-panel">
				<h3 class="list-title error-title">⚠ Rows with errors (will be skipped)</h3>
				{#each engine.errorRows as row}
					<div class="error-row">
						<code class="error-key">{row.idempotencyKey || '(no key)'}</code>
						<span class="error-msg">{row._error}</span>
					</div>
				{/each}
			</div>
		{/if}

		{#if engine.validRows.length > 0}
			<div class="preview-table-wrap glass-panel">
				<h3 class="list-title">Preview — {engine.validRows.length} rows to submit</h3>
				<div class="table-scroll">
					<table class="preview-table">
						<thead>
							<tr>
								<th>Idempotency Key</th>
								<th>Tenant / NGB</th>
								<th>Partner</th>
								<th>Commission</th>
								<th>Est. NGB Credit</th>
								<th>Period</th>
							</tr>
						</thead>
						<tbody>
							{#each engine.validRows as row}
								<tr>
									<td class="mono">{row.idempotencyKey}</td>
									<td>{row.tenantId}</td>
									<td>{row.hotelPartnerId}</td>
									<td>{formatCents(row.partnerCommissionCents)}</td>
									<td class="credit">{formatCents(row._computedNgbCreditCents ?? 0)}</td>
									<td>{row.periodStart ?? ''}{row.periodEnd ? ` → ${row.periodEnd}` : ''}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<div class="action-row">
			<button class="btn-reset" onclick={() => engine.reset()}>← Re-upload</button>
			<button
				class="btn-submit"
				onclick={() => void engine.submit()}
				disabled={engine.validRows.length === 0}
			>
				Submit {engine.validRows.length} Rebate{engine.validRows.length === 1 ? '' : 's'}
			</button>
		</div>
	</div>

{:else if engine.phase === 'submitting'}
	<div class="submitting-state glass-panel">
		<div class="spinner"></div>
		<p>Submitting {engine.validRows.length} rebate records…</p>
	</div>

{:else if engine.phase === 'done'}
	<div class="results-section glass-panel">
		<h2 class="results-title">Submission Complete</h2>
		<div class="results-grid">
			{#each engine.results as r}
				<div class="result-row" class:ok={r.ok} class:fail={!r.ok}>
					<span class="result-icon">{r.ok ? '✓' : '✗'}</span>
					<code class="result-key">{r.idempotencyKey}</code>
					<span class="result-msg">{r.msg}</span>
				</div>
			{/each}
		</div>
		<div class="done-actions">
			<button class="btn-reset" onclick={() => engine.reset()}>Upload Another</button>
		</div>
	</div>
{/if}
