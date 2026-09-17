<script lang="ts">
	import type { RecruiterOnboardingEngine } from './RecruiterOnboardingEngine.svelte.js';
	let { engine }: { engine: RecruiterOnboardingEngine } = $props();
</script>

<div class="ro-hud tw-bg-[#0f172a] tw-border-t tw-border-slate-800 tw-p-4 tw-flex tw-justify-between tw-items-center">
	<div class="tw-font-mono tw-text-sm tw-text-slate-400">
		NATIONAL CRIMINAL DATABASE CLEARANCE
	</div>
	<div>
		{#if engine.status === 'clear'}
			<span class="tw-bg-[#14b8a6]/50 tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/30 tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-mono tw-font-bold">CLEARED</span>
		{:else if engine.status === 'invited'}
			<span class="tw-bg-amber-900/50 tw-text-[#fbbf24] tw-border tw-border-[#f59e0b]/30 tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-mono tw-font-bold">INVITATION SENT</span>
		{:else}
			<span class="tw-bg-[#0f172a] tw-text-slate-300 tw-border tw-border-slate-700 tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-mono tw-font-bold">{String(engine.status).toUpperCase()}</span>
		{/if}
	</div>
</div>
