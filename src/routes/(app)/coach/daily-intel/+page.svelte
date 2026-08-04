<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
</script>

<svelte:head>
	<title>Daily Intel · Coach OS</title>
</svelte:head>

<div class="tw-p-8 tw-bg-[#000000] tw-min-h-screen tw-text-white">
	<h1 class="tw-font-sans tw-text-2xl tw-font-bold tw-mb-6">Daily Intel</h1>

	<!-- .intel-panel with 24px vertical padding (tw-py-6) and 16px horizontal padding (tw-px-4) -->
	<div class="intel-panel tw-py-6 tw-px-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-mb-6 tw-rounded-none">
		<h2 class="tw-text-sm tw-uppercase tw-tracking-widest tw-text-[#94a3b8] tw-mb-4 tw-font-sans">Squad Telemetry</h2>
		<div class="tw-grid tw-gap-8" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
			<div class="bento-cell tw-bg-[#000000] tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">Load</span>
				<!-- Numeric telemetry values must use Geist Mono -->
				<div class="telemetry-readout-val tw-font-mono tw-text-3xl tw-text-[#14b8a6]">82%</div>
			</div>
			<div class="bento-cell tw-bg-[#000000] tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">Readiness</span>
				<div class="telemetry-readout-val tw-font-mono tw-text-3xl tw-text-[#14b8a6]">95%</div>
			</div>
		</div>
	</div>
</div>
