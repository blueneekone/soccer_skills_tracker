<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<svelte:head>
	<title>Player OS — SSTracker</title>
	<meta name="description" content="Player OS: Gamified Skill Trees, XP progression, and video trial uploads." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#000000] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-amber-500 tw-selection:text-[#000000]">
	
	<!-- Header & Cinematic Media -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-amber-500">THE DOPAMINE ENGINE</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight" style="font-family: 'Geist Sans', sans-serif;">
			Player OS
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed tw-mb-8" style="font-family: 'Switzer', sans-serif;">
			Drive intrinsic motivation with the dark-mode HUD, Gamified Skill Trees, and strict XP progression.
		</p>
		
		<!-- Cinematic Media Container -->
		<div class="tw-w-full tw-max-w-5xl tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10">
				<button class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-colors tw-duration-150 group-hover:tw-text-amber-500 group-hover:tw-border-amber-500" aria-label="Play Player OS demo">
					<Icon name={"status.circle-play" as IconName} size={48} strokeWidth={1} />
				</button>
			</div>
			<video src="/videos/player-os-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
		</div>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="st-bento tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-[clamp(1rem,2vw,1.5rem)]">
			
			<!-- Octalysis RPG Loop - 8 Cols -->
			<div class="md:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-amber-500 tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
					<div class="tw-flex tw-items-center tw-gap-3">
						<Icon name={"game.rocket" as IconName} size={28} strokeWidth={1.5} class="tw-text-amber-500" />
						<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">Octalysis RPG Progression Loop</h2>
					</div>
					<span class="tw-font-mono tw-text-xs tw-text-amber-500 tw-border tw-border-amber-500/30 tw-px-2 tw-py-0.5 tw-uppercase tw-tracking-widest">XP_TELEMETRY</span>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-6" style="font-family: 'Switzer', sans-serif;">
					Leverage core drives of behavioral psychology. Athletes earn XP, unlock achievements, and climb leaderboards through verifiable training effort, transforming isolated drills into a cohesive progression fantasy.
				</p>
				
				<!-- High-Voltage Progress Meter Highlight -->
				<div class="tw-mt-auto tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-p-4 tw-rounded-sm">
					<div class="tw-flex tw-justify-between tw-items-center tw-mb-2">
						<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase tw-tracking-widest">Level 14 · Striker Mastery</span>
						<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-amber-500">2,850 / 3,000 XP</span>
					</div>
					<div class="tw-w-full tw-h-2 tw-bg-[#0f172a] tw-rounded-full tw-overflow-hidden">
						<div class="tw-h-full tw-bg-amber-500" style="width: 95%;"></div>
					</div>
				</div>
			</div>

			<!-- Composite Snowflake Skill Tree - 4 Cols -->
			<div class="md:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#14b8a6] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"user.profile" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">Composite Snowflake Skill Tree</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-6" style="font-family: 'Switzer', sans-serif;">
					Track specialized athlete development across stamina, pace, shooting, and tactical IQ with multidimensional snowflake web charts.
				</p>
				<div class="tw-mt-auto tw-flex tw-items-center tw-gap-2 tw-font-mono tw-text-xs tw-text-[#14b8a6]">
					<Icon name={"data.radar" as IconName} size={16} />
					<span>Vanguard Prism 360° Profile</span>
				</div>
			</div>

			<!-- 30-Second CV Video Trial Uploads - 12 Cols -->
			<div class="md:tw-col-span-12 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 tw-items-center">
				<div class="tw-flex-1">
					<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
						<Icon name={"action.upload" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
						<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">30-Second CV Video Trial Uploads</h2>
					</div>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-6" style="font-family: 'Switzer', sans-serif;">
						Players seamlessly submit 30-second unlisted YouTube or compressed mobile videos for remote skill validation. Computer Vision (CV) pipelines flag and verify drill mechanics before coaches review, ensuring high-fidelity remote training.
					</p>
					<a href="/login" class="tw-bg-amber-500 tw-text-[#000000] hover:tw-bg-amber-500/90 tw-px-8 tw-py-3.5 tw-rounded-sm tw-font-mono tw-font-bold tw-text-xs tw-uppercase tw-tracking-wider tw-transition-colors tw-duration-150 tw-inline-flex tw-items-center tw-gap-2 tw-shadow-[0_0_20px_rgba(251,191,36,0.25)]">
						Deploy Player HQ
						<Icon name={"nav.chevron-right" as IconName} size={16} />
					</a>
				</div>
				<div class="tw-flex-1 tw-w-full tw-aspect-video tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden">
					<video src="/videos/player-cv-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
				</div>
			</div>

		</div>
	</section>
</div>
