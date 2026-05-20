<script lang="ts">
	import { browser } from '$app/environment';
	import { drawSeededProgressRing } from '$lib/hud/seededCanvasRing.js';

	let {
		uid = 'default',
		size = 56,
		fill = 0,
		strokeColor = 'var(--color-structural, #60a5fa)',
		trackColor = 'rgba(255,255,255,0.12)',
		label = '',
		value = '',
		subLabel = '',
		showCenter = true,
		avatarSeed = '',
		showAvatar = false,
	}: {
		uid?: string;
		size?: number;
		fill?: number;
		strokeColor?: string;
		trackColor?: string;
		label?: string;
		value?: string;
		subLabel?: string;
		showCenter?: boolean;
		avatarSeed?: string;
		showAvatar?: boolean;
	} = $props();

	let canvasEl = $state<HTMLCanvasElement | null>(null);

	const clampedFill = $derived(Math.min(1, Math.max(0, Number(fill) || 0)));

	function paint(timeMs: number) {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;
		const dpr = browser ? Math.min(window.devicePixelRatio || 1, 2) : 1;
		const radius = Math.max(8, size * 0.38);
		const lineWidth = Math.max(3, size * 0.07);
		const px = size * dpr;
		canvasEl.width = px;
		canvasEl.height = px;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		drawSeededProgressRing({
			ctx,
			cx: size / 2,
			cy: size / 2,
			radius,
			lineWidth,
			fill: clampedFill,
			uid,
			strokeColor,
			trackColor,
			timeMs,
		});
	}

	$effect(() => {
		if (!browser || !canvasEl) return;
		let start = performance.now();
		let frame = 0;

		const tick = (now: number) => {
			paint(now - start);
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(frame);
	});

	const a11y = $derived(
		`${label} ${value} ${Math.round(clampedFill * 100)} percent progress`.trim(),
	);
</script>

<div
	class="hud-seeded-ring"
	class:hud-seeded-ring--avatar={showAvatar}
	style="--hsr-size: {size}px; --hsr-stroke: {strokeColor};"
	role="img"
	aria-label={a11y}
>
	<canvas bind:this={canvasEl} class="hud-seeded-ring__canvas" width={size} height={size}></canvas>
	{#if showAvatar && avatarSeed}
		<div class="hud-seeded-ring__avatar">
			<span class="hud-seeded-ring__initials">{avatarSeed.slice(0, 2).toUpperCase()}</span>
		</div>
	{/if}
	{#if showCenter && (label || value || subLabel)}
		<div class="hud-seeded-ring__center">
			{#if label}<span class="hud-seeded-ring__label">{label}</span>{/if}
			{#if value}<span class="hud-seeded-ring__value">{value}</span>{/if}
			{#if subLabel}<span class="hud-seeded-ring__sub">{subLabel}</span>{/if}
		</div>
	{/if}
</div>

<style>
	.hud-seeded-ring {
		position: relative;
		width: var(--hsr-size, 56px);
		height: var(--hsr-size, 56px);
		flex-shrink: 0;
	}

	.hud-seeded-ring__canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.hud-seeded-ring__center {
		position: absolute;
		inset: 22%;
		display: grid;
		place-items: center;
		text-align: center;
		pointer-events: none;
		min-width: 0;
		overflow: hidden;
	}

	.hud-seeded-ring__avatar {
		position: absolute;
		inset: 50%;
		transform: translate(-50%, -50%);
		width: calc(var(--hsr-size, 56px) * 0.62);
		height: calc(var(--hsr-size, 56px) * 0.62);
		overflow: hidden;
		border-radius: 24px;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 80%, #1e293b);
	}

	.hud-seeded-ring__initials {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.62rem;
		font-weight: 900;
		color: #f8fafc;
	}

	.hud-seeded-ring__label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.42rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--hsr-stroke, #60a5fa) 65%, #94a3b8);
	}

	.hud-seeded-ring__value {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.62rem, 2cqw, 0.78rem);
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.hud-seeded-ring__sub {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.38rem;
		font-weight: 700;
		text-transform: uppercase;
		color: #64748b;
	}
</style>
