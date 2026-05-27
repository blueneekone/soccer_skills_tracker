<script lang="ts">
	import HudAvatarRing from '$lib/components/player/HudAvatarRing.svelte';
	import HologramCardShell from '$lib/components/player/HologramCardShell.svelte';
	import IdentityTelemetryBezel from '$lib/components/player/dashboard/IdentityTelemetryBezel.svelte';
	import OperativeIdCardFrame from '$lib/components/stats/OperativeIdCardFrame.svelte';
	import { composeOperativePortrait } from '$lib/gamification/renderOperativeLoadout.js';
	import HudStatCell from '$lib/components/player/dashboard/HudStatCell.svelte';
	import {
		formatCompactXp,
		formatLastTrainingLabel,
	} from '$lib/player/dashboard/playerHudMetrics.js';
	import '$lib/styles/player-dashboard-hud.css';

	let {
		embedded = false,
		hideDisplayName = false,
		uid = '',
		operativeAvatar = undefined,
		operativeLoadout = undefined,
		ownedCosmetics = undefined,
		displayName = 'Athlete',
		/** Organization/club on emblem — not team assignment. */
		clubName = '',
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
		hideDisplayName?: boolean;
		uid?: string;
		operativeAvatar?: unknown;
		operativeLoadout?: unknown;
		ownedCosmetics?: string[];
		displayName?: string;
		clubName?: string;
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

	const holoAccent = $derived(
		currentStreak > 0 || (embedded && totalXp > 0)
			? 'var(--pd-accent-action, #fbbf24)'
			: 'var(--pd-accent-data, #14b8a6)',
	);

	const holoPortraitLayers = $derived(
		composeOperativePortrait({
			operativeAvatar,
			loadout: operativeLoadout,
			size: 96,
			ownedIds: ownedCosmetics,
		}),
	);

	const emblemOwnsIdentity = $derived(embedded && !profileIncomplete);
</script>

<div
	class="ibm-root"
	class:ibm-root--embedded={embedded}
	class:ibm-root--premium={embedded}
	class:ibm-root--incomplete={profileIncomplete}
	class:ibm-streak-at-risk={currentStreak > 0}
	data-streak-active={currentStreak > 0 ? 'true' : undefined}
	aria-label="Player identity"
>
	{#if embedded && profileIncomplete && onProfileSetup}
		<button
			type="button"
			class="ibm-profile-banner ibm-profile-setup-card ibm-profile-banner--hub-span"
			onclick={onProfileSetup}
		>
			<span class="ibm-profile-banner__eyebrow">Operative onboarding</span>
			<span class="ibm-profile-banner__action ibm-profile-setup-card__cta">
				Complete operative profile →
			</span>
		</button>
	{/if}

	{#if embedded}
		<div class="ibm-body--hub-span">
			<HologramCardShell accent={holoAccent} compact ariaLabel="Operative identity card">
				<div class="ibm-holo-face">
					{#if profileIncomplete}
						<div class="ibm-holo-face__portrait ibm-holo-face__portrait--placeholder" aria-hidden="true">
							<span class="ibm-holo-face__initials">{initials}</span>
						</div>
					{:else}
						<OperativeIdCardFrame
							variant="holo"
							portraitSvg={holoPortraitLayers.portraitSvg}
							borderSvg={holoPortraitLayers.borderSvg}
							bannerSvg={holoPortraitLayers.bannerSvg}
							frameClass={holoPortraitLayers.frameClass}
							displayName={displayName}
							clubName={clubName || undefined}
							rankName={rankName || 'UNRANKED'}
							operativeLevel={level}
						/>
					{/if}
				</div>
				{#snippet telemetry()}
					<IdentityTelemetryBezel
						{currentStreak}
						{longestStreak}
						{totalXp}
						{xpLabel}
						streakAtRisk={currentStreak > 0}
					/>
				{/snippet}
			</HologramCardShell>

			<div class="ibm-rings">
				<div class="ibm-identity">
					<div class="ibm-identity__head">
						{#if !hideDisplayName && !emblemOwnsIdentity}
							<p class="ibm-name" title={displayName}>{displayName}</p>
						{/if}
					</div>
					<p
						class="ibm-meta"
						class:ibm-meta--strap={hideDisplayName}
						aria-hidden={emblemOwnsIdentity ? true : undefined}
					>
						{#if emblemOwnsIdentity}
							{rankProgressLabel}
						{:else}
							{teamLabel || 'No team'} · {rankName}
						{/if}
					</p>

					<div class="ibm-rank-progress" aria-label="Rank progress">
						<p class="ibm-rank-progress__label">{rankProgressLabel}</p>
						<div
							class="ibm-rank-progress__bar"
							class:ibm-rank-bar--premium={embedded}
							class:ibm-rank-bar--has-xp={embedded && totalXp > 0}
							role="progressbar"
							aria-valuenow={rankBarPercent}
							aria-valuemin="0"
							aria-valuemax="100"
						>
							<div class="ibm-rank-progress__fill" style:width="{rankBarPercent}%"></div>
						</div>
					</div>

					<p class="ibm-last-session">LAST TRAINED · {lastSessionLabel}</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="ibm-avatar" class:ibm-avatar--placeholder={profileIncomplete}>
		{#if profileIncomplete}
			<div class="ibm-silhouette-ring" aria-hidden="true">
				<span class="ibm-silhouette-ring__initials">{initials}</span>
			</div>
		{:else}
			<HudAvatarRing
				{operativeAvatar}
				{operativeLoadout}
				{ownedCosmetics}
				seed={ringSeed}
				size={embedded ? 88 : 72}
				{level}
				xpFill={levelXpFill}
				strokeColor="var(--color-accent, #fbbf24)"
				{embedded}
			/>
		{/if}
	</div>

	<div class="ibm-rings">
		{#if !embedded && profileIncomplete && onProfileSetup}
			<button
				type="button"
				class="ibm-profile-banner ibm-profile-setup-card"
				onclick={onProfileSetup}
			>
				<span class="ibm-profile-banner__eyebrow">Operative onboarding</span>
				<span class="ibm-profile-banner__action ibm-profile-setup-card__cta">
					Complete operative profile →
				</span>
			</button>
		{/if}
		<div class="ibm-identity">
			<div class="ibm-identity__head">
				{#if !hideDisplayName}
					<p class="ibm-name" title={displayName}>{displayName}</p>
				{/if}
			</div>
			<p class="ibm-meta" class:ibm-meta--strap={hideDisplayName}>
				{teamLabel || 'No team'} · {rankName}
			</p>

			<div class="ibm-rank-progress" aria-label="Rank progress">
				<p class="ibm-rank-progress__label">{rankProgressLabel}</p>
				<div
					class="ibm-rank-progress__bar"
					class:ibm-rank-bar--premium={embedded}
					class:ibm-rank-bar--has-xp={embedded && totalXp > 0}
					role="progressbar"
					aria-valuenow={rankBarPercent}
					aria-valuemin="0"
					aria-valuemax="100"
				>
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
	{/if}
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

	.ibm-avatar--placeholder {
		--player-hud-avatar-size: clamp(72px, 14vw, 88px);
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
