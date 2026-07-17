<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import CarRideHome from '$lib/components/parent/CarRideHome.svelte';
	import CoOpArena from '$lib/components/parent/co-op/CoOpArena.svelte';
	import BountyTerminal from '$lib/components/parent/co-op/BountyTerminal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import VanguardEmptyState from '$lib/components/ui/VanguardEmptyState.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';

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

	function signAttestation() {
		attestationSigned = true;
	}
</script>

<svelte:head>
	<title>Nexus Command Â· Parent OS</title>
</svelte:head>

<!-- Parent OS Trusted Co-Op Partner Aesthetic -->
<div class="tw-bg-[#0f172a] tw-text-white tw-p-8 tw-font-sans tw-min-h-0">
	<div class="tw-max-w-[1600px] tw-mx-auto tw-space-y-8">
		
		<!-- Header -->
		<header class="tw-mb-8">
			<h1 class="tw-text-3xl tw-font-bold tw-font-mono tw-text-white tw-tracking-tight tw-mb-2">Parent OS</h1>
			<p class="tw-text-[#94a3b8] tw-text-lg tw-font-mono">Trusted Co-Op Partner Console</p>
		</header>

		<!-- Co-Op Arena & Compliance Sidecar in 12-Column Liquid Bento Grid -->
		<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 lg:tw-gap-8">
			
			<!-- CoOpArena spans 8 columns -->
			<div class="bento-span-8 lg:tw-col-span-8 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-overflow-hidden">
				<CoOpArena engine={coOpEngine} />
			</div>
			
			<!-- Compliance Sidecar spans 4 columns -->
			<div class="bento-span-4 lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6">
				<ActionInbox householdId={authStore.userProfile?.householdId} />

				<!-- The Car Ride Home Holographic Widget (Z3 Holographic Card) -->
				<div class="tw-relative tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-overflow-hidden tw-z-10 tw-bg-[#0f172a]/40 tw-backdrop-blur-[20px]">
					<CarRideHome 
						{matchData}
						{isEmbargoed}
						{attestationSigned}
						{countdown}
						{signAttestation}
					/>
				</div>

				<!-- Bounty Terminal -->
				<div class="tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-flex-1 tw-min-h-[300px]">
					<BountyTerminal engine={coOpEngine} />
				</div>
			</div>
		</div>

		<!-- Communications Oversight Panels -->
		<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 lg:tw-gap-8">
			<!-- Parent Lounge -->
			<div class="lg:tw-col-span-7 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-6">
				<h3 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2 tw-mb-4">
					<Icon name={"status.info" as IconName} class="tw-w-5 tw-h-5 tw-text-[#3b82f6]" /> Parent Lounge
				</h3>
				<div class="tw-bg-[#1e293b] tw-rounded-[24px] tw-p-4 tw-border tw-border-[#334155] tw-h-48 tw-flex tw-items-center tw-justify-center tw-overflow-hidden tw-relative">
					<div class="tw-absolute tw-top-4 tw-right-4 tw-px-2 tw-py-1 tw-bg-[#3b82f6]/10 tw-text-[#3b82f6] tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded">READ_ONLY</div>
					<VanguardEmptyState title="No Recent Announcements" message="Official team broadcasts and scheduling announcements will appear here." />
				</div>
			</div>

			<!-- Household Thread -->
			<div class="lg:tw-col-span-5 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-6">
				<h3 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2 tw-mb-4">
					<Icon name={"status.verified" as IconName} class="tw-w-5 tw-h-5 tw-text-[#10b981]" /> Household Thread
				</h3>
				<div class="tw-bg-[#1e293b] tw-rounded-[24px] tw-p-4 tw-border tw-border-[#334155] tw-h-48 tw-flex tw-items-center tw-justify-center tw-relative tw-overflow-hidden">
					<div class="tw-absolute tw-top-4 tw-right-4 tw-px-2 tw-py-1 tw-bg-[#10b981]/10 tw-text-[#10b981] tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded">SAFESPORT_COMPLIANT</div>
					<div class="tw-absolute tw-bottom-4 tw-left-4 tw-flex tw-items-center tw-gap-2">
						<Icon name={"sys.lock" as IconName} class="tw-w-4 tw-h-4 tw-text-[#94a3b8]" />
						<span class="tw-text-[#94a3b8] tw-text-[10px] tw-font-mono tw-tracking-widest">PRIVATE MESSAGING DISABLED FOR MINORS</span>
					</div>
					<VanguardEmptyState title="No Active Threads" message="Coach-to-athlete communications are CC'd to this thread automatically for full oversight." />
				</div>
			</div>
		</div>

	</div>
</div>
