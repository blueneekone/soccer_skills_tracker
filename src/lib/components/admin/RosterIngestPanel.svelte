<script lang="ts">
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import Papa from 'papaparse';
	import VampireColumnMapper from './VampireColumnMapper.svelte';

	type IngestFormat = 'csv' | 'json' | 'pdf';

	type IngestInviteRow = {
		email: string;
		code: string;
		name?: string;
	};

	let { teamId = '', clubId = '' } = $props();

	const ingestRoster = httpsCallable(functions, 'ingestRoster');
	const MAX_BYTES = 5 * 1024 * 1024;

	let fileName = $state('');
	let pendingFormat = $state<IngestFormat | null>(null);
	let pendingFile = $state<File | null>(null);
	let ingesting = $state(false);
	let err = $state('');
	let ok = $state('');
	let invites = $state<IngestInviteRow[]>([]);
	let skipped = $state(0);

	// Vampire Engine state
	let showVampire = $state(false);
	let csvHeaders = $state<string[]>([]);
	let csvPreviewRows = $state<Record<string, string>[]>([]);
	let rawCsvData = $state<Record<string, string>[]>([]);

	function detectFormat(file: File): IngestFormat | null {
		const name = file.name.toLowerCase();
		if (name.endsWith('.csv') || file.type === 'text/csv') return 'csv';
		if (name.endsWith('.json') || file.type === 'application/json') return 'json';
		if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
		return null;
	}

	async function fileToBase64(file: File): Promise<string> {
		const buf = await file.arrayBuffer();
		const bytes = new Uint8Array(buf);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
		return btoa(binary);
	}

	function onFileInput(e: Event) {
		err = '';
		ok = '';
		invites = [];
		skipped = 0;
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (file.size > MAX_BYTES) {
			err = 'File too large (max 5 MB).';
			pendingFile = null;
			pendingFormat = null;
			fileName = '';
			return;
		}
		const format = detectFormat(file);
		if (!format) {
			err = 'Unsupported format. Upload .csv, .json, or .pdf.';
			pendingFile = null;
			pendingFormat = null;
			fileName = '';
			return;
		}
		pendingFile = file;
		pendingFormat = format;
		fileName = file.name;

		// If CSV, immediately parse and show Vampire Mapper
		if (format === 'csv') {
			file.text().then((txt) => {
				const parsed = Papa.parse<Record<string, string>>(txt, {
					header: true,
					skipEmptyLines: true,
				});
				if (parsed.errors.length > 0 && parsed.data.length === 0) {
					err = 'Failed to parse CSV file.';
					pendingFile = null;
					return;
				}
				rawCsvData = parsed.data;
				csvHeaders = parsed.meta.fields || [];
				csvPreviewRows = parsed.data.slice(0, 3);
				showVampire = true;
			}).catch(() => {
				err = 'Failed to read CSV file.';
			});
		}
	}

	function clearSelection() {
		pendingFile = null;
		pendingFormat = null;
		fileName = '';
		err = '';
		ok = '';
		invites = [];
		skipped = 0;
		showVampire = false;
		rawCsvData = [];
		csvHeaders = [];
		csvPreviewRows = [];
	}

	async function runIngest(mappedData?: Record<string, string>[]) {
		if (!pendingFile || !pendingFormat || !teamId) return;
		err = '';
		ok = '';
		invites = [];
		skipped = 0;
		ingesting = true;
		try {
			let content = '';
			let finalFormat = pendingFormat;

			if (pendingFormat === 'csv' && mappedData) {
				// We use the mapped JSON payload instead of raw CSV text
				content = JSON.stringify(mappedData);
				finalFormat = 'json';
			} else if (pendingFormat === 'pdf') {
				content = await fileToBase64(pendingFile);
			} else {
				content = await pendingFile.text();
			}

			const res = await ingestRoster({
				format: finalFormat,
				content,
				teamId,
			});
			const data = res.data as
				| {
						processed?: number;
						skipped?: number;
						invites?: IngestInviteRow[];
				  }
				| undefined;
			invites = Array.isArray(data?.invites) ? data.invites : [];
			skipped = typeof data?.skipped === 'number' ? data.skipped : 0;
			const processed = typeof data?.processed === 'number' ? data.processed : invites.length;
			ok = `Ingested ${processed} player${processed === 1 ? '' : 's'}. Distribute invite codes to guardians.`;
			
			// Auto clear selection on success
			clearSelection();
		} catch (e) {
			const code = (e as { code?: string }).code || '';
			const msg = (e as { message?: string }).message || 'Ingest failed.';
			if (code.includes('permission-denied')) {
				err = 'Director role required for roster ingestion.';
			} else {
				err = msg;
			}
		} finally {
			ingesting = false;
			showVampire = false;
		}
	}

	function handleVampireSubmit(mapping: Record<string, string>) {
		// Convert rawCsvData to JSON array using mapping
		const mappedData = rawCsvData.map((row) => {
			const obj: Record<string, string> = {};
			for (const [targetId, sourceCol] of Object.entries(mapping)) {
				if (sourceCol && row[sourceCol] !== undefined) {
					obj[targetId] = row[sourceCol];
				}
			}
			return obj;
		});
		void runIngest(mappedData);
	}

	function handleVampireCancel() {
		clearSelection();
	}
</script>

<section class="ri-panel" aria-labelledby="ri-title">
	<header class="ri-panel__head">
		<h3 id="ri-title" class="ri-panel__title">Bulk roster ingest</h3>
		<p class="ri-panel__sub">
			Director-only — uploads create <code>users</code> rows and single-use invite codes via the
			<code>ingestRoster</code> Cloud Function. Coaches must use
			<a class="ri-link" href={resolveAppPath('/coach/logistics?tab=roster')}>Team Ops CSV import</a>
			instead. Registrars are not authorized on this path.
		</p>
		{#if clubId}
			<p class="ri-panel__meta">Club scope: <span class="ri-mono">{clubId}</span></p>
		{/if}
	</header>

	<div class="ri-panel__pick">
		<label class="ri-file-label">
			<span class="ri-btn ri-btn--secondary">Choose file</span>
			<input
				class="ri-file-input"
				type="file"
				accept=".csv,.json,.pdf,text/csv,application/json,application/pdf"
				onchange={onFileInput}
			/>
		</label>
		{#if fileName}
			<span class="ri-file-name">{fileName}{pendingFormat ? ` (${pendingFormat})` : ''}</span>
		{:else}
			<span class="ri-muted">CSV, JSON, or PDF — email required per row</span>
		{/if}
	</div>

	<div class="ri-panel__actions">
		{#if pendingFormat === 'csv' && showVampire}
			<!-- Vampire handles its own submit/cancel actions -->
		{:else}
			<button
				type="button"
				class="ri-btn"
				disabled={!pendingFile || !teamId || ingesting}
				onclick={() => void runIngest()}
			>
				{ingesting ? 'Ingesting…' : 'Run ingest'}
			</button>
		{/if}
		{#if (fileName || invites.length > 0) && !showVampire}
			<button type="button" class="ri-btn ri-btn--secondary" disabled={ingesting} onclick={clearSelection}>
				Clear
			</button>
		{/if}
	</div>

	{#if showVampire}
		<div class="ri-vampire-wrap">
			<VampireColumnMapper
				headers={csvHeaders}
				previewRows={csvPreviewRows}
				onsubmit={handleVampireSubmit}
				oncancel={handleVampireCancel}
			/>
		</div>
	{/if}

	{#if err}
		<p class="ri-err" role="alert">{err}</p>
	{/if}
	{#if ok}
		<p class="ri-ok" role="status">{ok}</p>
	{/if}
	{#if skipped > 0}
		<p class="ri-warn" role="status">{skipped} row{skipped === 1 ? '' : 's'} skipped (invalid email).</p>
	{/if}

	{#if invites.length > 0}
		<div class="ri-table-wrap">
			<table class="ri-table" aria-label="Generated invite codes">
				<caption class="ri-caption">{invites.length} invite code{invites.length === 1 ? '' : 's'}</caption>
				<thead>
					<tr>
						<th scope="col">Athlete</th>
						<th scope="col">Email</th>
						<th scope="col">Invite code</th>
					</tr>
				</thead>
				<tbody>
					{#each invites as row (row.email + row.code)}
						<tr>
							<td>{row.name || '—'}</td>
							<td class="ri-mono">{row.email}</td>
							<td class="ri-mono ri-code">{row.code}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.ri-panel {
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		background: var(--glass-bg, #fff);
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	:global(html.dark) .ri-panel {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.1);
	}
	.ri-panel__head {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.ri-panel__title {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-primary, #0f172a);
	}
	.ri-panel__sub {
		margin: 0;
		font-size: 0.78rem;
		color: var(--text-secondary, #64748b);
		line-height: 1.45;
		max-width: 48rem;
	}
	.ri-panel__meta {
		margin: 0;
		font-size: 0.72rem;
		color: var(--text-secondary, #64748b);
	}
	.ri-link {
		color: #0d9488;
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.ri-panel__pick {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}
	.ri-file-label {
		cursor: pointer;
	}
	.ri-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		overflow: hidden;
	}
	.ri-file-name {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
	}
	.ri-muted {
		font-size: 0.8125rem;
		color: var(--text-secondary, #64748b);
	}
	.ri-panel__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.ri-btn {
		border: none;
		border-radius: 8px;
		padding: 0.55rem 1rem;
		font-size: 0.8125rem;
		font-weight: 700;
		background: var(--brand-primary, #d97706);
		color: #fff;
		cursor: pointer;
	}
	.ri-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.ri-btn--secondary {
		background: transparent;
		color: var(--text-primary, #0f172a);
		border: 1px solid var(--border-subtle, #e5e5e5);
	}
	.ri-err {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
	}
	.ri-ok {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #15803d;
	}
	.ri-warn {
		margin: 0;
		font-size: 0.8125rem;
		color: #b45309;
	}
	.ri-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 8px;
	}
	.ri-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}
	.ri-caption {
		caption-side: top;
		text-align: left;
		padding: 0.5rem 0.75rem;
		font-weight: 700;
		color: var(--text-secondary, #64748b);
		background: var(--surface-subtle, #f9f9f9);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}
	.ri-table th,
	.ri-table td {
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}
	.ri-table th {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary, #64748b);
	}
	.ri-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
	}
	.ri-code {
		font-weight: 800;
		letter-spacing: 0.08em;
	}
	.ri-vampire-wrap {
		margin-top: 0.5rem;
	}
</style>
