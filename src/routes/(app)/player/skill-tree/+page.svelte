<script lang="ts">
	/**
	 * +page.svelte — Skill Tree Shell
	 * ────────────────────────────────
	 * Vanguard Trinity mounting layer. Responsibilities:
	 *   1. Resolve ArmoryEngine (lazy, no args)
	 *   2. Instantiate SkillTreeEngine (holds ArmoryEngine reference)
	 *   3. Wire auth → armory.loadPlayerData via $effect
	 *   4. Lay out Bento grid
	 *   5. Mount SkillTreeArena + SkillTreeHUD
	 */

	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
	import { SkillTreeEngine } from '$lib/components/player/skill-tree/SkillTreeEngine.svelte.js';
	import SkillTreeArena from '$lib/components/player/skill-tree/SkillTreeArena.svelte';
	import SkillTreeHUD from '$lib/components/player/skill-tree/SkillTreeHUD.svelte';
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';

	// ── Engine instantiation (module-level — correct for Svelte 5 rune classes) ──

	const armory = new ArmoryEngine();
	const skillTree = new SkillTreeEngine(armory);

	// ── Auth → data wiring ────────────────────────────────────────────────────

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		const uid = authStore.user?.uid;
		if (uid) {
			armory.loadPlayerData(uid);
		}
	});

	// ── Derived values for Arena / HUD props ──────────────────────────────────

	const tierAccent = $derived(armory.currentTier.accent);
	const armoryStats = $derived(armory.playerStats);
</script>

<svelte:head>
	<title>Skill Tree · Physical Progression · SSTRACKER</title>
</svelte:head>

<div class="pd-page-root player-dossier-root st-page tw-min-h-screen tw-min-w-0 tw-overflow-x-hidden tw-text-white" style="background: var(--pd-bg);">

	<div class="pd-content-wrap">
	<PlayerOsPageStrap eyebrow="Progress / Skill tree" title="Physical progression">
		{#snippet status()}
			<span class="pd-label">{armory.currentTier.label}</span>
		{/snippet}
	</PlayerOsPageStrap>

	<!-- ── Main bento grid ───────────────────────────────────────────────── -->
	<div class="st-bento">

		<!-- Primary cell: arena + HUD stacked (HUD absolutely overlays Arena) -->
		<div class="st-cell-primary tw-relative">
			<SkillTreeArena engine={skillTree} {armoryStats} {tierAccent} />
			<SkillTreeHUD engine={skillTree} {armory} />
		</div>

		<!-- Secondary cell: XP / tier summary + branch progress -->
		<div class="st-cell-secondary tw-flex tw-flex-col tw-gap-[clamp(0.75rem,2vw,1.25rem)]">

			<!-- Tier card -->
			<div class="pd-page-panel pd-panel-section st-side-card tw-flex tw-flex-col tw-gap-3 tw-p-4">

				<p class="pd-label">Current tier</p>

				<p
					class="pd-mono tw-text-[clamp(1.1rem,2.5vw,1.5rem)] tw-font-black tw-tracking-widest tw-uppercase tw-leading-none"
					style:color={tierAccent}
				>
					{armory.currentTier.label}
				</p>

				<!-- XP progress bar -->
				<div class="st-xp-track tw-h-1 tw-overflow-hidden" style="background: var(--pd-bg); border: 1px solid var(--pd-line);">
					<div
						class="tw-h-full tw-transition-[width] tw-duration-700"
						style:width="{armory.progressToNextTier}%"
						style:background="var(--pd-accent-action)"
					></div>
				</div>

				<p class="pd-mono tw-text-[11px] tw-tabular-nums" style="color: var(--pd-text);">
					{armory.totalXP.toLocaleString()} XP
				</p>

				{#if armory.nextTier}
					<p class="pd-mono tw-text-[10px] tw-tracking-wide" style="color: var(--pd-text-muted);">
						{armory.xpRequired.toLocaleString()} XP to
						<span style="color: var(--pd-accent-data);">{armory.nextTier.label}</span>
					</p>
				{/if}
			</div>

			<!-- Branch progress summary -->
			<div class="pd-page-panel pd-panel-section st-side-card tw-flex tw-flex-col tw-gap-2 tw-p-4">

				<p class="pd-label tw-mb-1">Branch progress</p>

				{#each skillTree.branchSummaries as s (s.attr)}
					<div class="tw-flex tw-items-center tw-gap-2 tw-text-[10px] pd-mono">

						<!-- Attr label -->
						<span
							class="tw-w-[3.5rem] tw-shrink-0 tw-tracking-wider tw-uppercase"
							style:color={s.accent}
						>
							{s.attr}
						</span>

						<!-- Progress bar -->
						<div class="tw-flex-1 tw-h-[3px] tw-overflow-hidden" style="background: var(--pd-bg); border: 1px solid var(--pd-line);">
							<div
								class="tw-h-full tw-transition-[width] tw-duration-700"
								style:width="{Math.round(s.progress * 100)}%"
								style:background={s.accent}
							></div>
						</div>

						<!-- Unlocked / total -->
						<span class="tw-tabular-nums tw-shrink-0" style="color: var(--pd-text-muted);">
							{s.unlocked}<span style="color: var(--pd-line);">/</span>{s.total}
						</span>
					</div>
				{/each}
			</div>

		</div>
		<!-- /st-cell-secondary -->

	</div>
	<!-- /st-bento -->

	</div>
</div>
<!-- /player-dossier-root -->

<style>
	.st-bento {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, clamp(14rem, 22vw, 22rem));
		gap: clamp(0.75rem, 2vw, 1.5rem);
		align-items: start;
	}

	@media (max-width: 640px) {
		.st-bento {
			grid-template-columns: 1fr;
		}
	}

	.st-side-card {
		min-width: 0;
	}
</style>
