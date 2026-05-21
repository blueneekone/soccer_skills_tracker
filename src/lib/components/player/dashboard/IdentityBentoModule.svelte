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

		<div class="ibm-pills">
			<span
				class="ibm-pill ibm-pill--streak"
				class:ibm-pill--streak-active={currentStreak > 0}
				title="Best {longestStreak}d streak"
			>
				<HudSeededRingCanvas
					uid={ringSeed}
					size={28}
					fill={streakFill}
					strokeColor="var(--color-accent, #fbbf24)"
					value={String(currentStreak)}
					showCenter={true}
				/>
				<span class="ibm-pill__stack">
					<span class="ibm-pill__label">Streak</span>
					<span class="ibm-pill__value">{currentStreak}d</span>
				</span>
			</span>

			<span class="ibm-pill ibm-pill--xp" title="Career XP">
				<HudSeededRingCanvas
					uid={ringSeed}
					size={28}
					fill={levelXpFill}
					strokeColor="var(--color-structural, #3b82f6)"
					value={xpLabel}
					showCenter={true}
				/>
				<span class="ibm-pill__stack">
					<span class="ibm-pill__label">XP</span>
					<span class="ibm-pill__value">{xpLabel}</span>
				</span>
			</span>
		</div>

		{#if profileIncomplete && onProfileSetup}
			<button type="button" class="ibm-setup" onclick={onProfileSetup}>
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

	.ibm-pills {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(6px, 1.2vw, 10px);
		align-items: center;
	}

	.ibm-pill {
		display: inline-flex;
		align-items: center;
		gap: clamp(4px, 0.8vw, 6px);
	}

	.ibm-pill__stack {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.ibm-pill__label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.46rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 70%, #94a3b8);
	}

	.ibm-pill--streak .ibm-pill__label {
		color: color-mix(in srgb, var(--color-accent, #fbbf24) 80%, #fde68a);
	}

	.ibm-pill__value {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.7rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #ffffff;
		white-space: nowrap;
	}

	.ibm-setup {
		margin: 0;
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

	.ibm-setup:hover {
		text-decoration: underline;
	}

	@media (max-width: 480px) {
		.ibm-root {
			grid-template-columns: 1fr;
		}
	}
</style>
