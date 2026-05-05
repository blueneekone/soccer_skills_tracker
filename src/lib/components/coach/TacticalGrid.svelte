<script>
	import { onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { createTacticalWarRoom } from './TacticalEngine.svelte';
	import TacticalArena from './TacticalArena.svelte';
	import TacticalHUD from './TacticalHUD.svelte';

	let {
		showTacticalOverlay = $bindable(),
		wrBucketPitch = $bindable(),
		wrBucketXi = $bindable(),
		wrBucketBench = $bindable(),
		wrOppPitch = $bindable(),
		drawnRoutes = $bindable(),
		warRoomTool = $bindable(),
	} = $props();

	const host = {
		showTacticalOverlay: { get: () => showTacticalOverlay, set: (v) => (showTacticalOverlay = v) },
		warRoomTool: { get: () => warRoomTool, set: (v) => (warRoomTool = v) },
		wrBucketPitch: { get: () => wrBucketPitch, set: (v) => (wrBucketPitch = v) },
		wrBucketXi: { get: () => wrBucketXi, set: (v) => (wrBucketXi = v) },
		wrBucketBench: { get: () => wrBucketBench, set: (v) => (wrBucketBench = v) },
		wrOppPitch: { get: () => wrOppPitch, set: (v) => (wrOppPitch = v) },
		drawnRoutes: { get: () => drawnRoutes, set: (v) => (drawnRoutes = v) },
	};

	const model = createTacticalWarRoom(host);

	onDestroy(() => {
		model.simulator.pause();
	});
</script>

<svelte:window onkeydown={model.handleKeyDown} />

<div
	class="tw-fixed tw-inset-0 tw-z-[100] tw-flex tw-h-screen tw-w-full tw-flex-col tw-overflow-visible tw-bg-[#020202] tw-font-sans"
	in:fly={{ y: 20, duration: 400, easing: cubicOut }}
	out:fade={{ duration: 200 }}
>
	<header
		class="tw-z-20 tw-flex tw-h-14 tw-shrink-0 tw-items-center tw-justify-between tw-border-b tw-border-[#ff003c]/35 tw-bg-[#020202]/80 tw-px-6 tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)]"
	>
		<div class="tw-flex tw-items-center tw-gap-4">
			<div
				class="tw-h-3 tw-w-3 tw-animate-pulse tw-rounded-full tw-bg-[#ff003c] tw-shadow-[0_0_16px_#ff003c]"
			></div>
			<h2
				class="tw-font-mono tw-text-[12px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#ff003c]"
			>
				Tactical War Room // Active Grid
			</h2>
		</div>
		<button
			type="button"
			class="tw-pointer-events-auto tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-full tw-border-2 tw-border-white/10 tw-bg-[#020202]/80 tw-font-mono tw-text-xl tw-text-white tw-backdrop-blur-3xl tw-transition-colors hover:tw-border-[#ff0033]/70 hover:tw-text-[#ff0033]"
			onclick={model.closeOverlay}
			aria-label="Close tactical board"
		>
			✕
		</button>
	</header>

	<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-visible tw-bg-[#020202]">
		<div
			class="tw-pointer-events-auto tw-relative tw-z-0 tw-min-h-0 tw-w-full tw-flex-1 tw-overflow-visible"
		>
			<TacticalArena {model} {warRoomTool} />
			<div
				class="tw-pointer-events-none tw-absolute tw-inset-4 tw-z-0 tw-overflow-visible md:tw-inset-8"
				aria-hidden="true"
			></div>
		</div>
		<TacticalHUD {model} bind:warRoomTool />
	</div>
</div>

<style>
	:global(.disc-visual) {
		transform-box: fill-box;
	}

	:global(.grid-entity--selected .tg-target-lock-orbit) {
		filter: drop-shadow(0 0 10px rgba(255, 0, 60, 0.55))
			drop-shadow(0 0 22px rgba(255, 0, 60, 0.22));
	}
</style>
