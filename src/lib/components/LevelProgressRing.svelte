<script>
	import { browser } from '$app/environment';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';

	/** Total XP (lifetime); progress within current level is derived. */
	let {
		totalXp = 0,
		level: levelProp = 0,
		/** Light theme for enterprise cards (#fff / #fafafa surfaces). */
		variant = 'dark',
		/** Larger ring for hero headers. */
		size = 'md',
		/** Show XP progress within the current level (into / needed for next). */
		showLevelSegment = false,
	} = $props();

	const R = 54;
	const strokeW = 7;
	const c = 2 * Math.PI * R;
	const scale = $derived(size === 'lg' ? 1.35 : 1);
	const pixelSize = $derived(Math.round(128 * scale));

	let ringProgress = $state(0);
	let countDisplay = $state(0);
	let ringInitialized = $state(false);

	const levelInfo = $derived(getLevelProgressFromTotalXp(totalXp));
	const displayLevel = $derived(
		levelProp > 0 ? levelProp : levelInfo.level
	);

	$effect(() => {
		if (!browser) return;
		const target = Math.min(1, Math.max(0, getLevelProgressFromTotalXp(totalXp).progress));
		if (!ringInitialized) {
			ringProgress = 0;
			const t = requestAnimationFrame(() => {
				ringProgress = target;
				ringInitialized = true;
			});
			return () => cancelAnimationFrame(t);
		}
		ringProgress = target;
	});

	$effect(() => {
		if (!browser) return;
		const target = Math.max(0, Math.floor(Number(totalXp) || 0));
		const start = countDisplay;
		const t0 = performance.now();
		const duration = 520;

		function easeOut(t) {
			return 1 - Math.pow(1 - t, 3);
		}

		let rafId = 0;
		function tick(now) {
			const u = Math.min(1, (now - t0) / duration);
			countDisplay = Math.floor(start + (target - start) * easeOut(u));
			if (u < 1) rafId = requestAnimationFrame(tick);
			else countDisplay = target;
		}
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	const dashOffset = $derived(c * (1 - ringProgress));

	const segInto = $derived(levelInfo.xpIntoLevel);
	const segNeed = $derived(levelInfo.xpToNext);
</script>

<div
	class="xp-ring"
	class:xp-ring--light={variant === 'light'}
	class:xp-ring--lg={size === 'lg'}
	style="width: {pixelSize}px; height: {pixelSize}px;"
	aria-label="Level progress"
>
	<svg
		class="xp-ring__svg"
		viewBox="0 0 128 128"
		width={pixelSize}
		height={pixelSize}
	>
		<circle class="xp-ring__track" cx="64" cy="64" r={R} fill="none" stroke-width={strokeW} />
		<circle
			class="xp-ring__fill"
			cx="64"
			cy="64"
			r={R}
			fill="none"
			stroke-width={strokeW}
			stroke-dasharray={c}
			stroke-dashoffset={dashOffset}
			transform="rotate(-90 64 64)"
		/>
	</svg>
	<div class="xp-ring__center">
		<span class="xp-ring__level">Lv {displayLevel}</span>
		<span class="xp-ring__xp">{countDisplay.toLocaleString()}</span>
		<span class="xp-ring__xp-label">total XP</span>
		{#if showLevelSegment}
			<span class="xp-ring__seg">
				{segInto.toLocaleString()} / {segNeed.toLocaleString()} XP this level
			</span>
		{/if}
	</div>
</div>

<style>
	.xp-ring {
		position: relative;
		width: 128px;
		height: 128px;
		flex-shrink: 0;
	}

	.xp-ring__svg {
		display: block;
		filter: drop-shadow(0 0 10px color-mix(in srgb, var(--pp-accent, var(--brand-primary)) 35%, transparent));
	}

	.xp-ring__track {
		stroke: rgba(30, 41, 59, 0.95);
	}

	.xp-ring__fill {
		stroke: var(--pp-accent, var(--brand-primary));
		stroke-linecap: round;
		transition: stroke-dashoffset 0.88s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.xp-ring__center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		pointer-events: none;
		padding: 8px;
	}

	.xp-ring__level {
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(203, 213, 225, 0.95);
		margin-bottom: 2px;
	}

	.xp-ring__xp {
		font-size: 1.15rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #f8fafc;
		line-height: 1.1;
	}

	.xp-ring__xp-label {
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgba(148, 163, 184, 0.95);
		margin-top: 2px;
	}

	.xp-ring__seg {
		display: block;
		margin-top: 6px;
		font-size: 0.65rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--brand-primary, #6366f1);
		line-height: 1.25;
		max-width: 7.5rem;
	}

	.xp-ring--light .xp-ring__svg {
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--brand-primary, #6366f1) 22%, transparent));
	}

	.xp-ring--light .xp-ring__track {
		stroke: #e5e5e5;
	}

	.xp-ring--light .xp-ring__level {
		color: var(--text-secondary, #737373);
	}

	.xp-ring--light .xp-ring__xp {
		color: var(--text-primary, #0a0a0a);
	}

	.xp-ring--light .xp-ring__xp-label {
		color: var(--text-secondary, #737373);
	}

	:global(html.dark) .xp-ring--light .xp-ring__track {
		stroke: rgba(255, 255, 255, 0.14);
	}

	:global(html.dark) .xp-ring--light .xp-ring__xp {
		color: #fafafa;
	}
</style>
