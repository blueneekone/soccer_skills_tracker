<script lang="ts">
	/**
	 * RosterIngest.svelte — Universal Roster Ingestion Terminal
	 * ──────────────────────────────────────────────────────────
	 * Allows Club Directors to upload CSV, JSON, or PDF league rosters.
	 * Calls the `ingestRoster` Cloud Function which batch-writes players and
	 * generates per-player invite codes.
	 *
	 * Supported formats
	 * ─────────────────
	 * • CSV  — columns: name, email, position, dob, jersey (any order, any variant)
	 * • JSON — array of player objects with the same fields
	 * • PDF  — any text-based league roster; Gemini extracts structure
	 *
	 * After ingestion, a results table shows every player with their invite code
	 * and a "Copy All Codes" button for bulk distribution.
	 */

	import { getFunctions, httpsCallable } from 'firebase/functions';

	// ── Types ──────────────────────────────────────────────────────────────────

	type Format = 'csv' | 'json' | 'pdf';
	type Phase = 'idle' | 'parsing' | 'uploading' | 'complete' | 'error';

	interface IngestInvite {
		email: string;
		code: string;
		name: string;
	}

	interface IngestResult {
		processed: number;
		skipped: number;
		invites: IngestInvite[];
	}

	// ── Props ──────────────────────────────────────────────────────────────────

	interface Props {
		teamId?: string | null;
		onComplete?: (result: IngestResult) => void;
	}
	const { teamId = null, onComplete }: Props = $props();

	// ── State ──────────────────────────────────────────────────────────────────

	let phase = $state<Phase>('idle');
	let selectedFile = $state<File | null>(null);
	let detectedFormat = $state<Format | null>(null);
	let errorMsg = $state('');
	let result = $state<IngestResult | null>(null);
	let copyStatus = $state<'idle' | 'copied'>('idle');

	// ── Derived ───────────────────────────────────────────────────────────────

	const fileLabel = $derived(
		selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)` : ''
	);

	const FORMAT_ICON: Record<Format, string> = { csv: '📊', json: '📋', pdf: '📄' };
	const FORMAT_LABEL: Record<Format, string> = { csv: 'CSV', json: 'JSON', pdf: 'PDF (Gemini)' };

	// ── File handling ──────────────────────────────────────────────────────────

	function detectFormat(file: File): Format | null {
		const name = file.name.toLowerCase();
		if (name.endsWith('.csv')) return 'csv';
		if (name.endsWith('.json')) return 'json';
		if (name.endsWith('.pdf')) return 'pdf';
		if (file.type === 'text/csv') return 'csv';
		if (file.type === 'application/json') return 'json';
		if (file.type === 'application/pdf') return 'pdf';
		return null;
	}

	function onFileChange(ev: Event): void {
		const input = ev.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		selectedFile = file;
		detectedFormat = detectFormat(file);
		errorMsg = '';
		result = null;
		phase = 'idle';
	}

	function reset(): void {
		phase = 'idle';
		selectedFile = null;
		detectedFormat = null;
		errorMsg = '';
		result = null;
		copyStatus = 'idle';
	}

	// ── Ingestion ──────────────────────────────────────────────────────────────

	async function runIngestion(): Promise<void> {
		if (!selectedFile || !detectedFormat) return;

		phase = 'parsing';
		errorMsg = '';

		try {
			let content: string;

			if (detectedFormat === 'pdf') {
				// PDF: Base64-encode the binary for transport to Cloud Function
				const buf = await selectedFile.arrayBuffer();
				const bytes = new Uint8Array(buf);
				let binary = '';
				for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
				content = btoa(binary);
			} else {
				// CSV / JSON: read as UTF-8 text
				content = await selectedFile.text();
			}

			phase = 'uploading';

			const fns = getFunctions(undefined, 'us-central1');
			const ingestFn = httpsCallable<
				{ format: Format; content: string; teamId: string | null },
				IngestResult
			>(fns, 'ingestRoster');

			const res = await ingestFn({ format: detectedFormat, content, teamId });
			result = res.data;
			phase = 'complete';
			onComplete?.(res.data);
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Ingestion failed.';
			phase = 'error';
		}
	}

	// ── Copy invite codes ──────────────────────────────────────────────────────

	async function copyAllCodes(): Promise<void> {
		if (!result) return;
		const lines = result.invites.map((i) => `${i.name} <${i.email}> — CODE: ${i.code}`).join('\n');
		await navigator.clipboard.writeText(lines);
		copyStatus = 'copied';
		setTimeout(() => (copyStatus = 'idle'), 2500);
	}
</script>

<div class="ri-root">
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="ri-header">
		<span class="ri-header__icon" aria-hidden="true">🗂</span>
		<div>
			<h3 class="ri-header__title">UNIVERSAL ROSTER INGESTION</h3>
			<p class="ri-header__sub">CSV · JSON · PDF (AI extraction) — batch import with automatic invite code generation</p>
		</div>
	</div>

	<!-- ── Upload Area ─────────────────────────────────────────────────────── -->
	{#if phase === 'idle' || phase === 'error'}
		<div class="ri-body">
			<div class="ri-format-pills" role="list" aria-label="Supported formats">
				{#each (['csv', 'json', 'pdf'] as Format[]) as fmt}
					<div
						class="ri-format-pill"
						class:ri-format-pill--active={detectedFormat === fmt}
						role="listitem"
					>
						<span aria-hidden="true">{FORMAT_ICON[fmt]}</span>
						{FORMAT_LABEL[fmt]}
					</div>
				{/each}
			</div>

			<label class="ri-drop-zone" for="ri-file-input" aria-describedby="ri-format-desc">
				<div class="ri-drop-zone__icon" aria-hidden="true">
					{#if selectedFile && detectedFormat}
						{FORMAT_ICON[detectedFormat]}
					{:else}
						📁
					{/if}
				</div>
				{#if selectedFile}
					<p class="ri-drop-zone__filename">{fileLabel}</p>
					{#if detectedFormat}
						<span class="ri-format-badge">{FORMAT_LABEL[detectedFormat]}</span>
					{:else}
						<span class="ri-format-badge ri-format-badge--warn">UNSUPPORTED FORMAT</span>
					{/if}
				{:else}
					<p class="ri-drop-zone__title">DROP FILE OR CLICK TO BROWSE</p>
					<p class="ri-drop-zone__sub" id="ri-format-desc">.csv, .json, or .pdf (max 5 MB)</p>
				{/if}
			</label>

			<input
				id="ri-file-input"
				type="file"
				accept=".csv,.json,.pdf,text/csv,application/json,application/pdf"
				class="ri-file-input-hidden"
				onchange={onFileChange}
				aria-label="Select roster file"
			/>

			{#if errorMsg}
				<div class="ri-error-banner" role="alert">
					<span aria-hidden="true">⚠</span> {errorMsg}
				</div>
			{/if}

			{#if selectedFile && detectedFormat}
				<div class="ri-actions">
					<button class="ri-btn-ghost" onclick={reset}>CLEAR</button>
					<button class="ri-start-btn" onclick={runIngestion}>
						<span aria-hidden="true">⚡</span> INGEST ROSTER
					</button>
				</div>
			{:else if selectedFile && !detectedFormat}
				<p class="ri-unsupported">Unsupported file type. Please upload a .csv, .json, or .pdf file.</p>
			{/if}
		</div>
	{/if}

	<!-- ── Processing State ────────────────────────────────────────────────── -->
	{#if phase === 'parsing' || phase === 'uploading'}
		<div class="ri-processing" aria-live="polite">
			<div class="ri-processing__dots">
				<span></span><span></span><span></span>
			</div>
			<p class="ri-processing__label">
				{phase === 'parsing' ? 'READING FILE…' : 'TRANSMITTING TO NEXUS…'}
			</p>
			{#if detectedFormat === 'pdf' && phase === 'uploading'}
				<p class="ri-processing__sub">Gemini AI is parsing roster structure. This may take 10–15 seconds.</p>
			{/if}
		</div>
	{/if}

	<!-- ── Results ─────────────────────────────────────────────────────────── -->
	{#if phase === 'complete' && result}
		<div class="ri-results">
			<!-- Summary row -->
			<div class="ri-results__summary">
				<div class="ri-kpi ri-kpi--success">
					<span class="ri-kpi__val">{result.processed}</span>
					<span class="ri-kpi__label">IMPORTED</span>
				</div>
				<div class="ri-kpi ri-kpi--warn">
					<span class="ri-kpi__val">{result.skipped}</span>
					<span class="ri-kpi__label">SKIPPED</span>
				</div>
				<div class="ri-kpi">
					<span class="ri-kpi__val">{result.invites.length}</span>
					<span class="ri-kpi__label">CODES GENERATED</span>
				</div>
			</div>

			<!-- Actions -->
			<div class="ri-results__actions">
				<button class="ri-copy-btn" onclick={copyAllCodes} aria-live="polite">
					{#if copyStatus === 'copied'}
						✓ COPIED TO CLIPBOARD
					{:else}
						📋 COPY ALL INVITE CODES
					{/if}
				</button>
				<button class="ri-btn-ghost" onclick={reset}>INGEST ANOTHER</button>
			</div>

			<!-- Invite table -->
			<div class="ri-table-wrap" role="region" aria-label="Generated invite codes">
				<table class="ri-table">
					<thead>
						<tr>
							<th class="ri-th">PLAYER</th>
							<th class="ri-th">EMAIL</th>
							<th class="ri-th ri-th--code">INVITE CODE</th>
						</tr>
					</thead>
					<tbody>
						{#each result.invites as invite (invite.email)}
							<tr class="ri-tr">
								<td class="ri-td">{invite.name}</td>
								<td class="ri-td ri-td--email">{invite.email}</td>
								<td class="ri-td ri-td--code">
									<code class="ri-code">{invite.code}</code>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	.ri-root {
		font-family: 'JetBrains Mono', monospace;
		background: rgba(5, 8, 15, 0.88);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		overflow: hidden;
	}

	/* ── Header ────────────────────────────────────────────────────────────── */
	.ri-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	.ri-header__icon { font-size: 1.4rem; flex-shrink: 0; }
	.ri-header__title {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.85);
	}
	.ri-header__sub {
		margin: 0.15rem 0 0;
		font-size: 0.5rem;
		color: rgba(255, 255, 255, 0.28);
		letter-spacing: 0.06em;
	}

	/* ── Body ──────────────────────────────────────────────────────────────── */
	.ri-body {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	/* ── Format Pills ──────────────────────────────────────────────────────── */
	.ri-format-pills {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.ri-format-pill {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 3px 10px;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.3);
		transition: color 0.2s, border-color 0.2s;
	}
	.ri-format-pill--active {
		border-color: rgba(0, 240, 255, 0.4);
		color: #00f0ff;
		background: rgba(0, 240, 255, 0.06);
	}

	/* ── Drop Zone ─────────────────────────────────────────────────────────── */
	.ri-drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 130px;
		border-radius: 10px;
		border: 1px dashed rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.015);
		cursor: pointer;
		padding: 1.5rem;
		text-align: center;
		transition: border-color 0.2s, background 0.2s;
	}
	.ri-drop-zone:hover {
		border-color: rgba(0, 240, 255, 0.3);
		background: rgba(0, 240, 255, 0.03);
	}
	.ri-drop-zone__icon { font-size: 1.8rem; }
	.ri-drop-zone__title {
		margin: 0;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.45);
	}
	.ri-drop-zone__sub {
		margin: 0;
		font-size: 0.5rem;
		color: rgba(255, 255, 255, 0.22);
		letter-spacing: 0.06em;
	}
	.ri-drop-zone__filename {
		margin: 0;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.65);
		word-break: break-all;
	}

	.ri-format-badge {
		padding: 2px 9px;
		border-radius: 4px;
		background: rgba(0, 240, 255, 0.08);
		border: 1px solid rgba(0, 240, 255, 0.25);
		font-size: 0.48rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #00f0ff;
	}
	.ri-format-badge--warn {
		background: rgba(255, 0, 60, 0.06);
		border-color: rgba(255, 0, 60, 0.25);
		color: #ff6070;
	}

	.ri-file-input-hidden {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}

	.ri-error-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		padding: 0.55rem 0.8rem;
		border-radius: 7px;
		background: rgba(255, 0, 60, 0.07);
		border: 1px solid rgba(255, 0, 60, 0.2);
		font-size: 0.55rem;
		color: #ff6070;
		line-height: 1.5;
	}

	.ri-unsupported {
		margin: 0;
		text-align: center;
		font-size: 0.55rem;
		color: rgba(255, 200, 60, 0.7);
	}

	.ri-actions {
		display: flex;
		gap: 0.65rem;
	}
	.ri-start-btn {
		flex: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.65rem;
		border-radius: 8px;
		border: 1px solid rgba(0, 240, 255, 0.5);
		background: rgba(0, 240, 255, 0.08);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #00f0ff;
		cursor: pointer;
		min-height: 44px;
		transition: background 0.2s, box-shadow 0.2s;
		box-shadow: 0 0 14px rgba(0, 240, 255, 0.14);
	}
	.ri-start-btn:hover {
		background: rgba(0, 240, 255, 0.16);
		box-shadow: 0 0 28px rgba(0, 240, 255, 0.3);
	}

	/* ── Processing ────────────────────────────────────────────────────────── */
	.ri-processing {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.65rem;
		padding: 3rem 1.5rem;
		text-align: center;
	}
	.ri-processing__dots {
		display: flex;
		gap: 6px;
	}
	.ri-processing__dots span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #00f0ff;
		animation: ri-dot 1.2s ease-in-out infinite;
	}
	.ri-processing__dots span:nth-child(2) { animation-delay: 0.2s; }
	.ri-processing__dots span:nth-child(3) { animation-delay: 0.4s; }
	.ri-processing__label {
		margin: 0;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(0, 240, 255, 0.7);
		animation: ri-blink 1.4s ease-in-out infinite;
	}
	.ri-processing__sub {
		margin: 0;
		font-size: 0.52rem;
		color: rgba(255, 255, 255, 0.3);
		max-width: 280px;
		line-height: 1.6;
	}

	/* ── Results ───────────────────────────────────────────────────────────── */
	.ri-results {
		padding: 1.1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.ri-results__summary {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.ri-kpi {
		flex: 1;
		min-width: 80px;
		padding: 0.65rem 0.8rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.02);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.ri-kpi--success { border-color: rgba(34, 197, 94, 0.2); background: rgba(34, 197, 94, 0.04); }
	.ri-kpi--warn { border-color: rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.04); }
	.ri-kpi__val {
		font-size: 1.4rem;
		font-weight: 900;
		color: white;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.ri-kpi--success .ri-kpi__val { color: #22c55e; text-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
	.ri-kpi--warn .ri-kpi__val { color: #f59e0b; }
	.ri-kpi__label {
		font-size: 0.42rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.3);
	}

	.ri-results__actions {
		display: flex;
		gap: 0.65rem;
		flex-wrap: wrap;
	}
	.ri-copy-btn {
		flex: 2;
		padding: 0.6rem;
		border-radius: 7px;
		border: 1px solid rgba(0, 240, 255, 0.3);
		background: rgba(0, 240, 255, 0.05);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: rgba(0, 240, 255, 0.7);
		cursor: pointer;
		min-height: 44px;
		transition: background 0.2s;
	}
	.ri-copy-btn:hover { background: rgba(0, 240, 255, 0.12); }

	/* ── Table ─────────────────────────────────────────────────────────────── */
	.ri-table-wrap {
		overflow-x: auto;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}
	.ri-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.55rem;
	}
	.ri-th {
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-size: 0.45rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.02);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		white-space: nowrap;
	}
	.ri-th--code { text-align: center; }
	.ri-tr { border-bottom: 1px solid rgba(255, 255, 255, 0.03); }
	.ri-tr:last-child { border-bottom: none; }
	.ri-tr:hover { background: rgba(255, 255, 255, 0.015); }
	.ri-td {
		padding: 0.5rem 0.75rem;
		color: rgba(255, 255, 255, 0.55);
		vertical-align: middle;
	}
	.ri-td--email {
		font-size: 0.48rem;
		color: rgba(255, 255, 255, 0.35);
	}
	.ri-td--code { text-align: center; }
	.ri-code {
		display: inline-block;
		padding: 3px 10px;
		border-radius: 5px;
		background: rgba(0, 240, 255, 0.07);
		border: 1px solid rgba(0, 240, 255, 0.22);
		color: #00f0ff;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.18em;
	}

	/* ── Shared ghost ────────────────────────────────────────────────────────── */
	.ri-btn-ghost {
		flex: 1;
		padding: 0.5rem;
		border-radius: 7px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		min-height: 44px;
		transition: color 0.2s;
	}
	.ri-btn-ghost:hover { color: rgba(255, 255, 255, 0.6); }

	/* ── Animations ─────────────────────────────────────────────────────────── */
	@keyframes ri-dot {
		0%, 80%, 100% { transform: scale(0.35); opacity: 0.25; }
		40% { transform: scale(1); opacity: 1; }
	}
	@keyframes ri-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* ── Responsive ─────────────────────────────────────────────────────────── */
	@media (max-width: 480px) {
		.ri-results__actions { flex-direction: column; }
		.ri-table { font-size: 0.5rem; }
		.ri-td, .ri-th { padding: 0.4rem 0.5rem; }
	}
</style>
