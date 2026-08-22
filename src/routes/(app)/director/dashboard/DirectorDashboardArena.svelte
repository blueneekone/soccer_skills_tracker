<script lang="ts">
	import type { DirectorDashboardEngine } from './DirectorDashboardEngine.svelte.js';
	import DirectorCommandCenter from '$lib/components/director/os/DirectorCommandCenter.svelte';
	import FieldOpsModule from '$lib/components/director/os/FieldOpsModule.svelte';
	import TeamsTab from '$lib/components/director/TeamsTab.svelte';
	import ComplianceTab from '$lib/components/director/ComplianceTab.svelte';
	import UplinkTerminal from './UplinkTerminal.svelte';
	import IntakePanopticon from './IntakePanopticon.svelte';
	import VpcApprovalQueue from '$lib/components/director/os/VpcApprovalQueue.svelte';
	import HouseholdLinkerPanel from '$lib/components/director/HouseholdLinkerPanel.svelte';
	import RegistrarInviteTab from '$lib/components/director/RegistrarInviteTab.svelte';
	import TransferPortal from '$lib/components/player/TransferPortal.svelte';
	import RegistrarRosterTransferPanel from '$lib/components/director/RegistrarRosterTransferPanel.svelte';
	import PlaybookTab from '$lib/components/director/PlaybookTab.svelte';
	import LicensesTab from '$lib/components/director/LicensesTab.svelte';
	import MissionControl from '$lib/components/director/MissionControl.svelte';
	import DirectorCommsCompliancePanel from '$lib/components/director/DirectorCommsCompliancePanel.svelte';
	import CommsSponsorPartnerChannel from '$lib/components/comms/CommsSponsorPartnerChannel.svelte';
	import DirectorRetentionReport from '$lib/components/compliance/DirectorRetentionReport.svelte';
	import VampireImporter from '$lib/components/interoperability/VampireImporter.svelte';
	import AffinitySyncCard from '$lib/components/interoperability/AffinitySyncCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: DirectorDashboardEngine } = $props();

</script>

<div class="tw-flex tw-flex-col tw-min-h-0 tw-h-full tw-min-w-0" style="overflow-y: auto;">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-flex tw-flex-col tw-gap-8 tw-min-h-full tw-w-full">
		
		{#if engine.activeTab === 'home'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<DirectorCommandCenter clubId={engine.clubId} />
				
				<div class="tw-grid tw-grid-cols-12 director-hud-grid tw-w-full tw-gap-4 tw-mt-2" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
					<!-- Club Revenue Analytics -->
					<div data-card="revenue" class="st-bento director-card revenue-engine-analytics dark-form-surface tw-border tw-border-slate-700 tw-bg-slate-900/80 tw-p-4 tw-rounded-none tw-min-w-0" style="border-radius: 0px !important; background: #0f172a;">
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-2 tw-min-w-0">
							<h3 class="tw-text-xs tw-text-[#14b8a6] tw-uppercase tw-tracking-widest tw-min-w-0" style="font-family: 'Geist Sans', sans-serif;">Revenue Engine</h3>
							<div class="compliance-indicator status-dot compliance-status-dot tw-bg-emerald-500" style="width: 8px; height: 8px; border-radius: 50%; display: block;"></div>
						</div>
						<div class="tw-text-[#D4D4D8] tw-text-sm tw-min-w-0" style="font-family: 'Switzer', sans-serif;">Club Revenue Analytics Offline</div>
					</div>

					<!-- God-Mode Club Roster Tree -->
					<div data-card="roster" class="st-bento director-card roster-hierarchy-tree dark-form-surface tw-border tw-border-slate-700 tw-bg-slate-900/80 tw-p-4 tw-rounded-none tw-min-w-0" style="border-radius: 0px !important; background: #0f172a;">
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-2 tw-min-w-0">
							<h3 class="tw-text-xs tw-text-[#14b8a6] tw-uppercase tw-tracking-widest tw-min-w-0" style="font-family: 'Geist Sans', sans-serif;">Roster Hierarchy</h3>
							<div class="compliance-status-dot tw-bg-emerald-500" style="width: 8px; height: 8px; border-radius: 50%; display: block;"></div>
						</div>
						<div class="tw-text-[#D4D4D8] tw-text-sm tw-min-w-0" style="font-family: 'Switzer', sans-serif;">God-Mode Tree Offline</div>
					</div>
				</div>
			</section>
		{:else if engine.activeTab === 'field'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<FieldOpsModule clubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'comms'}
			<section class="tw-grid tw-grid-cols-12 director-bento-grid-container tw-w-full tw-gap-8" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
				<section
					class="st-bento lg:tw-col-span-8 siem-panel dark-form-surface tw-flex tw-flex-col tw-gap-3 tw-p-8 tw-border tw-border-slate-600 tw-bg-slate-900 tw-relative tw-min-w-0"
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
					class="st-bento lg:tw-col-span-4 siem-panel dark-form-surface tw-flex tw-flex-col tw-gap-3 tw-p-8 tw-border tw-border-slate-600 tw-bg-slate-900 tw-relative tw-min-w-0"
					aria-labelledby="director-sponsor-ops-heading"
				>
					<h2 id="director-sponsor-ops-heading" class="tw-m-0 tw-text-base tw-font-extrabold tw-text-slate-50" style="font-family: 'Geist Sans', sans-serif;">
						Partner offers
					</h2>
					<p class="tw-m-0 tw-text-sm tw-leading-relaxed tw-text-[#D4D4D8] tw-max-w-2xl" style="font-family: 'Switzer', sans-serif;">
						Create, approve, and send sponsor digests to opted-in guardians. Parents see delivered
						offers on their dashboard — not in the Comms hub rail.
					</p>
					<CommsSponsorPartnerChannel clubId={engine.clubId} />
				</section>
				<div class="lg:tw-col-span-12 tw-w-full tw-min-w-0">
					<DirectorCommsCompliancePanel clubId={engine.clubId} teams={engine.clubTeams} />
				</div>
			</section>
		{:else}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				{#if engine.activeTab === 'teams'}
					<TeamsTab clubId={engine.clubId} />
					<div class="tw-mt-6">
						<RegistrarRosterTransferPanel clubId={engine.clubId} />
					</div>
				{:else if engine.activeTab === 'registrars'}
					<RegistrarInviteTab clubId={engine.clubId} />
					<section class="tw-mt-6" aria-label="Player transfer intake">
						<TransferPortal role="director" />
					</section>
				{:else if engine.activeTab === 'playbook'}
					<PlaybookTab clubId={engine.clubId} />
				{:else if engine.activeTab === 'licenses'}
					<LicensesTab clubId={engine.clubId} />
				{:else if engine.activeTab === 'compliance'}
					<ComplianceTab clubId={engine.clubId} />
				{:else if engine.activeTab === 'household'}
					<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
						<HouseholdLinkerPanel clubId={engine.clubId} />
						<UplinkTerminal currentClubId={engine.clubId} clubTeams={engine.clubTeams} />
						<IntakePanopticon currentClubId={engine.clubId} />
						<VpcApprovalQueue clubId={engine.clubId} />
					</div>
				{:else if engine.activeTab === 'vanguard'}
					<MissionControl />
				{:else if engine.activeTab === 'retention'}
					<DirectorRetentionReport />
				{:else if engine.activeTab === 'sync'}
					<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
						<div class="tw-p-6 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none">
							<h2 class="tw-text-xl tw-font-bold tw-text-amber-500 tw-mb-6 tw-flex tw-items-center tw-gap-2">
								<Icon name={"nav.swap" as IconName} size={24} />
								Data Sync &amp; Roster Ingestion
							</h2>
							<VampireImporter clubId={engine.clubId} />
						</div>
						<AffinitySyncCard clubId={engine.clubId} />
					</div>
				{:else}
					<div class="tw-flex tw-items-center tw-justify-center tw-p-12 tw-border tw-border-[#334155] tw-bg-[#0B0F19] tw-text-[#94A3B8]">
						<p class="tw-font-mono tw-text-sm tw-tracking-widest">ERROR: UNKNOWN MODULE_STATE</p>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</div>
