<script lang="ts">
	import { goto } from '$app/navigation';
	import type { SkillTreeEngine } from './SkillTreeEngine.svelte.js';
	import type { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
	import { scoutsSixToWorkoutFocus } from '$lib/data/skillTree/scoutsSixWorkoutBridge.js';

	interface Props {
		engine: SkillTreeEngine;
		armory: ArmoryEngine;
	}

	let { engine, armory }: Props = $props();

	const detail = $derived(engine.selectedNodeDetail);
	const summaries = $derived(engine.branchSummaries);
	const tier = $derived(armory.currentTier);

	/** True when the player is in the ROOKIE tier (Fog of War rank-gate active). */
	const isRookie = $derived(tier.id === 'ROOKIE');

	/**
	 * Per-branch revealed count: how many of the branch's nodes are currently
	 * visible (not fogged). Used to display "ATTR · revealed/total" in chips.
	 */
	const revealedCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const node of engine.nodes) {
			if (!counts[node.parentAttr]) counts[node.parentAttr] = 0;
			if (node.visible) counts[node.parentAttr]++;
		}
		return counts;
	});

	function statusLabel(state: 'locked' | 'unlocked' | 'mastered'): string {
		if (state === 'mastered') return 'MASTERED';
		if (state === 'unlocked') return 'UNLOCKED';
		return 'LOCKED';
	}

	function statusColor(state: 'locked' | 'unlocked' | 'mastered'): string {
		if (state === 'mastered') return '#f0a500';
		if (state === 'unlocked') return '#14b8a6';
		return '#4b5563';
	}

	function launchDrillForNode() {
		if (!detail || detail.state === 'locked') return;
		const focus = scoutsSixToWorkoutFocus(detail.parentAttr);
		const params = new URLSearchParams({ focus, skillNode: detail.id });
		void goto(`/player/workout?${params.toString()}`);
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
					style:border-color={isFocused ? 'rgba(20, 184, 166,0.8)' : hasUnlocked ? 'rgba(20, 184, 166,0.4)' : 'rgba(255,255,255,0.1)'}
					style:color={isFocused ? '#14b8a6' : hasUnlocked ? '#cffafe' : '#64748b'}
					style:box-shadow={isFocused ? '0 0 8px rgba(20, 184, 166,0.5)' : 'none'}
					onclick={() => engine.focusBranch(s.attr)}
				>
					{s.attr}&nbsp;·&nbsp;{s.unlocked}<span class="tw-text-[8px] tw-opacity-40">/</span>{revealedCounts[s.attr] ?? s.total}<span class="tw-text-[8px] tw-opacity-30">/{s.total}</span>
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
			style:border-color="rgba(20, 184, 166,0.25)"
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
					style:color="#14b8a6"
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
						style:background="linear-gradient(90deg, rgba(20, 184, 166,0.6), #14b8a6)"
						style:box-shadow="0 0 6px #14b8a688"
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

			<!-- Fog of War density hint -->
			<div class="tw-text-[8px] tw-font-mono tw-tracking-[0.15em] tw-border-t tw-pt-1.5" style:border-color="rgba(255,255,255,0.06)" style:color="rgba(157,0,255,0.45)">
				{#if isRookie}
					[ MIST DENSITY: HIGH · COMPLETE A RANK-1 NODE TO REVEAL ]
				{:else}
					[ MIST DENSITY: ADAPTIVE · UNLOCK PARENTS TO REVEAL ]
				{/if}
			</div>
			<div class="tw-flex tw-items-center tw-gap-2 tw-pt-0.5">
				{#if detail.state === 'locked'}
					<span class="tw-text-[8px] tw-font-mono tw-tracking-[0.15em] tw-text-slate-600">
						[ UNLOCK NODE TO LAUNCH TRAINING ]
					</span>
				{:else}
					<button
						type="button"
						class="tw-pointer-events-auto tw-text-[9px] tw-font-black tw-tracking-[0.18em] tw-uppercase tw-font-mono tw-px-2.5 tw-py-1 tw-rounded tw-border tw-cursor-pointer tw-transition"
						style:color="#14b8a6"
						style:border-color="rgba(20, 184, 166,0.55)"
						style:background="rgba(20, 184, 166,0.12)"
						onclick={launchDrillForNode}
					>
						Launch training
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
