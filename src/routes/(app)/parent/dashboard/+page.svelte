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

	// Epic 14: Premium Spectator Access Check
	let hasPremiumSpectator = $derived(authStore.claims?.premium_spectator === true);

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

		<!-- Premium Spectator Showcase -->
		<div class="tw-relative tw-mt-8">
			<h2 class="tw-text-white tw-font-bold tw-text-2xl tw-flex tw-items-center tw-gap-2 tw-mb-6">
				<span class="tw-text-[#fbbf24]">◆</span> Premium Spectator Showcase
			</h2>

			<!-- Glassmorphism Blur for Free Tier -->
			{#if !hasPremiumSpectator}
				<div class="tw-absolute tw-inset-0 tw-z-10 tw-mt-14 tw-bg-[#0f172a]/40 tw-backdrop-blur-[20px] tw-rounded-[24px] tw-flex tw-flex-col tw-items-center tw-justify-center tw-border tw-border-white/10">
					<div class="tw-text-center tw-max-w-md tw-px-6">
						<div class="tw-text-[#fbbf24] tw-mb-4 tw-flex tw-justify-center">
							<svg class="tw-w-12 tw-h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
						</div>
						<h3 class="tw-text-white tw-font-bold tw-text-xl tw-mb-2">Advanced Analytics & Live Feeds Locked</h3>
						<p class="tw-text-[#cbd5e1] tw-mb-6 tw-text-sm tw-font-mono">Experience 1080p live streams, automated highlight reels, and tactical heatmaps of your athlete's performance.</p>
						<button class="tw-bg-[#fbbf24] tw-text-[#0f172a] tw-font-bold tw-text-lg tw-w-full tw-py-4 tw-rounded-xl tw-hover:bg-[#f59e0b] tw-transition-colors tw-shadow-[0_0_20px_rgba(251,191,36,0.3)]">
							Unlock Premium Spectator Access ($24.99/mo)
						</button>
					</div>
				</div>
			{/if}

			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-6 {(!hasPremiumSpectator) ? 'tw-select-none tw-pointer-events-none' : ''}">
				
				<!-- 1080p HD Live Streams (Spans 8 columns) -->
				<div class="md:tw-col-span-8 tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6">
					<div class="tw-flex tw-justify-between tw-items-center tw-mb-4">
						<h3 class="tw-text-white tw-font-bold tw-text-lg">1080p HD Match Feed</h3>
						<span class="tw-px-3 tw-py-1 tw-bg-red-500/20 tw-text-red-400 tw-text-xs tw-font-bold tw-rounded-full tw-animate-pulse">LIVE</span>
					</div>
					<div class="tw-bg-black tw-rounded-xl tw-h-64 tw-flex tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-relative tw-overflow-hidden">
						<!-- Mock Video UI -->
						<svg class="tw-w-16 tw-h-16 tw-text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
						<div class="tw-absolute tw-bottom-4 tw-left-4 tw-flex tw-items-center tw-gap-2">
							<span class="tw-text-white/70 tw-text-xs tw-font-mono">FC Elite U14 vs Metro City</span>
						</div>
					</div>
				</div>

				<!-- Tactical Heatmaps (Spans 4 columns) -->
				<div class="md:tw-col-span-4 tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col">
					<h3 class="tw-text-white tw-font-bold tw-text-lg tw-mb-4">Tactical Heatmap</h3>
					<div class="tw-flex-1 tw-bg-[#1e293b] tw-rounded-xl tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-p-4 tw-relative">
						<!-- Mock Heatmap Grid -->
						<div class="tw-grid tw-grid-cols-3 tw-grid-rows-4 tw-gap-1 tw-w-full tw-h-full tw-opacity-50">
							<div class="tw-bg-[#14b8a6]/10"></div><div class="tw-bg-[#14b8a6]/20"></div><div class="tw-bg-[#14b8a6]/10"></div>
							<div class="tw-bg-[#14b8a6]/30"></div><div class="tw-bg-[#14b8a6]/70"></div><div class="tw-bg-[#14b8a6]/40"></div>
							<div class="tw-bg-[#14b8a6]/20"></div><div class="tw-bg-[#14b8a6]/50"></div><div class="tw-bg-[#14b8a6]/20"></div>
							<div class="tw-bg-[#14b8a6]/10"></div><div class="tw-bg-[#14b8a6]/30"></div><div class="tw-bg-[#14b8a6]/10"></div>
						</div>
						<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-pointer-events-none">
							<span class="tw-text-[#14b8a6] tw-text-xs tw-font-mono tw-font-bold tw-bg-[#0f172a]/80 tw-px-2 tw-py-1 tw-rounded">ZONE 14 ACTIVE</span>
						</div>
					</div>
				</div>

				<!-- Automated Player Highlight Reels (Spans 12 columns) -->
				<div class="md:tw-col-span-12 tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6">
					<h3 class="tw-text-white tw-font-bold tw-text-lg tw-mb-4">Automated Highlight Reels</h3>
					<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-4">
						{#each [1, 2, 3] as i}
							<div class="tw-bg-[#1e293b] tw-rounded-xl tw-h-32 tw-border tw-border-[#334155] tw-relative tw-overflow-hidden tw-group tw-cursor-pointer">
								<div class="tw-absolute tw-inset-0 tw-bg-[#0f172a]/50 group-hover:tw-bg-transparent tw-transition-colors"></div>
								<div class="tw-absolute tw-bottom-3 tw-left-3">
									<span class="tw-text-white tw-font-bold tw-text-sm">Key Pass {i}</span>
									<p class="tw-text-[#94a3b8] tw-text-[10px] tw-font-mono">Match Week {4 - i}</p>
								</div>
								<div class="tw-absolute tw-top-3 tw-right-3 tw-bg-[#fbbf24] tw-text-[#0f172a] tw-text-[10px] tw-font-bold tw-px-2 tw-py-0.5 tw-rounded-sm">
									AI CLIP
								</div>
							</div>
						{/each}
					</div>
				</div>

			</div>
		</div>

	</div>
</div>
