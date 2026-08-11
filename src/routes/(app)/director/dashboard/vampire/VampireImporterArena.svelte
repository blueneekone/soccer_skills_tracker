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

  <div class="tw-flex tw-flex-col tw-gap-4">
    <div class="tw-flex tw-items-center tw-gap-2">
      <label class="tw-text-sm tw-text-gray-300 tw-font-mono" for="teamIdInput">Team ID:</label>
      <input
        id="teamIdInput"
        type="text"
        bind:value={engine.teamId}
        class="tw-bg-void-black tw-text-data-cyan tw-border tw-border-structural-grey tw-px-3 tw-py-1 tw-font-mono tw-rounded-none focus:tw-outline-none focus:tw-border-data-cyan"
        placeholder="Enter Team ID"
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
      <span class="tw-text-gray-400 tw-font-mono tw-mb-2">Drag & Drop CSV Here</span>
      <span class="tw-text-gray-500 tw-text-xs tw-font-mono">or click to browse</span>
      <input
        type="file"
        accept=".csv"
        bind:this={fileInput}
        onchange={handleFileChange}
        class="tw-hidden"
      />
    </div>
  </div>
</div>
