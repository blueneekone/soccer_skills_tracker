<script lang="ts">
	import HudAvatarRing from '$lib/components/player/HudAvatarRing.svelte';
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatCompactXp, streakRingFill } from '$lib/player/dashboard/playerHudMetrics.js';
	import '$lib/styles/player-dashboard-hud.css';

	let {
		embedded = false,
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
		onOpenCommandCenter,
	}: {
		embedded?: boolean;
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
		onOpenCommandCenter?: () => void;
	} = $props();

	const xpLabel = $derived(formatCompactXp(totalXp));
	const streakFill = $derived(streakRingFill(currentStreak));
	const ringSeed = $derived(uid || displayName || 'player');

	const levelXpFill = $derived.by(() => {
		const d = xpInTier + xpToNextRank;
		if (d <= 0) return 1;
		return Math.min(1, Math.max(0, xpInTier / d));
	});
</script>

<header
	class="player-hud-header"
	class:player-hud-header--standalone={!embedded}
	class:player-hud-header--embedded={embedded}
	aria-label="Player combat HUD"
>
	<div class="player-hud-header__lead">
		<div class="player-hud-avatar-bento">
			<HudAvatarRing
				seed={ringSeed}
				size={72}
				level={level}
				xpFill={levelXpFill}
				strokeColor="var(--color-accent, #fbbf24)"
				{embedded}
			/>
		</div>
		<div class="player-hud-header__identity">
			<div class="player-hud-header__title-row">
				<div class="player-hud-header__title-block">
					<p class="player-hud-header__name" title={displayName}>{displayName}</p>
					<p class="player-hud-header__meta" title={teamLabel || 'No team'}>
						{teamLabel || 'No team'} · {rankName}
					</p>
				</div>
				<div class="player-hud-header__pills" aria-label="Streak and career XP">
					<span class="player-hud-pill player-hud-pill--streak" title="Best {longestStreak} day streak">
						<HudSeededRingCanvas
							uid={ringSeed}
							size={28}
							fill={streakFill}
							strokeColor="var(--color-accent, #fbbf24)"
							value={String(currentStreak)}
							showCenter={true}
						/>
						<span class="player-hud-pill__stack">
							<span class="player-hud-pill__label">Streak</span>
							<span class="player-hud-pill__value">{currentStreak}d</span>
						</span>
					</span>
					<span class="player-hud-pill player-hud-pill--xp" title="Career XP">
						<span class="player-hud-pill__label">XP</span>
						<span class="player-hud-pill__value">{xpLabel}</span>
					</span>
				</div>
			</div>
			{#if profileIncomplete && onProfileSetup}
				<button type="button" class="player-hud-header__setup" onclick={onProfileSetup}>
					Finish profile setup
				</button>
			{/if}
			{#if onOpenCommandCenter}
				<button
					type="button"
					class="cmd-center-trigger"
					onclick={onOpenCommandCenter}
					aria-label="Open command center"
				>
					<Icon name="sys.grid" size={18} />
				</button>
			{/if}
		</div>
	</div>
</header>

<style>
	.player-hud-header--standalone {
		display: flex;
		align-items: center;
		gap: clamp(12px, 3vw, 20px);
		width: 100%;
		max-width: 72rem;
		margin-inline: auto;
		padding: clamp(12px, 2.5vw, 20px);
		box-sizing: border-box;
		background: rgba(5, 10, 16, 0.95);
		clip-path: polygon(
			0 16px,
			16px 0,
			calc(100% - 16px) 0,
			100% 16px,
			100% calc(100% - 16px),
			calc(100% - 16px) 100%,
			16px 100%,
			0 calc(100% - 16px)
		);
		border: 1px solid rgba(0, 255, 255, 0.15);
	}

	.player-hud-header--embedded {
		display: flex;
		align-items: flex-start;
		width: 100%;
		margin: 0;
		padding: 0;
		background: transparent !important;
		border: none !important;
		border-radius: 0 !important;
		box-shadow: none !important;
		backdrop-filter: none !important;
		-webkit-backdrop-filter: none !important;
	}

	.player-hud-header--embedded .player-hud-pill {
		background: transparent !important;
		border: none !important;
		border-radius: 0 !important;
		box-shadow: none !important;
		backdrop-filter: none !important;
		-webkit-backdrop-filter: none !important;
		padding: 0;
		gap: clamp(4px, 1vw, 6px);
	}

	.player-hud-header__lead {
		--player-hud-avatar-size: clamp(52px, 12vw, 72px);
	}

	.player-hud-avatar-bento {
		aspect-ratio: 1 / 1;
		padding: 0;
		flex-shrink: 0;
		width: var(--player-hud-avatar-size, clamp(52px, 12vw, 72px));
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.player-hud-header--embedded .player-hud-header__lead {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--player-hud-gap, clamp(10px, 2vw, 14px));
	}

	.player-hud-header--embedded :global(.player-hud-header__name),
	.player-hud-header--embedded :global(.player-hud-header__meta),
	.player-hud-header--embedded .player-hud-pill__label,
	.player-hud-header--embedded .player-hud-pill__value {
		font-family: 'Geist Mono', ui-monospace, monospace;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.player-hud-header__title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: clamp(8px, 2vw, 14px);
		min-width: 0;
	}

	.player-hud-header__title-block {
		min-width: 0;
		flex: 1 1 8rem;
	}

	.player-hud-header__pills {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: clamp(6px, 1.5vw, 10px);
		flex-shrink: 0;
	}

	.player-hud-pill {
		display: inline-flex;
		align-items: center;
		gap: clamp(6px, 1.2vw, 8px);
		padding: clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 10px);
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 28%, transparent);
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 55%, transparent);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.06),
			0 4px 16px rgba(0, 0, 0, 0.25);
	}

	.player-hud-pill--streak {
		border-color: color-mix(in srgb, var(--color-accent, #fbbf24) 35%, transparent);
	}

	.player-hud-pill--xp {
		border-color: color-mix(in srgb, var(--color-structural) 35%, transparent);
	}

	.player-hud-pill__stack {
		display: flex;
		flex-direction: column;
		gap: clamp(2px, 0.4vw, 4px);
		min-width: 0;
	}

	.player-hud-pill__label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.48rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 70%, #94a3b8);
	}

	.player-hud-pill--streak .player-hud-pill__label {
		color: color-mix(in srgb, var(--color-accent, #fbbf24) 80%, #fde68a);
	}

	.player-hud-pill--xp .player-hud-pill__label {
		color: color-mix(in srgb, var(--color-structural) 80%, #a5f3fc);
	}

	.player-hud-pill__value {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.72rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #ffffff;
		white-space: nowrap;
	}

	.player-hud-header__setup {
		margin: clamp(4px, 1vw, 6px) 0 0;
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

	@media (max-width: 520px) {
		.player-hud-header__title-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
