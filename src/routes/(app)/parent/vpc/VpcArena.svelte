<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import type { VpcEngine } from './VpcEngine.svelte';

	let { engine }: { engine: VpcEngine } = $props();

	$effect(() => {
		engine.checkDisclosureHeight();
	});
</script>

<div class="tw-bg-[#000000] tw-min-h-dvh tw-text-white tw-font-sans tw-overflow-y-auto tw-p-4 lg:tw-p-8">
	<div class="tw-max-w-4xl tw-mx-auto">
		<div class="tw-bg-[#0F172A] tw-border tw-border-[#334155] tw-rounded-none tw-flex tw-flex-col">
			
			<header class="tw-bg-black/40 tw-border-b tw-border-[#334155] tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-4">
				<div class="tw-flex tw-items-center tw-gap-4">
					<div class="tw-w-12 tw-h-12 tw-bg-black tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-[#14b8a6] tw-rounded-none">
						<Icon name={"status.seal-check" as IconName} size={24} />
					</div>
					<div>
						<h1 class="tw-text-xl tw-font-bold tw-uppercase tw-tracking-widest tw-m-0">Verifiable Parental Consent</h1>
						{#if authStore.role === 'parent' && engine.householdId && !engine.loadingHousehold && !engine.loadErr && engine.household && engine.playerEmails.length > 0}
							<p class="tw-font-mono tw-text-xs tw-mt-1 {engine.aggregateTrustStatus === 'verified' ? 'tw-text-[#14b8a6]' : 'tw-text-[#f59e0b]'}">
								{engine.aggregateTrustStatus === 'verified' ? 'All linked athletes verified' : 'Consent required for one or more athletes'}
							</p>
						{:else}
							<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs tw-mt-1">COPPA / FERPA compliance gate</p>
						{/if}
					</div>
				</div>
				{#if authStore.role === 'parent' && engine.householdId && !engine.loadingHousehold && !engine.loadErr && engine.household && engine.playerEmails.length > 0 && engine.wizardStage === 'select' && engine.firstPendingEmail}
					<button type="button" class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-px-4 tw-py-2 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase hover:tw-bg-[#14b8a6]/20 tw-transition-colors tw-rounded-none" onclick={() => engine.startFirstPendingConsent()}>
						Update Consent
					</button>
				{/if}
			</header>

			<div class="tw-p-6">
				{#if authStore.role !== 'parent'}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">This page is for parent accounts only.</p>
				{:else if !engine.householdId}
					<div class="tw-bg-black tw-border tw-border-[#334155] tw-p-8 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-4">
						<Icon name={"user.group" as IconName} size={32} class="tw-text-[#64748b]" />
						<p class="tw-text-[#94a3b8] tw-text-sm max-w-md">Your account is not linked to a household yet. Your club director must connect parent and athlete emails before the consent flow appears here.</p>
					</div>
				{:else if engine.loadingHousehold}
					<p class="tw-text-[#14b8a6] tw-font-mono tw-text-xs">Loading household...</p>
				{:else if engine.loadErr}
					<p class="tw-text-red-400 tw-font-mono tw-text-xs">{engine.loadErr}</p>
				{:else if !engine.household}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">Household data unavailable.</p>
				{:else if engine.playerEmails.length === 0}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">No linked athlete emails found on this household.</p>
				{:else if engine.wizardStage === 'done'}
					<div class="tw-bg-black tw-border tw-border-[#14b8a6]/30 tw-p-8 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-4">
						<Icon name={"status.verified" as IconName} size={48} class="tw-text-[#14b8a6]" />
						<h3 class="tw-text-xl tw-font-bold tw-text-white tw-m-0">Consent Complete</h3>
						<p class="tw-text-[#94a3b8] tw-text-sm tw-max-w-md">Your digital consent for <strong class="tw-text-white">{engine.activePlayerEmail}</strong> has been recorded and <strong class="tw-text-[#14b8a6]">verified</strong>. Your athlete can sign in and start training immediately.</p>
						<button type="button" class="tw-mt-4 tw-bg-[#14b8a6] tw-text-black tw-px-6 tw-py-3 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#0d9488] tw-transition-colors" onclick={() => engine.cancelWizard()}>
							Back to Athletes
						</button>
					</div>
				{:else if engine.wizardStage === 'select'}
					<p class="tw-text-[#94a3b8] tw-text-sm tw-mb-6">Complete the <strong class="tw-text-white">digital consent ceremony</strong> for each linked athlete below. Submitting consent here verifies the athlete immediately.</p>
					<ul class="tw-space-y-3">
						{#each engine.playerEmails as em}
							{@const badge = engine.vpcStatusBadge(engine.playerStatuses[em])}
							<li class="tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">
								<div class="tw-flex tw-flex-col tw-gap-1">
									<span class="tw-text-white tw-font-mono tw-text-sm">{em}</span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest {badge.label === 'Verified' ? 'tw-text-[#14b8a6]' : 'tw-text-[#f59e0b]'}">{badge.label}</span>
								</div>
								{#if engine.isPlayerVpcComplete(engine.playerStatuses[em])}
									<span class="tw-flex tw-items-center tw-gap-2 tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-uppercase"><Icon name={"status.check" as IconName} size={14} /> Complete</span>
								{:else}
									<button type="button" class="tw-bg-[#fbbf24] tw-text-black tw-px-4 tw-py-2 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#f59e0b] hover:tw-shadow-[0_0_15px_rgba(251,191,36,0.4)] tw-transition-all" onclick={() => engine.startWizard(em)}>
										Update Consent
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{:else if engine.wizardStage === 'step1'}
					<div class="tw-flex tw-items-center tw-mb-8">
						<button type="button" class="tw-w-8 tw-h-8 tw-bg-black tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-[#94a3b8] hover:tw-text-white tw-transition-colors tw-rounded-none tw-mr-4" onclick={() => engine.cancelWizard()} aria-label="Cancel">
							<Icon name={"nav.arrow-left" as IconName} size={14} />
						</button>
						<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1">
							<span class="tw-w-6 tw-h-6 tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">1</span>
							<div class="tw-flex-1 tw-h-[1px] tw-bg-[#334155]"></div>
							<span class="tw-w-6 tw-h-6 tw-bg-black tw-border tw-border-[#334155] tw-text-[#64748b] tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">2</span>
							<div class="tw-flex-1 tw-h-[1px] tw-bg-[#334155]"></div>
							<span class="tw-w-6 tw-h-6 tw-bg-black tw-border tw-border-[#334155] tw-text-[#64748b] tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">3</span>
						</div>
					</div>

					<h3 class="tw-text-lg tw-font-bold tw-text-white tw-mb-2">Step 1 — Data Use Disclosure</h3>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-mb-6">You are consenting on behalf of <strong class="tw-text-white">{engine.activePlayerEmail}</strong>. Read the full disclosure below, then scroll to the bottom to continue.</p>

					<div class="tw-bg-black tw-border tw-border-[#334155] tw-h-64 tw-overflow-y-auto tw-p-6 tw-mb-6 tw-text-sm tw-text-[#cbd5e1] tw-leading-relaxed prose prose-invert prose-p:tw-my-2 prose-ul:tw-my-2" role="document" bind:this={engine.disclosureEl} onscroll={(e) => engine.onDisclosureScroll(e)}>
						<h4 class="tw-text-white tw-font-bold tw-text-base tw-mb-2">What data we collect</h4>
						<p>We collect the following categories of personal data for athletes registered through SSTRACKER, the Soccer Skills Development platform:</p>
						<ul class="tw-list-disc tw-pl-5">
							<li><strong>Identity data:</strong> athlete display name, email address, date of birth, team roster membership, and club affiliation.</li>
							<li><strong>Workout &amp; training data:</strong> repetition counts, training sets, session timestamps, video trial submissions, assigned drill completions, and XP / level progress.</li>
							<li><strong>Analytics data:</strong> aggregate performance metrics, attribute scores (speed, agility, technique, etc.), and positional comparisons within the club.</li>
							<li><strong>Communication data:</strong> in-app messages between coaches and athletes, notification delivery receipts.</li>
						</ul>
						<h4 class="tw-text-white tw-font-bold tw-text-base tw-mt-6 tw-mb-2">How we use this data</h4>
						<p>Data is used exclusively to:</p>
						<ul class="tw-list-disc tw-pl-5">
							<li>Display the athlete's progress to the athlete, their parent/guardian, their coach, and their club director within their shared organizational scope.</li>
							<li>Enable coaches to assign, review, and approve training activities.</li>
							<li>Generate aggregate, de-identified club analytics for directors.</li>
						</ul>
						<p>We do <strong>not</strong> sell athlete data. We do <strong>not</strong> share data with third-party advertisers. Analytics data may be processed by Firebase/Google infrastructure subject to Google's sub-processor privacy terms.</p>
						<h4 class="tw-text-white tw-font-bold tw-text-base tw-mt-6 tw-mb-2">Data retention and deletion</h4>
						<p>Minor athlete data is subject to time-limited retention. If parental consent is withdrawn or not verified within the platform's configured TTL window, all training data, passports, evaluation records, and roster memberships will be permanently purged and the associated Firebase Authentication account will be anonymized. You may request immediate deletion by contacting your club director at any time.</p>
						<h4 class="tw-text-white tw-font-bold tw-text-base tw-mt-6 tw-mb-2">Your rights under COPPA &amp; FERPA</h4>
						<p>Under the Children's Online Privacy Protection Act (COPPA) and Family Educational Rights and Privacy Act (FERPA), you have the right to:</p>
						<ul class="tw-list-disc tw-pl-5">
							<li>Review all personal data collected about your child.</li>
							<li>Request correction or deletion of inaccurate data.</li>
							<li>Withdraw consent at any time (subject to reasonable processing delays).</li>
							<li>Receive a copy of any stored data within 30 days of a written request to your club director.</li>
						</ul>
						<h4 class="tw-text-white tw-font-bold tw-text-base tw-mt-6 tw-mb-2">Policy version</h4>
						<p>This disclosure is version <strong>2026-04</strong>, effective April 2026.</p>
						<div class="tw-mt-8 tw-text-[#14b8a6] tw-font-mono tw-text-[10px] tw-flex tw-items-center tw-gap-2 tw-uppercase tw-tracking-widest">
							<Icon name={"nav.arrow-down" as IconName} size={12} /> Scroll to the bottom to confirm you have read this disclosure.
						</div>
					</div>

					<button type="button" class="tw-w-full tw-py-4 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed {engine.disclosureScrolled ? 'tw-bg-[#14b8a6] tw-text-black hover:tw-bg-[#0d9488]' : 'tw-bg-[#334155] tw-text-[#94a3b8]'}" disabled={!engine.disclosureScrolled} onclick={() => engine.wizardStage = 'step2'}>
						{#if engine.disclosureScrolled}
							<Icon name={"status.verified" as IconName} size={16} /> I have read the disclosure — continue
						{:else}
							<Icon name={"nav.arrow-down" as IconName} size={16} /> Scroll to the bottom to continue
						{/if}
					</button>

				{:else if engine.wizardStage === 'step2'}
					<div class="tw-flex tw-items-center tw-mb-8">
						<button type="button" class="tw-w-8 tw-h-8 tw-bg-black tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-[#94a3b8] hover:tw-text-white tw-transition-colors tw-rounded-none tw-mr-4" onclick={() => engine.wizardStage = 'step1'} aria-label="Back">
							<Icon name={"nav.arrow-left" as IconName} size={14} />
						</button>
						<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1">
							<span class="tw-w-6 tw-h-6 tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center"><Icon name={"status.check" as IconName} size={12} /></span>
							<div class="tw-flex-1 tw-h-[1px] tw-bg-[#14b8a6]"></div>
							<span class="tw-w-6 tw-h-6 tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">2</span>
							<div class="tw-flex-1 tw-h-[1px] tw-bg-[#334155]"></div>
							<span class="tw-w-6 tw-h-6 tw-bg-black tw-border tw-border-[#334155] tw-text-[#64748b] tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">3</span>
						</div>
					</div>

					<h3 class="tw-text-lg tw-font-bold tw-text-white tw-mb-2">Step 2 — Consent Assertions</h3>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-mb-6">Review each item and indicate your consent. Items marked <strong class="tw-text-[#14b8a6]">Required</strong> must be accepted to proceed.</p>

					<div class="tw-space-y-4 tw-mb-8">
						<label class="tw-flex tw-items-start tw-gap-4 tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
							<input type="checkbox" bind:checked={engine.consentWorkout} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#14b8a6]" />
							<div>
								<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
									<strong class="tw-text-white">Workout &amp; training data</strong>
									<span class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-px-2 tw-py-0.5 tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Required</span>
								</div>
								<span class="tw-text-[#94a3b8] tw-text-xs">Allow SSTRACKER to collect and store repetition counts, session logs, drill completions, and XP data for {engine.activePlayerEmail}.</span>
							</div>
						</label>
						<label class="tw-flex tw-items-start tw-gap-4 tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
							<input type="checkbox" bind:checked={engine.consentIdentity} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#14b8a6]" />
							<div>
								<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
									<strong class="tw-text-white">Identity &amp; roster data</strong>
									<span class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-px-2 tw-py-0.5 tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Required</span>
								</div>
								<span class="tw-text-[#94a3b8] tw-text-xs">Allow the platform to store the athlete's display name, email address, club and team membership, and date of birth for access control.</span>
							</div>
						</label>
						<label class="tw-flex tw-items-start tw-gap-4 tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
							<input type="checkbox" bind:checked={engine.consentAnalytics} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
							<div>
								<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
									<strong class="tw-text-white">Performance analytics</strong>
									<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
								</div>
								<span class="tw-text-[#94a3b8] tw-text-xs">Allow attribute scoring, leaderboard rankings, and team-comparison analytics. Declining will exclude the athlete from club dashboards but will not affect training data logging.</span>
							</div>
						</label>
						<label class="tw-flex tw-items-start tw-gap-4 tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
							<input type="checkbox" bind:checked={engine.consentComms} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
							<div>
								<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
									<strong class="tw-text-white">In-app communications</strong>
									<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
								</div>
								<span class="tw-text-[#94a3b8] tw-text-xs">Allow coaches to send in-app messages and notifications to the athlete account.</span>
							</div>
						</label>
						<label class="tw-flex tw-items-start tw-gap-4 tw-bg-black tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
							<input type="checkbox" bind:checked={engine.consentSponsor} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
							<div>
								<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
									<strong class="tw-text-white">Sponsor &amp; partner updates</strong>
									<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
								</div>
								<span class="tw-text-[#94a3b8] tw-text-xs">Receive director-approved club partner announcements in your guardian inbox. Separate from coach team messages. Never sent to minor accounts.</span>
							</div>
						</label>
					</div>

					<button type="button" class="tw-w-full tw-py-4 tw-bg-[#14b8a6] tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#0d9488] tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed" disabled={!engine.consentWorkout || !engine.consentIdentity} onclick={() => engine.wizardStage = 'step3'}>
						Continue to Attestation
					</button>

				{:else if engine.wizardStage === 'step3'}
					<div class="tw-flex tw-items-center tw-mb-8">
						<button type="button" class="tw-w-8 tw-h-8 tw-bg-black tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-[#94a3b8] hover:tw-text-white tw-transition-colors tw-rounded-none tw-mr-4" onclick={() => engine.wizardStage = 'step2'} aria-label="Back">
							<Icon name={"nav.arrow-left" as IconName} size={14} />
						</button>
						<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1">
							<span class="tw-w-6 tw-h-6 tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center"><Icon name={"status.check" as IconName} size={12} /></span>
							<div class="tw-flex-1 tw-h-[1px] tw-bg-[#14b8a6]"></div>
							<span class="tw-w-6 tw-h-6 tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center"><Icon name={"status.check" as IconName} size={12} /></span>
							<div class="tw-flex-1 tw-h-[1px] tw-bg-[#14b8a6]"></div>
							<span class="tw-w-6 tw-h-6 tw-bg-[#fbbf24] tw-text-black tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">3</span>
						</div>
					</div>

					<h3 class="tw-text-lg tw-font-bold tw-text-white tw-mb-2">Step 3 — Digital Attestation</h3>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-mb-6">By entering your legal name and clicking <strong class="tw-text-white">Submit consent</strong>, you confirm that you are the legal parent or guardian of <strong class="tw-text-[#14b8a6]">{engine.activePlayerEmail}</strong> and that you have read, understood, and agree to the data use disclosure in Step 1.</p>

					<div class="tw-mb-6">
						<label class="tw-text-[#a5b4fc] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-block tw-mb-2" for="vpc-parent-name">Your legal name (as parent / guardian)</label>
						<input id="vpc-parent-name" type="text" bind:value={engine.parentDisplayName} placeholder="e.g. Jane Doe" autocomplete="name" disabled={engine.submitting} class="tw-w-full tw-bg-black tw-border tw-border-[#334155] tw-text-white tw-p-3 tw-font-mono tw-text-sm focus:tw-outline-none focus:tw-border-[#fbbf24] tw-rounded-none tw-transition-colors" />
					</div>

					<div class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-p-4 tw-mb-6 tw-text-sm">
						<p class="tw-mb-2"><strong class="tw-text-white">Athlete:</strong> <span class="tw-text-[#14b8a6]">{engine.activePlayerEmail}</span></p>
						<p class="tw-mb-2"><strong class="tw-text-white">Consenting to:</strong></p>
						<ul class="tw-list-none tw-p-0 tw-m-0 tw-space-y-1 tw-text-xs tw-text-[#cbd5e1]">
							<li>Workout &amp; training data — <strong class="{engine.consentWorkout ? 'tw-text-[#14b8a6]' : 'tw-text-red-400'}">{engine.consentWorkout ? 'Accepted' : 'Declined'}</strong></li>
							<li>Identity &amp; roster data — <strong class="{engine.consentIdentity ? 'tw-text-[#14b8a6]' : 'tw-text-red-400'}">{engine.consentIdentity ? 'Accepted' : 'Declined'}</strong></li>
							<li>Performance analytics — <strong class="{engine.consentAnalytics ? 'tw-text-[#14b8a6]' : 'tw-text-[#64748b]'}">{engine.consentAnalytics ? 'Accepted' : 'Declined'}</strong></li>
							<li>In-app communications — <strong class="{engine.consentComms ? 'tw-text-[#14b8a6]' : 'tw-text-[#64748b]'}">{engine.consentComms ? 'Accepted' : 'Declined'}</strong></li>
							<li>Sponsor &amp; partner updates — <strong class="{engine.consentSponsor ? 'tw-text-[#14b8a6]' : 'tw-text-[#64748b]'}">{engine.consentSponsor ? 'Accepted' : 'Declined'}</strong></li>
						</ul>
						<p class="tw-mt-4 tw-text-[10px] tw-font-mono tw-text-[#64748b] tw-uppercase">Policy version: 2026-04 — {new Date().toLocaleDateString()}</p>
					</div>

					{#if engine.submitError}
						<p class="tw-text-red-400 tw-font-mono tw-text-xs tw-mb-4">{engine.submitError}</p>
					{/if}

					<button type="button" class="tw-w-full tw-py-4 tw-bg-[#fbbf24] tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#f59e0b] hover:tw-shadow-[0_0_20px_rgba(251,191,36,0.4)] tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed" disabled={engine.submitting || !engine.parentDisplayName.trim()} onclick={() => engine.submitConsent()}>
						{#if engine.submitting}
							<Icon name={"status.loading" as IconName} size={16} /> <span>Submitting...</span>
						{:else}
							<Icon name={"status.seal-check" as IconName} size={16} /> <span>Submit Consent via Enclave</span>
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
