<script lang="ts">
	import type { ClubManagementEngine } from './ClubManagementEngine.svelte.js';
	import RegistrarInviteTab from '$lib/components/director/RegistrarInviteTab.svelte';
	import TransferPortal from '$lib/components/player/TransferPortal.svelte';
	import MarketingTab from '$lib/components/director/MarketingTab.svelte';
	import DirectorCommsCompliancePanel from '$lib/components/director/DirectorCommsCompliancePanel.svelte';
	import CommsSponsorPartnerChannel from '$lib/components/comms/CommsSponsorPartnerChannel.svelte';
	import LicensesTab from '$lib/components/director/LicensesTab.svelte';
	import DirectorBillingAuditPanel from '$lib/components/director/DirectorBillingAuditPanel.svelte';
	import VampireImporter from '$lib/components/interoperability/VampireImporter.svelte';
	import AffinitySyncCard from '$lib/components/interoperability/AffinitySyncCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { engine }: { engine: ClubManagementEngine } = $props();
</script>

<div class="tw-h-full tw-w-full tw-p-6 lg:tw-p-10 tw-bg-[#05050A]">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-flex tw-flex-col tw-gap-8 tw-min-h-full">
		{#if engine.activeTab === 'registrars'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<RegistrarInviteTab clubId={engine.clubId} />
				<section class="tw-mt-6" aria-label="Player transfer intake">
					<TransferPortal role="director" />
				</section>
			</section>
		{:else if engine.activeTab === 'comms'}
			<section class="director-bento-grid-container tw-w-full tw-gap-8" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
				<section
					class="st-bento lg:tw-col-span-8 siem-panel dark-form-surface tw-flex tw-flex-col tw-gap-3 tw-p-8 tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-relative tw-min-w-0 tw-rounded-none"
					aria-labelledby="director-comms-cta-heading"
				>
					<h2 id="director-comms-cta-heading" class="tw-m-0 tw-text-base tw-font-extrabold tw-text-slate-50" style="font-family: 'Geist Sans', sans-serif;">
						Club broadcast
					</h2>
					<p class="tw-m-0 tw-text-sm tw-leading-relaxed tw-text-[#D4D4D8] tw-max-w-2xl" style="font-family: 'Switzer', sans-serif;">
						Compose club-wide announcements in the unified Comms hub — one surface for fan-out,
						delivery receipts, and SafeSport parent CC per team.
					</p>
					<a
						class="tw-inline-flex tw-mt-1 tw-text-sm tw-font-extrabold tw-text-teal-400 tw-no-underline hover:tw-underline"
						href="/messages?channel=club_wide&clubId={encodeURIComponent(engine.clubId)}"
						style="font-family: 'Geist Mono', monospace;"
					>
						Open Comms hub — Club-wide broadcast →
					</a>
				</section>
				<section
					class="st-bento lg:tw-col-span-4 siem-panel dark-form-surface tw-flex tw-flex-col tw-gap-3 tw-p-8 tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-relative tw-min-w-0 tw-rounded-none"
					aria-labelledby="director-sponsor-ops-heading"
				>
					<h2 id="director-sponsor-ops-heading" class="tw-m-0 tw-text-base tw-font-extrabold tw-text-slate-50" style="font-family: 'Geist Sans', sans-serif;">
						Partner offers
					</h2>
					<p class="tw-m-0 tw-text-sm tw-leading-relaxed tw-text-[#D4D4D8] tw-max-w-2xl" style="font-family: 'Switzer', sans-serif;">
						Create, approve, and send sponsor digests to opted-in guardians.
					</p>
					<CommsSponsorPartnerChannel clubId={engine.clubId} />
				</section>
				<div class="lg:tw-col-span-12 tw-w-full tw-min-w-0">
					<DirectorCommsCompliancePanel clubId={engine.clubId} teams={engine.clubTeams} />
				</div>
			</section>
		{:else if engine.activeTab === 'licenses'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<LicensesTab clubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'billing'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<DirectorBillingAuditPanel clubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'sync'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<div class="tw-p-6 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none">
					<h2 class="tw-text-xl tw-font-bold tw-text-amber-500 tw-mb-6 tw-flex tw-items-center tw-gap-2">
						<Icon name="nav.swap" size={24} />
						Data Sync &amp; Roster Ingestion
					</h2>
					<VampireImporter clubId={engine.clubId} />
				</div>
				<AffinitySyncCard clubId={engine.clubId} />
			</section>
		{/if}
	</div>
</div>
