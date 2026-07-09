<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<svelte:head>
	<title>Coach OS — SSTracker</title>
	<meta name="description" content="Coach OS: Fabric.js Spatial Drill Designer, RAG AI Tactical Assistant, and real-time telemetry." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#f59e0b] tw-selection:text-[#0f172a]">
	
	<!-- Header & Cinematic Media -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#f59e0b]">THE SIDELINE SIEM</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
			Coach OS
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed tw-mb-8">
			Leverage the Spatial Drill Designer, real-time match telemetry, and the RAG AI Tactical Assistant to orchestrate every victory.
		</p>
		
		<!-- Cinematic Media Container -->
		<div class="tw-w-full tw-max-w-5xl tw-aspect-video tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10">
				<button class="tw-bg-[#0B0F19]/90 tw-border tw-border-[#1e293b] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-colors tw-duration-150 group-hover:tw-text-[#f59e0b]">
					<Icon name={"status.circle-play" as IconName} size={48} strokeWidth={1} />
				</button>
			</div>
			<img src="https://placehold.co/1920x1080/0f172a/334155.webp?text=[VIDEO_SLOT:+Coach+OS+Command+Center]" alt="Coach OS Cinematic Video" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
		</div>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-[clamp(1rem,2vw,1.5rem)]">
			
			<!-- Fabric.js HTML5 Spatial Drill Designer - 8 Cols -->
			<div class="md:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"action.edit" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#f59e0b]" />
					<h2 class="tw-text-2xl tw-font-bold">Fabric.js Spatial Drill Designer</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Draft and animate tactical maneuvers on an interactive HTML5 canvas. Snap-to-grid constraints, multi-select tooling, and vector physics allow you to design complex drills that athletes can view directly in their OS.
				</p>
				<div class="tw-mt-auto tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden">
					<img src="https://placehold.co/800x450/0f172a/334155.webp?text=[VIDEO_SLOT:+Spatial+Drill+Designer]" alt="Spatial Drill Designer" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

			<!-- RAG AI Tactical Assistant - 4 Cols -->
			<div class="md:tw-col-span-4 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"comm.chat" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#f59e0b]" />
					<h2 class="tw-text-xl tw-font-bold">RAG AI Tactical Assistant</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Chat with your club's entire historical playbook. The AI ingests past match reports, drill success rates, and opponent telemetry to suggest optimal formations and counter-strategies in real-time.
				</p>
			</div>

			<!-- Real-Time Telemetry Grid - 12 Cols -->
			<div class="md:tw-col-span-12 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 tw-items-center">
				<div class="tw-flex-1">
					<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
						<Icon name={"data.chart-line" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#f59e0b]" />
						<h2 class="tw-text-2xl tw-font-bold">Real-Time Telemetry Grid</h2>
					</div>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
						High-density data visualizations render match statistics instantly. Monitor player fatigue, possession percentages, and zone control through crisp, Chart.js-powered gauges and trendlines.
					</p>
				</div>
				<div class="tw-flex-1 tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden">
					<img src="https://placehold.co/800x450/0f172a/334155.webp?text=[DATA_VISUALIZATION:+Telemetry+Grid]" alt="Telemetry Grid" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

		</div>
	</section>
</div>
