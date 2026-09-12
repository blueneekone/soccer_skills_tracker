<script lang="ts">
	import type { ParentWorkoutEngine } from './ParentWorkoutEngine.svelte';

	let { engine }: { engine: ParentWorkoutEngine } = $props();
</script>

<div class="tw-bg-[#0B0F19] tw-border tw-border-[#14b8a6]/30 tw-p-4 tw-rounded-none tw-mt-4">
	<span class="tw-text-[#14b8a6] tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-mb-3 tw-block">Guardian Attestation</span>
	<label class="tw-sr-only" for="plw-legal">Your full legal name</label>
	<input id="plw-legal" type="text" autocomplete="name" placeholder="First and last (verifying parent)" bind:value={engine.verifierLegalName} class="tw-w-full tw-bg-black tw-border tw-border-[#334155] tw-text-white tw-p-3 tw-font-mono tw-text-sm focus:tw-outline-none focus:tw-border-[#fbbf24] tw-rounded-none tw-mb-4 tw-transition-colors" />
	<label class="tw-flex tw-items-center tw-gap-3 tw-cursor-pointer">
		<input type="checkbox" bind:checked={engine.parentVerifiedAck} class="tw-accent-[#fbbf24] tw-w-4 tw-h-4" />
		<span class="tw-text-xs tw-text-[#94a3b8]">I confirm this session was completed as logged for the selected operative.</span>
	</label>
</div>
