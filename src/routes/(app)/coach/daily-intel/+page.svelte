<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
</script>

<svelte:head>
	<title>Daily Intel · Coach OS</title>
</svelte:head>

<div class="tw-p-8 tw-bg-slate-900 tw-min-h-screen tw-text-slate-200">
	<h1 class="tw-text-2xl tw-font-bold tw-mb-6">Daily Intel</h1>

	<!-- .intel-panel with 24px vertical padding (tw-py-6) and 16px horizontal padding (tw-px-4) -->
	<div class="intel-panel tw-py-6 tw-px-4 tw-bg-slate-800 tw-rounded-lg tw-border tw-border-slate-700 tw-mb-6">
		<h2 class="tw-text-sm tw-uppercase tw-tracking-widest tw-text-slate-400 tw-mb-4">Squad Telemetry</h2>
		<div class="tw-flex tw-gap-8">
			<div>
				<span class="tw-text-xs tw-text-slate-500 tw-uppercase">Load</span>
				<!-- Numeric telemetry values must use Geist Mono -->
				<div class="telemetry-readout-val tw-font-mono tw-text-3xl tw-text-emerald-400">82%</div>
			</div>
			<div>
				<span class="tw-text-xs tw-text-slate-500 tw-uppercase">Readiness</span>
				<div class="telemetry-readout-val tw-font-mono tw-text-3xl tw-text-emerald-400">95%</div>
			</div>
		</div>
	</div>
</div>
