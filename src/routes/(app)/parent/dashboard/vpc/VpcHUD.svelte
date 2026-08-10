<script lang="ts">
  import type { VpcEngine } from './VpcEngine.svelte.js';

  let { engine = $bindable() }: { engine: VpcEngine } = $props();

  const timestamp = new Date().toISOString();
</script>

<div class="tw-border tw-border-slate-800 tw-rounded-[24px] tw-p-6 tw-bg-slate-900 tw-font-mono tw-text-sm tw-flex tw-flex-col tw-gap-4">
  <div class="tw-text-slate-400">TELEMETRY</div>

  <div class="tw-flex tw-justify-between">
    <span class="tw-text-slate-500">STATUS:</span>
    <span class={engine.isVerified ? 'tw-text-[#14b8a6]' : 'tw-text-amber-500'}>
      {engine.isVerified ? 'VERIFIED' : 'PENDING'}
    </span>
  </div>

  <div class="tw-flex tw-col tw-flex-col tw-gap-1">
    <span class="tw-text-slate-500">TIMESTAMP:</span>
    <span class="tw-text-slate-300">{timestamp}</span>
  </div>

  {#if engine.challenge}
    <div class="tw-flex tw-col tw-flex-col tw-gap-1">
      <span class="tw-text-slate-500">CHALLENGE:</span>
      <span class="tw-text-slate-300 tw-truncate" title={engine.challenge}>{engine.challenge.substring(0, 16)}...</span>
    </div>
  {/if}
</div>
