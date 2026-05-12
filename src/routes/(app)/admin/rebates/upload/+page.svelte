<script lang="ts">
	import { goto } from '$app/navigation';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';

	// ── Guard: super_admin only ─────────────────────────────────────────────
	$effect(() => {
		const role = authStore.userProfile?.role ?? '';
		if (!['super_admin', 'global_admin'].includes(role)) {
			goto('/director');
		}
	});

	interface RebateRow {
		/** Partner settlement reference — used as idempotencyKey */
		idempotencyKey: string;
		tenantId: string;
		hotelPartnerId: string;
		partnerCommissionCents: number;
		periodStart?: string;
		periodEnd?: string;
		roomNights?: number;
		linkedEventId?: string;
		// Computed preview fields
		_computedNgbCreditCents?: number;
		_error?: string;
	}

	type UploadPhase = 'idle' | 'parsing' | 'previewing' | 'submitting' | 'done';

	let phase = $state<UploadPhase>('idle');
	let rows = $state<RebateRow[]>([]);
	let results = $state<{ idempotencyKey: string; ok: boolean; msg: string }[]>([]);
	let globalError = $state('');
	let dragOver = $state(false);

	const REBATE_RATE_PCT = 70; // 70% goes to NGB (preview only — actual rate from live policy)

	// ── CSV parsing ─────────────────────────────────────────────────────────

	async function handleFile(file: File) {
		if (!file.name.endsWith('.csv')) {
			globalError = 'Please upload a .csv file.';
			return;
		}
		phase = 'parsing';
		globalError = '';
		const Papa = (await import('papaparse')).default;
		Papa.parse<Record<string, string>>(file, {
			header: true,
			skipEmptyLines: true,
			complete: (result) => {
				const parsed = result.data.map((raw) => {
					const idempotencyKey = (raw.idempotencyKey || raw.settlement_ref || '').trim();
					const tenantId = (raw.tenantId || raw.ngb_id || '').trim();
					const hotelPartnerId = (raw.hotelPartnerId || raw.partner_id || '').trim();
					const cents = Math.round(parseFloat(raw.partnerCommissionCents || raw.commission_cents || '0'));

					const row: RebateRow = {
						idempotencyKey,
						tenantId,
						hotelPartnerId,
						partnerCommissionCents: cents,
						periodStart: (raw.periodStart || raw.period_start || '').trim() || undefined,
						periodEnd: (raw.periodEnd || raw.period_end || '').trim() || undefined,
						roomNights: raw.roomNights ? parseInt(raw.roomNights, 10) : undefined,
						linkedEventId: (raw.linkedEventId || raw.event_id || '').trim() || undefined,
					};

					// Client-side preview estimate
					row._computedNgbCreditCents = Math.round(cents * (REBATE_RATE_PCT / 100));

					// Validation
					const errors: string[] = [];
					if (!idempotencyKey) errors.push('idempotencyKey missing');
					if (!tenantId) errors.push('tenantId missing');
					if (!hotelPartnerId) errors.push('hotelPartnerId missing');
					if (!Number.isInteger(cents) || cents <= 0) errors.push('invalid partnerCommissionCents');
					if (errors.length) row._error = errors.join('; ');

					return row;
				});

				// Detect duplicate idempotencyKeys within the file
				const seen = new Set<string>();
				for (const r of parsed) {
					if (!r._error && r.idempotencyKey) {
						if (seen.has(r.idempotencyKey)) {
							r._error = `Duplicate idempotencyKey in file: "${r.idempotencyKey}"`;
						} else {
							seen.add(r.idempotencyKey);
						}
					}
				}

				rows = parsed;
				phase = 'previewing';
			},
			error: (err) => {
				globalError = `CSV parse error: ${err.message}`;
				phase = 'idle';
			},
		});
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) handleFile(file);
	}

	function onFileInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) handleFile(file);
	}

	function reset() {
		rows = [];
		results = [];
		phase = 'idle';
		globalError = '';
	}

	// ── Submit ──────────────────────────────────────────────────────────────

	const validRows = $derived(rows.filter((r) => !r._error));
	const errorRows = $derived(rows.filter((r) => !!r._error));

	async function submit() {
		if (validRows.length === 0) return;
		phase = 'submitting';
		results = [];
		const fns = getFunctions(undefined, 'us-east1');
		const submitRecord = httpsCallable<Record<string, unknown>, Record<string, unknown>>(
			fns,
			'submitHotelRebateRecord',
		);

		for (const row of validRows) {
			try {
				await submitRecord({
					tenantId: row.tenantId,
					hotelPartnerId: row.hotelPartnerId,
					partnerCommissionCents: row.partnerCommissionCents,
					idempotencyKey: row.idempotencyKey,
					periodStart: row.periodStart,
					periodEnd: row.periodEnd,
					roomNights: row.roomNights,
					linkedEventId: row.linkedEventId,
				});
				results.push({ idempotencyKey: row.idempotencyKey, ok: true, msg: 'Recorded' });
			} catch (e: unknown) {
				results.push({
					idempotencyKey: row.idempotencyKey,
					ok: false,
					msg: e instanceof Error ? e.message : String(e),
				});
			}
		}
		phase = 'done';
	}

	function formatCents(cents: number): string {
		return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}
</script>

<div class="upload-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Hotel Rebate CSV Upload</h1>
			<p class="page-subtitle">
				Fallback console for filing hotel block rebates without a partner API integration.
			</p>
		</div>
	</header>

	{#if globalError}
		<div class="alert alert-error">{globalError}</div>
	{/if}

	{#if phase === 'idle' || phase === 'parsing'}
		<div
			class="drop-zone glass-panel"
			class:drag-active={dragOver}
			role="region"
			aria-label="CSV drop zone"
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => { dragOver = false; }}
			ondrop={onDrop}
		>
			<div class="drop-icon">📄</div>
			<p class="drop-label">Drop a CSV file here, or</p>
			<label class="btn-browse">
				Browse File
				<input type="file" accept=".csv" style="display:none" onchange={onFileInput} />
			</label>
			<p class="drop-hint">
				Required columns: <code>idempotencyKey</code>, <code>tenantId</code>,
				<code>hotelPartnerId</code>, <code>partnerCommissionCents</code><br />
				Optional: <code>periodStart</code>, <code>periodEnd</code>, <code>roomNights</code>,
				<code>linkedEventId</code>
			</p>
		</div>
	{:else if phase === 'previewing'}
		<div class="preview-section">
			<div class="preview-summary glass-panel">
				<div class="summary-stat">
					<span class="stat-val">{rows.length}</span>
					<span class="stat-lbl">Total Rows</span>
				</div>
				<div class="summary-stat">
					<span class="stat-val ok">{validRows.length}</span>
					<span class="stat-lbl">Valid</span>
				</div>
				<div class="summary-stat">
					<span class="stat-val err">{errorRows.length}</span>
					<span class="stat-lbl">Errors</span>
				</div>
			</div>

			{#if errorRows.length > 0}
				<div class="error-list glass-panel">
					<h3 class="list-title error-title">⚠ Rows with errors (will be skipped)</h3>
					{#each errorRows as row}
						<div class="error-row">
							<code class="error-key">{row.idempotencyKey || '(no key)'}</code>
							<span class="error-msg">{row._error}</span>
						</div>
					{/each}
				</div>
			{/if}

			{#if validRows.length > 0}
				<div class="preview-table-wrap glass-panel">
					<h3 class="list-title">Preview — {validRows.length} rows to submit</h3>
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
								{#each validRows as row}
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
				<button class="btn-reset" onclick={reset}>← Re-upload</button>
				<button
					class="btn-submit"
					onclick={submit}
					disabled={validRows.length === 0}
				>
					Submit {validRows.length} Rebate{validRows.length === 1 ? '' : 's'}
				</button>
			</div>
		</div>

	{:else if phase === 'submitting'}
		<div class="submitting-state glass-panel">
			<div class="spinner"></div>
			<p>Submitting {validRows.length} rebate records…</p>
		</div>

	{:else if phase === 'done'}
		<div class="results-section glass-panel">
			<h2 class="results-title">Submission Complete</h2>
			<div class="results-grid">
				{#each results as r}
					<div class="result-row" class:ok={r.ok} class:fail={!r.ok}>
						<span class="result-icon">{r.ok ? '✓' : '✗'}</span>
						<code class="result-key">{r.idempotencyKey}</code>
						<span class="result-msg">{r.msg}</span>
					</div>
				{/each}
			</div>
			<div class="done-actions">
				<button class="btn-reset" onclick={reset}>Upload Another</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.upload-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-title {
		font-size: clamp(1.4rem, 3vw, 2rem);
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 0.25rem;
	}

	.page-subtitle {
		color: var(--vanguard-text-muted, #94a3b8);
		margin: 0;
		font-size: 0.9rem;
	}

	.alert {
		border-radius: 12px;
		padding: 0.85rem 1.2rem;
		font-size: 0.875rem;
	}
	.alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); color: #fca5a5; }

	.glass-panel {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: var(--vanguard-radius, 24px);
		padding: clamp(1.25rem, 3vw, 2rem);
		box-shadow:
			0 2px 6px rgba(0,0,0,0.3),
			0 6px 20px rgba(0,0,0,0.2),
			inset 0 1px 0 rgba(255,255,255,0.06);
	}

	/* Drop zone */
	.drop-zone {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		padding: 3.5rem 2rem;
		border: 1.5px dashed rgba(255,255,255,0.12);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.drop-zone.drag-active {
		border-color: rgba(99,102,241,0.5);
		background: rgba(99,102,241,0.06);
	}
	.drop-icon { font-size: 3rem; }
	.drop-label { color: var(--vanguard-text-muted, #94a3b8); margin: 0; }

	.btn-browse {
		background: rgba(99,102,241,0.15);
		border: 1px solid rgba(99,102,241,0.4);
		color: #a5b4fc;
		border-radius: 10px;
		padding: 0.5rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn-browse:hover { background: rgba(99,102,241,0.25); }

	.drop-hint {
		font-size: 0.75rem;
		color: rgba(148,163,184,0.6);
		margin: 0;
		line-height: 1.6;
	}
	.drop-hint code {
		background: rgba(255,255,255,0.07);
		border-radius: 4px;
		padding: 0.1rem 0.3rem;
		font-size: 0.72rem;
	}

	/* Preview */
	.preview-section { display: flex; flex-direction: column; gap: 1rem; }

	.preview-summary {
		display: flex;
		gap: 2rem;
		justify-content: center;
	}

	.summary-stat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
	.stat-val { font-size: 2rem; font-weight: 800; color: var(--vanguard-text-primary, #e2e8f0); line-height: 1; }
	.stat-val.ok { color: #34d399; }
	.stat-val.err { color: #f87171; }
	.stat-lbl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vanguard-text-muted, #94a3b8); }

	.list-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 0.75rem;
	}
	.error-title { color: #fbbf24; }

	.error-list { display: flex; flex-direction: column; gap: 0.4rem; }
	.error-row { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.8rem; }
	.error-key { color: #fbbf24; font-size: 0.75rem; flex-shrink: 0; }
	.error-msg { color: #f87171; }

	.table-scroll { overflow-x: auto; }

	.preview-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}
	.preview-table th {
		text-align: left;
		padding: 0.5rem 0.75rem;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--vanguard-text-muted, #94a3b8);
		border-bottom: 1px solid rgba(255,255,255,0.08);
		white-space: nowrap;
	}
	.preview-table td {
		padding: 0.6rem 0.75rem;
		color: var(--vanguard-text-primary, #e2e8f0);
		border-bottom: 1px solid rgba(255,255,255,0.04);
		white-space: nowrap;
	}
	.preview-table td.mono { font-family: monospace; font-size: 0.75rem; }
	.preview-table td.credit { color: #34d399; }

	.action-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.btn-reset {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.12);
		color: var(--vanguard-text-muted, #94a3b8);
		border-radius: 10px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: border-color 0.15s;
	}
	.btn-reset:hover { border-color: rgba(255,255,255,0.3); }

	.btn-submit {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: white;
		border: none;
		border-radius: 12px;
		padding: 0.65rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 4px 14px rgba(99,102,241,0.35);
		transition: opacity 0.15s, transform 0.15s;
	}
	.btn-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
	.btn-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

	/* Submitting state */
	.submitting-state {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}
	.spinner {
		width: 40px; height: 40px;
		border: 3px solid rgba(255,255,255,0.1);
		border-top-color: #a5b4fc;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Results */
	.results-title {
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0 0 1rem;
	}
	.results-grid { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.5rem; }
	.result-row {
		display: grid;
		grid-template-columns: 1.5rem 1fr 1fr;
		gap: 0.75rem;
		align-items: center;
		font-size: 0.82rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid rgba(255,255,255,0.04);
	}
	.result-icon { font-weight: 700; }
	.result-row.ok .result-icon { color: #34d399; }
	.result-row.fail .result-icon { color: #f87171; }
	.result-key { font-family: monospace; font-size: 0.75rem; color: var(--vanguard-text-muted, #94a3b8); }
	.result-msg { color: var(--vanguard-text-primary, #e2e8f0); }
	.done-actions { display: flex; justify-content: flex-end; }
</style>
