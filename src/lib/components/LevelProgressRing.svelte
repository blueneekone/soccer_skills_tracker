<script>
	import { browser } from '$app/environment';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';

	/** Total XP (lifetime); progress within current level is derived. */
	let { totalXp = 0, level: levelProp = 0 } = $props();

	const R = 54;
	const strokeW = 7;
	const c = 2 * Math.PI * R;

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
</script>

<div class="xp-ring" aria-label="Level progress">
	<svg class="xp-ring__svg" viewBox="0 0 128 128" width="128" height="128">
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
</style>
