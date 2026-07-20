<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell)
	 * Tactical SIEM Architecture — Vanguard Protocol Adherent
	 */
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	
	export const prerender = true;
</script>

<svelte:head>
	<title>SSTracker — The ultimate operating system for elite youth clubs.</title>
	<meta
		name="description"
		content="SSTracker runs your athletes' development with household-first compliance, coach intent, and parent co-op — the club OS youth sports needs beyond schedule-only tools."
	/>
	<meta property="og:title" content="SSTracker — Athlete development & compliance for youth clubs" />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#0f172a]">
	
	<!-- THE HERO -->
	<main class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-justify-center tw-gap-12">
		
		<div class="tw-flex tw-flex-col tw-items-center tw-gap-8">
			<div class="tw-flex tw-items-center tw-gap-3">
				<div class="tw-h-px tw-w-12 tw-bg-[#14b8a6]"></div>
				<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-tracking-widest">NEXUS COMMAND · ENTERPRISE</span>
				<div class="tw-h-px tw-w-12 tw-bg-[#14b8a6]"></div>
			</div>
			
			<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight tw-max-w-4xl">
				Level-up in game and reality, with the ultimate sports skill tracker.
			</h1>
			
			<a href="/login" class="vanguard-btn-amber tw-w-fit tw-flex tw-items-center tw-gap-3 tw-px-8 tw-py-4 tw-rounded-sm tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-transition-colors tw-duration-150">
				Deploy Your Club
				<Icon name={"nav.chevron-right" as IconName} strokeWidth={2.5} size={18} />
			</a>
		</div>

		<!-- Massive 12-Column Video Slot -->
		<div class="tw-w-full tw-relative tw-aspect-video tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-group">
			<div class="tw-absolute tw-inset-0 tw-bg-gradient-to-tr tw-from-[#0f172a]/80 tw-to-transparent tw-z-10 tw-pointer-events-none"></div>
			<!-- Tactical Border Accents -->
			<div class="tw-absolute tw-top-0 tw-left-0 tw-w-8 tw-h-8 tw-border-t-2 tw-border-l-2 tw-border-[#14b8a6] tw-z-20"></div>
			<div class="tw-absolute tw-bottom-0 tw-right-0 tw-w-8 tw-h-8 tw-border-b-2 tw-border-r-2 tw-border-[#14b8a6] tw-z-20"></div>
			
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-20">
				<button class="tw-bg-[#0f172a]/90 tw-border tw-border-[#1e293b] hover:tw-border-[#14b8a6] tw-rounded-full tw-p-5 tw-text-[#f8fafc] tw-shadow-2xl tw-transition-colors tw-duration-150 group-hover:tw-text-[#14b8a6]" aria-label="Play product demo video">
					<Icon name={"media.play" as IconName} size={48} strokeWidth={1.5} />
				</button>
			</div>
			<!-- Mocked Product Video Loop -->
			<img src="https://placehold.co/1920x1080/0B0F19/1e293b.webp?text=[VIDEO_SLOT:+90-Second+Product+Demo+Loop]" alt="SSTracker Product Demo Loop" class="tw-w-full tw-h-full tw-object-cover tw-opacity-60 grayscale group-hover:grayscale-0 tw-transition-all tw-duration-700" loading="eager" />
		</div>

		<!-- Low-Contrast Trust Bar -->
		<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-x-6 tw-gap-y-2 tw-pt-4 tw-font-mono tw-text-xs tw-text-[#475569] tw-uppercase tw-tracking-widest">
			<span>Powered by:</span>
			<span>Stripe</span>
			<span>·</span>
			<span>Checkr</span>
			<span>·</span>
			<span>Firebase</span>
		</div>
	</main>

	<!-- ECOSYSTEM PREVIEW (Training Triangle Bento Grid) -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-py-24">
		<div class="tw-flex tw-flex-col tw-items-center tw-text-center tw-mb-16">
			<span class="tw-font-mono tw-text-xs tw-text-[#f59e0b] tw-tracking-widest tw-mb-4">SYS.ECOSYSTEM</span>
			<h2 class="tw-text-4xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight">The Training Triangle</h2>
			<p class="tw-text-[#94a3b8] tw-mt-4 tw-max-w-2xl">Complete operational parity across your club's most critical personas.</p>
		</div>

		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6">
			
			<!-- Player Train -->
			<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col tw-items-center tw-text-center md:tw-items-start md:tw-text-left">
				<Icon name={"game.rocket" as IconName} size={32} strokeWidth={1} class="tw-text-[#14b8a6] tw-mb-6" />
				<h3 class="tw-text-2xl tw-font-bold tw-text-[#f8fafc] tw-mb-3">Player Train</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8 tw-flex-1">
					The Dopamine Engine. Gamified Skill Trees, XP progression, and video trial uploads that drive intrinsic motivation and unyielding athlete engagement.
				</p>
				<a href="/player" class="tw-w-fit tw-font-mono tw-text-xs tw-text-[#f8fafc] hover:tw-text-[#14b8a6] tw-uppercase tw-tracking-widest tw-font-bold tw-transition-colors tw-duration-150 tw-flex tw-items-center tw-gap-2">
					Learn More <Icon name={"nav.arrow-right" as IconName} size={14} />
				</a>
			</div>

			<!-- Coach Forge -->
			<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col tw-items-center tw-text-center md:tw-items-start md:tw-text-left">
				<Icon name={"user.settings" as IconName} size={32} strokeWidth={1} class="tw-text-[#f59e0b] tw-mb-6" />
				<h3 class="tw-text-2xl tw-font-bold tw-text-[#f8fafc] tw-mb-3">Coach Forge</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8 tw-flex-1">
					The Sideline SIEM. Leverage the Fabric.js Spatial Drill Designer, real-time match telemetry, and the RAG AI Tactical Assistant to orchestrate every victory.
				</p>
				<a href="/coach" class="tw-w-fit tw-font-mono tw-text-xs tw-text-[#f8fafc] hover:tw-text-[#f59e0b] tw-uppercase tw-tracking-widest tw-font-bold tw-transition-colors tw-duration-150 tw-flex tw-items-center tw-gap-2">
					Learn More <Icon name={"nav.arrow-right" as IconName} size={14} />
				</a>
			</div>

			<!-- Parent Visibility -->
			<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col tw-items-center tw-text-center md:tw-items-start md:tw-text-left">
				<Icon name={"status.shield-check" as IconName} size={32} strokeWidth={1} class="tw-text-[#3b82f6] tw-mb-6" />
				<h3 class="tw-text-2xl tw-font-bold tw-text-[#f8fafc] tw-mb-3">Parent Visibility</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8 tw-flex-1">
					The Co-Op Trust Center. Mathematical compliance with COPPA 2.0, the Car Ride Home emotional safety protocol, and Tremendous bounty payouts for verified guardians.
				</p>
				<a href="/parent" class="tw-w-fit tw-font-mono tw-text-xs tw-text-[#f8fafc] hover:tw-text-[#3b82f6] tw-uppercase tw-tracking-widest tw-font-bold tw-transition-colors tw-duration-150 tw-flex tw-items-center tw-gap-2">
					Learn More <Icon name={"nav.arrow-right" as IconName} size={14} />
				</a>
			</div>

		</div>
	</section>

</div>
