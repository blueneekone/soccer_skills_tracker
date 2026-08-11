<script lang="ts">
  import type { VampireImporterEngine } from './VampireImporterEngine.svelte';

  let { engine }: { engine: VampireImporterEngine } = $props();
</script>

<div class="tw-flex tw-items-center tw-justify-between tw-w-full">
  <div class="tw-flex tw-items-center tw-gap-4">
    <h1 class="tw-text-2xl tw-font-bold tw-text-gray-100 tw-font-sans">Vampire Importer</h1>
    {#if engine.isUploading}
      <span class="tw-text-data-cyan tw-text-sm tw-font-mono tw-animate-pulse">Uploading & Parsing...</span>
    {/if}
  </div>

  <div class="tw-flex tw-items-center tw-gap-6 tw-font-mono text-sm">
    <div class="tw-flex tw-flex-col tw-items-end">
      <span class="tw-text-gray-400 tw-text-xs">Processed</span>
      <span class="telemetry-readout tw-text-data-cyan tw-font-bold">{engine.processedCount}</span>
    </div>

    {#if engine.errorMessage}
      <div class="tw-flex tw-flex-col tw-items-end tw-text-red-500">
        <span class="tw-text-xs">Error</span>
        <span>{engine.errorMessage}</span>
      </div>
    {/if}

    {#if engine.successMessage}
      <div class="tw-flex tw-flex-col tw-items-end tw-text-green-500">
        <span class="tw-text-xs">Status</span>
        <span>{engine.successMessage}</span>
      </div>
    {/if}
  </div>
</div>
