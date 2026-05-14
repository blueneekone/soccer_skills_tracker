<script lang="ts">
	import TeamLeaderboard from '$lib/components/tracker/TeamLeaderboard.svelte';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	const profile = $derived(authStore.userProfile);

	const totalXpHud = $derived(
		Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)),
	);
	const levelHud = $derived(getLevelProgressFromTotalXp(totalXpHud));
	const xpToNextLabel = $derived(
		levelHud.xpToNext <= 0
			? '—'
			: String(Math.max(0, levelHud.xpToNext - levelHud.xpIntoLevel)),
	);
	const streakDays = $derived(Math.max(0, Math.floor(Number(profile?.currentStreak) || 0)));
</script>

<svelte:head>
	<title>Training tracker · SSTRACKER</title>
</svelte:head>

<div
	class="pt-root tw-mx-auto tw-box-border tw-w-full tw-max-w-6xl tw-min-w-0 tw-space-y-6 tw-overflow-x-hidden tw-px-2 tw-pb-24"
>
	<section class="gw-hud" aria-label="Training pulse">
		<div class="gw-hud__cell">
			<span class="gw-hud__label">Current level</span>
			<span class="gw-hud__value gw-hud__value--level">Lv. {levelHud.level}</span>
		</div>
		<div class="gw-hud__cell">
			<span class="gw-hud__label">XP to next level</span>
			<span class="gw-hud__value gw-hud__value--mono">{xpToNextLabel}</span>
		</div>
		<div class="gw-hud__cell">
			<span class="gw-hud__label">Day streak</span>
			<span class="gw-hud__value gw-hud__value--streak">
				<Icon name="game.flame" />
				{streakDays}d
			</span>
		</div>
	</section>

	{#if profile?.teamId && profile.teamId !== 'admin'}
		<section class="pt-lb tw-min-w-0" aria-label="Team leaderboard">
			<TeamLeaderboard />
		</section>
	{/if}
</div>

<style>
	/* Mirrors `(app)/tracker` gamified HUD so leaderboard sits beside the same pulse strip. */
	.gw-hud {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		padding: 14px 12px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	@media (max-width: 360px) {
		.gw-hud {
			grid-template-columns: 1fr;
		}
	}

	.gw-hud__cell {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		padding: 8px 6px;
	}

	.gw-hud__label {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(228, 228, 231, 0.55);
	}

	.gw-hud__value {
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		color: #fafafa;
		line-height: 1.1;
	}

	.gw-hud__value--level {
		background: linear-gradient(120deg, #fde68a 0%, #f59e0b 35%, #a855f7 90%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.gw-hud__value--mono {
		font-variant-numeric: tabular-nums;
	}

	.gw-hud__value--streak {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-variant-numeric: tabular-nums;
		color: #fb923c;
	}

	.gw-hud__value--streak :global(svg) {
		width: 1.15rem;
		height: 1.15rem;
	}

	.pt-lb {
		width: 100%;
		min-width: 0;
	}
</style>
