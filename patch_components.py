import os

os.makedirs('src/lib/components/compliance', exist_ok=True)

with open('src/lib/components/compliance/VpcStep1Disclosure.svelte', 'w') as f:
    f.write("""<script lang="ts">
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
""")

with open('src/lib/components/compliance/VpcStep2Assertions.svelte', 'w') as f:
    f.write("""<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	export let wizardStage: string;
	export let consentWorkout: boolean;
	export let consentIdentity: boolean;
	export let consentAnalytics: boolean;
	export let consentComms: boolean;
	export let consentSponsor: boolean;
	export let activePlayerEmail: string;
</script>

<div class="tw-rounded-[24px] tw-border tw-border-[#334155] tw-bg-slate-900 tw-p-6 tw-shadow-2xl tw-mb-6">
	<div class="tw-flex tw-items-center tw-mb-8">
		<button type="button" class="tw-w-8 tw-h-8 tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-[#94a3b8] hover:tw-text-white tw-transition-colors tw-mr-4" onclick={() => wizardStage = 'step1'} aria-label="Back">
			<Icon name={"nav.arrow-left" as IconName} size={14} />
		</button>
		<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1">
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center"><Icon name={"status.check" as IconName} size={12} /></span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#14b8a6]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#f59e0b] tw-text-black tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">2</span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#334155]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#64748b] tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">3</span>
		</div>
	</div>

	<h2 class="tw-font-sans tw-text-xl tw-font-semibold tw-tracking-tight tw-text-white tw-mb-2">Step 2 — Consent Assertions</h2>
	<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-mb-6">Review each item and indicate your consent. Items marked <strong class="tw-text-[#f59e0b]">Required</strong> must be accepted to proceed.</p>

	<div class="tw-space-y-4 tw-mb-8">
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#f59e0b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentWorkout} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#f59e0b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Workout &amp; training data</strong>
					<span class="tw-bg-[#f59e0b]/10 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Required</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow SSTRACKER to collect and store repetition counts, session logs, drill completions, and XP data for {activePlayerEmail}.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#f59e0b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentIdentity} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#f59e0b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Identity &amp; roster data</strong>
					<span class="tw-bg-[#f59e0b]/10 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Required</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow the platform to store the athlete's display name, email address, club and team membership, and date of birth for access control.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentAnalytics} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Performance analytics</strong>
					<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow attribute scoring, leaderboard rankings, and team-comparison analytics. Declining will exclude the athlete from club dashboards but will not affect training data logging.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentComms} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">In-app communications</strong>
					<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow coaches to send in-app messages and notifications to the athlete account.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentSponsor} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Sponsor &amp; partner updates</strong>
					<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Receive director-approved club partner announcements in your guardian inbox. Separate from coach team messages. Never sent to minor accounts.</span>
			</div>
		</label>
	</div>

	<button type="button" class="tw-w-full tw-py-4 tw-rounded-lg tw-bg-[#f59e0b] tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#d97706] tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed" disabled={!consentWorkout || !consentIdentity} onclick={() => wizardStage = 'step3'}>
		Continue to Attestation
	</button>
</div>
""")

with open('src/lib/components/compliance/VpcStep3Attestation.svelte', 'w') as f:
    f.write("""<script lang="ts">
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
""")
