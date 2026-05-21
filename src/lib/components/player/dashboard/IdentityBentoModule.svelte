<script lang="ts">
	import HudAvatarRing from '$lib/components/player/HudAvatarRing.svelte';
	import HudStatCell from '$lib/components/player/dashboard/HudStatCell.svelte';
	import { formatCompactXp } from '$lib/player/dashboard/playerHudMetrics.js';
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
	} = $props();

	const xpLabel = $derived(formatCompactXp(totalXp));
	const ringSeed = $derived(uid || displayName || 'player');
	const levelXpFill = $derived.by(() => {
		const d = xpInTier + xpToNextRank;
		if (d <= 0) return 1;
		return Math.min(1, Math.max(0, xpInTier / d));
	});
</script>

<div
	class="ibm-root"
	class:ibm-root--embedded={embedded}
	class:ibm-streak-at-risk={currentStreak > 0}
	data-streak-active={currentStreak > 0 ? 'true' : undefined}
	aria-label="Player identity"
>
	<div class="ibm-avatar">
		<HudAvatarRing
			seed={ringSeed}
			size={72}
			{level}
			xpFill={levelXpFill}
			strokeColor="var(--color-accent, #fbbf24)"
			{embedded}
		/>
	</div>

	<div class="ibm-rings">
		<div class="ibm-identity">
			<p class="ibm-name" title={displayName}>{displayName}</p>
			<p class="ibm-meta">{teamLabel || 'No team'} · {rankName}</p>
		</div>

		<div class="ibm-metrics">
			<HudStatCell
				label="STREAK"
				value="{currentStreak}d"
				variant="streak"
				title="Best {longestStreak}d streak"
			/>
			<HudStatCell label="XP" value={xpLabel} variant="xp" title="Career XP" />
		</div>

		{#if profileIncomplete && onProfileSetup}
			<div class="ibm-actions">
				<button type="button" class="ibm-cta ibm-cta--setup" onclick={onProfileSetup}>
					FINISH PROFILE SETUP
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.ibm-root {
		--player-hud-avatar-size: clamp(52px, 12vw, 72px);
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--player-hud-gap, clamp(10px, 2vw, 16px));
		padding: var(--player-hud-pad, clamp(10px, 2vw, 16px));
		border: 1px solid #334155;
		background: rgba(2, 2, 2, 0.7);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: none;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.ibm-root--embedded {
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		border: none;
		padding: 0;
	}

	.ibm-avatar {
		aspect-ratio: 1 / 1;
		position: relative;
		width: var(--player-hud-avatar-size, clamp(52px, 12vw, 72px));
		flex-shrink: 0;
	}

	.ibm-avatar > :global(*) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.ibm-rings {
		display: flex;
		flex-direction: column;
		gap: var(--player-hud-gap, clamp(4px, 1vw, 8px));
		justify-content: center;
		min-width: 0;
	}

	.ibm-identity {
		min-width: 0;
	}

	.ibm-name {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.82rem, 2vw, 1rem);
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vanguard-text-1, #f8fafc);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ibm-meta {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.48rem, 1vw, 0.58rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: color-mix(in srgb, var(--color-structural) 70%, #94a3b8);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ibm-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(6px, 1.2vw, 10px);
		align-items: stretch;
	}

	.ibm-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: clamp(6px, 1.2vw, 10px);
	}

	@media (max-width: 480px) {
		.ibm-root {
			grid-template-columns: 1fr;
		}
	}
</style>
