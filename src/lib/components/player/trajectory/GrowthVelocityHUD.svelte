<script lang="ts">
	import type { GviTier } from '$lib/types/trajectory.js';

	interface Props {
		gvi: number | null;
		gviTier: GviTier;
		gviLabel: string;
		gviFormatted: string;
		currentMonthXp: number;
		lastMonthXp: number;
		monthsActive: number;
		loading: boolean;
		dossierMode?: boolean;
	}

	let {
		gvi,
		gviTier,
		gviLabel,
		gviFormatted,
		currentMonthXp,
		lastMonthXp,
		monthsActive,
		loading,
		dossierMode = false,
	}: Props = $props();

	// Sparkline bar calculations
	const totalXp = $derived(currentMonthXp + lastMonthXp);
	const lastPct = $derived(totalXp > 0 ? Math.round((lastMonthXp / totalXp) * 100) : 50);
	const currPct = $derived(totalXp > 0 ? 100 - lastPct : 50);

	// Tier-based styling
	const tierConfig = $derived.by(() => {
		switch (gviTier) {
			case 'BREAKOUT':
				return {
					badgeBg: 'tw-bg-emerald-500/15',
					badgeBorder: 'tw-border-emerald-500/40',
					badgeText: 'tw-text-emerald-400',
					glow: 'tw-shadow-[0_0_20px_rgba(52,211,153,0.2)]',
					barCurrent: 'tw-bg-emerald-400',
					barCurrentGlow: 'tw-shadow-[0_0_6px_rgba(52,211,153,0.7)]',
					valueColor: 'tw-text-emerald-400',
				};
			case 'CLIMBING':
				return {
					badgeBg: 'tw-bg-[#14b8a6]/10',
					badgeBorder: 'tw-border-[#14b8a6]/30',
					badgeText: 'tw-text-[#14b8a6]',
					glow: 'tw-shadow-[0_0_20px_rgba(20, 184, 166,0.12)]',
					barCurrent: 'tw-bg-[#14b8a6]',
					barCurrentGlow: 'tw-shadow-[0_0_6px_rgba(20, 184, 166,0.7)]',
					valueColor: 'tw-text-[#14b8a6]',
				};
			case 'PLATEAU':
				return {
					badgeBg: 'tw-bg-amber-500/10',
					badgeBorder: 'tw-border-amber-500/30',
					badgeText: 'tw-text-amber-400',
					glow: 'tw-shadow-[0_0_20px_rgba(251,191,36,0.1)]',
					barCurrent: 'tw-bg-amber-400',
					barCurrentGlow: 'tw-shadow-[0_0_6px_rgba(251,191,36,0.5)]',
					valueColor: 'tw-text-amber-400',
				};
			case 'IGNITING':
			default:
				return {
					badgeBg: dossierMode ? 'tw-bg-[color-mix(in_srgb,var(--pd-panel,#05050a)_92%,#fff)]' : 'tw-bg-slate-700/30',
					badgeBorder: dossierMode ? 'tw-border-[color-mix(in_srgb,var(--pd-line,rgba(255,255,255,0.1))_100%,transparent)]' : 'tw-border-slate-600/30',
					badgeText: dossierMode ? 'tw-text-[var(--pd-text-muted,rgba(255,255,255,0.5))]' : 'tw-text-slate-400',
					glow: '',
					barCurrent: dossierMode ? 'tw-bg-[var(--pd-text-muted,rgba(255,255,255,0.35))]' : 'tw-bg-slate-500',
					barCurrentGlow: '',
					valueColor: dossierMode ? 'tw-text-[var(--pd-text-muted,rgba(255,255,255,0.5))]' : 'tw-text-slate-300',
				};
		}
	});
</script>

<div
	class="gvi-root tw-relative tw-flex tw-flex-col tw-rounded-2xl tw-overflow-hidden {dossierMode
		? 'pd-glass-panel'
		: 'tw-border tw-border-[#14b8a6]/15 tw-bg-[linear-gradient(165deg,rgba(20, 184, 166,0.06)_0%,rgba(5,5,10,0.92)_45%,rgba(0,0,0,0.55)_100%)]'} {tierConfig.glow}"
	style="padding: clamp(0.75rem, 2vw, 1.25rem); gap: clamp(0.5rem, 1.5vw, 0.75rem);"
>
	<!-- Ambient top glow -->
	{#if !dossierMode}
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-bg-[radial-gradient(ellipse_70%_35%_at_50%_0%,rgba(20, 184, 166,0.04)_0%,transparent_70%)]"
		aria-hidden="true"
	></div>
	{/if}

	{#if loading}
		<!-- Loading skeleton state -->
		<div class="tw-flex tw-flex-col tw-gap-3 tw-animate-pulse">
			<div class="tw-h-2 tw-w-32 tw-rounded tw-bg-white/10"></div>
			<div class="tw-h-10 tw-w-24 tw-rounded-lg tw-bg-white/10"></div>
			<div class="tw-h-2 tw-w-full tw-rounded tw-bg-white/10"></div>
			<div class="tw-flex tw-justify-between">
				<div class="tw-h-2 tw-w-20 tw-rounded tw-bg-white/10"></div>
				<div class="tw-h-2 tw-w-10 tw-rounded tw-bg-white/10"></div>
			</div>
		</div>
	{:else}
		<!-- Eyebrow -->
		<div class="tw-relative tw-flex tw-items-center tw-justify-between">
			<span
				class="tw-font-mono tw-tracking-widest tw-uppercase {dossierMode
					? 'tw-text-[var(--pd-accent-data-bright,rgba(0,212,255,0.55))]'
					: 'tw-text-[#14b8a6]/60'}"
				style="font-size: clamp(7px, 0.9vw, 10px);"
			>
				[ GROWTH VELOCITY INDEX ]
			</span>
			<!-- Tier badge -->
			<span
				class="tw-font-mono tw-tracking-widest tw-uppercase tw-rounded-md tw-border {tierConfig.badgeBg} {tierConfig.badgeBorder} {tierConfig.badgeText} tw-leading-none"
				style="font-size: clamp(7px, 0.85vw, 9px); padding: 2px clamp(4px, 0.8vw, 6px);"
			>
				{gviTier}
			</span>
		</div>

		<!-- GVI value — tachometer display -->
		<div class="tw-relative tw-flex tw-flex-col tw-gap-0.5">
			{#if gviTier === 'IGNITING'}
				<span
					class="tw-font-mono tw-font-bold tw-text-slate-500 tw-leading-none"
					style="font-size: clamp(1.5rem, 4vw, 2.5rem);"
				>
					—
				</span>
				<span
					class="tw-font-mono tw-tracking-wide tw-text-slate-500 tw-uppercase"
					style="font-size: clamp(7px, 0.9vw, 9px);"
				>
					COLLECTING BASELINE…
				</span>
			{:else}
				<span
					class="tw-font-mono tw-font-bold {tierConfig.valueColor} tw-leading-none tw-tabular-nums tw-drop-shadow-[0_0_12px_currentColor]"
					style="font-size: clamp(1.75rem, 4.5vw, 3rem);"
				>
					{gviFormatted}
				</span>
				<span
					class="tw-font-mono tw-tracking-wide tw-text-white/40 tw-uppercase"
					style="font-size: clamp(7px, 0.9vw, 9px);"
				>
					{gviLabel}
				</span>
			{/if}
		</div>

		<!-- Sparkline bar: last month vs current month -->
		<div class="tw-flex tw-flex-col tw-gap-1.5">
			<div class="tw-flex tw-items-center tw-justify-between">
				<span
					class="tw-font-mono tw-tracking-widest tw-text-white/30 tw-uppercase"
					style="font-size: clamp(7px, 0.85vw, 9px);"
				>
					LAST MO
				</span>
				<span
					class="tw-font-mono tw-tracking-widest tw-text-white/30 tw-uppercase"
					style="font-size: clamp(7px, 0.85vw, 9px);"
				>
					THIS MO
				</span>
			</div>
			<div class="tw-relative tw-flex tw-h-2 tw-rounded-full tw-overflow-hidden tw-bg-white/5">
				<!-- Last month segment -->
				<div
					class="tw-h-full tw-bg-white/20 tw-transition-all tw-duration-700"
					style="width: {lastPct}%;"
				></div>
				<!-- Divider -->
				<div class="tw-w-px tw-h-full tw-bg-[#020202]" aria-hidden="true"></div>
				<!-- Current month segment -->
				<div
					class="tw-h-full {tierConfig.barCurrent} {tierConfig.barCurrentGlow} tw-transition-all tw-duration-700"
					style="width: {currPct}%;"
				></div>
			</div>
			<div class="tw-flex tw-items-center tw-justify-between">
				<span
					class="tw-font-mono tw-tabular-nums tw-text-white/30"
					style="font-size: clamp(7px, 0.85vw, 9px);"
				>
					{lastMonthXp.toLocaleString()} XP
				</span>
				<span
					class="tw-font-mono tw-tabular-nums {tierConfig.valueColor}"
					style="font-size: clamp(7px, 0.85vw, 9px);"
				>
					{currentMonthXp.toLocaleString()} XP
				</span>
			</div>
		</div>

		<!-- Footer: months active counter -->
		<div class="tw-relative tw-flex tw-items-end tw-justify-between tw-mt-auto">
			<div class="tw-flex tw-items-center tw-gap-1.5">
				<span
					class="tw-inline-block tw-w-1.5 tw-h-1.5 tw-rounded-full {gviTier !== 'IGNITING'
						? 'tw-bg-[#14b8a6] tw-animate-pulse tw-shadow-[0_0_4px_rgba(20, 184, 166,0.8)]'
						: 'tw-bg-slate-600'}"
					aria-hidden="true"
				></span>
				<span
					class="tw-font-mono tw-tracking-wider tw-text-white/30 tw-uppercase"
					style="font-size: clamp(7px, 0.85vw, 9px);"
				>
					LIVE
				</span>
			</div>
			<div class="tw-flex tw-flex-col tw-items-end">
				<span
					class="tw-font-mono tw-font-bold tw-tabular-nums tw-text-white/50"
					style="font-size: clamp(0.9rem, 2vw, 1.1rem);"
				>
					{monthsActive}
				</span>
				<span
					class="tw-font-mono tw-tracking-widest tw-text-white/20 tw-uppercase"
					style="font-size: clamp(6px, 0.8vw, 8px);"
				>
					MOS ACTIVE
				</span>
			</div>
		</div>
	{/if}
</div>
