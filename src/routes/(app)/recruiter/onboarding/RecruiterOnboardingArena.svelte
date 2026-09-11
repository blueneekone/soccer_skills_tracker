<script lang="ts">
	import type { RecruiterOnboardingEngine } from './RecruiterOnboardingEngine.svelte.js';

	let { engine }: { engine: RecruiterOnboardingEngine } = $props();
</script>

<div class="ro-arena tw-p-6 tw-max-w-3xl tw-mx-auto tw-rounded-[24px]">
	{#if engine.loading}
		<p class="tw-font-mono tw-text-gray-400">Loading vetting status...</p>
	{:else if engine.error}
		<p class="tw-font-mono tw-text-amber-500">{engine.error}</p>
	{:else if engine.status === 'not_found'}
		<div class="tw-bg-slate-800 tw-p-6 tw-rounded-[24px] tw-border tw-border-slate-700">
			<h2 class="tw-text-xl tw-font-bold tw-mb-4 tw-text-white">Application Required</h2>
			<p class="tw-text-slate-300">Your recruiter profile was not found. Please contact administration or apply to initiate vetting.</p>
		</div>
	{:else if engine.status === 'pending'}
		<div class="tw-bg-slate-800 tw-p-6 tw-rounded-[24px] tw-border tw-border-slate-700">
			<h2 class="tw-text-xl tw-font-bold tw-mb-4 tw-text-white">Vetting Underway</h2>
			<p class="tw-text-slate-300 tw-mb-4">Your application is being reviewed. If approved, you will receive a Checkr invitation here.</p>
			<button class="tw-bg-amber-500 tw-text-slate-900 tw-font-bold tw-py-2 tw-px-4 tw-rounded tw-cursor-pointer hover:tw-bg-amber-400" onclick={() => engine.forcePoll()}>Refresh Status</button>
		</div>
	{:else if engine.status === 'invited'}
		<div class="tw-bg-slate-800 tw-p-6 tw-rounded-[24px] tw-border tw-border-slate-700">
			<h2 class="tw-text-xl tw-font-bold tw-mb-4 tw-text-white">Background Check Required</h2>
			<p class="tw-text-slate-300 tw-mb-4">Please check your email for the Checkr background check invitation and complete it to gain platform access.</p>
			{#if engine.candidateId}
				<p class="tw-font-mono tw-text-sm tw-text-slate-400 tw-mt-4">Candidate ID: {engine.candidateId}</p>
			{/if}
			<button class="tw-bg-amber-500 tw-text-slate-900 tw-font-bold tw-py-2 tw-px-4 tw-rounded tw-mt-4 tw-cursor-pointer hover:tw-bg-amber-400" onclick={() => engine.forcePoll()}>Check Verification</button>
		</div>
	{:else if engine.status === 'clear'}
		<div class="tw-bg-slate-800 tw-p-6 tw-rounded-[24px] tw-border tw-border-emerald-600/50">
			<h2 class="tw-text-xl tw-font-bold tw-mb-4 tw-text-emerald-400">Clearance Verified</h2>
			<p class="tw-text-slate-300">Your National Criminal Database background check is clear. You now have authorized access to prospect data.</p>
			<a href="/recruiter" class="tw-inline-block tw-bg-emerald-500 tw-text-slate-900 tw-font-bold tw-py-2 tw-px-4 tw-rounded tw-mt-4 tw-no-underline hover:tw-bg-emerald-400">Proceed to Recruiter HUD</a>
		</div>
	{:else}
		<div class="tw-bg-slate-800 tw-p-6 tw-rounded-[24px] tw-border tw-border-amber-600/50">
			<h2 class="tw-text-xl tw-font-bold tw-mb-4 tw-text-amber-500">Status: {String(engine.status).toUpperCase()}</h2>
			<p class="tw-text-slate-300">Your vetting status requires manual review. Please contact support.</p>
		</div>
	{/if}
</div>
