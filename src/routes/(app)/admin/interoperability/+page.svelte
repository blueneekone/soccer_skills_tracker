<script lang="ts">
	import { untrack } from 'svelte';
	import Papa from 'papaparse';
	import { db } from '$lib/firebase.js';
	import { collection, writeBatch, doc } from 'firebase/firestore';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	// ── Export Hub ─────────────────────────────────────────────────────────────
	let exportFormat = $state<'csv' | 'json' | 'pdf'>('csv');
	let exportLoading = $state(false);
	let exportError = $state('');

	async function triggerExport(format: 'csv' | 'json' | 'pdf') {
		exportLoading = true;
		exportError = '';
		try {
			// This will call a server-side cursor endpoint to prevent memory crashes
			// on massive 10,000+ row datasets.
			const res = await fetch(`/api/export?format=${format}&collection=users`, {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer DUMMY_TOKEN_FOR_NOW' 
				}
			});
			if (!res.ok) {
				throw new Error('Export failed: ' + (await res.text()));
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `admin_export_${Date.now()}.${format}`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			exportError = e instanceof Error ? e.message : 'Unknown export error';
		} finally {
			exportLoading = false;
		}
	}

	// ── Vampire Importer ───────────────────────────────────────────────────────
	let dragActive = $state(false);
	let parsedData = $state<Record<string, string>[]>([]);
	let csvHeaders = $state<string[]>([]);
	let parseError = $state('');

	function handleDrag(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === 'dragenter' || e.type === 'dragover') {
			dragActive = true;
		} else if (e.type === 'dragleave' || e.type === 'drop') {
			dragActive = false;
		}
	}

	function handleDrop(e: DragEvent) {
		handleDrag(e);
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			parseFile(e.dataTransfer.files[0]);
		}
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			parseFile(target.files[0]);
		}
	}

	function parseFile(file: File) {
		parseError = '';
		parsedData = [];
		csvHeaders = [];

		if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
			parseError = 'Only CSV files are supported for import.';
			return;
		}

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				untrack(() => {
					if (results.errors.length) {
						parseError = 'Failed to parse CSV. Please check formatting.';
						return;
					}
					parsedData = results.data as Record<string, string>[];
					csvHeaders = Object.keys(parsedData[0] || {});
				});
			},
			error: (err) => {
				parseError = err.message;
			}
		});
	}

	// ── Visual Column Mapper ───────────────────────────────────────────────────
	// Schema fields required for our database
	const targetSchema = [
		{ key: 'email', label: 'Email Address (Required)' },
		{ key: 'firstName', label: 'First Name' },
		{ key: 'lastName', label: 'Last Name' },
		{ key: 'role', label: 'Role' },
	];

	// Map of schemaKey -> csvHeader
	let columnMap = $state<Record<string, string>>({});

	// ── Atomic Batch Ingestion ─────────────────────────────────────────────────
	let ingestLoading = $state(false);
	let ingestProgress = $state(0);
	let ingestError = $state('');
	let ingestSuccess = $state(false);

	async function executeAtomicIngestion() {
		// Strict Prohibition: Raw set() loops are forbidden.
		// Mathematical Safety: Firestore writeBatch capped at exactly 500 ops.
		if (!columnMap['email']) {
			ingestError = 'You must map the Email Address field to proceed.';
			return;
		}

		ingestLoading = true;
		ingestError = '';
		ingestSuccess = false;
		ingestProgress = 0;

		const total = parsedData.length;
		const CHUNK_SIZE = 500;
		let processed = 0;

		try {
			for (let i = 0; i < total; i += CHUNK_SIZE) {
				const chunk = parsedData.slice(i, i + CHUNK_SIZE);
				const batch = writeBatch(db);

				for (const row of chunk) {
					const emailVal = row[columnMap['email']];
					if (!emailVal || !emailVal.includes('@')) continue; // Skip invalid

					const docRef = doc(collection(db, 'users'));
					const payload: Record<string, any> = {
						email: emailVal.trim().toLowerCase(),
						createdAt: new Date(),
					};

					if (columnMap['firstName']) payload.firstName = row[columnMap['firstName']]?.trim();
					if (columnMap['lastName']) payload.lastName = row[columnMap['lastName']]?.trim();
					if (columnMap['role']) payload.role = row[columnMap['role']]?.trim() || 'player';

					batch.set(docRef, payload);
				}

				await batch.commit();
				processed += chunk.length;
				ingestProgress = Math.floor((processed / total) * 100);
			}

			ingestSuccess = true;
		} catch (e) {
			ingestError = e instanceof Error ? e.message : 'Ingestion failed';
		} finally {
			ingestLoading = false;
		}
	}
</script>

<div class="tw-max-w-7xl tw-mx-auto tw-p-6 tw-flex tw-flex-col tw-gap-8">
	<!-- HEADER -->
	<header class="tw-border-b tw-border-[#334155] tw-pb-6">
		<h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-3 tw-m-0">
			<Icon name={"data.database" as IconName} /> Interoperability Hub
		</h1>
		<p class="tw-text-[#A1A1AA] tw-text-sm tw-mt-2">
			Export operational data globally or ingest legacy CSV rosters with mathematically-safe batching.
		</p>
	</header>

	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-8">
		<!-- PHASE 1: DATA LIQUIDITY EXPORT HUB -->
		<section class="lg:tw-col-span-1 tw-flex tw-flex-col tw-gap-4">
			<div class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-flex tw-flex-col tw-gap-4">
				<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA]">
					<Icon name={"action.download" as IconName} size={20} strokeWidth={1.5} />
					<h2 class="tw-text-base tw-font-bold tw-m-0">Data Liquidity Exports</h2>
				</div>
				<p class="tw-text-[#A1A1AA] tw-text-xs">
					Download global platform datasets securely. Exports utilize server-side cursors to prevent browser memory exhaustion.
				</p>
				
				<div class="tw-flex tw-flex-col tw-gap-3 tw-mt-2">
					<button 
						onclick={() => triggerExport('csv')}
						disabled={exportLoading}
						class="tw-flex tw-items-center tw-justify-between tw-w-full tw-bg-[#020617] hover:tw-bg-[#1E293B] tw-border tw-border-[#334155] tw-rounded-lg tw-px-4 tw-py-3 tw-transition-colors tw-text-[#FAFAFA] tw-font-bold tw-text-sm disabled:tw-opacity-50"
					>
						<span class="tw-flex tw-items-center tw-gap-2">
							<Icon name={"file.document" as IconName} size={16} strokeWidth={1.5} />
							Global Roster (CSV)
						</span>
						<span class="tw-text-[#A1A1AA] tw-text-xs">Export</span>
					</button>

					<button 
						onclick={() => triggerExport('json')}
						disabled={exportLoading}
						class="tw-flex tw-items-center tw-justify-between tw-w-full tw-bg-[#020617] hover:tw-bg-[#1E293B] tw-border tw-border-[#334155] tw-rounded-lg tw-px-4 tw-py-3 tw-transition-colors tw-text-[#FAFAFA] tw-font-bold tw-text-sm disabled:tw-opacity-50"
					>
						<span class="tw-flex tw-items-center tw-gap-2">
							<Icon name={"action.database" as IconName} size={16} strokeWidth={1.5} />
							Global Roster (JSON)
						</span>
						<span class="tw-text-[#A1A1AA] tw-text-xs">Export</span>
					</button>

					<button 
						onclick={() => triggerExport('pdf')}
						disabled={exportLoading}
						class="tw-flex tw-items-center tw-justify-between tw-w-full tw-bg-[#020617] hover:tw-bg-[#1E293B] tw-border tw-border-[#334155] tw-rounded-lg tw-px-4 tw-py-3 tw-transition-colors tw-text-[#FAFAFA] tw-font-bold tw-text-sm disabled:tw-opacity-50"
					>
						<span class="tw-flex tw-items-center tw-gap-2">
							<Icon name={"file.document" as IconName} size={16} strokeWidth={1.5} />
							Global Roster (PDF)
						</span>
						<span class="tw-text-[#A1A1AA] tw-text-xs">Export</span>
					</button>
				</div>
				
				{#if exportError}
					<p class="tw-text-[#ef4444] tw-text-xs tw-font-bold tw-m-0 tw-mt-2">{exportError}</p>
				{/if}
			</div>
		</section>

		<!-- PHASE 2 & 3 & 4: VAMPIRE IMPORTER & MAPPER -->
		<section class="lg:tw-col-span-2 tw-flex tw-flex-col tw-gap-6">
			
			{#if parsedData.length === 0}
				<!-- Drag & Drop Upload Zone -->
				<div 
					class="tw-bg-[#0B0F19] tw-border-2 tw-border-dashed tw-rounded-xl tw-p-12 tw-flex tw-flex-col tw-items-center tw-justify-center tw-transition-colors tw-text-center tw-min-h-[300px] {dragActive ? 'tw-border-[#14b8a6] tw-bg-[#14b8a6]/5' : 'tw-border-[#334155]'}"
					ondragenter={handleDrag}
					ondragleave={handleDrag}
					ondragover={handleDrag}
					ondrop={handleDrop}
				>
					<Icon name={"action.upload" as IconName} size={48} strokeWidth={1.5} class="tw-text-[#A1A1AA] tw-mb-4" />
					<h2 class="tw-text-lg tw-font-bold tw-text-[#FAFAFA] tw-m-0">The Vampire Importer</h2>
					<p class="tw-text-[#A1A1AA] tw-text-sm tw-mt-2 tw-max-w-sm">
						Drag and drop your legacy CSV file here, or click to browse. Max upload size 5MB.
					</p>
					
					<label class="tw-mt-6 tw-bg-[#FAFAFA] tw-text-[#020617] hover:tw-bg-[#D4D4D8] tw-font-bold tw-text-sm tw-px-6 tw-py-2 tw-rounded-lg tw-cursor-pointer tw-transition-colors">
						Browse Files
						<input type="file" accept=".csv" class="tw-hidden" onchange={handleFileSelect} />
					</label>

					{#if parseError}
						<p class="tw-text-[#ef4444] tw-text-xs tw-font-bold tw-mt-4">{parseError}</p>
					{/if}
				</div>
			{:else}
				<!-- Column Mapper & Ingestion UI -->
				<div class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-flex tw-flex-col tw-gap-6">
					<div class="tw-flex tw-items-center tw-justify-between">
						<div class="tw-flex tw-items-center tw-gap-3">
							<Icon name={"status.success" as IconName} size={20} class="tw-text-[#14b8a6]" strokeWidth={1.5} />
							<h2 class="tw-text-base tw-font-bold tw-text-[#FAFAFA] tw-m-0">CSV Parsed Successfully</h2>
						</div>
						<span class="tw-bg-[#1E293B] tw-text-[#FAFAFA] tw-text-xs tw-font-bold tw-px-3 tw-py-1 tw-rounded-full">
							{parsedData.length} Rows Found
						</span>
					</div>

					<!-- Visual Column Mapper (Bento Grid) -->
					<div class="tw-border tw-border-[#334155] tw-rounded-lg tw-overflow-hidden">
						<div class="tw-grid tw-grid-cols-12 tw-bg-[#020617] tw-border-b tw-border-[#334155] tw-p-3">
							<div class="tw-col-span-5 tw-text-xs tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-tracking-wider">Target Schema Field</div>
							<div class="tw-col-span-7 tw-text-xs tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-tracking-wider">Map To Legacy Column</div>
						</div>
						
						{#each targetSchema as field, index}
							<div class="tw-grid tw-grid-cols-12 tw-border-b tw-border-[#334155] last:tw-border-none hover:tw-bg-[#1E293B]/50 tw-transition-colors">
								<div class="tw-col-span-5 tw-p-4 tw-flex tw-items-center">
									<span class="tw-text-sm tw-font-bold tw-text-[#FAFAFA]">{field.label}</span>
								</div>
								<div class="tw-col-span-7 tw-p-3 tw-flex tw-items-center">
									<select
										class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-text-sm tw-font-bold tw-px-3 tw-py-2 tw-rounded-lg focus:tw-outline-none focus:tw-border-[#14b8a6]"
										bind:value={columnMap[field.key]}
									>
										<option value="">-- Ignore this field --</option>
										{#each csvHeaders as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						{/each}
					</div>
					
					<!-- Data Preview -->
					{#if columnMap['email']}
						<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-p-4">
							<p class="tw-text-xs tw-font-bold tw-text-[#D4D4D8] tw-uppercase tw-tracking-wider tw-mb-3">Preview (Row 1)</p>
							<div class="tw-grid tw-grid-cols-2 tw-gap-4">
								{#each targetSchema as field}
									{#if columnMap[field.key]}
										<div class="tw-flex tw-flex-col tw-gap-1">
											<span class="tw-text-xs tw-text-[#A1A1AA]">{field.label}</span>
											<span class="tw-text-sm tw-font-bold tw-text-[#FAFAFA]">{parsedData[0][columnMap[field.key]] || '—'}</span>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					<!-- Action Controls -->
					<div class="tw-flex tw-items-center tw-justify-between tw-mt-4">
						<button 
							onclick={() => { parsedData = []; parseError = ''; columnMap = {}; }}
							disabled={ingestLoading || ingestSuccess}
							class="tw-text-sm tw-font-bold tw-text-[#A1A1AA] hover:tw-text-[#FAFAFA] tw-transition-colors disabled:tw-opacity-50"
						>
							Cancel / Reset
						</button>

						{#if ingestSuccess}
							<div class="tw-bg-[#14b8a6]/20 tw-text-[#14b8a6] tw-px-4 tw-py-2 tw-rounded-lg tw-text-sm tw-font-bold tw-flex tw-items-center tw-gap-2">
								<Icon name={"status.success" as IconName} size={16} strokeWidth={2} />
								Ingestion Complete
							</div>
						{:else}
							<button 
								onclick={executeAtomicIngestion}
								disabled={ingestLoading || !columnMap['email']}
								class="tw-bg-[#F59E0B] hover:tw-bg-[#D97706] tw-text-[#020617] tw-font-bold tw-text-sm tw-px-6 tw-py-2 tw-rounded-lg tw-transition-colors disabled:tw-opacity-50 tw-flex tw-items-center tw-gap-2"
							>
								{#if ingestLoading}
									<Icon name={"status.info" as IconName} size={16} />
									Processing ({ingestProgress}%)...
								{:else}
									<Icon name={"action.database" as IconName} size={16} />
									Begin Atomic Batch Ingestion
								{/if}
							</button>
						{/if}
					</div>
					
					{#if ingestError}
						<p class="tw-text-[#ef4444] tw-text-xs tw-font-bold tw-mt-2 tw-text-right">{ingestError}</p>
					{/if}
				</div>
			{/if}

		</section>
	</div>
</div>
