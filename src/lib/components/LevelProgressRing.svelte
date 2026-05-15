<script>
	import { browser } from '$app/environment';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';

	/**
	 * @typedef {'dark' | 'light'} RingVariant
	 */

	/** @type {{
	 *   currentXp?: number;
	 *   nextRankXp?: number;
	 *   rankName?: string;
	 *   totalXp?: number;
	 *   level?: number;
	 *   variant?: RingVariant;
	 *   size?: 'md' | 'lg';
	 *   showLevelSegment?: boolean;
	 * }} */
	let {
		/** Progress XP within the current career rank (into tier; see `getCurrentRank`). */
		currentXp: currentXpProp = undefined,
		/** XP remaining until the next rank threshold. */
		nextRankXp: nextRankXpProp = undefined,
		/** Career rank label, e.g. `Operative` (parent may show alongside in uppercase). */
		rankName: rankNameProp = undefined,
		/** Lifetime total XP; used for legacy call sites, center readout, and `getCurrentRank` fallback. */
		totalXp: totalXpProp = 0,
		/** OS display level; if unset, derived from `totalXp` via the polynomial curve. */
		level: levelProp = 0,
		variant = /** @type {RingVariant} */ ('dark'),
		size = /** @type {'md' | 'lg'} */ ('md'),
		showLevelSegment = false,
	} = $props();

	const R = 54;
	const strokeW = 7;
	const c = 2 * Math.PI * R;
	const scale = $derived(size === 'lg' ? 1.35 : 1);
	const pixelSize = $derived(Math.round(128 * scale));

	const rankState = $derived.by(() => {
		const t = Math.max(0, Math.floor(Number(totalXpProp) || 0));
		const explicit =
			typeof currentXpProp === 'number' &&
			!Number.isNaN(currentXpProp) &&
			typeof nextRankXpProp === 'number' &&
			!Number.isNaN(nextRankXpProp);
		if (explicit) {
			const xIn = Math.max(0, Math.floor(/** @type {number} */ (currentXpProp)));
			const xTo = Math.max(0, Math.floor(/** @type {number} */ (nextRankXpProp)));
			const r0 = getCurrentRank(t);
			return {
				currentXp: xIn,
				nextRankXp: xTo,
				rankName: typeof rankNameProp === 'string' && rankNameProp.trim() ? rankNameProp.trim() : r0.rank,
				totalForDisplay: t,
				atMax: r0.atMaxRank,
			};
		}
		const r = getCurrentRank(t);
		return {
			currentXp: r.xpInCurrentTier,
			nextRankXp: r.xpToNextRank,
			rankName: r.rank,
			totalForDisplay: t,
			atMax: r.atMaxRank,
		};
	});

	const levelInfo = $derived(getLevelProgressFromTotalXp(rankState.totalForDisplay));
	const displayLevel = $derived(
		typeof levelProp === 'number' && levelProp > 0 ? levelProp : levelInfo.level,
	);

	/** 0..1: progress through the current rank tier. */
	const rankFill = $derived.by(() => {
		if (rankState.atMax) return 1;
		const a = rankState.currentXp;
		const b = rankState.nextRankXp;
		const d = a + b;
		if (d <= 0) return 0;
		return Math.min(1, Math.max(0, a / d));
	});

	/** 0–100% within current career rank (thermochromic ring). */
	const progressPercentage = $derived(
		Math.round(Math.min(1, Math.max(0, rankFill)) * 100),
	);

	/** @type {string} */
	const ringColor = $derived.by(() => {
		const p = progressPercentage;
		/** Cyan: high progress in tier. */
		if (p >= 67) return '#14b8a6';
		/** Amber: mid. */
		if (p >= 34) return '#f59e0b';
		/** Red: early tier progress. */
		return '#ef4444';
	});

	const segInto = $derived(levelInfo.xpIntoLevel);
	const segNeed = $derived(levelInfo.xpToNext);

	let ringProgress = $state(0);
	let countDisplay = $state(0);
	let ringInitialized = $state(false);

	$effect(() => {
		if (!browser) return;
		const target = rankFill;
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
		const target = Math.max(0, Math.floor(rankState.totalForDisplay));
		const start = countDisplay;
		const t0 = performance.now();
		const duration = 520;

		function easeOut(/** @type {number} */ t) {
			return 1 - Math.pow(1 - t, 3);
		}

		let rafId = 0;
		function tick(/** @type {number} */ now) {
			const u = Math.min(1, (now - t0) / duration);
			countDisplay = Math.floor(start + (target - start) * easeOut(u));
			if (u < 1) rafId = requestAnimationFrame(tick);
			else countDisplay = target;
		}
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	const dashOffset = $derived(c * (1 - Math.min(1, Math.max(0, ringProgress))));

	const a11yLabel = $derived(
		`Career rank ${rankState.rankName}. ${Math.round(Math.min(1, Math.max(0, rankFill)) * 100)} percent to next rank. ${countDisplay.toLocaleString()} total XP.`,
	);
</script>

<div
	class="lp-ring"
	class:lp-ring--light={variant === 'light'}
	class:lp-ring--lg={size === 'lg'}
	style="--ring-size:{pixelSize}px;"
	aria-label={a11yLabel}
>
	<svg
		class="lp-ring__svg"
		viewBox="0 0 128 128"
		width={pixelSize}
		height={pixelSize}
		role="img"
	>
		<circle class="lp-ring__track" cx="64" cy="64" r={R} fill="none" stroke-width={strokeW} />
		<circle
			class="lp-ring__fill tw-transition-colors tw-duration-1000"
			cx="64"
			cy="64"
			r={R}
			fill="none"
			stroke={ringColor}
			stroke-width={strokeW}
			stroke-linecap="round"
			stroke-dasharray={c}
			stroke-dashoffset={dashOffset}
			transform="rotate(-90 64 64)"
		/>
	</svg>
	<div class="lp-ring__center">
		<span class="lp-ring__level">Lv {displayLevel}</span>
		<span class="lp-ring__xp">{countDisplay.toLocaleString()}</span>
		<span class="lp-ring__xp-label">total XP</span>
		{#if showLevelSegment}
			<span class="lp-ring__seg">
				{segInto.toLocaleString()} / {segNeed.toLocaleString()} XP this level
			</span>
		{/if}
	</div>
</div>

<style>
	.lp-ring {
		position: relative;
		width: var(--ring-size, 128px);
		height: var(--ring-size, 128px);
		flex-shrink: 0;
		container-type: inline-size;
	}

	.lp-ring__svg {
		display: block;
		/* no drop-shadow: tactical, flat, SIEM */
	}

	.lp-ring__track {
		stroke: rgba(20, 184, 166, 0.18);
	}

	.lp-ring__fill {
		stroke: #14b8a6;
		transition: stroke-dashoffset 0.88s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.lp-ring--light .lp-ring__track {
		stroke: #cbd5e1;
	}

	.lp-ring__center {
		position: absolute;
		top: 50%;
		left: 50%;
		/* Inscribed square: √2/2 ≈ 70.7% of the ring diameter stays inside the stroke. */
		width: 70.7%;
		height: 70.7%;
		transform: translate(-50%, -50%);
		display: flex;
		min-width: 0;
		box-sizing: border-box;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		pointer-events: none;
		overflow: hidden;
	}

	.lp-ring__level {
		font-size: clamp(0.55rem, 1.6cqw, 0.72rem);
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(103, 232, 249, 0.92);
		margin-bottom: 2px;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lp-ring__xp {
		font-size: clamp(0.85rem, 2.6cqw, 1.15rem);
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #f8fafc;
		line-height: 1.1;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lp-ring__xp-label {
		font-size: clamp(0.5rem, 1.4cqw, 0.62rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(20, 184, 166, 0.55);
		margin-top: 2px;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lp-ring__seg {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		margin-top: 4px;
		font-size: clamp(0.55rem, 1.5cqw, 0.65rem);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: #14b8a6;
		line-height: 1.25;
		max-width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.lp-ring--light .lp-ring__level {
		color: #0e7490;
	}

	.lp-ring--light .lp-ring__xp {
		color: #0f172a;
	}

	.lp-ring--light .lp-ring__xp-label {
		color: #64748b;
	}

	.lp-ring--light .lp-ring__seg {
		color: #0891b2;
	}

	:global(html.dark) .lp-ring--light .lp-ring__track {
		stroke: rgba(20, 184, 166, 0.22);
	}

	:global(html.dark) .lp-ring--light .lp-ring__xp {
		color: #fafafa;
	}
</style>
