<script lang="ts">
	import { MatchDayEngine } from './MatchDayEngine.svelte';
	import MatchDayHUD from './MatchDayHUD.svelte';
	import MatchDayArena from './MatchDayArena.svelte';

	const engine = new MatchDayEngine();
</script>

<svelte:head>
	<title>Coach • Live Match Day Console</title>
</svelte:head>

<div
	class="pd-matchday-root tw-min-h-screen tw-bg-[#0a0a0a] tw-text-white tw-p-6 tw-space-y-6"
	style="background-color: rgb(10, 10, 10); border-radius: 0px;"
>
	<header class="tw-border-b tw-border-[#334155] tw-pb-4">
		<h1 class="tw-font-mono tw-text-2xl tw-font-bold tw-text-[#fbbf24] tw-uppercase tw-tracking-tight">
			Live Match Day Console
		</h1>
		<p class="tw-text-xs tw-text-gray-400 tw-font-mono">
			Side-line telemetry, sub-14ms event logging & Car Ride Home Shield
		</p>
	</header>

	<MatchDayHUD {engine} />
	<MatchDayArena {engine} />
</div>
