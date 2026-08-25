<script lang="ts">
  import { VampireImporterEngine } from './VampireImporterEngine.svelte';
  import VampireImporterArena from './VampireImporterArena.svelte';
  import VampireImporterHUD from './VampireImporterHUD.svelte';

  let engine = new VampireImporterEngine();
</script>

<div class="vampire-shell tw-w-full tw-h-[100dvh] tw-flex tw-flex-col tw-bg-void-black tw-text-gray-100 tw-rounded-none">
  <div class="tw-flex-none tw-w-full tw-p-4 tw-border-b tw-border-gray-800">
    <VampireImporterHUD {engine} />
  </div>
  <div class="tw-flex-grow tw-w-full tw-relative">
    <VampireImporterArena {engine} />
  </div>
</div>
