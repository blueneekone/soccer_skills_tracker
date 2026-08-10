<script lang="ts">
  import VpcArena from './VpcArena.svelte';
  import VpcHUD from './VpcHUD.svelte';
  import { VpcEngine } from './VpcEngine.svelte.js';

  let engine = new VpcEngine();
</script>

<div class="tw-bg-[#0f172a] tw-rounded-[24px] tw-p-8 tw-flex tw-flex-col tw-gap-8 tw-min-h-screen">
  <header>
    <h1 class="tw-text-white tw-font-bold tw-text-2xl">Biometric Enclave</h1>
    <p class="tw-text-slate-400">Verifiable Parental Consent (VPC)</p>
  </header>

  <div class="tw-grid tw-grid-cols-12 tw-gap-6 tw-w-full tw-max-w-4xl">
    <div class="tw-col-span-8">
      <VpcArena bind:engine={engine} />
    </div>
    <div class="tw-col-span-4">
      <VpcHUD bind:engine={engine} />
    </div>
  </div>
</div>
