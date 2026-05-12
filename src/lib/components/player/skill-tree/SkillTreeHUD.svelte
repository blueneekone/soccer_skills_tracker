<script lang="ts">
	import type { SkillTreeEngine } from './SkillTreeEngine.svelte.js';
	import type { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';

	interface Props {
		engine: SkillTreeEngine;
		armory: ArmoryEngine;
	}

	let { engine, armory }: Props = $props();

	const detail = $derived(engine.selectedNodeDetail);
	const summaries = $derived(engine.branchSummaries);
	const tier = $derived(armory.currentTier);

	function statusLabel(state: 'locked' | 'unlocked' | 'mastered'): string {
		if (state === 'mastered') return 'MASTERED';
		if (state === 'unlocked') return 'UNLOCKED';
		return 'LOCKED';
	}

	function statusColor(state: 'locked' | 'unlocked' | 'mastered'): string {
		if (state === 'mastered') return '#f0a500';
		if (state === 'unlocked') return '#00f0ff';
		return '#4b5563';
	}
</script>

<!-- Root: pointer-events-none so snowflake interactions pass through -->
<div class="tw-absolute tw-inset-0 tw-pointer-events-none tw-z-10">

	<!-- ── Top strip: branch chips + tier badge ── -->
	<div class="tw-absolute tw-top-2 tw-left-2 tw-right-2 tw-flex tw-items-start tw-justify-between tw-gap-2">

		<!-- Branch summary chips -->
		<div class="tw-flex tw-flex-wrap tw-gap-1">
			{#each summaries as s (s.attr)}
				{@const isFocused = engine.focusedBranch === s.attr}
				{@const hasUnlocked = s.unlocked > 0}
				<button
					class="tw-pointer-events-auto tw-text-[10px] tw-font-black tw-tracking-[0.2em] tw-uppercase tw-font-mono tw-px-2 tw-py-1 tw-rounded tw-border tw-transition tw-bg-transparent tw-cursor-pointer"
					style:border-color={isFocused ? 'rgba(0,240,255,0.8)' : hasUnlocked ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.1)'}
					style:color={isFocused ? '#00f0ff' : hasUnlocked ? '#cffafe' : '#64748b'}
					style:box-shadow={isFocused ? '0 0 8px rgba(0,240,255,0.5)' : 'none'}
					onclick={() => engine.focusBranch(s.attr)}
				>
					{s.attr}&nbsp;·&nbsp;{s.unlocked}/{s.total}
				</button>
			{/each}
		</div>

		<!-- Tier badge -->
		<div
			class="tw-pointer-events-none tw-text-[10px] tw-font-black tw-tracking-[0.2em] tw-uppercase tw-font-mono tw-px-3 tw-py-1 tw-rounded tw-border tw-whitespace-nowrap tw-shrink-0"
			style:border-color={tier.accent}
			style:color={tier.accent}
			style:background="rgba(2,2,2,0.7)"
			style:box-shadow="0 0 10px {tier.accent}44"
		>
			[ {tier.label} ]
		</div>
	</div>

	<!-- ── Bottom: selected node detail panel ── -->
	{#if detail}
		<div
			class="tw-absolute tw-bottom-2 tw-left-2 tw-right-2 tw-pointer-events-none tw-rounded tw-border tw-p-3 tw-flex tw-flex-col tw-gap-2"
			style:background="rgba(2,2,2,0.82)"
			style:border-color="rgba(0,240,255,0.25)"
			style:backdrop-filter="blur(6px)"
		>
			<!-- Dismiss button -->
			<button
				class="tw-pointer-events-auto tw-absolute tw-top-2 tw-right-2 tw-text-[10px] tw-font-mono tw-tracking-widest tw-text-slate-400 hover:tw-text-cyan-300 tw-transition tw-bg-transparent tw-border-0 tw-cursor-pointer tw-px-1"
				onclick={() => engine.selectNode(null)}
				aria-label="Dismiss node detail"
			>
				✕
			</button>

			<!-- Node label + attribute -->
			<div class="tw-flex tw-flex-col tw-gap-0.5 tw-pr-5">
				<span
					class="tw-text-[13px] tw-font-black tw-tracking-widest tw-uppercase tw-font-mono"
					style:color="#00f0ff"
				>
					{detail.label}
				</span>
				<span class="tw-text-[9px] tw-font-mono tw-tracking-[0.18em] tw-uppercase tw-text-slate-500">
					{detail.attrLabel}
				</span>
			</div>

			<!-- Progress bar -->
			<div class="tw-flex tw-flex-col tw-gap-1">
				<div class="tw-relative tw-h-1.5 tw-w-full tw-rounded-full tw-overflow-visible" style:background="rgba(255,255,255,0.08)">
					<!-- Fill -->
					<div
						class="tw-absolute tw-top-0 tw-left-0 tw-h-full tw-rounded-full tw-transition-all tw-duration-300"
						style:width="{detail.progressPct}%"
						style:background="linear-gradient(90deg, rgba(0,240,255,0.6), #00f0ff)"
						style:box-shadow="0 0 6px #00f0ff88"
					></div>
					<!-- Threshold tick -->
					<div
						class="tw-absolute tw-top-[-3px] tw-h-[calc(100%+6px)] tw-w-px"
						style:left="{detail.threshold * 100}%"
						style:background="rgba(240,165,0,0.8)"
					></div>
				</div>
				<div class="tw-flex tw-justify-between tw-text-[8px] tw-font-mono tw-text-slate-600 tw-tracking-widest">
					<span>0</span>
					<span style:color="rgba(240,165,0,0.7)">↑ {Math.round(detail.threshold * 100)}%</span>
					<span>100</span>
				</div>
			</div>

			<!-- Status pill + description -->
			<div class="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
				<span
					class="tw-text-[9px] tw-font-black tw-tracking-[0.2em] tw-uppercase tw-font-mono tw-px-2 tw-py-0.5 tw-rounded tw-border"
					style:color={statusColor(detail.state)}
					style:border-color={statusColor(detail.state) + '66'}
					style:background={statusColor(detail.state) + '18'}
				>
					{statusLabel(detail.state)}
				</span>
				<span class="tw-text-[9px] tw-font-mono tw-text-slate-400 tw-leading-tight">
					{detail.description}
				</span>
			</div>

			<!-- Sprint 5.2 placeholder -->
			<div class="tw-text-[8px] tw-font-mono tw-tracking-[0.15em] tw-text-slate-700 tw-border-t tw-pt-1.5" style:border-color="rgba(255,255,255,0.06)">
				[ DRILL MAPPINGS · BACKEND SPRINT ]
			</div>
		</div>
	{/if}
</div>
