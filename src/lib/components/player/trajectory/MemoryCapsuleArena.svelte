<script lang="ts">
	import type { MemoryCapsuleDoc } from '$lib/types/trajectory.js';

	interface Props {
		capsule: MemoryCapsuleDoc;
		baselineDaysAgo: number;
		capsuleHeadline: string;
		dossierMode?: boolean;
	}

	let { capsule, baselineDaysAgo, capsuleHeadline, dossierMode = false }: Props = $props();

	const SCOUTS_SIX_KEYS = ['PAC', 'ACC', 'AGI', 'STM', 'POW', 'VAN'] as const;
	type MetricKey = (typeof SCOUTS_SIX_KEYS)[number];

	function parseMetric(val: string): number {
		return parseFloat(val) || 0;
	}

	function getDelta(key: MetricKey): number {
		const base = parseMetric(capsule.baselineSnapshot.scoutsSix[key]);
		const curr = parseMetric(capsule.currentSnapshot.scoutsSix[key]);
		return curr - base;
	}

	function deltaSymbol(delta: number): string {
		if (delta > 0) return '↑';
		if (delta < 0) return '↓';
		return '=';
	}

	function deltaClass(delta: number): string {
		if (delta > 0) return 'tw-text-emerald-400';
		if (delta < 0) return 'tw-text-orange-400';
		return 'tw-text-white/30';
	}

	const xpBarMax = $derived(
		Math.max(capsule.deltaSummary.xpGained, capsule.baselineSnapshot.totalXp / 10, 1)
	);
	const xpBarPct = $derived(
		Math.min(100, Math.round((capsule.deltaSummary.xpGained / xpBarMax) * 100))
	);
</script>

<article
	class="mc-arena tw-relative tw-w-full tw-rounded-3xl tw-overflow-hidden {dossierMode
		? 'mc-arena--dossier-premium pd-glass-panel'
		: 'tw-bg-[#020202]/80 tw-backdrop-blur-xl tw-border tw-border-[#14b8a6]/20 tw-shadow-[0_0_60px_rgba(20, 184, 166,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]'}"
	style="padding: clamp(1rem, 3vw, 2rem);"
>
	<!-- Ambient glow layer -->
	{#if !dossierMode}
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(20, 184, 166,0.05)_0%,transparent_70%)]"
		aria-hidden="true"
	></div>
	{/if}

	<!-- Header -->
	<header class="tw-relative tw-mb-6 tw-flex tw-flex-col tw-gap-2">
		<span
			class="tw-font-mono tw-tracking-widest tw-text-[#14b8a6] tw-uppercase tw-opacity-70"
			style="font-size: clamp(8px, 1vw, 10px);"
		>
			[ TIME-LAPSE MEMORY CAPSULE ]
		</span>
		<h2
			class="tw-text-white tw-font-semibold tw-leading-tight"
			style="font-size: clamp(1rem, 2.5vw, 1.5rem);"
		>
			{capsuleHeadline}
		</h2>
		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-w-8 tw-h-px tw-bg-[#14b8a6]/30"></span>
			<span
				class="tw-font-mono tw-tracking-widest tw-text-white/40 tw-uppercase"
				style="font-size: clamp(8px, 1vw, 10px);"
			>
				{capsule.deltaSummary.daySpan} DAY SPAN · CAPSULE {capsule.capsuleId}
			</span>
		</div>
	</header>

	<!-- Column Labels -->
	<div
		class="tw-grid tw-grid-cols-[1fr_auto_1fr] tw-gap-x-4 tw-mb-3"
		style="padding-inline: clamp(0.25rem, 1vw, 0.5rem);"
	>
		<span
			class="tw-font-mono tw-tracking-widest tw-text-white/40 tw-uppercase"
			style="font-size: clamp(8px, 1vw, 10px);"
		>
			BASELINE / {baselineDaysAgo} DAYS AGO
		</span>
		<span class="tw-w-6"></span>
		<span
			class="tw-font-mono tw-tracking-widest tw-text-[#14b8a6]/70 tw-uppercase tw-text-right"
			style="font-size: clamp(8px, 1vw, 10px);"
		>
			CURRENT / TODAY
		</span>
	</div>

	<!-- Scout's Six comparison grid -->
	<div
		class="tw-grid tw-grid-cols-1 tw-gap-px tw-bg-[#14b8a6]/5 tw-rounded-xl tw-overflow-hidden tw-border tw-border-[#14b8a6]/10"
	>
		{#each SCOUTS_SIX_KEYS as key (key)}
			{@const delta = getDelta(key)}
			{@const sym = deltaSymbol(delta)}
			{@const cls = deltaClass(delta)}
			<div
				class="tw-grid tw-grid-cols-[1fr_auto_1fr] tw-items-center tw-gap-x-4 tw-bg-[#020202]/60"
				style="padding: clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1.25rem);"
			>
				<!-- Baseline value -->
				<div class="tw-flex tw-items-center tw-gap-3">
					<span
						class="tw-font-mono tw-text-white/30 tw-uppercase tw-tracking-widest tw-shrink-0"
						style="font-size: clamp(8px, 1vw, 10px); width: 2.5ch;">{key}</span
					>
					<span
						class="tw-font-mono tw-text-white/60 tw-tabular-nums"
						style="font-size: clamp(0.75rem, 1.5vw, 0.9rem);"
					>
						{capsule.baselineSnapshot.scoutsSix[key]}
					</span>
				</div>

				<!-- Delta indicator -->
				<div class="tw-flex tw-flex-col tw-items-center tw-gap-0.5">
					<span
						class="tw-font-mono tw-font-bold tw-tabular-nums {cls}"
						style="font-size: clamp(0.75rem, 1.5vw, 0.9rem);"
					>
						{sym}
					</span>
					{#if delta !== 0}
						<span
							class="tw-font-mono tw-tabular-nums {cls} tw-opacity-70"
							style="font-size: clamp(7px, 0.9vw, 9px);"
						>
							{delta > 0 ? '+' : ''}{delta.toFixed(1)}
						</span>
					{/if}
				</div>

				<!-- Current value -->
				<div class="tw-flex tw-items-center tw-justify-end tw-gap-3">
					<span
						class="tw-font-mono tw-tabular-nums {delta > 0
							? 'tw-text-[#14b8a6]'
							: delta < 0
								? 'tw-text-orange-400'
								: 'tw-text-white/80'}"
						style="font-size: clamp(0.75rem, 1.5vw, 0.9rem);"
					>
						{capsule.currentSnapshot.scoutsSix[key]}
					</span>
					<span
						class="tw-font-mono tw-text-white/30 tw-uppercase tw-tracking-widest tw-shrink-0 tw-text-right"
						style="font-size: clamp(8px, 1vw, 10px); width: 2.5ch;">{key}</span
					>
				</div>
			</div>
		{/each}
	</div>

	<!-- Bottom stats row -->
	<footer
		class="tw-mt-5 tw-grid tw-grid-cols-3 tw-gap-3"
		style="padding-top: clamp(0.5rem, 1.5vw, 0.75rem);"
	>
		<!-- XP Gained bar -->
		<div
			class="tw-col-span-3 sm:tw-col-span-1 tw-flex tw-flex-col tw-gap-2 tw-bg-[#14b8a6]/5 tw-rounded-xl tw-border tw-border-[#14b8a6]/10"
			style="padding: clamp(0.5rem, 1.5vw, 0.75rem);"
		>
			<span
				class="tw-font-mono tw-tracking-widest tw-text-white/40 tw-uppercase"
				style="font-size: clamp(8px, 1vw, 10px);"
			>
				XP GAINED
			</span>
			<span
				class="tw-font-mono tw-font-bold tw-text-[#14b8a6] tw-tabular-nums"
				style="font-size: clamp(1rem, 2vw, 1.25rem);"
			>
				+{capsule.deltaSummary.xpGained.toLocaleString()}
			</span>
			<div class="tw-h-1 tw-w-full tw-rounded-full tw-bg-white/5 tw-overflow-hidden">
				<div
					class="tw-h-full tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_rgba(20, 184, 166,0.6)] tw-transition-all tw-duration-700"
					style="width: {xpBarPct}%;"
				></div>
			</div>
		</div>

		<!-- Level Delta -->
		<div
			class="tw-flex tw-flex-col tw-gap-1 tw-bg-[#14b8a6]/5 tw-rounded-xl tw-border tw-border-[#14b8a6]/10 tw-items-center tw-justify-center"
			style="padding: clamp(0.5rem, 1.5vw, 0.75rem);"
		>
			<span
				class="tw-font-mono tw-tracking-widest tw-text-white/40 tw-uppercase"
				style="font-size: clamp(8px, 1vw, 10px);"
			>
				LEVEL Δ
			</span>
			<span
				class="tw-font-mono tw-font-bold tw-tabular-nums {capsule.deltaSummary.levelDelta >= 0
					? 'tw-text-emerald-400'
					: 'tw-text-orange-400'}"
				style="font-size: clamp(1rem, 2vw, 1.25rem);"
			>
				{capsule.deltaSummary.levelDelta >= 0 ? '+' : ''}{capsule.deltaSummary.levelDelta}
			</span>
			<span
				class="tw-font-mono tw-text-white/30 tw-tabular-nums"
				style="font-size: clamp(8px, 1vw, 10px);"
			>
				LVL {capsule.baselineSnapshot.level} → {capsule.currentSnapshot.level}
			</span>
		</div>

		<!-- Streak Delta -->
		<div
			class="tw-flex tw-flex-col tw-gap-1 tw-bg-[#14b8a6]/5 tw-rounded-xl tw-border tw-border-[#14b8a6]/10 tw-items-center tw-justify-center"
			style="padding: clamp(0.5rem, 1.5vw, 0.75rem);"
		>
			<span
				class="tw-font-mono tw-tracking-widest tw-text-white/40 tw-uppercase"
				style="font-size: clamp(8px, 1vw, 10px);"
			>
				STREAK Δ
			</span>
			<span
				class="tw-font-mono tw-font-bold tw-tabular-nums {capsule.deltaSummary.streakDelta >= 0
					? 'tw-text-emerald-400'
					: 'tw-text-orange-400'}"
				style="font-size: clamp(1rem, 2vw, 1.25rem);"
			>
				{capsule.deltaSummary.streakDelta >= 0 ? '+' : ''}{capsule.deltaSummary.streakDelta}
			</span>
			<span
				class="tw-font-mono tw-text-white/30 tw-tabular-nums"
				style="font-size: clamp(8px, 1vw, 10px);"
			>
				{capsule.baselineSnapshot.streakDays}d → {capsule.currentSnapshot.streakDays}d
			</span>
		</div>
	</footer>
</article>
