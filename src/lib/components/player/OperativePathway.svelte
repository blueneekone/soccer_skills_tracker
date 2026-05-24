<script lang="ts">
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** Battle-pass ladder length (inclusive). */
	const PATHWAY_MAX = 50;

	/**
	 * Player's current operative level (from XP curve).
	 * @type {{ level?: number; dossierMode?: boolean; compact?: boolean; maxVisible?: number; hideScrollHud?: boolean; scrollToCurrent?: boolean; hqTealCurrent?: boolean }}
	 */
	let {
		level = 1,
		dossierMode = false,
		compact = false,
		maxVisible = 3,
		hideScrollHud = false,
		scrollToCurrent = false,
		hqTealCurrent = false,
	} = $props();

	const playerLevel = $derived(Math.max(1, Math.floor(Number(level) || 1)));
	const tealCurrent = $derived(compact || hqTealCurrent);

	let trackEl: HTMLUListElement | undefined = $state();

	/**
	 * Returns the tier window for compact HQ preview (default 3 tiers).
	 * @param {number} L
	 */
	function compactTierWindow(L: number) {
		const span = Math.max(1, Math.floor(Number(maxVisible) || 3));
		if (span >= PATHWAY_MAX) {
			return Array.from({ length: PATHWAY_MAX }, (_, i) => i + 1);
		}
		if (L <= 1) {
			return Array.from({ length: span }, (_, i) => i + 1);
		}
		if (L >= PATHWAY_MAX - 1) {
			return Array.from({ length: span }, (_, i) => PATHWAY_MAX - span + 1 + i);
		}
		const start = L - Math.floor(span / 2);
		return Array.from({ length: span }, (_, i) => start + i);
	}

	const tiers = $derived(
		compact ?
			compactTierWindow(playerLevel)
		:	Array.from({ length: PATHWAY_MAX }, (_, i) => i + 1),
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

	/** Milestone tiers — gold edge accent on node ring (5, 10, 25, 50 + trophy tiers). */
	function isMilestoneTier(tier: number) {
		return tier === 5 || tier === 10 || tier === 25 || tier === 50 || tier % 15 === 0;
	}

	function centerCurrentTier() {
		if (!scrollToCurrent || !trackEl) return;

		const current = trackEl.querySelector<HTMLElement>('[data-opp-current="true"]');
		if (!current) return;

		const trackRect = trackEl.getBoundingClientRect();
		const nodeRect = current.getBoundingClientRect();
		const delta = nodeRect.left - trackRect.left - (trackRect.width - nodeRect.width) / 2;
		trackEl.scrollLeft += delta;
	}

	$effect(() => {
		if (!browser || !trackEl) return;

		void playerLevel;
		void tiers.length;

		tick().then(() => {
			requestAnimationFrame(() => {
				centerCurrentTier();
			});
		});
	});
</script>

<div
	class="opp-root tw-w-full tw-min-w-0"
	class:opp-root--compact={compact}
	class:opp-root--hq-current={hqTealCurrent}
	data-region="operative-pathway"
>
	{#if !compact && !hideScrollHud}
		<p class="opp-hud opp-mono tw-mb-3 tw-text-[0.65rem]" style="color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));">
			Scroll · <span style="color: var(--pd-accent-data, #14b8a6);">LV {String(playerLevel).padStart(2, '0')}</span> /
			{PATHWAY_MAX}
		</p>
	{/if}
	<div class="opp-track-shell">
		<ul
			bind:this={trackEl}
			class="opp-track tw-m-0 tw-list-none tw-py-2 {compact ?
				'tw-overflow-visible tw-pb-2 tw-pl-0 tw-pr-0'
			:	'tw-flex tw-gap-4 tw-overflow-x-auto tw-pb-4 tw-pl-1 tw-pr-6 tw-snap-x tw-snap-mandatory [-webkit-overflow-scrolling:touch] tw-scroll-pl-1 sm:tw-scroll-pl-2 sm:tw-pl-2'}"
			aria-label={compact ?
				`Pathway preview, levels ${tiers[0]} through ${tiers[tiers.length - 1]}`
			:	`Mission rewards pathway, levels 1 through ${PATHWAY_MAX}`}
		>
			{#each tiers as tier (tier)}
				{@const state = tierState(tier)}
				<li
					class="opp-node opp-node--edge opp-mono tw-flex tw-flex-col tw-items-center tw-border tw-transition-[box-shadow,opacity,border-color] tw-duration-200 {compact ?
						'tw-min-w-0 tw-w-full tw-p-3'
					:	'tw-min-w-[120px] tw-snap-start tw-shrink-0 tw-p-4 tw-relative tw-z-[1]'} {state ===
					'unlocked' ?
						dossierMode ?
							'opp-node--unlocked-dossier tw-opacity-50'
						:	'tw-bg-slate-800 tw-border-emerald-500/30 tw-opacity-50'
					: state === 'current' ?
						dossierMode ?
							'opp-node--current-dossier tw-relative tw-z-[2] tw-opacity-100'
						:	'tw-relative tw-z-[2] tw-bg-slate-900 tw-border-cyan-400 tw-opacity-100 tw-shadow-[0_0_15px_rgba(20, 184, 166,0.4)]'
					: dossierMode ?
						'opp-node--locked-dossier tw-opacity-80'
					:	'tw-bg-slate-900/40 tw-border-white/5 tw-opacity-80'}"
					class:opp-node--milestone={isMilestoneTier(tier)}
					aria-label={tierLabel(tier)}
					data-opp-current={state === 'current' ? 'true' : undefined}
				>
					<span class="tw-mb-2 tw-text-[0.62rem] tw-font-black tw-tabular-nums tw-tracking-wider" style="color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));">
						LVL {tier}
					</span>

					<div
						class="opp-node__reward-well tw-mb-3 tw-flex tw-items-center tw-justify-center {compact ?
							'tw-h-10 tw-w-10'
						:	'tw-h-12 tw-w-12'}"
						aria-hidden="true"
					>
						<Icon name={rewardIconClass(tier)} size={compact ? 20 : 24} style="color: var(--pd-accent-data, #14b8a6);" aria-hidden="true" />
					</div>

					{#if state === 'unlocked'}
						<Icon name={"status.verified" as IconName} size={20} class="tw-text-emerald-400/90" aria-hidden="true" />
						<span class="tw-sr-only">Cleared</span>
					{:else if state === 'current'}
						<span
							class="opp-active-label tw-text-[0.55rem] tw-font-bold tw-uppercase tw-tracking-[0.2em]"
							style="color: {tealCurrent ?
								'var(--pd-accent-data, #14b8a6)'
							:	'var(--pd-accent-action, #fbbf24)'};"
						>
							{tealCurrent ? 'ACTIVE' : 'NOW'}
						</span>
					{:else}
						<Icon name={"sys.lock-simple" as IconName} size={20} style="color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));" aria-hidden="true" />
						<span class="tw-sr-only">Locked</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	.opp-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	/* Thin scrollbar — Chromium / Firefox (void context overrides track in player-dashboard-hud.css) */
	.opp-track {
		position: relative;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, transparent) transparent;
	}

	.opp-track::-webkit-scrollbar {
		height: 6px;
	}

	.opp-track::-webkit-scrollbar-track {
		background: transparent;
		border-radius: 999px;
	}

	.opp-track::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, transparent);
		border-radius: 999px;
	}
</style>
