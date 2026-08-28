<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<main class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-10">
	<div class="tw-flex tw-flex-col tw-items-center tw-gap-6">
		<div class="tw-flex tw-items-center tw-gap-3">
			<div class="tw-h-px tw-w-12 tw-bg-[#14b8a6]"></div>
			<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-tracking-widest" style="font-family: 'Geist Mono', monospace;">SSTRACKER · ENTERPRISE</span>
			<div class="tw-h-px tw-w-12 tw-bg-[#14b8a6]"></div>
		</div>

		<h1 class="tw-text-4xl md:tw-text-5xl lg:tw-text-6xl tw-font-bold tw-text-[#FAFAFA] tw-tracking-tight tw-leading-[1.05] tw-max-w-4xl" style="font-family: 'Geist Sans', sans-serif; font-size: clamp(2rem, 5vw, 4rem);">
			Unify your sports experience. Dominate your development.
		</h1>

		<p class="tw-text-[#D4D4D8] tw-text-lg tw-max-w-2xl tw-leading-relaxed" style="font-family: 'Switzer', sans-serif;">
			Replace the disjointed legacy stack with a cohesive, gamified training operating system built for elite youth clubs.
		</p>
	</div>

	<div class="tw-w-full tw-max-w-5xl tw-relative tw-aspect-video tw-rounded-sm" style="box-shadow: 0 0 20px var(--text-glow-magenta);">
		<div class="tw-w-full tw-h-full tw-relative tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-overflow-hidden">
			<video src="/assets/video/marketing-hero.mp4" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-90"></video>
			<div class="tw-absolute tw-inset-0 tw-z-10 tw-pointer-events-none" style="opacity: 0.03; background: repeating-linear-gradient(0deg, transparent, transparent 3px, #fff 3px, #fff 4px);"></div>
		</div>
	</div>
</main>
