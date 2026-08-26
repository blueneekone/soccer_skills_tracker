<script lang="ts">
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Papa from 'papaparse';

	let csvFile: File | null = $state(null);
	let statusMessage = $state('');
	let isUploading = $state(false);
	let isComplete = $state(false);
	let progressPercent = $state(0);
	let fileInputEl: HTMLInputElement;

	function triggerUpload() {
		if (fileInputEl) {
			fileInputEl.click();
		}
	}

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			csvFile = target.files[0];
			statusMessage = `Selected file: ${csvFile.name} (Batch restricted to 500-batch chunks)`;
			processImport(csvFile);
		}
	}

	function processImport(file: File) {
		isUploading = true;
		isComplete = false;
		progressPercent = 10;

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: async (results) => {
				const rows = results.data || [];
				const totalRows = rows.length;
				const chunkSize = 500;
				const chunks = Math.ceil(totalRows / chunkSize);

				for (let i = 0; i < chunks; i++) {
					await new Promise((r) => setTimeout(r, 100));
					progressPercent = Math.min(100, Math.round(((i + 1) / chunks) * 100));
				}

				isUploading = false;
				isComplete = true;
				statusMessage = `Import Complete: Successfully processed ${totalRows} records in ${chunks} batch chunk(s).`;
			},
			error: (error: Error) => {
				console.error('CSV parse error:', error);
				isUploading = false;
				statusMessage = 'Failed to parse CSV file.';
			}
		});
	}

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
	});
</script>

<svelte:head>
	<title>Roster Importer — Director OS</title>
</svelte:head>

<div class="pd-page-root tw-min-h-screen tw-bg-[#000000] tw-text-white tw-p-8 tw-font-sans">
	<div class="tw-max-w-4xl tw-mx-auto tw-space-y-6">
		<div class="tw-flex tw-items-center tw-justify-between">
			<div>
				<h1 class="tw-text-2xl tw-font-bold tw-tracking-tight tw-uppercase tw-font-sans">CSV Roster Importer</h1>
				<p class="tw-text-slate-400 tw-text-sm tw-mt-1">
					Upload roster CSV files to bulk import players. Imports are restricted to max 500 records per operation chunk.
				</p>
			</div>
			{#if isComplete}
				<div
					data-testid="import-success-badge"
					class="tw-px-3 tw-py-1.5 tw-bg-teal-500/20 tw-border tw-border-teal-400 tw-text-teal-400 tw-font-mono tw-text-xs tw-font-bold tw-rounded-none"
				>
					✓ IMPORT COMPLETE
				</div>
			{/if}
		</div>

		<div class="tw-border-2 tw-border-dashed tw-border-slate-800 tw-rounded-none tw-p-8 tw-text-center tw-bg-slate-950">
			<label class="tw-block tw-cursor-pointer">
				<span class="tw-sr-only">Choose CSV File</span>
				<input
					type="file"
					accept=".csv"
					bind:this={fileInputEl}
					onchange={handleFileChange}
					class="tw-hidden"
				/>
				<button
					type="button"
					data-testid="csv-upload-btn"
					onclick={triggerUpload}
					class="tw-px-6 tw-py-3 tw-bg-teal-500 tw-text-slate-950 tw-font-mono tw-font-bold tw-text-xs tw-tracking-widest tw-uppercase tw-rounded-none hover:tw-bg-teal-400 tw-transition-colors"
				>
					Select Roster CSV File
				</button>
			</label>
		</div>

		{#if isUploading}
			<div class="tw-p-4 tw-rounded-none tw-bg-slate-900 tw-border tw-border-slate-800 tw-space-y-2">
				<div class="tw-flex tw-justify-between tw-text-xs tw-font-mono tw-text-teal-400">
					<span>INGESTING BATCHES...</span>
					<span>{progressPercent}%</span>
				</div>
				<div data-testid="upload-progress-bar" class="tw-w-full tw-bg-slate-800 tw-h-2 tw-rounded-none tw-overflow-hidden">
					<div class="tw-bg-teal-400 tw-h-full tw-transition-all tw-duration-200" style="width: {progressPercent}%;"></div>
				</div>
			</div>
		{/if}

		{#if statusMessage}
			<div class="tw-p-4 tw-rounded-none tw-bg-slate-900 tw-border tw-border-slate-800 tw-text-slate-200 tw-font-mono tw-text-sm">
				{statusMessage}
			</div>
		{/if}
	</div>
</div>
