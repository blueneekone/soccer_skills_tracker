<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	export let wizardStage: string;
	export let parentDisplayName: string;
	export let submitting: boolean;
	export let submitError: string;
	export let activePlayerEmail: string;
	export let consentWorkout: boolean;
	export let consentIdentity: boolean;
	export let consentAnalytics: boolean;
	export let consentComms: boolean;
	export let consentSponsor: boolean;
	export let submitConsent: () => void;
</script>

<div class="tw-rounded-[24px] tw-border tw-border-[#334155] tw-bg-slate-900 tw-p-6 tw-shadow-2xl tw-mb-6">
	<div class="tw-flex tw-items-center tw-mb-8">
		<button type="button" class="tw-w-8 tw-h-8 tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-[#94a3b8] hover:tw-text-white tw-transition-colors tw-mr-4" onclick={() => wizardStage = 'step2'} aria-label="Back">
			<Icon name={"nav.arrow-left" as IconName} size={14} />
		</button>
		<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1">
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center"><Icon name={"status.check" as IconName} size={12} /></span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#14b8a6]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center"><Icon name={"status.check" as IconName} size={12} /></span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#14b8a6]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#f59e0b] tw-text-black tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">3</span>
		</div>
	</div>

	<h2 class="tw-font-sans tw-text-xl tw-font-semibold tw-tracking-tight tw-text-white tw-mb-2">Step 3 — Digital Attestation</h2>
	<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-mb-6">By entering your legal name and clicking <strong class="tw-text-white">Submit consent</strong>, you confirm that you are the legal parent or guardian of <strong class="tw-text-[#f59e0b]">{activePlayerEmail}</strong> and that you have read, understood, and agree to the data use disclosure in Step 1.</p>

	<div class="tw-mb-6 tw-space-y-4">
		<label class="tw-block tw-font-mono tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#94a3b8]" for="vpc-parent-name">Your legal name (as parent / guardian)</label>
		<input id="vpc-parent-name" type="text" bind:value={parentDisplayName} placeholder="Type full legal name..." autocomplete="name" disabled={submitting} class="tw-w-full tw-rounded-lg tw-border tw-border-[#334155] tw-bg-[#1e293b] tw-px-4 tw-py-3 tw-font-sans tw-text-white tw-placeholder-slate-500 tw-outline-none tw-transition-all tw-duration-200 focus:tw-border-[#f59e0b] focus:tw-ring-1 focus:tw-ring-[#f59e0b]" />
	</div>

	<div class="tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-mb-6 tw-font-sans tw-text-sm">
		<p class="tw-mb-2"><strong class="tw-text-white">Athlete:</strong> <span class="tw-text-[#f59e0b]">{activePlayerEmail}</span></p>
		<p class="tw-mb-2"><strong class="tw-text-white">Consenting to:</strong></p>
		<ul class="tw-list-none tw-p-0 tw-m-0 tw-space-y-1 tw-text-xs tw-text-[#cbd5e1]">
			<li>Workout &amp; training data — <strong class="{consentWorkout ? 'tw-text-[#14b8a6]' : 'tw-text-red-400'}">{consentWorkout ? 'Accepted' : 'Declined'}</strong></li>
			<li>Identity &amp; roster data — <strong class="{consentIdentity ? 'tw-text-[#14b8a6]' : 'tw-text-red-400'}">{consentIdentity ? 'Accepted' : 'Declined'}</strong></li>
			<li>Performance analytics — <strong class="{consentAnalytics ? 'tw-text-[#14b8a6]' : 'tw-text-[#64748b]'}">{consentAnalytics ? 'Accepted' : 'Declined'}</strong></li>
			<li>In-app communications — <strong class="{consentComms ? 'tw-text-[#14b8a6]' : 'tw-text-[#64748b]'}">{consentComms ? 'Accepted' : 'Declined'}</strong></li>
			<li>Sponsor &amp; partner updates — <strong class="{consentSponsor ? 'tw-text-[#14b8a6]' : 'tw-text-[#64748b]'}">{consentSponsor ? 'Accepted' : 'Declined'}</strong></li>
		</ul>
		<p class="tw-mt-4 tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-uppercase">Policy version: 2026-04 — {new Date().toLocaleDateString()}</p>
	</div>

	{#if submitError}
		<p class="tw-text-[#f59e0b] tw-font-sans tw-text-sm tw-mb-4">{submitError}</p>
	{/if}

	<button type="button" class="tw-w-full tw-py-4 tw-rounded-lg tw-bg-[#f59e0b] tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#d97706] hover:tw-shadow-[0_0_20px_rgba(245,158,11,0.4)] tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed" disabled={submitting || !parentDisplayName.trim()} onclick={submitConsent}>
		{#if submitting}
			<Icon name={"status.loading" as IconName} size={16} /> <span>Submitting...</span>
		{:else}
			<Icon name={"status.seal-check" as IconName} size={16} /> <span>Submit Consent via Enclave</span>
		{/if}
	</button>
</div>
