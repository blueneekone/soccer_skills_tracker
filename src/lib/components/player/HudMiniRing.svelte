<script lang="ts">
	import { browser } from '$app/environment';

	let {
		fill = 0,
		label = '',
		value = '',
		subLabel = '',
		strokeColor = 'var(--color-structural, #14b8a6)',
		size = 56,
		prominent = false,
	}: {
		fill?: number;
		label?: string;
		value?: string;
		subLabel?: string;
		strokeColor?: string;
		size?: number;
		prominent?: boolean;
	} = $props();

	const R = 22;
	const strokeW = 5;
	const c = 2 * Math.PI * R;
	const clampedFill = $derived(Math.min(1, Math.max(0, Number(fill) || 0)));

	let ringProgress = $state(0);

	$effect(() => {
		if (!browser) return;
		const target = clampedFill;
		const t = requestAnimationFrame(() => {
			ringProgress = target;
		});
		return () => cancelAnimationFrame(t);
	});

	const dashOffset = $derived(c * (1 - ringProgress));
	const a11y = $derived(`${label}. ${value}. ${Math.round(clampedFill * 100)} percent.`);
</script>

<div
	class="hud-mini-ring"
	class:hud-mini-ring--prominent={prominent}
	style="--hud-ring-size: {size}px; --hud-ring-stroke: {strokeColor};"
	aria-label={a11y}
>
	<svg class="hud-mini-ring__svg" viewBox="0 0 56 56" width={size} height={size} role="img">
		<circle class="hud-mini-ring__track" cx="28" cy="28" r={R} fill="none" stroke-width={strokeW} />
		<circle
			class="hud-mini-ring__fill"
			cx="28"
			cy="28"
			r={R}
			fill="none"
			stroke-width={strokeW}
			stroke-linecap="round"
			stroke-dasharray={c}
			stroke-dashoffset={dashOffset}
			transform="rotate(-90 28 28)"
		/>
	</svg>
	<div class="hud-mini-ring__center">
		{#if label}
			<span class="hud-mini-ring__label">{label}</span>
		{/if}
		<span class="hud-mini-ring__value">{value}</span>
		{#if subLabel}
			<span class="hud-mini-ring__sub">{subLabel}</span>
		{/if}
	</div>
</div>

<style>
	.hud-mini-ring {
		position: relative;
		width: var(--hud-ring-size, 56px);
		height: var(--hud-ring-size, 56px);
		flex-shrink: 0;
	}

	.hud-mini-ring--prominent {
		border-radius: 50%;
		background: color-mix(in srgb, #1e293b 88%, var(--color-dominant, #0f172a));
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.14),
			0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.hud-mini-ring__svg {
		display: block;
	}

	.hud-mini-ring__track {
		stroke: color-mix(in srgb, var(--color-structural, #14b8a6) 22%, transparent);
	}

	.hud-mini-ring--prominent .hud-mini-ring__track {
		stroke: rgba(255, 255, 255, 0.38);
	}

	.hud-mini-ring__fill {
		stroke: var(--hud-ring-stroke, var(--color-structural, #14b8a6));
		transition: stroke-dashoffset 0.65s cubic-bezier(0.33, 1, 0.68, 1);
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--hud-ring-stroke, #14b8a6) 45%, transparent));
	}

	.hud-mini-ring__center {
		position: absolute;
		inset: 18%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		pointer-events: none;
		min-width: 0;
		overflow: hidden;
	}

	.hud-mini-ring__label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.42rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #14b8a6) 65%, #94a3b8);
	}

	.hud-mini-ring--prominent .hud-mini-ring__label {
		color: rgba(255, 255, 255, 0.82);
	}

	.hud-mini-ring__value {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.65rem, 2.2cqw, 0.8rem);
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--vanguard-text-1, #f8fafc);
		line-height: 1.1;
	}

	.hud-mini-ring--prominent .hud-mini-ring__value {
		color: #ffffff;
	}

	.hud-mini-ring__sub {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.38rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #64748b;
	}

	.hud-mini-ring--prominent .hud-mini-ring__sub {
		color: rgba(255, 255, 255, 0.72);
	}
</style>
