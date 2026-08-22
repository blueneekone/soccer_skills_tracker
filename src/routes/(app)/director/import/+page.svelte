<script lang="ts">
	import { onMount } from 'svelte';

	let csvFile: File | null = $state(null);
	let statusMessage = $state('');

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			csvFile = target.files[0];
			statusMessage = `Selected file: ${csvFile.name} (Batch restricted to 500-batch chunks)`;
		}
	}
</script>

<div class="pd-page-root tw-min-h-screen tw-bg-[#000000] tw-text-white tw-p-8 tw-font-sans">
	<div class="tw-max-w-4xl tw-mx-auto tw-space-y-6">
		<h1 class="tw-text-2xl tw-font-bold tw-tracking-tight">CSV Roster Importer</h1>
		<p class="tw-text-slate-400">Upload roster CSV files to bulk import players. Imports are restricted to max 500 records per operation.</p>

		<div class="tw-border-2 tw-border-dashed tw-border-slate-800 tw-rounded-none tw-p-8 tw-text-center tw-bg-slate-950">
			<label class="tw-block tw-cursor-pointer">
				<span class="tw-sr-only">Choose CSV File</span>
				<input
					type="file"
					accept=".csv"
					onchange={handleFileChange}
					class="tw-block tw-w-full tw-text-sm tw-text-slate-400 file:tw-mr-4 file:tw-py-2 file:tw-px-4 file:tw-rounded-none file:tw-border-0 file:tw-text-sm file:tw-font-semibold file:tw-bg-slate-800 file:tw-text-white hover:file:tw-bg-slate-700"
				/>
			</label>
		</div>

		{#if statusMessage}
			<div class="tw-p-4 tw-rounded-none tw-bg-slate-900 tw-border tw-border-slate-800 tw-text-slate-200 tw-font-mono tw-text-sm">
				{statusMessage}
			</div>
		{/if}
	</div>
</div>
