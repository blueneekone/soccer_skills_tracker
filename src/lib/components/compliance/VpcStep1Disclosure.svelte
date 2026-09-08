<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	export let wizardStage: string;
	export let disclosureScrolled: boolean;
	export let disclosureEl: HTMLElement | null;
	export let activePlayerEmail: string;
	export let cancelWizard: () => void;
	export let onDisclosureScroll: (e: Event) => void;
</script>

<div class="tw-rounded-[24px] tw-border tw-border-[#334155] tw-bg-slate-900 tw-p-6 tw-shadow-2xl tw-mb-6">
	<div class="tw-flex tw-items-center tw-mb-8">
		<button type="button" class="tw-w-8 tw-h-8 tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-[#94a3b8] hover:tw-text-white tw-transition-colors tw-mr-4" onclick={cancelWizard} aria-label="Cancel">
			<Icon name={"nav.arrow-left" as IconName} size={14} />
		</button>
		<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1">
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#f59e0b] tw-text-black tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">1</span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#334155]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#64748b] tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">2</span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#334155]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#64748b] tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">3</span>
		</div>
	</div>

	<h2 class="tw-font-sans tw-text-xl tw-font-semibold tw-tracking-tight tw-text-white tw-mb-2">COPPA 2.0 Verifiable Parental Consent</h2>
	<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-mb-6">You are consenting on behalf of <strong class="tw-text-white">{activePlayerEmail}</strong>. Read the full disclosure below, then scroll to the bottom to continue.</p>

	<div class="tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-h-64 tw-overflow-y-auto tw-p-6 tw-mb-6 tw-text-sm tw-text-[#cbd5e1] tw-leading-relaxed prose prose-invert prose-p:tw-my-2 prose-ul:tw-my-2" role="document" bind:this={disclosureEl} onscroll={onDisclosureScroll}>
		<h4 class="tw-text-white tw-font-sans tw-font-semibold tw-text-base tw-mb-2">What data we collect</h4>
		<p class="tw-font-sans">We collect the following categories of personal data for athletes registered through SSTRACKER, the Soccer Skills Development platform:</p>
		<ul class="tw-list-disc tw-pl-5 tw-font-sans">
			<li><strong>Identity data:</strong> athlete display name, email address, date of birth, team roster membership, and club affiliation.</li>
			<li><strong>Workout &amp; training data:</strong> repetition counts, training sets, session timestamps, video trial submissions, assigned drill completions, and XP / level progress.</li>
			<li><strong>Analytics data:</strong> aggregate performance metrics, attribute scores (speed, agility, technique, etc.), and positional comparisons within the club.</li>
			<li><strong>Communication data:</strong> in-app messages between coaches and athletes, notification delivery receipts.</li>
		</ul>
		<h4 class="tw-text-white tw-font-sans tw-font-semibold tw-text-base tw-mt-6 tw-mb-2">How we use this data</h4>
		<p class="tw-font-sans">Data is used exclusively to:</p>
		<ul class="tw-list-disc tw-pl-5 tw-font-sans">
			<li>Display the athlete's progress to the athlete, their parent/guardian, their coach, and their club director within their shared organizational scope.</li>
			<li>Enable coaches to assign, review, and approve training activities.</li>
			<li>Generate aggregate, de-identified club analytics for directors.</li>
		</ul>
		<p class="tw-font-sans">We do <strong>not</strong> sell athlete data. We do <strong>not</strong> share data with third-party advertisers. Analytics data may be processed by Firebase/Google infrastructure subject to Google's sub-processor privacy terms.</p>
		<h4 class="tw-text-white tw-font-sans tw-font-semibold tw-text-base tw-mt-6 tw-mb-2">Data retention and deletion</h4>
		<p class="tw-font-sans">Minor athlete data is subject to time-limited retention. If parental consent is withdrawn or not verified within the platform's configured TTL window, all training data, passports, evaluation records, and roster memberships will be permanently purged and the associated Firebase Authentication account will be anonymized. You may request immediate deletion by contacting your club director at any time.</p>
		<h4 class="tw-text-white tw-font-sans tw-font-semibold tw-text-base tw-mt-6 tw-mb-2">Your rights under COPPA &amp; FERPA</h4>
		<p class="tw-font-sans">Under the Children's Online Privacy Protection Act (COPPA) and Family Educational Rights and Privacy Act (FERPA), you have the right to:</p>
		<ul class="tw-list-disc tw-pl-5 tw-font-sans">
			<li>Review all personal data collected about your child.</li>
			<li>Request correction or deletion of inaccurate data.</li>
			<li>Withdraw consent at any time (subject to reasonable processing delays).</li>
			<li>Receive a copy of any stored data within 30 days of a written request to your club director.</li>
		</ul>
		<h4 class="tw-text-white tw-font-sans tw-font-semibold tw-text-base tw-mt-6 tw-mb-2">Policy version</h4>
		<p class="tw-font-mono tw-text-xs">This disclosure is version <strong>2026-04</strong>, effective April 2026.</p>
		<div class="tw-mt-8 tw-text-[#f59e0b] tw-font-mono tw-text-[10px] tw-flex tw-items-center tw-gap-2 tw-uppercase tw-tracking-widest">
			<Icon name={"nav.arrow-down" as IconName} size={12} /> Scroll to the bottom to confirm you have read this disclosure.
		</div>
	</div>

	<button type="button" class="tw-w-full tw-py-4 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-gap-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed {disclosureScrolled ? 'tw-bg-[#f59e0b] tw-text-black hover:tw-bg-[#d97706]' : 'tw-bg-[#334155] tw-text-[#94a3b8]'}" disabled={!disclosureScrolled} onclick={() => wizardStage = 'step2'}>
		{#if disclosureScrolled}
			<Icon name={"status.verified" as IconName} size={16} /> I have read the disclosure — continue
		{:else}
			<Icon name={"nav.arrow-down" as IconName} size={16} /> Scroll to the bottom to continue
		{/if}
	</button>
</div>
