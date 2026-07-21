<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { doc, getDoc, getDocs, onSnapshot, updateDoc, collection, query, where, orderBy, limit } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import ActiveBounties from '$lib/components/player/dashboard/ActiveBounties.svelte';
	import OperativeHub from '$lib/components/player/dashboard/OperativeHub.svelte';
	import OperativeQuickOps from '$lib/components/player/dashboard/OperativeQuickOps.svelte';
	import OperativePathwayPreview from '$lib/components/player/dashboard/OperativePathwayPreview.svelte';
	import HqWorldContextStrip from '$lib/components/player/dashboard/HqWorldContextStrip.svelte';
	// PlayerHudHeader deprecated in Sprint 1.6 — replaced by IdentityBentoModule
	import IdentityBentoModule from '$lib/components/player/dashboard/IdentityBentoModule.svelte';
	import HUDContainer from '$lib/components/hud/HUDContainer.svelte';
	import VanguardProtocolPanel from '$lib/components/player/dashboard/VanguardProtocolPanel.svelte';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { deriveVanguardPrism } from '$lib/utils/vanguard-prism.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import '$lib/styles/player-dashboard-hud.css';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
	import { onDestroy, untrack } from 'svelte';
	import { TrajectoryEngine } from '$lib/states/TrajectoryEngine.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import MemoryCapsuleArena from '$lib/components/player/trajectory/MemoryCapsuleArena.svelte';
	import type { VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol.js';
	import { hasVanguardTelemetry } from '$lib/player/dashboard/vanguardProtocol.js';
	import {
		mapScheduleDoc,
		pickNextScheduleEvent,
		resolveHqStatusBadges,
		resolveNextEventLabel,
		type HqScheduleEventLike,
	} from '$lib/player/dashboard/hqWorldContext.js';
	import { getCompletedAlbumSetChipLabels } from '$lib/gamification/albumSetBonuses.js';
	import { resolveOperativeCardMetadata } from '$lib/gamification/cardCollectibleMetadata.js';
	import { parseOperativePortrait } from '$lib/avatars/portraitV2Schema.js';
	import {
		readRepairOperativeAvatar,
		queuePortraitReadRepairWrite,
	} from '$lib/avatars/portraitReadRepair.js';
	import { fetchClubDisplayName } from '$lib/player/fetchClubDisplayName.js';
	import AdaptiveHomework from './AdaptiveHomework.svelte';
	import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
	import PlayerActivityStreak from '$lib/components/shell/PlayerActivityStreak.svelte';
	import { DopamineEngine } from '$lib/components/player/DopamineEngine.svelte';
	import BountyBoard from '$lib/components/player/BountyBoard.svelte';

	const armory = new ArmoryEngine();
	const dopamineEngine = new DopamineEngine();

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

	let selectedVanguardAxis = $state<VanguardAxisId | null>(null);

	// ── Trajectory Engine (memory capsules) ──────────────────────────────────
	const trajectoryEngine = new TrajectoryEngine();

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (email) trajectoryEngine.connect(email);
	});

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (uid && email) armory.loadPlayerData(uid, email);
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
	const telemetryReady = $derived(hasVanguardTelemetry(attrRadarValues));
	const lastTrainingUtc = $derived(
		statsRaw && typeof statsRaw === 'object' && typeof statsRaw.last_training_utc === 'string' ?
			statsRaw.last_training_utc
		:	null,
	);

	/** Controls the one-time profile setup modal. */
	let showInitModal = $state(false);

	let coachBountyCount = $state(0);
	let heroQuestId = $state<string | null>(null);
	/** @type {HqScheduleEventLike | null} */
	let nextScheduleEvent = $state(null);

	const callsign = $derived(
		(activePlayer?.playerName && String(activePlayer.playerName).trim()) ||
			email.split('@')[0] ||
			'—',
	);

	/** Repaired v2 portrait for HQ identity + ring (lazy read-repair from Firestore profile). */
	let displayOperativeAvatar = $state<unknown>(undefined);
	let lastPortraitRepairSig = '';

	const profilePortraitRepairSig = $derived.by(() => {
		const oa = activePlayer?.operativeAvatar;
		const opp = activePlayer?.ownedPortraitParts;
		const ageBand =
			typeof activePlayer?.ageBand === 'string' ? activePlayer.ageBand
			: typeof authStore.userProfile?.ageBand === 'string' ? authStore.userProfile.ageBand
			: '';
		const oaNorm = oa && typeof oa === 'object' ? JSON.stringify(oa) : '';
		const oppNorm = Array.isArray(opp) ? JSON.stringify([...opp].sort()) : '';
		return `${email}:${ageBand}:${oaNorm}:${oppNorm}`;
	});

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		void profilePortraitRepairSig;
		if (!email) {
			lastPortraitRepairSig = '';
			displayOperativeAvatar = undefined;
			return;
		}
		if (profilePortraitRepairSig === lastPortraitRepairSig) return;
		lastPortraitRepairSig = profilePortraitRepairSig;

		const { operativeAvatar, ownedPortraitParts, didMigrate } = readRepairOperativeAvatar(
			activePlayer?.operativeAvatar,
			activePlayer?.ownedPortraitParts,
			{
				ageBand:
					typeof activePlayer?.ageBand === 'string' ? activePlayer.ageBand
					: typeof authStore.userProfile?.ageBand === 'string' ? authStore.userProfile.ageBand
					: undefined,
			},
		);
		displayOperativeAvatar = operativeAvatar;
		if (didMigrate) {
			void queuePortraitReadRepairWrite(email, { operativeAvatar, ownedPortraitParts });
		}
	});

	const operativeAvatarForHud = $derived(
		displayOperativeAvatar ?? activePlayer?.operativeAvatar,
	);

	const hasArmoryProfile = $derived(
		parseOperativePortrait(operativeAvatarForHud) !== null,
	);

	const nextEventLabel = $derived(resolveNextEventLabel(nextScheduleEvent));
	const ownedSeasonOneCardIds = $derived(
		Array.isArray(activePlayer?.ownedSeasonOneCards) ?
			activePlayer.ownedSeasonOneCards.filter((id) => typeof id === 'string')
		:	[],
	);
	const hqCardMetadata = $derived(
		resolveOperativeCardMetadata({
			operativeLoadout: activePlayer?.operativeLoadout,
			ownedSeasonOneCards: ownedSeasonOneCardIds,
			totalXp: totalXpHud,
			rankName: rankProgress.rank,
			emailKey: email,
		}),
	);
	const completedAlbumSetChips = $derived(
		getCompletedAlbumSetChipLabels(ownedSeasonOneCardIds),
	);
	const hqStatusBadges = $derived(
		resolveHqStatusBadges({
			profileIncomplete: !hasArmoryProfile,
			streak,
			lastTrainingUtc,
			coachBountyCount,
			heroQuestId,
			suppressProfileIncompleteBadge: !hasArmoryProfile,
			completedAlbumSetChips,
		}),
	);

	/** @type {string} */
	let teamAssignmentLabel = $state('');
	let clubDisplayName = $state('');

	$effect(() => {
		if (!browser) return;
		const u = authStore.user;
		untrack(() => {
			if (authStore.role === 'player' && u?.uid) {
				playerEngine.attach(u.uid);
			} else {
				playerEngine.detach();
			}
		});
		return () => {
			untrack(() => playerEngine.detach());
		};
	});

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		if (!browser || authStore.isLoading || !uid) {
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
				untrack(() => dopamineEngine.hydrate(statsRaw));
			},
			(e) => {
				console.error('[player dashboard] player_stats', e);
				statsRaw = null;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		if (!browser || authStore.isLoading) return;
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

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		if (!browser) return;
		const profile = activePlayer;
		let cancelled = false;
		(async () => {
			const name = await fetchClubDisplayName(db, profile);
			if (!cancelled) clubDisplayName = name;
		})();
		return () => {
			cancelled = true;
		};
	});

	async function loadLegacyScheduleFallback(tid: string, now: Date) {
		// T0-2: read from team_workouts (coach-written), client-filter scheduled_event.
		const fallbackQ = query(collection(db, 'team_workouts'), where('teamId', '==', tid));
		const snap = await getDocs(fallbackQ);
		const events = snap.docs
			.filter((d) => d.data().recordType === 'scheduled_event')
			.map((d) => mapScheduleDoc(d.id, d.data()));
		nextScheduleEvent = pickNextScheduleEvent(events, now);
	}

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		if (!browser || authStore.isLoading) return;
		const tid =
			typeof activePlayer?.teamId === 'string' ? activePlayer.teamId.trim() : '';
		if (!tid || tid === 'admin') {
			nextScheduleEvent = null;
			return;
		}

		const now = new Date();
		// T0-2: repointed from `schedules`/`startAt` to `team_workouts`/`startTimestamp`.
		// recordType filtered client-side to avoid a 3-field composite index
		// (teamId + recordType + startTimestamp). Requires composite index: teamId + startTimestamp.
		const scheduleQ = query(
			collection(db, 'team_workouts'),
			where('teamId', '==', tid),
			where('startTimestamp', '>=', now.getTime()),
			orderBy('startTimestamp', 'asc'),
			limit(5),
		);

		let cancelled = false;

		const unsub = onSnapshot(
			scheduleQ,
			(snap) => {
				if (cancelled) return;
				const scheduledDocs = snap.docs.filter(
					(d) => d.data().recordType === 'scheduled_event',
				);
				if (scheduledDocs.length > 0) {
					nextScheduleEvent = mapScheduleDoc(scheduledDocs[0].id, scheduledDocs[0].data());
					return;
				}
				void loadLegacyScheduleFallback(tid, now).catch(() => {
					if (!cancelled) nextScheduleEvent = null;
				});
			},
			(e) => {
				console.warn('[player dashboard] team_workouts schedule', e);
				void loadLegacyScheduleFallback(tid, now).catch(() => {
					if (!cancelled) nextScheduleEvent = null;
				});
			},
		);

		return () => {
			cancelled = true;
			unsub();
		};
	});

	// Read-Repair: silently stamp sportId = 'soccer' on user profiles missing it.
	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
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
		class="player-dossier-root tw-flex tw-h-64 tw-min-h-[40vh] tw-w-full tw-items-center tw-justify-center tw-py-16"
		style="background: var(--pd-bg, #000); color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<Icon name="status.loading" class="tw-animate-spin tw-text-4xl tw-text-[color:var(--pd-text-muted,rgba(255,255,255,0.5))]" />
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
<main class="tw-bg-[#000000] tw-min-h-screen tw-text-white tw-font-sans tw-relative tw-z-0 tw-p-8 lg:tw-p-12 tw-overflow-y-auto" data-dopamine={vanguardFlags.dopamineEnabled ? 'on' : 'off'}>
	<!-- Z1: Structural Layout (12-col Bento) -->
	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-8 tw-max-w-7xl tw-mx-auto tw-z-10 tw-relative">
		
		<!-- Z2: Dynamic Streak Counters & EXACTLY ONE ACTION GOLD CTA -->
		<section class="lg:tw-col-span-12 tw-flex tw-items-center tw-justify-between tw-z-20 tw-mt-4">
			<div class="tw-bg-[#0f172a] tw-p-6 tw-flex tw-items-center tw-gap-6" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
				<div>
					<p class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-tracking-widest tw-uppercase tw-mb-1">Callsign // {callsign || 'Operative'}</p>
					<h1 class="tw-font-mono tw-text-2xl tw-text-[#f8fafc] tw-uppercase">{rankProgress.rank}</h1>
				</div>
				<div class="tw-h-12 tw-w-px tw-bg-[#334155]"></div>
				<PlayerActivityStreak {armory} />
			</div>
			
			<button class="tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-[#000000] tw-font-bold tw-font-mono tw-px-10 tw-py-5 tw-uppercase tw-tracking-widest tw-transition-colors" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);" onclick={() => goto('/player/armory?tab=studio')}>
				[ INITIATE WORKOUT ]
			</button>
		</section>

		<!-- Z2: Vanguard Prism (6-axis Radar) -->
		<section class="lg:tw-col-span-8 tw-bg-[#0f172a] tw-p-8 tw-relative tw-z-20 tw-flex tw-flex-col" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
			<header class="tw-mb-6">
				<h2 class="tw-font-mono tw-text-lg tw-text-[#f8fafc] tw-uppercase tw-tracking-widest">Vanguard Telemetry</h2>
				<p class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase tw-tracking-widest">Synthetic Nodes</p>
			</header>
			<div class="tw-flex-1 tw-min-h-[300px]">
				<VanguardProtocolPanel
					prismValues={attrRadarValues}
					bind:selectedAxis={selectedVanguardAxis}
					compact={!telemetryReady}
					hideHeadTitle={true}
				/>
			</div>
		</section>

		<!-- Z2: Octalysis Quests & Intel -->
		<section class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-8 tw-z-20 tw-min-w-0">
			<div class="tw-bg-[#0f172a] tw-p-8 tw-relative" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
				<header class="tw-mb-4">
					<h2 class="tw-font-mono tw-text-lg tw-text-[#f8fafc] tw-uppercase tw-tracking-widest">Active Bounties</h2>
				</header>
				<ActiveBounties
					embedded
					lastTrainingUtc={lastTrainingUtc}
					onCoachBountyCount={(count) => (coachBountyCount = count)}
					onHeroQuestId={(id) => (heroQuestId = id)}
				/>
				<div class="tw-mt-4">
					<BountyBoard engine={dopamineEngine} playerId={uid} />
				</div>
			</div>

			<div class="tw-bg-[#0f172a] tw-p-8 tw-relative" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
				{#if vanguardFlags.capsulesEnabled && trajectoryEngine.activeCapsule}
					<header class="tw-mb-4">
						<h2 class="tw-font-mono tw-text-lg tw-text-[#f8fafc] tw-uppercase tw-tracking-widest">Memory Capsules</h2>
						<p class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase tw-tracking-widest">Self Comparison</p>
					</header>
					<MemoryCapsuleArena
						dossierMode={true}
						capsule={trajectoryEngine.activeCapsule}
						baselineDaysAgo={trajectoryEngine.baselineDaysAgo}
						capsuleHeadline={trajectoryEngine.capsuleHeadline}
					/>
				{:else}
					<div class="tw-flex tw-items-center tw-justify-center tw-h-32 tw-text-center">
						<p class="tw-font-mono tw-text-sm tw-text-[#334155] tw-uppercase tw-tracking-widest">Awaiting First Memory Capsule</p>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>

<!-- Sprint 9.2: Initialize Operative — distinct one-time setup modal -->
{#if showInitModal}
<div
	class="init-modal-scrim tw-fixed tw-inset-0 tw-z-[500] tw-flex tw-items-center tw-justify-center tw-p-4"
	style="background: var(--surface-modal-scrim, rgba(0,0,0,0.75)); backdrop-filter: blur(4px);"
	role="presentation"
	onclick={(e) => { if (e.target === e.currentTarget) showInitModal = false; }}
>
	<div
		class="init-modal pd-panel tw-relative tw-w-full tw-max-w-md tw-p-6 tw-shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="init-modal-h"
	>
		<button
			type="button"
			class="init-modal__close tw-absolute tw-right-3 tw-top-3 tw-flex tw-min-h-[44px] tw-min-w-[44px] tw-items-center tw-justify-center tw-rounded-lg"
			onclick={() => (showInitModal = false)}
			aria-label="Close"
		>
			<Icon name="sys.close" size={14} />
		</button>

		<div class="init-modal__head bento-mb-md tw-pb-3">
			<p class="pd-eyebrow tw-m-0">
				One-time setup · SOAR
			</p>
			<h2
				id="init-modal-h"
				class="pd-strap__title tw-m-0 tw-mt-1.5 tw-text-lg"
			>
				Finish your profile
			</h2>
		</div>

		<p class="init-modal__body tw-m-0 tw-text-sm tw-leading-relaxed">
			Your player profile is not complete yet. Set your avatar, position, and sport in the Armory
			to unlock the full Player OS.
		</p>

		<ul class="init-modal__steps bento-mt-md tw-list-none tw-m-0 tw-p-0 tw-space-y-1.5">
			{#each ['Choose your player avatar', 'Set your position and sport', 'Review your gear unlocks'] as step, i}
				<li class="init-modal__step tw-flex tw-min-w-0 tw-items-center tw-gap-2.5 tw-font-mono tw-text-[0.6rem] tw-font-semibold tw-uppercase tw-tracking-[0.12em]">
					<span class="init-modal__step-num tw-flex tw-h-4 tw-w-4 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-sm tw-text-[0.5rem] tw-font-black">{i + 1}</span>
					{step}
				</li>
			{/each}
		</ul>

		<div class="bento-mt-lg tw-flex tw-flex-wrap tw-items-center tw-gap-3">
			<a
				href="/player/armory?tab=studio"
				class="init-modal__cta init-modal__cta--primary tw-inline-flex tw-min-h-[44px] tw-w-fit tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-font-mono tw-text-[0.5625rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-no-underline tw-transition-all tw-duration-150 active:tw-scale-[0.98]"
				data-sveltekit-preload-data="hover"
				onclick={() => (showInitModal = false)}
			>
				<Icon name="status.shield-check" size={13} />
				Open Identity Studio
			</a>
			<button
				type="button"
				class="init-modal__cta init-modal__cta--secondary tw-inline-flex tw-min-h-[44px] tw-w-fit tw-items-center tw-justify-center tw-px-4 tw-font-mono tw-text-[0.5625rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-transition-all tw-duration-150 active:tw-scale-[0.98]"
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
</style>
