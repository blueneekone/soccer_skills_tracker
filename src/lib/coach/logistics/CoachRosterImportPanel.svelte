<script lang="ts">
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		parseCoachRosterCsv,
		type RosterCsvPreviewRow,
	} from '$lib/coach/logistics/rosterCsvParse.js';

	let { teamId = '' } = $props();

	const secureBulkAddPlayers = httpsCallable(functions, 'secureBulkAddPlayers');
	const coachRosterIngest = httpsCallable(functions, 'coachRosterIngest');

	let dragOver = $state(false);
	let fileName = $state('');
	let previewRows = $state<RosterCsvPreviewRow[]>([]);
	let parseCapped = $state(false);
	let parseErr = $state('');
	let parsing = $state(false);
	let committing = $state(false);
	let feedback = $state<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

	const readyRows = $derived(previewRows.filter((r) => r.status === 'ready'));
	const canCommit = $derived(Boolean(teamId && readyRows.length > 0 && !committing && !parsing));

	function isPdfFile(file: File): boolean {
		const name = file.name.toLowerCase();
		return name.endsWith('.pdf') || file.type === 'application/pdf';
	}

	function isCsvFile(file: File): boolean {
		const name = file.name.toLowerCase();
		return name.endsWith('.csv') || file.type === 'text/csv';
	}

	function mapCallableError(code: string, message: string): string {
		if (code === 'functions/resource-exhausted' || code === 'resource-exhausted') {
			return 'Licensed roster seats are fully allocated. Contact your director to upgrade.';
		}
		if (code === 'functions/failed-precondition' || code === 'failed-precondition') {
			if (message === 'team-full') {
				return 'This team has reached its seat cap. Ask your director to raise the team limit.';
			}
			return message || 'Import could not complete.';
		}
		return message || 'Import failed.';
	}

	function statusLabel(row: RosterCsvPreviewRow): string {
		if (row.status === 'ready') return 'Ready';
		if (row.reason === 'empty_name') return 'Name required';
		if (row.reason === 'invalid_email') return 'Invalid email';
		if (row.reason === 'name_too_long') return 'Name too long';
		return row.reason || 'Invalid row';
	}

	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				if (typeof result !== 'string') {
					reject(new Error('Could not read file.'));
					return;
				}
				const base64 = result.split(',')[1];
				if (!base64) {
					reject(new Error('Could not encode file.'));
					return;
				}
				resolve(base64);
			};
			reader.onerror = () => reject(new Error('Could not read file.'));
			reader.readAsDataURL(file);
		});
	}

	async function parsePdfFile(file: File) {
		if (!teamId) {
			parseErr = 'Select a team before uploading a PDF roster.';
			return;
		}
		parsing = true;
		parseErr = '';
		feedback = null;
		try {
			const contentBase64 = await fileToBase64(file);
			const res = await coachRosterIngest({
				teamId,
				format: 'pdf',
				contentBase64,
			});
			const data = res.data as
				| {
						ok?: boolean;
						players?: Array<{
							playerName: string;
							playerEmail?: string;
							jersey?: string;
						}>;
				  }
				| undefined;
			const players = data?.players ?? [];
			previewRows = players.map((p, idx) => ({
				line: idx + 1,
				playerName: p.playerName,
				...(p.playerEmail ? { playerEmail: p.playerEmail } : {}),
				...(p.jersey ? { jersey: p.jersey } : {}),
				status: 'ready' as const,
			}));
			parseCapped = players.length >= 200;
			fileName = file.name;
			if (players.length === 0) {
				parseErr = 'No player rows found in the PDF.';
			}
		} catch (err) {
			const code = (err as { code?: string }).code || '';
			const msg = (err as { message?: string }).message || '';
			previewRows = [];
			fileName = '';
			parseErr = mapCallableError(code, msg);
		} finally {
			parsing = false;
		}
	}

	async function readFile(file: File) {
		feedback = null;
		parseErr = '';
		if (isPdfFile(file)) {
			await parsePdfFile(file);
			return;
		}
		if (!isCsvFile(file)) {
			parseErr = 'Upload a .csv spreadsheet or league roster PDF.';
			previewRows = [];
			fileName = '';
			return;
		}
		const text = await file.text();
		const parsed = parseCoachRosterCsv(text);
		previewRows = parsed.rows;
		parseCapped = parsed.capped;
		fileName = file.name;
		if (parsed.rows.length === 0) {
			parseErr = 'No player rows found. Include a header row and at least one data row.';
		}
	}

	function onFileInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) void readFile(file);
		input.value = '';
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) void readFile(file);
	}

	function clearPreview() {
		previewRows = [];
		fileName = '';
		parseErr = '';
		parseCapped = false;
		feedback = null;
	}

	async function commitImport() {
		if (!teamId || readyRows.length === 0) return;
		feedback = null;
		committing = true;
		try {
			const res = await secureBulkAddPlayers({
				teamId,
				players: readyRows.map((r) => ({
					playerName: r.playerName,
					...(r.playerEmail ? { playerEmail: r.playerEmail } : {}),
					...(r.jersey ? { jersey: r.jersey } : {}),
				})),
			});
			const data = res.data as
				| {
						ok?: boolean;
						added?: number;
						duplicates?: number;
						skipped?: number;
						seatCapHit?: boolean;
						errors?: Array<{ index: number; reason: string }>;
				  }
				| undefined;

			const added = data?.added ?? 0;
			const duplicates = data?.duplicates ?? 0;
			const skipped = data?.skipped ?? 0;
			const seatCapHit = data?.seatCapHit === true;
			const callableErrors = data?.errors ?? [];

			if (seatCapHit) {
				feedback = {
					type: 'error',
					text: `Seat cap reached — added ${added}, skipped ${skipped}. Ask your director to raise team or club limits.`,
				};
			} else if (callableErrors.length > 0) {
				const emailConflicts = callableErrors.filter((e) => e.reason === 'email_in_use').length;
				feedback = {
					type: 'info',
					text: `Added ${added}. ${duplicates} duplicate${duplicates === 1 ? '' : 's'}. ${emailConflicts} email conflict${emailConflicts === 1 ? '' : 's'}.`,
				};
			} else {
				const dupPart =
					duplicates > 0 ? ` ${duplicates} already on roster.` : '';
				feedback = {
					type: 'success',
					text: `Added ${added} player${added === 1 ? '' : 's'}.${dupPart}`,
				};
				clearPreview();
			}
		} catch (err) {
			const code = (err as { code?: string }).code || '';
			const msg = (err as { message?: string }).message || '';
			feedback = { type: 'error', text: mapCallableError(code, msg) };
		} finally {
			committing = false;
		}
	}
</script>

<section class="ops-import" aria-labelledby="ops-import-h">
	<h3 id="ops-import-h" class="ops-import__title">Import roster</h3>
	<p class="ops-import__sub">
		Upload a roster spreadsheet (.csv) or league PDF. Preview rows before committing — linked players
		appear below automatically.
	</p>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="ops-import__drop"
		class:ops-import__drop--active={dragOver}
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={() => (dragOver = false)}
		ondrop={onDrop}
	>
		<p class="ops-import__drop-text">
			{#if parsing}
				Parsing…
			{:else if fileName}
				<span class="ops-import__file">{fileName}</span>
			{:else}
				Drop a .csv or PDF file here or choose a file
			{/if}
		</p>
		<label class="ops-import__file-label">
			<span class="ops-btn ops-btn--secondary">Choose file</span>
			<input
				class="ops-import__file-input"
				type="file"
				accept=".csv,text/csv,.pdf,application/pdf"
				onchange={onFileInput}
				disabled={parsing}
			/>
		</label>
	</div>

	{#if parseCapped}
		<p class="ops-import__warn" role="status">Only the first 200 rows were loaded.</p>
	{/if}
	{#if parseErr}
		<p class="ops-err" role="alert">{parseErr}</p>
	{/if}
	{#if feedback}
		<p
			class="ops-import__feedback"
			class:ops-import__feedback--err={feedback.type === 'error'}
			class:ops-import__feedback--ok={feedback.type === 'success'}
			role={feedback.type === 'error' ? 'alert' : 'status'}
		>
			{feedback.text}
		</p>
	{/if}

	{#if previewRows.length > 0}
		<div class="ops-import__table-wrap">
			<table class="ops-import__table">
				<caption class="ops-import__caption">
					{readyRows.length} ready · {previewRows.length - readyRows.length} with errors
				</caption>
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col">Email</th>
						<th scope="col">Jersey</th>
						<th scope="col">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each previewRows as row (row.line)}
						<tr class:ops-import__row--err={row.status === 'error'}>
							<td>{row.playerName}</td>
							<td>{row.playerEmail || '—'}</td>
							<td>{row.jersey || '—'}</td>
							<td>{statusLabel(row)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="ops-import__actions">
			<button type="button" class="ops-btn ops-btn--secondary" onclick={clearPreview}>Clear</button>
			<button type="button" class="ops-btn" disabled={!canCommit} onclick={() => void commitImport()}>
				{committing ? 'Importing…' : `Commit ${readyRows.length} player${readyRows.length === 1 ? '' : 's'}`}
			</button>
		</div>
	{/if}
</section>

<style>
	.ops-import {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
		padding: 12px;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		background: #fff;
	}
	.ops-import__title {
		margin: 0;
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
	}
	.ops-import__sub {
		margin: 0;
		font-size: 12px;
		color: #64748b;
		max-width: 40rem;
	}
	.ops-import__drop {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 14px;
		border: 1px dashed #cbd5e1;
		border-radius: 10px;
		background: #f8fafc;
	}
	.ops-import__drop--active {
		border-color: #0d9488;
		background: #f0fdfa;
	}
	.ops-import__drop-text {
		margin: 0;
		font-size: 13px;
		color: #334155;
	}
	.ops-import__file {
		font-weight: 700;
		color: #0f172a;
	}
	.ops-import__file-label {
		cursor: pointer;
	}
	.ops-import__file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		overflow: hidden;
	}
	.ops-import__warn {
		margin: 0;
		font-size: 12px;
		color: #b45309;
	}
	.ops-err {
		margin: 0;
		font-size: 12px;
		color: #b91c1c;
	}
	.ops-import__feedback {
		margin: 0;
		font-size: 12px;
		font-weight: 600;
		color: #334155;
	}
	.ops-import__feedback--err {
		color: #b91c1c;
	}
	.ops-import__feedback--ok {
		color: #15803d;
	}
	.ops-import__table-wrap {
		overflow-x: auto;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
	}
	.ops-import__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}
	.ops-import__caption {
		caption-side: top;
		text-align: left;
		padding: 8px 10px;
		font-weight: 700;
		color: #64748b;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}
	.ops-import__table th,
	.ops-import__table td {
		padding: 8px 10px;
		text-align: left;
		border-bottom: 1px solid #e2e8f0;
	}
	.ops-import__table th {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #64748b;
		background: #f8fafc;
	}
	.ops-import__row--err td {
		color: #b91c1c;
		background: #fef2f2;
	}
	.ops-import__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.ops-btn {
		border: none;
		border-radius: 10px;
		padding: 10px 16px;
		font-weight: 700;
		font-size: 13px;
		background: #0f172a;
		color: #fff;
		cursor: pointer;
	}
	.ops-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.ops-btn--secondary {
		background: #fff;
		color: #0f172a;
		border: 1px solid #e2e8f0;
	}
</style>
