<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import CarRideHome from '$lib/components/parent/CarRideHome.svelte';
	import CoOpArena from '$lib/components/parent/co-op/CoOpArena.svelte';
	import BountyTerminal from '$lib/components/parent/co-op/BountyTerminal.svelte';

	// For the engine, we will dynamically import or mock it for the dashboard
	// Assuming CoOpEngine exists and is available
	import { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	let coOpEngine = new CoOpEngine();

	// Mock match data
	let matchData = $state<any>(null);
	let loading = $state(true);
	let isEmbargoed = $state(false);
	let attestationSigned = $state(false);
	let liftTime = $state<Date | null>(null);
	let countdown = $state('');

	$effect(() => {
		loading = false;
		
		const now = new Date();
		const lift = new Date(now.getTime() + 5 * 60000); 
		liftTime = lift;
		isEmbargoed = true;
		matchData = {
			opponent: 'FC Elite U14',
			date: now.toLocaleDateString(),
			rpe: 9,
			successRate: 35
		};
	});

	$effect(() => {
		if (isEmbargoed && liftTime) {
			const interval = setInterval(() => {
				const diff = liftTime!.getTime() - Date.now();
				if (diff <= 0) {
					isEmbargoed = false;
					countdown = '';
					clearInterval(interval);
				} else {
					const minutes = Math.floor(diff / 60000);
					const seconds = Math.floor((diff % 60000) / 1000);
					countdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;
				}
			}, 1000);
			return () => clearInterval(interval);
		}
	});

	function signAttestation() {
		attestationSigned = true;
	}
</script>

<!-- Parent OS Trusted Co-Op Partner Aesthetic -->
<div class="tw-min-h-screen tw-bg-[#0f172a] tw-text-white tw-p-8 tw-font-sans">
	<div class="tw-max-w-7xl tw-mx-auto tw-space-y-8">
		
		<!-- Header -->
		<header class="tw-mb-8">
			<h1 class="tw-text-3xl tw-font-bold tw-font-mono tw-text-white tw-tracking-tight tw-mb-2">Parent OS</h1>
			<p class="tw-text-[#94a3b8] tw-text-lg">Trusted Co-Op Partner Console</p>
		</header>

		<!-- The Car Ride Home Holographic Widget -->
		<div class="tw-mb-8">
			<CarRideHome 
				{matchData}
				{isEmbargoed}
				{attestationSigned}
				{countdown}
				{signAttestation}
			/>
		</div>

		<!-- Co-Op Arena & Bounty Terminal in 12-Column Liquid Bento Grid -->
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-6 tw-mb-8">
			<!-- CoOpArena spans 8 columns -->
			<div class="md:tw-col-span-8">
				<CoOpArena engine={coOpEngine} />
			</div>
			<!-- BountyTerminal spans 4 columns -->
			<div class="md:tw-col-span-4">
				<BountyTerminal />
			</div>
		</div>

		<!-- Communications Oversight Panels -->
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
			<!-- Parent Lounge -->
			<div class="tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6">
				<h3 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2 tw-mb-4">
					<span class="tw-text-[#3b82f6]">●</span> Parent Lounge
				</h3>
				<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155] tw-h-48 tw-flex tw-items-center tw-justify-center tw-overflow-hidden tw-relative">
					<div class="tw-absolute tw-top-4 tw-right-4 tw-px-2 tw-py-1 tw-bg-blue-500/10 tw-text-blue-400 tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded">READ_ONLY</div>
					<p class="tw-text-[#64748b] tw-font-mono tw-text-sm tw-text-center">Official team broadcasts and scheduling announcements will appear here.</p>
				</div>
			</div>

			<!-- Household Thread -->
			<div class="tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6">
				<h3 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2 tw-mb-4">
					<span class="tw-text-[#10b981]">●</span> Household Thread
				</h3>
				<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155] tw-h-48 tw-flex tw-items-center tw-justify-center tw-relative tw-overflow-hidden">
					<div class="tw-absolute tw-top-4 tw-right-4 tw-px-2 tw-py-1 tw-bg-green-500/10 tw-text-green-400 tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded">SAFESPORT_COMPLIANT</div>
					<div class="tw-absolute tw-bottom-4 tw-left-4 tw-flex tw-items-center tw-gap-2">
						<svg class="tw-w-4 tw-h-4 tw-text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
						<span class="tw-text-[#94a3b8] tw-text-[10px] tw-font-mono tw-tracking-widest">PRIVATE MESSAGING DISABLED FOR MINORS</span>
					</div>
					<p class="tw-text-[#64748b] tw-font-mono tw-text-sm tw-text-center tw-px-8">Coach-to-athlete communications are CC'd to this thread automatically for full oversight.</p>
				</div>
			</div>
		</div>

	</div>
</div>
