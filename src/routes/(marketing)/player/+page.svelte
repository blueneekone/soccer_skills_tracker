<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<svelte:head>
	<title>Player OS — SSTracker</title>
	<meta name="description" content="Player OS: Gamified Skill Trees, XP progression, and video trial uploads." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#0f172a]">
	
	<!-- Header & Cinematic Media -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#14b8a6]">THE DOPAMINE ENGINE</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
			Player OS
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed tw-mb-8">
			Drive intrinsic motivation with the dark-mode HUD, Gamified Skill Trees, and strict XP progression.
		</p>
		
		<!-- Cinematic Media Container -->
		<div class="tw-w-full tw-max-w-5xl tw-aspect-video tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10">
				<button class="tw-bg-[#0B0F19]/90 tw-border tw-border-[#1e293b] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-colors tw-duration-150 group-hover:tw-text-[#14b8a6]" aria-label="Play Player OS demo video">
					<Icon name={"status.circle-play" as IconName} size={48} strokeWidth={1} />
				</button>
			</div>
			<img src="https://placehold.co/1920x1080/0f172a/334155.webp?text=[VIDEO_SLOT:+Player+OS+Dopamine+Engine]" alt="Player OS Cinematic Video" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
		</div>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-[clamp(1rem,2vw,1.5rem)]">
			
			<!-- Octalysis RPG Loop - 8 Cols -->
			<div class="md:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"game.rocket" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-2xl tw-font-bold">Octalysis RPG Progression Loop</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Leverage core drives of behavioral psychology. Athletes earn XP, unlock achievements, and climb leaderboards through verifiable training effort, transforming isolated drills into a cohesive progression fantasy.
				</p>
			</div>

			<!-- Composite Snowflake Skill Tree - 4 Cols -->
			<div class="md:tw-col-span-4 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"user.profile" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-xl tw-font-bold">Composite Snowflake Skill Tree</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
					Track specialized athlete development across stamina, pace, shooting, and tactical IQ with multidimensional snowflake web charts.
				</p>
			</div>

			<!-- 30-Second CV Video Trial Uploads - 12 Cols -->
			<div class="md:tw-col-span-12 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 tw-items-center">
				<div class="tw-flex-1">
					<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
						<Icon name={"action.upload" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
						<h2 class="tw-text-2xl tw-font-bold">30-Second CV Video Trial Uploads</h2>
					</div>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
						Players seamlessly submit 30-second unlisted YouTube or compressed mobile videos for remote skill validation. Computer Vision (CV) pipelines flag and verify drill mechanics before coaches review, ensuring high-fidelity remote training.
					</p>
				</div>
				<div class="tw-flex-1 tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden">
					<img src="https://placehold.co/800x450/0f172a/334155.webp?text=[VIDEO_SLOT:+CV+Validation]" alt="CV Validation" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

		</div>
	</section>
</div>
