<script lang="ts">
  import type { VampireImporterEngine } from './VampireImporterEngine.svelte';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth/facade.svelte';

  let { engine }: { engine: VampireImporterEngine } = $props();

  let fileInput: HTMLInputElement;
  let isDragging = $state(false);

  function triggerFileSelect() {
    fileInput.click();
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      engine.handleFileUpload(target.files[0]);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      engine.handleFileUpload(event.dataTransfer.files[0]);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      triggerFileSelect();
    }
  }

  // Hydration guard for data operations
  $effect(() => {
    if (!db || !authStore.isAuthenticated) return;
  });
</script>

<div class="tw-p-6 tw-bg-navy-slate tw-rounded-none tw-border tw-border-structural-grey">
  <div class="tw-mb-4">
    <h2 class="tw-text-xl tw-text-gray-100 tw-font-bold tw-font-sans">CSV Data Ingestion</h2>
    <p class="tw-text-gray-400 tw-text-sm tw-mt-1 tw-font-sans">Upload your legacy team roster files here.</p>
  </div>

  <div class="tw-flex tw-flex-col tw-gap-6">
    <div class="tw-flex tw-items-center tw-gap-3">
      <label class="tw-text-sm tw-text-gray-300 tw-font-mono" for="teamIdInput">Team ID:</label>
      <input
        id="teamIdInput"
        type="text"
        bind:value={engine.teamId}
        class="tw-bg-void-black tw-text-data-cyan tw-border tw-border-structural-grey tw-px-3 tw-py-1.5 tw-font-mono tw-rounded-none focus:tw-outline-none focus:tw-border-data-cyan tw-text-sm"
        placeholder="Enter Target Team ID"
      />
    </div>

    <!-- Drag & Drop Zone -->
    <div
      class="tw-w-full tw-h-48 tw-border-2 tw-border-dashed tw-border-structural-grey tw-bg-void-black tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer hover:tw-border-data-cyan tw-transition-colors {isDragging ? 'tw-border-data-cyan' : ''}"
      role="button"
      tabindex="0"
      onclick={triggerFileSelect}
      onkeydown={handleKeyDown}
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragenter={handleDragOver}
      ondragleave={handleDragLeave}
    >
      <span class="tw-text-gray-300 tw-font-mono tw-mb-2 tw-text-base">Drag & Drop CSV Here</span>
      <span class="tw-text-gray-500 tw-text-xs tw-font-mono">or click to browse local files</span>
      {#if engine.file}
        <span class="tw-mt-3 tw-text-data-cyan tw-font-mono tw-text-xs tw-bg-navy-slate tw-px-3 tw-py-1 tw-border tw-border-structural-grey">
          Selected: {engine.file.name} ({(engine.file.size / 1024).toFixed(1)} KB)
        </span>
      {/if}
      <input
        type="file"
        accept=".csv"
        bind:this={fileInput}
        onchange={handleFileChange}
        class="tw-hidden"
      />
    </div>

    <!-- Telemetry & Trigger Controls -->
    {#if engine.isParsing}
      <div class="tw-p-4 tw-border tw-border-structural-grey tw-bg-void-black tw-text-data-cyan tw-font-mono tw-text-xs tw-animate-pulse">
        Parsing CSV structure...
      </div>
    {:else if engine.parsedRows.length > 0}
      <div class="tw-flex tw-flex-col tw-gap-4">
        <div class="tw-flex tw-items-center tw-justify-between tw-bg-void-black tw-p-4 tw-border tw-border-structural-grey">
          <div class="tw-font-mono tw-text-xs tw-text-gray-300">
            Parsed Records Ready: <span class="tw-text-data-cyan tw-font-bold">{engine.parsedRows.length}</span>
          </div>
          <button
            type="button"
            class="tw-px-4 tw-py-2 tw-bg-data-cyan tw-text-void-black tw-font-mono tw-font-bold tw-text-xs tw-rounded-none hover:tw-opacity-90 disabled:tw-opacity-50"
            onclick={() => engine.triggerIngestion()}
            disabled={engine.isUploading}
          >
            {engine.isUploading ? 'INGESTING STAGING DATA...' : 'EXECUTE BATCH IMPORT'}
          </button>
        </div>

        <!-- Preview Table -->
        <div class="tw-w-full tw-overflow-x-auto tw-border tw-border-structural-grey">
          <table class="tw-w-full tw-text-left tw-font-mono tw-text-xs">
            <thead>
              <tr class="tw-bg-void-black tw-border-b tw-border-structural-grey tw-text-gray-400">
                <th class="tw-p-3">First Name</th>
                <th class="tw-p-3">Last Name</th>
                <th class="tw-p-3">Age</th>
                <th class="tw-p-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {#each engine.parsedRows.slice(0, 5) as row}
                <tr class="tw-border-b tw-border-structural-grey/40 hover:tw-bg-void-black/50 tw-text-gray-200">
                  <td class="tw-p-3">{row.firstName}</td>
                  <td class="tw-p-3">{row.lastName}</td>
                  <td class="tw-p-3">{row.age}</td>
                  <td class="tw-p-3">{row.email}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if engine.parsedRows.length > 5}
            <div class="tw-p-2 tw-bg-void-black tw-text-gray-500 tw-font-mono tw-text-xs tw-text-center">
              + {engine.parsedRows.length - 5} more records ready for batch ingestion
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
