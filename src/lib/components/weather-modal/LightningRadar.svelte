<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	let { weatherLockout = $bindable(false) }: { weatherLockout: boolean } = $props();
	let strikes = $state<{ id: number; dist: number; angle: number; time: number }[]>([]);
	let sweepAngle = $state(0), countdown = $state(0);
	let rafId: number, strikeInt: ReturnType<typeof setInterval>, cdInt: ReturnType<typeof setInterval>;
	const MOCK_PROB = 0.05; // 5% chance per tick

	onMount(() => {
		if (typeof window === 'undefined') return;
		let lastTime = performance.now();
		const animate = (time: number) => {
			sweepAngle = (sweepAngle + ((time - lastTime) * 0.1)) % 360;
			lastTime = time;
			rafId = requestAnimationFrame(animate);
		};
		rafId = requestAnimationFrame(animate);

		strikeInt = setInterval(() => {
			if (typeof window === 'undefined') return;
			if (Math.random() < MOCK_PROB) {
				const dist = Math.random() * 15, angle = Math.random() * 360;
				strikes = [...strikes, { id: Date.now(), dist, angle, time: Date.now() }];
				if (dist <= 8 && !weatherLockout) {
					weatherLockout = true;
					countdown = 30 * 60; // 30 mins
					if (!cdInt) cdInt = setInterval(() => { countdown > 0 ? countdown-- : clearInterval(cdInt); }, 1000);
				}
			}
			strikes = strikes.filter(s => Date.now() - s.time < 3000);
		}, 1000);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') { cancelAnimationFrame(rafId); clearInterval(strikeInt); clearInterval(cdInt); }
	});

	const fmtTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
</script>

<div class="tw-relative tw-w-full tw-aspect-square tw-max-w-[400px] tw-mx-auto tw-bg-[#000000] tw-border tw-rounded-none {weatherLockout ? 'tw-border-red-600' : 'tw-border-[#334155]'} tw-overflow-hidden">
	<svg viewBox="0 0 100 100" class="tw-w-full tw-h-full">
		<circle cx="50" cy="50" r="16.6" fill="none" stroke="#334155" stroke-dasharray="2 2" stroke-width="0.5"/>
		<circle cx="50" cy="50" r="33.3" fill="none" stroke="#334155" stroke-dasharray="2 2" stroke-width="0.5"/>
		<circle cx="50" cy="50" r="50" fill="none" class={weatherLockout ? 'tw-stroke-red-600 tw-animate-pulse' : 'tw-stroke-[#14b8a6]'} stroke-width="0.5"/>
		<line x1="50" y1="0" x2="50" y2="100" stroke="#334155" stroke-width="0.25"/>
		<line x1="0" y1="50" x2="100" y2="50" stroke="#334155" stroke-width="0.25"/>
		<g style="transform: rotate({sweepAngle}deg); transform-origin: 50px 50px;">
			<path d="M 50 50 L 50 0 A 50 50 0 0 1 100 50 Z" fill="url(#radarSweep)" opacity="0.4"/>
		</g>
		{#each strikes as s (s.id)}
			<circle cx={50 + (s.dist / 15 * 50) * Math.sin(s.angle * Math.PI / 180)} cy={50 - (s.dist / 15 * 50) * Math.cos(s.angle * Math.PI / 180)} r="1.5" fill="red" class="tw-animate-ping"/>
		{/each}
		<defs>
			<radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.8"/><stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
			</radialGradient>
		</defs>
	</svg>
	{#if weatherLockout}
		<div class="tw-absolute tw-bottom-2 tw-left-0 tw-right-0 tw-text-center tw-font-mono tw-text-red-500 tw-bg-black/80 tw-p-1 tw-text-xs tw-border-t tw-border-red-600">
			30 MINUTE RESTART DETECTED // COUNTDOWN SINCE LAST LIGHTNING EVENT<br/><span class="tw-text-xl tw-font-bold">{fmtTime(countdown)}</span>
		</div>
	{/if}
</div>
