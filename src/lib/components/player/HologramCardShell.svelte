<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		accent = 'var(--pd-accent-data, #14b8a6)',
		maxTiltDeg = 8,
		class: className = '',
		children,
		telemetry,
		ariaLabel = 'Holographic card',
		compact = false,
	}: {
		accent?: string;
		maxTiltDeg?: number;
		class?: string;
		children: Snippet;
		telemetry?: Snippet;
		ariaLabel?: string;
		compact?: boolean;
	} = $props();

	let isHover = $state(false);
	let nx = $state(0);
	let ny = $state(0);
	let glareX = $state(50);
	let glareY = $state(50);
	let motionReduced = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			motionReduced = mq.matches;
		};
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	const tiltX = $derived(ny * maxTiltDeg);
	const tiltY = $derived(-nx * maxTiltDeg);

	const cardTransform = $derived(
		motionReduced
			? 'none'
			: `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`,
	);

	const cardTransition = $derived(
		isHover && !motionReduced ? 'transform 0.15s ease-out' : 'transform 0.25s ease-out',
	);

	const foilBackground = $derived(
		`radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 25%, transparent 55%)`,
	);

	function onPointerMove(ev: PointerEvent) {
		if (motionReduced) return;
		const target = ev.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const relX = ev.clientX - rect.left;
		const relY = ev.clientY - rect.top;
		nx = Math.max(-1, Math.min(1, (relX / rect.width) * 2 - 1));
		ny = Math.max(-1, Math.min(1, (relY / rect.height) * 2 - 1));
		glareX = Math.max(0, Math.min(100, (relX / rect.width) * 100));
		glareY = Math.max(0, Math.min(100, (relY / rect.height) * 100));
		isHover = true;
	}

	function onPointerLeave() {
		nx = 0;
		ny = 0;
		glareX = 50;
		glareY = 50;
		isHover = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="hcs-wrapper {className}"
	class:hcs-wrapper--compact={compact}
	style:--hcs-accent={accent}
	aria-label={ariaLabel}
	role="group"
	onpointermove={onPointerMove}
	onpointerleave={onPointerLeave}
>
	<div
		class="hcs-card"
		class:hcs-card--has-telemetry={Boolean(telemetry)}
		style:transform={cardTransform}
		style:transition={cardTransition}
	>
		<div class="hcs-edge" aria-hidden="true"></div>
		<div class="hcs-scanlines" aria-hidden="true"></div>
		<div class="hcs-content">
			{@render children()}
		</div>
		{#if telemetry}
			<footer class="hcs-telemetry-foot">
				{@render telemetry()}
			</footer>
		{/if}
		<div class="hcs-foil" style:background={foilBackground} aria-hidden="true"></div>
	</div>
</div>

<style>
	.hcs-wrapper {
		position: relative;
		display: block;
		width: 100%;
		max-width: clamp(200px, 22vw, 280px);
		min-width: 0;
		flex-shrink: 0;
		user-select: none;
	}

	.hcs-wrapper--compact {
		max-width: clamp(200px, 20vw, 260px);
	}

	.hcs-card {
		position: relative;
		width: 100%;
		min-height: clamp(150px, 18vw, 190px);
		border-radius: 1rem;
		border: 1px solid color-mix(in srgb, var(--pd-line, rgba(255, 255, 255, 0.1)) 90%, transparent);
		background: color-mix(in srgb, #010409 82%, transparent);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		overflow: hidden;
		transform-style: preserve-3d;
	}

	.hcs-card--has-telemetry {
		display: flex;
		flex-direction: column;
	}

	.hcs-wrapper--compact .hcs-card {
		min-height: clamp(140px, 16vw, 180px);
		border-radius: 0.875rem;
	}

	.hcs-content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(6px, 1.2vw, 10px);
		width: 100%;
		flex: 1 1 auto;
		min-height: inherit;
		padding: clamp(10px, 2vw, 14px);
		box-sizing: border-box;
	}

	.hcs-card--has-telemetry .hcs-content {
		min-height: 0;
		padding-bottom: clamp(6px, 1.2vw, 10px);
	}

	.hcs-telemetry-foot {
		position: relative;
		z-index: 15;
		flex-shrink: 0;
		width: 100%;
		border-top: 1px solid color-mix(in srgb, var(--hcs-accent, #14b8a6) 18%, transparent);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, #010409 18%, transparent),
			color-mix(in srgb, #010409 92%, transparent)
		);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--hcs-accent, #14b8a6) 10%, transparent);
	}

	.hcs-edge::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--hcs-accent, #14b8a6) 35%, transparent),
			inset 0 0 24px color-mix(in srgb, var(--hcs-accent, #14b8a6) 18%, transparent),
			0 0 32px color-mix(in srgb, var(--hcs-accent, #14b8a6) 16%, transparent);
		pointer-events: none;
	}

	.hcs-edge {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		z-index: 2;
	}

	.hcs-foil {
		position: absolute;
		inset: 0;
		mix-blend-mode: overlay;
		pointer-events: none;
		/* Below .hcs-content (z-index 10) so portrait + arc labels stay readable */
		z-index: 4;
	}

	.hcs-scanlines {
		position: absolute;
		inset: 0;
		opacity: 0.06;
		pointer-events: none;
		z-index: 1;
		background-image: repeating-linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.5) 0,
			rgba(255, 255, 255, 0.5) 1px,
			transparent 1px,
			transparent 4px
		);
	}

	:global(.player-hud-root[data-dopamine='off']) .hcs-card,
	:global(.pd-chrome-root[data-dopamine='off']) .hcs-card {
		transform: none !important;
		transition: none !important;
	}

	@media (prefers-reduced-motion: reduce) {
		.hcs-card {
			transform: none !important;
			transition: none !important;
		}
	}
</style>
