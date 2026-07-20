<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<svelte:head>
	<title>Features — SSTracker</title>
	<meta
		name="description"
		content="Player, Parent, Coach, and Director workspaces plus compliance architecture — the development OS for youth clubs."
	/>
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#0f172a]">
	
	<!-- Header -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#f59e0b]">PERSONA SURFACES</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
			What SSTracker ships today.
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed">
			Four workspaces and a compliance moat — aligned with Wave 4 launch parity. No fantasy modules; each section maps to live routes on our production infrastructure.
		</p>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-6">
			
			<!-- Player OS (Dopamine Engine) - Spans 8 Cols -->
			<div id="development" class="md:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"game.rocket" as IconName} size={28} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-2xl tw-font-bold">Player OS: The Dopamine Engine</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Player HQ surfaces missions, telemetry, and adaptive homework. Drive intrinsic motivation with the dark-mode HUD, Gamified Skill Trees, and strict XP progression.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
					<!-- Media Placeholder -->
					<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10">
						<button class="tw-bg-[#0B0F19]/90 tw-border tw-border-[#1e293b] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-colors tw-duration-150 group-hover:tw-text-[#14b8a6]" aria-label="Play Player OS feature video">
							<Icon name={"media.play" as IconName} size={32} />
						</button>
					</div>
					<img src="https://placehold.co/1280x720/0f172a/334155.webp?text=[VIDEO_SLOT:+Octalysis+XP+Ring+&+Video+Trial+Upload]" alt="Player OS Video" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

			<!-- Coach OS (Sideline SIEM) - Spans 4 Cols -->
			<div id="logistics" class="md:tw-col-span-4 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"user.settings" as IconName} size={28} class="tw-text-[#f59e0b]" />
					<h2 class="tw-text-2xl tw-font-bold">Coach OS: Sideline SIEM</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Orchestrate your tactical vision. Leverage the RAG AI Tactical Assistant and Intent Engine to draft session plans instantly.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-square tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative">
					<img src="https://placehold.co/800x800/0f172a/334155.webp?text=[SCREENSHOT_SLOT:+Fabric.js+Spatial+Drill+Designer+&+Real-Time+Telemetry]" alt="Coach OS Screenshot" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

			<!-- Parent OS (Co-Op Trust Center) - Spans 4 Cols -->
			<div id="household" class="md:tw-col-span-4 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"security.lock" as IconName} size={28} class="tw-text-[#3b82f6]" />
					<h2 class="tw-text-2xl tw-font-bold">Parent OS: Co-Op Trust Center</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Ensure complete emotional safety. The Car Ride Home embargo locks match metrics for 15 minutes post-game. Verified guardians receive Tremendous bounty payouts for squad-level commitments.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-square tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative">
					<img src="https://placehold.co/800x800/0f172a/334155.webp?text=[SCREENSHOT_SLOT:+COPPA+2.0+Consent+&+Car+Ride+Home+Protocol]" alt="Parent OS Screenshot" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

			<!-- Director OS (God Mode) - Spans 8 Cols -->
			<div id="director-ops" class="md:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"sys.server" as IconName} size={28} class="tw-text-[#a855f7]" />
					<h2 class="tw-text-2xl tw-font-bold">Director OS: God Mode</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Complete administrative panopticon. Director surfaces cover deployment calendar, eligibility matrix, coach clearance (Checkr embed), and Stripe Financial Telemetry. Maintain club compliance health at a glance.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative">
					<img src="https://placehold.co/1280x720/0f172a/334155.webp?text=[SCREENSHOT_SLOT:+Stripe+Financial+Telemetry+&+Club+Compliance+Health]" alt="Director OS Screenshot" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

		</div>

		<!-- Footer CTA -->
		<div class="tw-mt-24 tw-text-center">
			<h2 class="tw-text-3xl tw-font-bold tw-mb-8">Ready to secure your club's future?</h2>
			<div class="tw-flex tw-items-center tw-justify-center tw-gap-6 tw-flex-wrap">
				<a href="/pricing" class="tw-bg-[#fbbf24] tw-text-[#0f172a] hover:tw-bg-[#f59e0b] tw-px-8 tw-py-4 tw-rounded-sm tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-transition-colors tw-duration-150">
					View Commercial Pricing →
				</a>
				<a href="/acquisition" class="tw-font-mono tw-text-xs tw-text-[#94a3b8] hover:tw-text-[#f8fafc] tw-font-bold tw-tracking-widest tw-uppercase tw-transition-colors tw-duration-150">
					Read Acquisition Brief
				</a>
			</div>
		</div>
	</section>

</div>
