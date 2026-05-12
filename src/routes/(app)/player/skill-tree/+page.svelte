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

	const tierAccent  = $derived(armory.currentTier.accent);
	const armoryStats = $derived(armory.playerStats);
</script>

<svelte:head>
	<title>Skill Tree · Physical Progression · NEXUS COMMAND</title>
</svelte:head>

<div class="st-shell tw-min-h-screen tw-bg-[#020202] tw-text-white">

	<!-- ── Page header bezel ──────────────────────────────────────────────── -->
	<header class="tw-mb-[clamp(1rem,2.5vw,1.75rem)]">
		<p class="tw-text-[10px] tw-font-black tw-tracking-[0.3em] tw-uppercase tw-font-mono tw-text-cyan-400/60">
			[ NEXUS COMMAND · PLAYER OS ]
		</p>
		<h1 class="tw-text-[clamp(1.2rem,3vw,2rem)] tw-font-black tw-tracking-widest tw-uppercase tw-text-white tw-leading-tight">
			Physical Skill Tree
		</h1>
		<p class="tw-text-[11px] tw-font-mono tw-text-slate-500 tw-tracking-widest">
			Composite Snowflake · Sprint 5.1
		</p>
	</header>

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
			<div class="tw-rounded-xl tw-border tw-border-white/[0.08] tw-bg-slate-900/50 tw-backdrop-blur-md tw-p-4 tw-flex tw-flex-col tw-gap-3">

				<p class="tw-text-[10px] tw-font-black tw-tracking-[0.3em] tw-uppercase tw-font-mono tw-text-cyan-400/60">
					Current Tier
				</p>

				<p
					class="tw-text-[clamp(1.1rem,2.5vw,1.5rem)] tw-font-black tw-tracking-widest tw-uppercase tw-font-mono tw-leading-none"
					style:color={tierAccent}
				>
					{armory.currentTier.label}
				</p>

				<!-- XP progress bar -->
				<div class="tw-h-1 tw-rounded-full tw-bg-white/10 tw-overflow-hidden">
					<div
						class="tw-h-full tw-rounded-full tw-transition-[width] tw-duration-700"
						style:width="{armory.progressToNextTier}%"
						style:background={tierAccent}
					></div>
				</div>

				<p class="tw-text-[11px] tw-font-mono tw-text-slate-300 tw-tabular-nums">
					{armory.totalXP.toLocaleString()} XP
				</p>

				{#if armory.nextTier}
					<p class="tw-text-[10px] tw-font-mono tw-text-slate-500 tw-tracking-wide">
						{armory.xpRequired.toLocaleString()} XP to
						<span class="tw-text-cyan-400/80">{armory.nextTier.label}</span>
					</p>
				{/if}
			</div>

			<!-- Branch progress summary -->
			<div class="tw-rounded-xl tw-border tw-border-white/[0.08] tw-bg-slate-900/50 tw-backdrop-blur-md tw-p-4 tw-flex tw-flex-col tw-gap-2">

				<p class="tw-text-[10px] tw-font-black tw-tracking-[0.3em] tw-uppercase tw-font-mono tw-text-cyan-400/60 tw-mb-1">
					Branch Progress
				</p>

				{#each skillTree.branchSummaries as s (s.attr)}
					<div class="tw-flex tw-items-center tw-gap-2 tw-text-[10px] tw-font-mono">

						<!-- Attr label -->
						<span
							class="tw-w-[3.5rem] tw-shrink-0 tw-tracking-wider tw-uppercase"
							style:color={s.accent}
						>
							{s.attr}
						</span>

						<!-- Progress bar -->
						<div class="tw-flex-1 tw-h-[3px] tw-rounded-full tw-bg-white/10 tw-overflow-hidden">
							<div
								class="tw-h-full tw-rounded-full tw-transition-[width] tw-duration-700"
								style:width="{Math.round(s.progress * 100)}%"
								style:background={s.accent}
							></div>
						</div>

						<!-- Unlocked / total -->
						<span class="tw-text-slate-500 tw-tabular-nums tw-shrink-0">
							{s.unlocked}<span class="tw-text-slate-700">/</span>{s.total}
						</span>
					</div>
				{/each}
			</div>

		</div>
		<!-- /st-cell-secondary -->

	</div>
	<!-- /st-bento -->

</div>
<!-- /st-shell -->

<style>
	.st-shell {
		padding: clamp(1rem, 3vw, 2rem);
	}

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

	/* .st-cell-primary: tw-relative on the element handles the HUD stacking context */
</style>
