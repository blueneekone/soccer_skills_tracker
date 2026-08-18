<script lang="ts">
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import CarRideHome from '$lib/components/compliance/CarRideHome.svelte';
	import CoOpArena from '$lib/components/parent/co-op/CoOpArena.svelte';
	import BountyTerminal from '$lib/components/parent/co-op/BountyTerminal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import VanguardEmptyState from '$lib/components/ui/VanguardEmptyState.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import UpcomingEventsRsvp from '$lib/components/parent/UpcomingEventsRsvp.svelte';
	import ParentNotificationPanel from '$lib/components/parent/ParentNotificationPanel.svelte';
	import ParentLatestAnnouncements from '$lib/components/parent/ParentLatestAnnouncements.svelte';
	import ParentWeekScheduleStrip from '$lib/components/parent/ParentWeekScheduleStrip.svelte';

	// For the engine, we instantiate CoOpEngine
	import { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	let coOpEngine = new CoOpEngine();

	// Mock match data for post-match car ride home telemetry
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
					date: new Date().toISOString(),
					rpe: 8,
					successRate: 84
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
<div class="pd-page-root compliance-vault tw-bg-[#0B0F19] tw-text-white tw-p-6 lg:tw-p-8 tw-font-sans tw-min-h-0">
	<div class="tw-max-w-[1600px] tw-mx-auto tw-space-y-6">
		
		<!-- Header / Command Plane Status HUD -->
		<header class="tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-4 tw-rounded-none">
			<div class="tw-flex tw-items-center tw-gap-4">
				<div class="tw-w-12 tw-h-12 tw-bg-[#1E293B] tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-amber-500 tw-rounded-none">
					<Icon name={"user.group" as IconName} size={24} />
				</div>
				<div>
					<div class="tw-flex tw-items-center tw-gap-2.5">
						<h1 class="tw-text-xl lg:tw-text-2xl tw-font-bold tw-tracking-tight tw-text-white tw-uppercase" style="font-family: 'Geist Sans', sans-serif;">
							Parent OS
						</h1>
						<span class="tw-text-[9px] tw-px-2 tw-py-0.5 tw-font-mono tw-border tw-border-amber-500/40 tw-bg-amber-500/10 tw-text-amber-500 tw-font-bold tw-rounded-none">
							PARENT-OS
						</span>
					</div>
					<p class="tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-mt-1">
						STATUS: <span class="tw-text-amber-500 tw-font-bold">ODP ONLINE</span> // TRUSTED CO-OP PARTNER ACTIVE
					</p>
				</div>
			</div>

			<!-- Quick Telemetry Links -->
			<div class="tw-flex tw-items-center tw-gap-3 tw-font-mono tw-text-xs">
				<a href="/parent/household" class="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-border tw-border-[#334155] tw-bg-[#1E293B]/60 tw-text-slate-200 hover:tw-border-amber-500/60 hover:tw-text-amber-500 tw-transition-colors tw-no-underline">
					<Icon name={"user.group" as IconName} size={14} class="tw-text-amber-500" />
					<span>HOUSEHOLD OPS</span>
				</a>
				<a href="/parent/payments" class="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-border tw-border-[#334155] tw-bg-[#1E293B]/60 tw-text-slate-200 hover:tw-border-[#14b8a6] hover:tw-text-[#14b8a6] tw-transition-colors tw-no-underline">
					<Icon name={"sys.credit-card" as IconName} size={14} class="tw-text-[#14b8a6]" />
					<span>PAYMENTS</span>
				</a>
				<a href="/parent/log-workout" class="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-border tw-border-amber-500/50 tw-bg-amber-500/10 tw-text-amber-500 hover:tw-bg-amber-500/20 tw-transition-colors tw-no-underline font-bold">
					<Icon name={"game.zap" as IconName} size={14} class="tw-text-amber-500" />
					<span>LOG WORKOUT</span>
				</a>
			</div>
		</header>

		<!-- 12-Column Asymmetric Liquid Bento Grid -->
		<div class="bento-grid-container bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); tw-gap-6 tw-w-full tw-min-w-0">
			
			<!-- CoOpArena spans 8 columns -->
			<div data-panel="true" class="st-bento bento-col-8 lg:tw-col-span-8 parent-panel tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
				<div class="tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-overflow-hidden tw-relative tw-rounded-none">
					<CoOpArena engine={coOpEngine} />
				</div>

				<!-- The Car Ride Home Holographic Widget -->
				<div data-panel="true" class="st-bento parent-panel tw-relative tw-border tw-border-[#1E293B] tw-overflow-hidden tw-bg-[#0F172A] tw-rounded-none">
					<CarRideHome 
						{matchData}
						{isEmbargoed}
						{attestationSigned}
						{countdown}
						{signAttestation}
					/>
				</div>
			</div>
			
			<!-- Compliance Sidecar spans 4 columns -->
			<div class="st-bento bento-col-4 lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
				<!-- Action Inbox -->
				<div class="st-bento tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-rounded-none">
					<ActionInbox householdId={authStore.userProfile?.householdId} />
				</div>

				<!-- Bounty Terminal -->
				<div data-panel="true" class="st-bento parent-panel tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-min-h-[260px] tw-relative tw-rounded-none">
					<BountyTerminal engine={coOpEngine} />
				</div>

				<!-- Upcoming Events RSVP -->
				<div class="st-bento tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-rounded-none">
					<UpcomingEventsRsvp />
				</div>

				<!-- Notification Panel -->
				<div class="st-bento tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-rounded-none">
					<ParentNotificationPanel />
				</div>
			</div>
		</div>

		<!-- Communications Oversight Panels (12-Column Grid) -->
		<div class="bento-grid-container bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr)); tw-gap-6 tw-w-full tw-min-w-0">
			<!-- Parent Lounge / Announcements (8 cols) -->
			<div data-panel="true" class="st-bento bento-col-8 lg:tw-col-span-8 parent-panel tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-relative tw-min-w-0 tw-rounded-none">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
					<h3 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2.5 tw-m-0" style="font-family: 'Geist Sans', sans-serif;">
						<Icon name={"comm.broadcast" as IconName} size={18} class="tw-text-amber-500" />
						<span>Parent Lounge Telemetry</span>
					</h3>
					<span class="tw-px-2 tw-py-0.5 tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-text-[#14b8a6] tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded-none">
						READ_ONLY // FERPA_COMPLIANT
					</span>
				</div>
				<ParentLatestAnnouncements />
			</div>

			<!-- Household Thread / SafeSport Oversight (4 cols) -->
			<div data-panel="true" class="st-bento bento-col-4 lg:tw-col-span-4 parent-panel tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-relative tw-min-w-0 tw-rounded-none">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
					<h3 class="tw-text-white tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-2.5 tw-m-0" style="font-family: 'Geist Sans', sans-serif;">
						<Icon name={"status.shield-check" as IconName} size={18} class="tw-text-amber-500" />
						<span>Household Thread</span>
					</h3>
					<span class="tw-px-2 tw-py-0.5 tw-bg-emerald-500/10 tw-border tw-border-emerald-500/30 tw-text-emerald-400 tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded-none">
						SAFESPORT_COMPLIANT
					</span>
				</div>
				<div class="tw-bg-[#0B0F19] tw-p-4 tw-border tw-border-[#1E293B] tw-min-h-[160px] tw-flex tw-flex-col tw-items-center tw-justify-center tw-relative tw-rounded-none">
					<div class="tw-w-full tw-flex tw-items-center tw-gap-2 tw-mb-3 tw-text-slate-400 tw-font-mono tw-text-[10px] tw-tracking-widest">
						<Icon name={"sys.lock" as IconName} size={14} class="tw-text-amber-500" />
						<span>PRIVATE 1:1 MESSAGING DISABLED FOR MINORS</span>
					</div>
					<VanguardEmptyState title="No Active Threads" message="Coach-to-athlete communications are CC'd to this thread automatically for full oversight." />
				</div>
			</div>
		</div>

	</div>
</div>
