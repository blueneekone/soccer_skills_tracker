<script lang="ts">
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import HudMiniRing from '$lib/components/player/HudMiniRing.svelte';
	import UidAvatar from '$lib/components/player/UidAvatar.svelte';
	import { formatCompactXp, streakRingFill } from '$lib/player/dashboard/playerHudMetrics.js';
	import '$lib/styles/player-dashboard-hud.css';

	let {
		uid = '',
		displayName = 'Athlete',
		teamLabel = '',
		rankName = '',
		level = 1,
		totalXp = 0,
		currentStreak = 0,
		longestStreak = 0,
		xpInTier = 0,
		xpToNextRank = 0,
		profileIncomplete = false,
		onProfileSetup,
	}: {
		uid?: string;
		displayName?: string;
		teamLabel?: string;
		rankName?: string;
		level?: number;
		totalXp?: number;
		currentStreak?: number;
		longestStreak?: number;
		xpInTier?: number;
		xpToNextRank?: number;
		profileIncomplete?: boolean;
		onProfileSetup?: () => void;
	} = $props();

	const xpLabel = $derived(formatCompactXp(totalXp));
	const streakFill = $derived(streakRingFill(currentStreak));
	const tierFill = $derived.by(() => {
		const d = xpInTier + xpToNextRank;
		if (d <= 0) return 0;
		return Math.min(1, Math.max(0, xpInTier / d));
	});
</script>

<header class="player-hud-root player-hud-header" aria-label="Player combat HUD">
	<div class="player-hud-header__lead">
		<UidAvatar seed={uid || displayName} size={64} alt="" class="player-hud-header__avatar" />
		<div class="player-hud-header__identity">
			<p class="player-hud-header__name" title={displayName}>{displayName}</p>
			<p class="player-hud-header__meta" title={teamLabel || 'No team'}>
				{teamLabel || 'No team'} · {rankName}
			</p>
			{#if profileIncomplete && onProfileSetup}
				<button type="button" class="player-hud-header__setup" onclick={onProfileSetup}>
					Finish profile setup
				</button>
			{/if}
		</div>
	</div>
	<div class="player-hud-header__rings" aria-label="XP and streak progress">
		<div class="player-hud-header__ring-wrap" aria-label="Level and XP">
			<LevelProgressRing
				currentXp={xpInTier}
				nextRankXp={xpToNextRank}
				rankName={rankName}
				totalXp={totalXp}
				level={level}
				size="md"
				variant="dark"
			/>
		</div>
		<HudMiniRing
			fill={streakFill}
			label="Streak"
			value="{currentStreak}d"
			subLabel="Best {longestStreak}d"
			strokeColor="var(--color-accent, #fbbf24)"
			size={56}
		/>
		<HudMiniRing
			fill={tierFill}
			label="Tier"
			value={xpLabel}
			subLabel="Career XP"
			size={56}
		/>
	</div>
</header>

<style>
	.player-hud-header__setup {
		margin: 0.35rem 0 0;
		padding: 0;
		border: none;
		background: none;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-accent, #fbbf24);
		cursor: pointer;
		text-align: left;
	}

	.player-hud-header__setup:hover {
		text-decoration: underline;
	}

	.player-hud-header__setup:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-accent, #fbbf24) 55%, transparent);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.player-hud-header__ring-wrap {
		width: 52px;
		height: 52px;
		overflow: visible;
		flex-shrink: 0;
	}

	.player-hud-header__ring-wrap :global(.lp-ring) {
		transform: scale(0.375);
		transform-origin: top left;
		width: 128px;
		height: 128px;
	}

	@media (min-width: 640px) {
		.player-hud-header__ring-wrap {
			width: 58px;
			height: 58px;
		}

		.player-hud-header__ring-wrap :global(.lp-ring) {
			transform: scale(0.453125);
		}
	}

	@media (max-width: 480px) {
		.player-hud-header {
			flex-wrap: wrap;
		}

		.player-hud-header__rings {
			width: 100%;
			justify-content: flex-start;
			padding-inline-end: 0;
		}
	}
</style>
