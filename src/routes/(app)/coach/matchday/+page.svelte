<script lang="ts">
	import { MatchDayEngine } from './MatchDayEngine.svelte';
	import MatchDayHUD from './MatchDayHUD.svelte';
	import MatchDayArena from './MatchDayArena.svelte';

	const engine = new MatchDayEngine();
</script>

<svelte:head>
	<title>Coach • Live Match Day Console | SSTracker</title>
</svelte:head>

<div
	class="pd-matchday-root coach-os-root tw-min-h-screen tw-bg-[#000000] tw-text-[#fafafa] tw-p-4 sm:tw-p-6 tw-space-y-6"
	style="background-color: rgb(0, 0, 0); border-radius: 0px;"
>
	<!-- Executive Tactical Header (Z0/Z2 Bridge) -->
	<header class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-border-b tw-border-[#334155] tw-pb-4">
		<div>
			<div class="tw-flex tw-items-center tw-gap-2.5 tw-mb-1">
				<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6] tw-animate-pulse" style="border-radius: 0px;"></span>
				<h1 class="tw-font-mono tw-text-xl sm:tw-text-2xl tw-font-black tw-text-[#fbbf24] tw-uppercase tw-tracking-wider">
					Live Match Day Console
				</h1>
			</div>
			<p class="tw-text-xs tw-text-[#d4d4d8] tw-font-mono">
				Side-line telemetry, sub-14ms event logging & Car Ride Home Shield
			</p>
		</div>

		<!-- Status Telemetry Readouts -->
		<div class="tw-flex tw-items-center tw-gap-2 tw-font-mono tw-text-[11px]">
			<span class="tw-px-2.5 tw-py-1 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-[#14b8a6]">
				LATENCY: <strong class="tw-text-white">12ms</strong>
			</span>
			<span class="tw-px-2.5 tw-py-1 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-[#fbbf24]">
				SHIELD: <strong class="tw-text-white">{engine.isShieldActive ? 'ARMED' : 'STANDBY'}</strong>
			</span>
		</div>
	</header>

	<MatchDayHUD {engine} />
	<MatchDayArena {engine} />
</div>
