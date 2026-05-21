<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import ActiveBounties from '$lib/components/player/dashboard/ActiveBounties.svelte';
	import OperativeHub from '$lib/components/player/dashboard/OperativeHub.svelte';
	// PlayerHudHeader deprecated in Sprint 1.6 — replaced by IdentityBentoModule
	import IdentityBentoModule from '$lib/components/player/dashboard/IdentityBentoModule.svelte';
	import HudMetricsPanel from '$lib/components/player/dashboard/HudMetricsPanel.svelte';
	import HUDContainer from '$lib/components/hud/HUDContainer.svelte';
	import PlayerCommandCenter from '$lib/components/player/dashboard/PlayerCommandCenter.svelte';
	import VanguardProtocolPanel from '$lib/components/player/dashboard/VanguardProtocolPanel.svelte';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { deriveVanguardPrism } from '$lib/utils/vanguard-prism.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import '$lib/styles/player-dashboard-hud.css';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
	import { onDestroy } from 'svelte';
	import { TrajectoryEngine } from '$lib/states/TrajectoryEngine.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import MemoryCapsuleArena from '$lib/components/player/trajectory/MemoryCapsuleArena.svelte';

	/**
	 * Effective operative for this lobby: Firestore profile for the signed-in Firebase user.
	 * Under impersonation the JWT session is already the target athlete, so this is their
	 * `users/{email}` doc — no separate `impersonationStore.activePlayer` object exists; the
	 * store only carries session metadata (never null; avoid throwing if claims are mid-resolve).
	 */
	const activePlayer = $derived(
		/** @type {Record<string, unknown> | null} */ (authStore.userProfile ?? null),
	);
	const profileXp = $derived(Math.max(0, Math.floor(Number(activePlayer?.totalXp ?? activePlayer?.xp) || 0)));
	const totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, profileXp) : profileXp,
	);
	const rankProgress = $derived(getCurrentRank(totalXpHud));
	const osLevel = $derived(getLevelProgressFromTotalXp(totalXpHud).level);
	const email = $derived((authStore.user?.email || '').toLowerCase());
	const uid = $derived(authStore.user?.uid || '');

	let commandCenterOpen = $state(false);

	// ── Trajectory Engine (memory capsules) ──────────────────────────────────
	const trajectoryEngine = new TrajectoryEngine();

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (email) trajectoryEngine.connect(email);
	});

	onDestroy(() => trajectoryEngine.destroy());

	/** @type {Record<string, unknown> | null} */
	let statsRaw = $state(null);
	/** @type {string | null} */
	let teamSportFromDoc = $state(null);

	const resolvedSportRaw = $derived(
		typeof teamSportFromDoc === 'string' && teamSportFromDoc.trim() ?
			teamSportFromDoc.trim().toLowerCase()
		:	'soccer',
	);
	const attrRadarValues = $derived(
		deriveVanguardPrism(
			statsRaw && typeof statsRaw === 'object' ? /** @type {Record<string,unknown>} */(statsRaw) : null,
			/** @type {import('$lib/utils/vanguard-prism.js').ArmoryStats} */ (
				/** @type {Record<string, unknown> | null} */ (activePlayer)?.armory?.stats ?? {}
			),
		)
	);

	const streak = $derived(Number(activePlayer?.currentStreak) || 0);
	const longestStreak = $derived(Number(activePlayer?.longestStreak) || streak);

	/** Controls the one-time profile setup modal. */
	let showInitModal = $state(false);

	/** @type {string} */
	let teamAssignmentLabel = $state('');

	const callsign = $derived(
		(activePlayer?.playerName && String(activePlayer.playerName).trim()) ||
			email.split('@')[0] ||
			'—',
	);

	const hasArmoryProfile = $derived(Boolean(activePlayer?.operativeAvatar));

	$effect(() => {
		if (!browser) return;
		const u = authStore.user;
		if (authStore.role === 'player' && u?.uid) {
			playerEngine.attach(u.uid);
			return () => playerEngine.detach();
		}
		playerEngine.detach();
	});

	$effect(() => {
		if (!browser || !uid) {
			statsRaw = null;
			return;
		}
		const ref = doc(db, 'player_stats', uid);
		const unsub = onSnapshot(
			ref,
			(snap) => {
				if (!snap.exists()) {
					statsRaw = null;
					return;
				}
				statsRaw = snap.data();
			},
			(e) => {
				console.error('[player dashboard] player_stats', e);
				statsRaw = null;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		if (!browser) return;
		const tid = /** @type {string | undefined} */ (activePlayer?.teamId);
		if (!tid || tid === 'admin') {
			teamAssignmentLabel = '';
			teamSportFromDoc = null;
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'teams', tid));
				if (cancelled) return;
				if (snap.exists()) {
					const d = snap.data();
					teamAssignmentLabel =
						typeof d.teamName === 'string' && d.teamName.trim() ?
							d.teamName.trim()
						:	typeof d.name === 'string' && d.name.trim() ?
							d.name.trim()
						:	tid;
					const sp = d.sport;
					teamSportFromDoc =
						typeof sp === 'string' && sp.trim() ? sp.trim().toLowerCase() : null;
				} else {
					teamAssignmentLabel = tid;
					teamSportFromDoc = null;
				}
			} catch (e) {
				console.error('[player dashboard] team label', e);
				if (!cancelled) {
					teamAssignmentLabel = tid;
					teamSportFromDoc = null;
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	// Read-Repair: silently stamp sportId = 'soccer' on user profiles missing it.
	$effect(() => {
		if (!browser || !email || authStore.isLoading) return;
		const profile = activePlayer;
		if (!profile || typeof profile.sportId === 'string') return;
		// Fire-and-forget — non-fatal if it fails
		updateDoc(doc(db, 'users', email), { sportId: sportsConfigStore.currentSportConfig?.sportId ?? 'soccer' }).catch(
			(e) => console.warn('[player-dash] sportId read-repair failed', e),
		);
	});

</script>

<svelte:head>
	<title>Player Dashboard · SSTRACKER</title>
</svelte:head>

{#if authStore.isLoading}
	<div
		class="tw-flex tw-h-64 tw-min-h-[40vh] tw-w-full tw-items-center tw-justify-center tw-bg-[#0B0F19] tw-py-16 tw-text-slate-400"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<Icon name="status.loading" class="tw-animate-spin tw-text-4xl tw-text-slate-400" />
		<span class="tw-sr-only">Loading player dashboard</span>
	</div>
{:else if !activePlayer}
	<div
		class="tw-mx-auto tw-flex tw-min-h-[40vh] tw-max-w-lg tw-flex-col tw-items-center tw-justify-center bento-gap-md tw-rounded-xl tw-border tw-border-amber-500/25 tw-bg-slate-950/90 tw-px-6 tw-py-14 tw-text-center tw-text-slate-200"
		role="alert"
	>
		<Icon name="status.warning-circle" class="tw-text-4xl tw-text-amber-400" />
		<p class="tw-m-0 tw-text-base tw-font-semibold tw-text-slate-100">
			Unable to load this operative profile. Try refreshing the page.
		</p>
		{#if impersonationStore.active}
			<p class="tw-m-0 tw-text-xs tw-leading-relaxed tw-text-slate-500">
				Impersonation is active for
				<span class="tw-font-mono tw-text-slate-400">
					{impersonationStore.targetEmail || impersonationStore.targetUid}
				</span>. If this keeps happening, exit impersonation from the banner and try again.
			</p>
		{/if}
	</div>
{:else}
<div
	class="lobby-page player-hud-root tw-relative tw-isolate tw-min-w-0 tw-overflow-x-hidden tw-text-slate-50"
	style="background: var(--color-dominant, #0f172a); padding: var(--bento-pad-liquid); padding-bottom: calc(var(--bento-pad-liquid) + env(safe-area-inset-bottom, 0px));"
	data-region="player-lobby"
>
	<HUDContainer ariaLabel="Player operations HUD">
		<div class="bento-span-12 tw-min-w-0">
			<OperativeHub>
				{#snippet identity()}
					<IdentityBentoModule
						uid={uid}
						displayName={callsign}
						teamLabel={teamAssignmentLabel}
						rankName={rankProgress.rank}
						level={osLevel}
						totalXp={totalXpHud}
						currentStreak={streak}
						longestStreak={longestStreak}
						xpInTier={rankProgress.xpInCurrentTier}
						xpToNextRank={rankProgress.xpToNextRank}
						profileIncomplete={!hasArmoryProfile}
						onProfileSetup={() => (showInitModal = true)}
						onOpenCommandCenter={() => (commandCenterOpen = true)}
					/>
				{/snippet}
				{#snippet metrics()}
					<HudMetricsPanel
						statsRaw={statsRaw}
						level={osLevel}
						rankName={rankProgress.rank}
						totalXp={totalXpHud}
						streak={streak}
						longestStreak={longestStreak}
					/>
				{/snippet}
				{#snippet quests()}
					<ActiveBounties embedded />
				{/snippet}
			</OperativeHub>
		</div>

	<section
		class="bento-span-12 bento-card tw-relative tw-z-30 tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-p-4 md:tw-p-5"
		aria-label="Vanguard Protocol telemetry"
	>
		<VanguardProtocolPanel prismValues={attrRadarValues} />
	</section>

	<section
		class="bento-span-12 bento-card lobby-capsules-section tw-relative tw-z-30 tw-flex tw-flex-col tw-p-4 md:tw-p-5"
		aria-labelledby="lobby-capsules-h"
	>
		<header class="lobby-capsules-intro">
			<p class="lobby-eyebrow tw-mb-1 tw-text-slate-400">Self comparison</p>
			<h2
				id="lobby-capsules-h"
				class="tw-m-0 tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100"
			>
				Time-Lapse Memory Capsules
			</h2>
			<p class="tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">
				Compare your performance only against your past self. Capsules unlock at the end of each
				training cycle.
			</p>
		</header>
		{#if vanguardFlags.capsulesEnabled && trajectoryEngine.activeCapsule}
			<MemoryCapsuleArena
				capsule={trajectoryEngine.activeCapsule}
				baselineDaysAgo={trajectoryEngine.baselineDaysAgo}
				capsuleHeadline={trajectoryEngine.capsuleHeadline}
			/>
		{:else}
			<div
				class="tw-flex tw-min-h-[140px] tw-items-center tw-justify-center tw-rounded-2xl tw-border tw-border-dashed tw-border-slate-800 tw-bg-slate-950 tw-p-6 tw-text-center tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.2em] tw-text-slate-500"
			>
				Ghost profile · awaiting first capsule
			</div>
		{/if}
	</section>

	</HUDContainer>
</div>

<PlayerCommandCenter bind:open={commandCenterOpen} />

<!-- Sprint 9.2: Initialize Operative — distinct one-time setup modal -->
{#if showInitModal}
<div
	class="init-modal-scrim tw-fixed tw-inset-0 tw-z-[500] tw-flex tw-items-center tw-justify-center tw-p-4"
	style="background: var(--surface-modal-scrim, rgba(0,0,0,0.75)); backdrop-filter: blur(4px);"
	role="presentation"
	onclick={(e) => { if (e.target === e.currentTarget) showInitModal = false; }}
>
	<div
		class="init-modal tw-relative tw-w-full tw-max-w-md tw-rounded-2xl tw-border tw-border-slate-700 tw-bg-slate-900 tw-p-6 tw-shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="init-modal-h"
	>
		<button
			type="button"
			class="tw-absolute tw-right-3 tw-top-3 tw-flex tw-min-h-[44px] tw-min-w-[44px] tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-700 tw-bg-slate-800 tw-text-slate-400 tw-transition-colors tw-duration-150 hover:tw-border-slate-600 hover:tw-text-slate-200"
			onclick={() => (showInitModal = false)}
			aria-label="Close"
		>
			<Icon name="sys.close" size={14} />
		</button>

		<div class="bento-mb-md tw-border-b tw-border-slate-800 tw-pb-3">
			<p class="tw-m-0 tw-font-mono tw-text-[0.5rem] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-slate-500">
				One-time setup · SOAR
			</p>
			<h2
				id="init-modal-h"
				class="tw-m-0 tw-mt-1.5 tw-font-mono tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-50"
			>
				Finish your profile
			</h2>
		</div>

		<p class="tw-m-0 tw-text-sm tw-leading-relaxed tw-text-slate-400">
			Your player profile is not complete yet. Set your avatar, position, and sport in the Armory
			to unlock the full Player OS.
		</p>

		<ul class="bento-mt-md tw-list-none tw-m-0 tw-p-0 tw-space-y-1.5">
			{#each ['Choose your player avatar', 'Set your position and sport', 'Review your gear unlocks'] as step, i}
				<li class="tw-flex tw-min-w-0 tw-items-center tw-gap-2.5 tw-font-mono tw-text-[0.6rem] tw-font-semibold tw-uppercase tw-tracking-[0.12em] tw-text-slate-500">
					<span class="tw-flex tw-h-4 tw-w-4 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-sm tw-border tw-border-teal-700/60 tw-bg-teal-600/10 tw-text-[0.5rem] tw-font-black tw-text-teal-500">{i + 1}</span>
					{step}
				</li>
			{/each}
		</ul>

		<div class="bento-mt-lg tw-flex tw-flex-wrap tw-items-center tw-gap-3">
			<a
				href={resolve('/player/armory')}
				class="tw-inline-flex tw-min-h-[44px] tw-w-fit tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border tw-border-teal-600/70 tw-bg-teal-600/10 tw-px-5 tw-font-mono tw-text-[0.5625rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-teal-400 tw-no-underline tw-transition-all tw-duration-150 hover:tw-bg-teal-600/20 active:tw-scale-[0.98]"
				data-sveltekit-preload-data="hover"
				onclick={() => (showInitModal = false)}
			>
				<Icon name="status.shield-check" size={13} />
				Open Armory
			</a>
			<button
				type="button"
				class="tw-inline-flex tw-min-h-[44px] tw-w-fit tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-700 tw-bg-transparent tw-px-4 tw-font-mono tw-text-[0.5625rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-400 tw-transition-all tw-duration-150 hover:tw-border-slate-600 hover:tw-text-slate-300 active:tw-scale-[0.98]"
				onclick={() => (showInitModal = false)}
			>
				Later
			</button>
		</div>
	</div>
</div>
{/if}

{/if}

<style>
	.lobby-page {
		color: var(--vanguard-text-1, #f8fafc);
	}

	/* Opaque data cards — Sprint 1.1: liquid shadow + inner highlight added. */
	.bento-card {
		border-radius: 24px;
		overflow: hidden;
		min-width: 0;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 18%, transparent);
		background: var(--color-dominant, #0f172a);
		box-shadow: var(--shadow-liquid);
		background-image: linear-gradient(
			160deg,
			rgba(255, 255, 255, 0.035) 0%,
			rgba(255, 255, 255, 0) 60%
		);
	}

	.lobby-eyebrow {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.lobby-capsules-intro {
		min-width: min(100%, 280px);
		max-width: none;
		margin-bottom: 0.75rem;
	}

	.lobby-capsules-section {
		min-width: 0;
	}
</style>
