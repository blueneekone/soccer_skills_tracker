<script lang="ts">
	import type { ComplianceOpsEngine } from './ComplianceOpsEngine.svelte.js';
	import ComplianceTab from '$lib/components/director/ComplianceTab.svelte';
	import CoachClearancePanopticon from '$lib/components/compliance/CoachClearancePanopticon.svelte';
	import HouseholdLinkerPanel from '$lib/components/director/HouseholdLinkerPanel.svelte';
	import UplinkTerminal from '../dashboard/UplinkTerminal.svelte';
	import IntakePanopticon from '../dashboard/IntakePanopticon.svelte';
	import VpcApprovalQueue from '$lib/components/director/os/VpcApprovalQueue.svelte';
	import DirectorRetentionReport from '$lib/components/compliance/DirectorRetentionReport.svelte';
	import HouseholdComplianceTab from '$lib/components/director/HouseholdComplianceTab.svelte';

	let { engine }: { engine: ComplianceOpsEngine } = $props();
</script>

<div class="tw-h-full tw-w-full tw-p-6 lg:tw-p-10 tw-bg-[#05050A]">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-flex tw-flex-col tw-gap-8 tw-min-h-full">
		{#if engine.activeTab === 'passports'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<ComplianceTab clubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'clearance'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<CoachClearancePanopticon clubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'households'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<HouseholdLinkerPanel clubId={engine.clubId} />
				<UplinkTerminal currentClubId={engine.clubId} clubTeams={engine.clubTeams} />
				<IntakePanopticon currentClubId={engine.clubId} />
			</section>
		{:else if engine.activeTab === 'coppa'}
			<section class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
				<VpcApprovalQueue clubId={engine.clubId} />
				<DirectorRetentionReport />
				<HouseholdComplianceTab clubId={engine.clubId} />
			</section>
		{/if}
	</div>
</div>
