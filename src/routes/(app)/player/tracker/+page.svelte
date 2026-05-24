<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import HudStatCell from '$lib/components/player/dashboard/HudStatCell.svelte';
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
	import { TrajectoryEngine } from '$lib/states/TrajectoryEngine.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import MemoryCapsuleArena from '$lib/components/player/trajectory/MemoryCapsuleArena.svelte';
	import '$lib/styles/player-dashboard-hud.css';

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

	const trajectoryEngine = new TrajectoryEngine();

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		const emailKey = (authStore.user?.email ?? '').toLowerCase();
		if (emailKey) trajectoryEngine.connect(emailKey);
	});

	onDestroy(() => trajectoryEngine.destroy());
</script>

<svelte:head>
	<title>Training tracker · SSTRACKER</title>
</svelte:head>

<div
	class="pd-page-root player-dossier-root pt-root tw-min-w-0 tw-overflow-x-hidden"
>
	<div class="pd-content-wrap">
	<PlayerOsPageStrap eyebrow="Progress / Training tracker" title="Training pulse">
		{#snippet status()}
			<span class="pd-label">Lv. {levelHud.level}</span>
		{/snippet}
	</PlayerOsPageStrap>

	<section class="pd-stat-row pd-page-panel" aria-label="Training pulse">
		<HudStatCell label="Current level" value={`Lv. ${levelHud.level}`} />
		<HudStatCell label="XP to next level" value={xpToNextLabel} variant="xp" />
		<HudStatCell label="Day streak" value={`${streakDays}d`} variant="streak" />
	</section>

	{#if vanguardFlags.capsulesEnabled}
		{#if trajectoryEngine.activeCapsule}
			<section class="pt-lb tw-min-w-0" aria-label="Time-Lapse Memory Capsule">
				<MemoryCapsuleArena
					capsule={trajectoryEngine.activeCapsule}
					baselineDaysAgo={trajectoryEngine.baselineDaysAgo}
					capsuleHeadline={trajectoryEngine.capsuleHeadline}
				/>
			</section>
		{:else if !trajectoryEngine.loading}
			<section
				class="pt-lb pt-ghost pd-page-panel pd-empty-state tw-min-w-0"
				aria-label="No memory capsule available"
			>
				<div class="pd-empty-state__icon" aria-hidden="true"></div>
				<div class="pd-empty-state__copy">
					<p class="pd-empty-state__title">Ghost profile</p>
					<p class="pd-empty-state__lede">Awaiting first memory capsule</p>
				</div>
			</section>
		{/if}
	{/if}
	</div>
</div>

<style>
	.pt-root {
		background: var(--pd-bg);
		color: var(--pd-text);
	}

	.pt-lb {
		width: 100%;
		min-width: 0;
	}

	.pt-ghost {
		margin-top: 0;
	}
</style>
