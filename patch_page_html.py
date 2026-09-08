with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

# Replace the HTML body with our new styled shell and components
start_idx = content.find('<div class="parent-vpc-trust-band">')
end_idx = content.find('</script>\n\n<svelte:head>')

html_replacement = """
<div class="tw-bg-[#000000] tw-min-h-dvh tw-text-white tw-font-sans tw-overflow-y-auto tw-p-4 lg:tw-p-8">
	<div class="tw-max-w-4xl tw-mx-auto">
		<div class="tw-rounded-[24px] tw-border tw-border-[#334155] tw-bg-slate-900 tw-shadow-2xl tw-flex tw-flex-col tw-overflow-hidden">

			<header class="tw-bg-black/40 tw-border-b tw-border-[#334155] tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-4">
				<div class="tw-flex tw-items-center tw-gap-4">
					<div class="tw-w-12 tw-h-12 tw-bg-black/50 tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-[#f59e0b] tw-rounded-lg">
						<Icon name="status.seal-check" size={24} />
					</div>
					<div>
						<h1 class="tw-font-sans tw-text-xl tw-font-bold tw-uppercase tw-tracking-widest tw-m-0">Verifiable Parental Consent</h1>
						{#if authStore.role === 'parent' && householdId && !loadingHousehold && !loadErr && household && playerEmails.length > 0}
							<p class="tw-font-mono tw-text-xs tw-mt-1 {aggregateTrustStatus === 'verified' ? 'tw-text-[#14b8a6]' : 'tw-text-[#f59e0b]'}">
								{aggregateTrustStatus === 'verified' ? 'All linked athletes verified' : 'Consent required for one or more athletes'}
							</p>
						{:else}
							<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs tw-mt-1">COPPA / FERPA compliance gate</p>
						{/if}
					</div>
				</div>
				{#if authStore.role === 'parent' && householdId && !loadingHousehold && !loadErr && household && playerEmails.length > 0 && wizardStage === 'select' && firstPendingEmail}
					<button type="button" class="tw-bg-[#f59e0b]/10 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b] tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase hover:tw-bg-[#f59e0b]/20 tw-transition-colors" onclick={() => startFirstPendingConsent()}>
						Update Consent
					</button>
				{/if}
			</header>

			<div class="tw-p-6">
				{#if authStore.role !== 'parent'}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">This page is for parent accounts only.</p>
				{:else if !householdId}
					<div class="tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-xl tw-p-8 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-4">
						<Icon name="user.group" size={32} class="tw-text-[#64748b]" />
						<p class="tw-text-[#94a3b8] tw-text-sm max-w-md">Your account is not linked to a household yet. Your club director must connect parent and athlete emails before the consent flow appears here.</p>
					</div>
				{:else if loadingHousehold}
					<p class="tw-text-[#f59e0b] tw-font-mono tw-text-xs">Loading household...</p>
				{:else if loadErr}
					<p class="tw-text-red-400 tw-font-mono tw-text-xs">{loadErr}</p>
				{:else if !household}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">Household data unavailable.</p>
				{:else if playerEmails.length === 0}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">No linked athlete emails found on this household.</p>
				{:else if wizardStage === 'done'}
					<div class="tw-bg-black/50 tw-border tw-border-[#14b8a6]/30 tw-rounded-[24px] tw-p-8 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-4">
						<Icon name="status.verified" size={48} class="tw-text-[#14b8a6]" />
						<h3 class="tw-font-sans tw-text-xl tw-font-bold tw-text-white tw-m-0">Consent Complete</h3>
						<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-max-w-md">Your digital consent for <strong class="tw-text-white">{activePlayerEmail}</strong> has been recorded and <strong class="tw-text-[#14b8a6]">verified</strong>. Your athlete can sign in and start training immediately.</p>
						<button type="button" class="tw-mt-4 tw-rounded-lg tw-bg-[#f59e0b] tw-text-black tw-px-6 tw-py-3 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#d97706] tw-transition-colors" onclick={() => cancelWizard()}>
							Back to Athletes
						</button>
					</div>
				{:else if wizardStage === 'select'}
					<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-mb-6">Complete the <strong class="tw-text-white">digital consent ceremony</strong> for each linked athlete below. Submitting consent here verifies the athlete immediately.</p>
					<ul class="tw-space-y-3">
						{#each playerEmails as em}
							{@const badge = vpcStatusBadge(playerStatuses[em])}
							<li class="tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-xl tw-p-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">
								<div class="tw-flex tw-flex-col tw-gap-1">
									<span class="tw-text-white tw-font-mono tw-text-sm">{em}</span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest {badge.label === 'Verified' ? 'tw-text-[#14b8a6]' : 'tw-text-[#f59e0b]'}">{badge.label}</span>
								</div>
								{#if isPlayerVpcComplete(playerStatuses[em])}
									<span class="tw-flex tw-items-center tw-gap-2 tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-uppercase"><Icon name="status.check" size={14} /> Complete</span>
								{:else}
									<button type="button" class="tw-rounded-lg tw-bg-[#f59e0b] tw-text-black tw-px-4 tw-py-2 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#d97706] hover:tw-shadow-[0_0_15px_rgba(245,158,11,0.4)] tw-transition-all" onclick={() => startWizard(em)}>
										Update Consent
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{:else if wizardStage === 'step1'}
					<VpcStep1Disclosure bind:wizardStage bind:disclosureScrolled bind:disclosureEl {activePlayerEmail} {cancelWizard} {onDisclosureScroll} />
				{:else if wizardStage === 'step2'}
					<VpcStep2Assertions bind:wizardStage bind:consentWorkout bind:consentIdentity bind:consentAnalytics bind:consentComms bind:consentSponsor {activePlayerEmail} />
				{:else if wizardStage === 'step3'}
					<VpcStep3Attestation bind:wizardStage bind:parentDisplayName bind:submitting bind:submitError {activePlayerEmail} {consentWorkout} {consentIdentity} {consentAnalytics} {consentComms} {consentSponsor} {submitConsent} />
				{/if}
			</div>
		</div>
	</div>
</div>
"""

new_content = content[:start_idx] + "\n</script>\n\n<svelte:head>\n\t<title>Verifiable Parental Consent · Parent OS</title>\n</svelte:head>\n\n" + html_replacement

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(new_content)
