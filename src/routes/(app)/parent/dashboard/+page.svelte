<script lang="ts">
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import CarRideHome from '$lib/components/parent/CarRideHome.svelte';
	import CoOpArena from '$lib/components/parent/co-op/CoOpArena.svelte';
	import BountyTerminal from '$lib/components/parent/co-op/BountyTerminal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import VanguardEmptyState from '$lib/components/ui/VanguardEmptyState.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import UpcomingEventsRsvp from '$lib/components/parent/UpcomingEventsRsvp.svelte';
	import ParentNotificationPanel from '$lib/components/parent/ParentNotificationPanel.svelte';

	// For the engine, we will dynamically import or mock it for the dashboard
	// Assuming CoOpEngine exists and is available
	import { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	let coOpEngine = new CoOpEngine();

	// Mock match data
	let matchData = $state<any>(null);
	let loading = $state(true);
	let isEmbargoed = $state(false);
	let attestationSigned = $state(false);
	let countdown = $state('15:00');

	// Simulate data fetch
	$effect(() => {
		untrack(() => {
		setTimeout(() => {
			loading = false;
			matchData = {
				opponent: 'Metro City Elite',
				result: 'L 1-2',
				date: new Date().toISOString()
			};
			isEmbargoed = true;
		}, 1000);
		});
	});

	function signAttestation() {
		attestationSigned = true;
	}
</script>

<svelte:head>
	<title>Nexus Command · Parent OS</title>
</svelte:head>

<!-- Parent OS Trusted Co-Op Partner Aesthetic -->
<div class="pd-page-root compliance-vault tw-bg-[#0f172a] tw-text-white tw-p-8 tw-font-sans tw-min-h-0">
	<div class="tw-max-w-[1600px] tw-mx-auto tw-space-y-8">
		
		<!-- Header -->
		<header class="tw-mb-8">
			<h1 class="tw-text-3xl tw-font-bold tw-tracking-tight tw-mb-2" style="font-family: 'Geist Sans', sans-serif; color: #FAFAFA;">Parent OS</h1>
			<p class="tw-text-[#D4D4D8] tw-text-lg" style="font-family: 'Switzer', sans-serif;">Trusted Co-Op Partner Console</p>
		</header>

		<!-- Co-Op Arena & Compliance Sidecar in 12-Column Liquid Bento Grid -->
		<div class="bento-grid-container tw-w-full tw-min-w-0 tw-grid tw-gap-6" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
			
			<!-- CoOpArena spans 8 columns -->
			<div data-panel="true" class="st-bento bento-col-8 parent-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-overflow-hidden tw-relative tw-min-w-0" style="border-radius: 0px;">
				<CoOpArena engine={coOpEngine} />
			</div>
			
			<!-- Compliance Sidecar spans 4 columns -->
			<div class="bento-col-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
				<div class="st-bento tw-contents">
					<ParentNotificationPanel />
				</div>
				<div class="st-bento tw-contents">
					<ActionInbox householdId={authStore.userProfile?.householdId} />
				</div>
				<div class="st-bento tw-contents">
					<UpcomingEventsRsvp />
				</div>
				<div class="st-bento tw-contents">
					<ParentNotificationPanel />
				</div>

				<!-- The Car Ride Home Holographic Widget (Z3 Holographic Card) -->
				<div data-panel="true" class="st-bento parent-panel tw-relative tw-border tw-border-[#334155] tw-overflow-hidden tw-z-10 tw-bg-[#0f172a]/40 tw-backdrop-blur-[20px]" style="border-radius: 0px;">
					<CarRideHome 
						{matchData}
						{isEmbargoed}
						{attestationSigned}
						{countdown}
						{signAttestation}
					/>
				</div>

				<!-- Bounty Terminal -->
				<div data-panel="true" class="st-bento parent-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex-1 tw-min-h-[300px] tw-relative" style="border-radius: 0px;">
					<BountyTerminal engine={coOpEngine} />
				</div>
			</div>
		</div>

		<!-- Communications Oversight Panels -->
		<div class="bento-grid-container tw-mt-6 tw-w-full tw-min-w-0 tw-grid tw-gap-6" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
			<!-- Parent Lounge -->
			<div data-panel="true" class="st-bento bento-col-8 parent-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-relative tw-min-w-0" style="border-radius: 0px;">
				<h3 class="tw-text-[#FAFAFA] tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2 tw-mb-4" style="font-family: 'Geist Sans', sans-serif;">
					<Icon name={"status.info" as IconName} class="tw-w-5 tw-h-5 tw-text-[#14b8a6]" /> Parent Lounge
				</h3>
				<div class="tw-bg-[#1e293b] tw-p-4 tw-border tw-border-[#334155] tw-h-48 tw-flex tw-items-center tw-justify-center tw-overflow-hidden tw-relative" style="border-radius: 0px;">
					<div class="tw-absolute tw-top-4 tw-right-4 tw-px-2 tw-py-1 tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded" style="font-family: 'Geist Mono', monospace;">READ_ONLY</div>
					<VanguardEmptyState title="No Recent Announcements" message="Official team broadcasts and scheduling announcements will appear here." />
				</div>
			</div>

			<!-- Household Thread -->
			<div data-panel="true" class="st-bento bento-col-4 parent-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-relative tw-min-w-0" style="border-radius: 0px;">
				<h3 class="tw-text-[#FAFAFA] tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2 tw-mb-4" style="font-family: 'Geist Sans', sans-serif;">
					<Icon name={"status.verified" as IconName} class="tw-w-5 tw-h-5 tw-text-[#10b981]" /> Household Thread
				</h3>
				<div class="tw-bg-[#1e293b] tw-p-4 tw-border tw-border-[#334155] tw-h-48 tw-flex tw-items-center tw-justify-center tw-relative tw-overflow-hidden" style="border-radius: 0px;">
					<div class="tw-absolute tw-top-4 tw-right-4 tw-px-2 tw-py-1 tw-bg-[#10b981]/10 tw-text-[#10b981] tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded" style="font-family: 'Geist Mono', monospace;">SAFESPORT_COMPLIANT</div>
					<div class="tw-absolute tw-bottom-4 tw-left-4 tw-flex tw-items-center tw-gap-2">
						<Icon name={"sys.lock" as IconName} class="tw-w-4 tw-h-4 tw-text-[#A1A1AA]" />
						<span class="tw-text-[#A1A1AA] tw-text-[10px] tw-font-mono tw-tracking-widest" style="font-family: 'Geist Mono', monospace;">PRIVATE MESSAGING DISABLED FOR MINORS</span>
					</div>
					<VanguardEmptyState title="No Active Threads" message="Coach-to-athlete communications are CC'd to this thread automatically for full oversight." />
				</div>
			</div>
		</div>

	</div>
</div>
