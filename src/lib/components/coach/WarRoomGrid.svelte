<script lang="ts">

	// The tactical board belongs strictly in the War Room and Drill Designer modules.
	// Eradicated the generic green "Spatial Layout" HTML5 canvas.
</script>

<div class="tw-relative tw-w-full tw-h-full tw-min-h-[400px] tw-bg-[#05050a] tw-rounded-lg tw-border tw-border-[#1e293b] tw-flex tw-items-center tw-justify-center tw-overflow-hidden">
	<div class="tw-absolute tw-inset-0 tw-bg-[linear-gradient(rgba(20,184,166,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.03)_1px,transparent_1px)] tw-bg-[size:20px_20px] pointer-events-none"></div>
	<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-z-10">
		<div class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-slate-800 tw-animate-pulse"></div>
		<p class="tw-text-slate-600 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-m-0">
			War Room Feed Offline
		</p>
		<p class="tw-text-slate-700 tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest tw-m-0">
			Awaiting tactical telemetry
		</p>
	</div>
</div>
