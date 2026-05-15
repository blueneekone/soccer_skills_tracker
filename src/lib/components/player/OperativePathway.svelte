<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** Battle-pass ladder length (inclusive). */
	const PATHWAY_MAX = 50;

	/**
	 * Player's current operative level (from XP curve).
	 * @type {{ level?: number }}
	 */
	let { level = 1 } = $props();

	const playerLevel = $derived(Math.max(1, Math.floor(Number(level) || 1)));

	const tiers = $derived(
		Array.from({ length: PATHWAY_MAX }, (_, i) => i + 1),
	);

	/**
	 * @param {number} tier
	 * @returns {'unlocked' | 'current' | 'locked'}
	 */
	function tierState(tier) {
		const L = playerLevel;
		if (L > tier) return 'unlocked';
		if (L === tier) return 'current';
		return 'locked';
	}

	/**
	 * Reward glyph inside each node (placeholder economy — pack / gear / spotlight tiers).
	 * @param {number} tier
	 */
	function rewardIconClass(tier: number): IconName {
		if (tier === 5) return 'game.sparkles';
		if (tier === 7) return 'game.sparkles';
		if (tier === 10) return 'game.star';
		if (tier === 25 || tier === 50) return 'game.trophy';
		if (tier % 15 === 0) return 'game.medal';
		if (tier % 5 === 0) return 'game.sparkles';
		return 'game.sparkles';
	}

	/**
	 * @param {number} tier
	 */
	function tierLabel(tier) {
		const s = tierState(tier);
		if (s === 'unlocked') return `Level ${tier}, cleared`;
		if (s === 'current') return `Level ${tier}, current objective`;
		return `Level ${tier}, locked`;
	}
</script>

<div class="opp-root tw-w-full tw-min-w-0" data-region="operative-pathway">
	<p class="opp-hud opp-mono tw-mb-3 tw-text-[0.65rem] tw-text-slate-500">
		Scroll · <span class="tw-text-cyan-400/90">LV {String(playerLevel).padStart(2, '0')}</span> /
		{PATHWAY_MAX}
	</p>
	<ul
		class="opp-track tw-m-0 tw-flex tw-list-none tw-gap-4 tw-overflow-x-auto tw-pb-4 tw-pl-1 tw-pr-6 tw-snap-x tw-snap-mandatory [-webkit-overflow-scrolling:touch] tw-scroll-pl-1 sm:tw-scroll-pl-2 sm:tw-pl-2"
		aria-label={`Mission rewards pathway, levels 1 through ${PATHWAY_MAX}`}
	>
		{#each tiers as tier (tier)}
			{@const state = tierState(tier)}
			<li
				class="opp-node opp-mono tw-flex tw-min-w-[120px] tw-snap-start tw-flex-col tw-items-center tw-rounded-xl tw-border tw-p-4 tw-transition-[transform,box-shadow,opacity,border-color] tw-duration-200 tw-shrink-0 {state ===
				'unlocked' ?
					'tw-bg-slate-800 tw-border-emerald-500/30 tw-opacity-50'
				: state === 'current' ?
					'tw-relative tw-z-[2] tw-scale-110 tw-bg-slate-900 tw-border-cyan-400 tw-opacity-100 tw-shadow-[0_0_15px_rgba(20, 184, 166,0.4)]'
				:	'tw-bg-slate-900/40 tw-border-white/5 tw-opacity-80'}"
				aria-label={tierLabel(tier)}
			>
				<span class="tw-mb-2 tw-text-[0.62rem] tw-font-black tw-tabular-nums tw-tracking-wider tw-text-slate-400">
					LVL {tier}
				</span>

				<div
					class="tw-mb-3 tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/30"
					aria-hidden="true"
				>
				<Icon name={rewardIconClass(tier)} size={24} class="tw-text-cyan-300/85" aria-hidden="true" />
				</div>

				{#if state === 'unlocked'}
					<Icon name={"status.verified" as IconName} size={20} class="tw-text-emerald-400/90" aria-hidden="true" />
					<span class="tw-sr-only">Cleared</span>
				{:else if state === 'current'}
					<span class="tw-text-[0.55rem] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-300">
						NOW
					</span>
				{:else}
					<Icon name={"sys.lock-simple" as IconName} size={20} class="tw-text-slate-600" aria-hidden="true" />
					<span class="tw-sr-only">Locked</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.opp-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	/* Thin scrollbar — Chromium / Firefox */
	.opp-track {
		scrollbar-width: thin;
		scrollbar-color: rgba(20, 184, 166, 0.35) rgba(15, 23, 42, 0.6);
	}

	.opp-track::-webkit-scrollbar {
		height: 6px;
	}

	.opp-track::-webkit-scrollbar-track {
		background: rgba(15, 23, 42, 0.65);
		border-radius: 999px;
	}

	.opp-track::-webkit-scrollbar-thumb {
		background: rgba(20, 184, 166, 0.35);
		border-radius: 999px;
	}
</style>
