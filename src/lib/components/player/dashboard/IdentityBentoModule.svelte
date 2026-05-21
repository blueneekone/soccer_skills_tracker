<script lang="ts">
	import HudAvatarRing from '$lib/components/player/HudAvatarRing.svelte';
	import HudStatCell from '$lib/components/player/dashboard/HudStatCell.svelte';
	import {
		formatCompactXp,
		formatLastTrainingLabel,
	} from '$lib/player/dashboard/playerHudMetrics.js';
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
		nextRank = null,
		rankProgressPercent = 0,
		atMaxRank = false,
		lastTrainingUtc = null,
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
		nextRank?: string | null;
		rankProgressPercent?: number;
		atMaxRank?: boolean;
		lastTrainingUtc?: string | null;
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

	const rankBarPercent = $derived(
		Math.min(100, Math.max(0, Math.floor(Number(rankProgressPercent) || 0))),
	);
	const lastSessionLabel = $derived(formatLastTrainingLabel(lastTrainingUtc));
	const rankProgressLabel = $derived.by(() => {
		if (atMaxRank) {
			return rankName ? `${rankName} · MAX TIER` : 'MAX RANK';
		}
		if (nextRank) {
			return `${formatCompactXp(xpToNextRank)} XP TO ${nextRank}`;
		}
		return `${formatCompactXp(xpToNextRank)} XP TO NEXT RANK`;
	});

	const initials = $derived.by(() => {
		const name = displayName.trim();
		if (name && name !== '—' && name !== 'Athlete') {
			const parts = name.split(/\s+/).filter(Boolean);
			if (parts.length >= 2) {
				return (parts[0][0] + parts[1][0]).toUpperCase();
			}
			return name.slice(0, 2).toUpperCase();
		}
		return (uid || '??').slice(0, 2).toUpperCase();
	});
</script>

<div
	class="ibm-root"
	class:ibm-root--embedded={embedded}
	class:ibm-root--badge-only={profileIncomplete}
	class:ibm-streak-at-risk={currentStreak > 0}
	data-streak-active={currentStreak > 0 ? 'true' : undefined}
	aria-label="Player identity"
>
	{#if !profileIncomplete}
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
	{/if}

	<div class="ibm-rings">
		{#if profileIncomplete && onProfileSetup}
			<button type="button" class="ibm-profile-banner" onclick={onProfileSetup}>
				Complete operative profile →
			</button>
		{/if}
		<div class="ibm-identity">
			<div class="ibm-identity__head">
				{#if profileIncomplete}
					<span class="ibm-inline-badge" aria-hidden="true">
						<span class="ibm-inline-badge__initials">{initials}</span>
					</span>
				{/if}
				<p class="ibm-name" title={displayName}>{displayName}</p>
			</div>
			<p class="ibm-meta">{teamLabel || 'No team'} · {rankName}</p>

			<div class="ibm-rank-progress" aria-label="Rank progress">
				<p class="ibm-rank-progress__label">{rankProgressLabel}</p>
				<div class="ibm-rank-progress__bar" role="progressbar" aria-valuenow={rankBarPercent} aria-valuemin="0" aria-valuemax="100">
					<div class="ibm-rank-progress__fill" style:width="{rankBarPercent}%"></div>
				</div>
			</div>

			<p class="ibm-last-session">LAST TRAINED · {lastSessionLabel}</p>
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

	.ibm-root--badge-only {
		grid-template-columns: 1fr;
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

	.ibm-identity__head {
		display: flex;
		align-items: center;
		gap: clamp(6px, 1.2vw, 10px);
		min-width: 0;
	}

	.ibm-name {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.95rem, 2.2vw, 1.15rem);
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vanguard-text-1, #f8fafc);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 1 1 auto;
	}

	.ibm-meta {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.48rem, 1vw, 0.58rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
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

	@media (max-width: 480px) {
		.ibm-root:not(.ibm-root--badge-only) {
			grid-template-columns: 1fr;
		}
	}
</style>
