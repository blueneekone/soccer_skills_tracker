<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import OperativeAvatarPreview from '$lib/components/player/OperativeAvatarPreview.svelte';
	import AttributeRadar from './AttributeRadar.svelte';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { deriveVanguardPrism } from '$lib/utils/vanguard-prism.js';
	import { parseOperativeAvatar } from '$lib/avatars/operativeAvatar.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import {
		getAttributeSchemaForSport,
		hasDocumentedSkillRatings,
		pickSkillRatingForKey,
	} from '$lib/utils/sport-attributes.js';
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
	const attributeSchema = $derived(getAttributeSchemaForSport(resolvedSportRaw));

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

	/** @type {Array<{ id: string; title: string; routeCount: number; xpBounty: number; thumbRoutes: Array<{ x1: number; y1: number; cx: number; cy: number; x2: number; y2: number; color: string }> }>} */
	let tacticalDeployments = $state([]);
	let deploymentsLoading = $state(true);

	// Mock TacticalCartridge fallback — used when no live deployments in Firestore.
	// Route color palette: flat analytics-grade — no neon, no cyan glow.
	//   #f1f5f9 slate-50  — primary attack route
	//   #14b8a6 teal-500  — supporting run
	//   #fbbf24 amber-400 — set piece trigger
	//   #ef4444 red-500   — pressing trigger
	const MOCK_CARTRIDGES = [
		{
			id: 'cart-mock-alpha',
			title: 'Phoenix · 4-3-3 Press',
			routeCount: 3,
			xpBounty: 240,
			thumbRoutes: [
				{ x1: 30, y1: 70, cx: 60, cy: 25, x2: 92, y2: 35, color: '#f1f5f9' },
				{ x1: 50, y1: 78, cx: 70, cy: 50, x2: 88, y2: 60, color: '#14b8a6' },
				{ x1: 18, y1: 55, cx: 40, cy: 40, x2: 75, y2: 25, color: '#fbbf24' },
			],
		},
		{
			id: 'cart-mock-bravo',
			title: 'Vanguard · Counter Strike',
			routeCount: 2,
			xpBounty: 180,
			thumbRoutes: [
				{ x1: 22, y1: 80, cx: 55, cy: 40, x2: 90, y2: 22, color: '#f1f5f9' },
				{ x1: 38, y1: 72, cx: 62, cy: 55, x2: 85, y2: 50, color: '#ef4444' },
			],
		},
		{
			id: 'cart-mock-charlie',
			title: 'Aegis · Set Piece Spin',
			routeCount: 4,
			xpBounty: 320,
			thumbRoutes: [
				{ x1: 42, y1: 18, cx: 55, cy: 45, x2: 70, y2: 70, color: '#f1f5f9' },
				{ x1: 28, y1: 28, cx: 50, cy: 55, x2: 78, y2: 38, color: '#14b8a6' },
				{ x1: 60, y1: 25, cx: 70, cy: 50, x2: 92, y2: 55, color: '#fbbf24' },
				{ x1: 18, y1: 62, cx: 38, cy: 70, x2: 65, y2: 80, color: '#ef4444' },
			],
		},
	];

	const missionLogEntries = $derived.by(() => {
		if (tacticalDeployments.length > 0) {
			return tacticalDeployments.map((d) => ({
				...d,
				thumbRoutes: d.thumbRoutes && d.thumbRoutes.length > 0
					? d.thumbRoutes
					: MOCK_CARTRIDGES[0].thumbRoutes,
			}));
		}
		return MOCK_CARTRIDGES;
	});

	/** @type {string} */
	let teamAssignmentLabel = $state('');

	const callsign = $derived(
		(activePlayer?.playerName && String(activePlayer.playerName).trim()) ||
			email.split('@')[0] ||
			'—',
	);

	const operativeAvatarConfig = $derived(parseOperativeAvatar(activePlayer?.operativeAvatar));

	const xpHudCompact = $derived.by(() => {
		const x = totalXpHud;
		if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
		if (x >= 100_000) return `${Math.round(x / 1000)}k`;
		if (x >= 1000) return `${(x / 1000).toFixed(1)}k`;
		return x.toLocaleString();
	});

	const sportHudToken = $derived((resolvedSportRaw || '—').slice(0, 4).toUpperCase());

	const combatTelemetryReady = $derived(
		hasDocumentedSkillRatings(
			statsRaw && typeof statsRaw === 'object' ?
				/** @type {Record<string, unknown>} */ (statsRaw)
			:	null,
			attributeSchema,
		),
	);

	const combatHudRows = $derived.by(() => {
		const schema = attributeSchema;
		const keys = schema.keys;
		const labels = schema.labels;
		if (!combatTelemetryReady) {
			return labels.map((label) => ({ label, pct: 0, display: '00' }));
		}
		const raw = /** @type {Record<string, unknown>} */ (statsRaw);
		return keys.map((key, i) => {
			const v = pickSkillRatingForKey(raw, key) ?? 0;
			const clamped = Math.min(99, Math.max(0, v));
			return {
				label: labels[i] ?? key,
				pct: Math.round((clamped / 99) * 1000) / 10,
				display: String(clamped).padStart(2, '0'),
			};
		});
	});

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
			tacticalDeployments = [];
			deploymentsLoading = false;
			return;
		}
		const tid = /** @type {string | undefined} */ (activePlayer?.teamId);
		if (!tid || tid === 'admin') {
			tacticalDeployments = [];
			deploymentsLoading = false;
			return;
		}
		const q = query(
			collection(db, 'tactical_deployments'),
			where('teamId', '==', tid),
			orderBy('createdAt', 'desc'),
			limit(5),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				tacticalDeployments = snap.docs.map((d) => {
					const data = d.data();
					/** @type {Array<{ x1: number; y1: number; cx: number; cy: number; x2: number; y2: number; color: string }>} */
					const thumbRoutes = Array.isArray(data.routes)
						? data.routes.slice(0, 4).map((r) => ({
							x1: Number(r?.x1) / 16 || 30,
							y1: Number(r?.y1) / 9 || 50,
							cx: Number(r?.cx) / 16 || 55,
							cy: Number(r?.cy) / 9 || 40,
							x2: Number(r?.x2) / 16 || 80,
							y2: Number(r?.y2) / 9 || 30,
							color: typeof r?.color === 'string' ? r.color : '#f1f5f9',
						}))
						: [];
					return {
						id: d.id,
						title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Untitled Play',
						routeCount: Math.max(0, Number(data.routeCount) || (Array.isArray(data.routes) ? data.routes.length : 0)),
						xpBounty: Math.max(0, Number(data.xpBounty) || 0),
						thumbRoutes,
					};
				});
				deploymentsLoading = false;
			},
			(e) => {
				console.error('[player dashboard] tactical_deployments', e);
				tacticalDeployments = [];
				deploymentsLoading = false;
			},
		);
		return () => unsub();
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
		class="tw-flex tw-h-64 tw-min-h-[40vh] tw-w-full tw-items-center tw-justify-center tw-bg-slate-950 tw-py-16 tw-text-slate-400"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<Icon name="status.loading" class="tw-animate-spin tw-text-4xl tw-text-slate-400" />
		<span class="tw-sr-only">Loading player dashboard</span>
	</div>
{:else if !activePlayer}
	<div
		class="tw-mx-auto tw-flex tw-min-h-[40vh] tw-max-w-lg tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-rounded-xl tw-border tw-border-amber-500/25 tw-bg-slate-950/90 tw-px-6 tw-py-14 tw-text-center tw-text-slate-200"
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
	class="lobby-page tw-relative tw-isolate tw-min-w-0 tw-overflow-x-hidden tw-bg-slate-950 tw-text-slate-50"
	data-region="player-lobby"
>
	<!-- Top HUD: level ring + compact career readouts (streak lives on operative card) -->
	<header
		class="lobby-hud-bar tw-relative tw-z-40 tw-mb-6 tw-w-full tw-border-b tw-border-slate-800 tw-bg-slate-900/90 tw-backdrop-blur-xl"
		aria-label="Combat HUD"
	>
		<div
			class="tw-mx-auto tw-flex tw-w-full tw-max-w-6xl tw-min-w-0 tw-items-stretch tw-gap-0 tw-px-3 sm:tw-px-5"
		>
			<!-- Tile 1: Level ring -->
			<div
				class="lobby-hud-tile lobby-hud-tile--primary tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-1 tw-border-r tw-border-slate-800 tw-px-4 tw-py-3 sm:tw-px-6"
				aria-label="Level"
			>
				<div class="lobby-hud-ring__inner">
					<LevelProgressRing
						currentXp={rankProgress.xpInCurrentTier}
						nextRankXp={rankProgress.xpToNextRank}
						rankName={rankProgress.rank}
						totalXp={totalXpHud}
						level={osLevel}
						size="lg"
						variant="dark"
						showLevelSegment={true}
					/>
				</div>
				<span class="tw-font-mono tw-text-[0.5rem] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-slate-500">Level</span>
			</div>
			<!-- Tile 2: XP -->
			<div
				class="lobby-hud-tile tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center tw-gap-0.5 tw-border-r tw-border-slate-800 tw-px-4 tw-py-3 sm:tw-px-6"
				aria-label="Total XP"
			>
				<span class="tw-font-mono tw-text-[0.5rem] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-slate-500">XP</span>
				<span class="tabular-num tw-min-w-0 tw-truncate tw-font-mono tw-text-lg tw-font-black tw-leading-none tw-tracking-tight tw-text-slate-100" title={String(totalXpHud)}>{xpHudCompact}</span>
			</div>
			<!-- Tile 3: Streak -->
			<div
				class="lobby-hud-tile tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center tw-gap-0.5 tw-px-4 tw-py-3 sm:tw-px-6"
				aria-label="Training streak"
			>
				<span class="tw-font-mono tw-text-[0.5rem] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-slate-500">Streak</span>
				<span class="tabular-num tw-font-mono tw-text-lg tw-font-black tw-leading-none tw-tracking-tight tw-text-teal-400">{streak}d</span>
				<span class="tabular-num tw-font-mono tw-text-[0.5rem] tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-600">Best {longestStreak}d</span>
			</div>
		</div>
	</header>

	<!-- Sprint 9.2: converted from flex-column to 12-col asymmetric bento grid -->
	<div
		class="lobby-root bento-grid bento-grid--12col tw-relative tw-z-30 tw-mx-auto tw-box-border tw-min-w-0 tw-w-full tw-max-w-6xl tw-overflow-x-hidden tw-px-3 tw-pb-28 tw-pt-0 sm:tw-px-5"
	>
	<div
		class="lobby-hero bento-span-12 bento-card bento-grid bento-grid--2col tw-relative tw-z-30 tw-min-h-0 tw-min-w-0 tw-items-stretch tw-p-4 md:tw-p-5"
		aria-label="Operative profile"
	>
		<div
			class="operative-stack tw-relative tw-z-50 tw-flex tw-h-full tw-min-h-0 tw-min-w-0 tw-w-full tw-flex-col tw-items-stretch"
		>
			<div class="operative-casefile operative-casefile--siem tw-flex tw-h-full tw-min-h-0 tw-w-full tw-flex-1 tw-flex-col">
				<div
					class="operative-casefile__rail tw-mb-0 tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-gap-2 tw-border-b tw-border-slate-700/90 tw-pb-1.5 tw-font-mono tw-text-[0.55rem] tw-font-semibold tw-uppercase tw-tracking-[0.18em] tw-text-slate-500"
					aria-hidden="true"
				>
					<span class="tw-truncate">SOAR · casefile</span>
					<span class="tw-shrink-0 tw-tabular-nums tw-text-slate-600">OP-ASSET</span>
				</div>
				<div
					class="operative-siem-statusrow tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-gap-2 tw-border-b tw-border-slate-800 tw-py-1.5 tw-font-mono tw-text-[0.5rem] tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500"
				>
					<span class="tw-min-w-0 tw-truncate">Field operative · clearance</span>
					<span
						class="tw-shrink-0 tw-rounded-sm tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-1.5 tw-py-0.5 tw-tabular-nums tw-tracking-widest tw-text-slate-400"
					>
						LV {osLevel}
					</span>
				</div>
				<div
					class="operative-siem-body tw-mt-3 tw-flex tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col tw-items-stretch tw-gap-4 sm:tw-flex-row"
				>
				<div
					class="operative-siem-photo tw-relative tw-mx-auto tw-aspect-square tw-w-full tw-max-w-[176px] tw-shrink-0 tw-overflow-hidden tw-rounded-full sm:tw-mx-0"
				>
					<OperativeAvatarPreview
						config={operativeAvatarConfig}
						size={176}
						showInitializeCta={false}
						class="tw-block tw-h-full tw-w-full tw-rounded-full tw-object-cover"
					/>
				</div>
					<div class="operative-siem-meta tw-flex tw-h-full tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-2">
						<p
							class="tw-m-0 tw-font-mono tw-text-[0.5rem] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-slate-500"
						>
							Subject
						</p>
						<p
							class="tw-m-0 tw-min-w-0 tw-truncate tw-font-mono tw-text-base tw-font-black tw-tracking-tight tw-text-slate-50 md:tw-text-lg"
							title={callsign}
						>
							{callsign}
						</p>
						<p
							class="tw-m-0 tw-min-w-0 tw-line-clamp-2 tw-text-[0.65rem] tw-font-medium tw-leading-snug tw-tracking-wide tw-text-slate-500"
							title={teamAssignmentLabel || 'No team assignment'}
						>
							{teamAssignmentLabel || 'No team assignment'}
						</p>
						<p
							class="tw-m-0 tw-min-w-0 tw-truncate tw-font-mono tw-text-[0.55rem] tw-font-semibold tw-tracking-wide tw-text-slate-600"
							title={rankProgress.rank}
						>
							Rank · {rankProgress.rank}
						</p>
					<div class="tw-mt-auto tw-pt-1 tw-flex tw-min-w-0 tw-items-center tw-gap-2">
						<div class="operative-siem-tile tw-flex-1 tw-min-w-0">
							<span class="operative-siem-tile__k">Sport</span>
							<span class="operative-siem-tile__v tw-truncate" title={resolvedSportRaw}>{sportHudToken}</span>
						</div>
						<div class="operative-siem-tile tw-flex-1 tw-min-w-0">
							<span class="operative-siem-tile__k">Rank</span>
							<span class="operative-siem-tile__v tw-truncate" title={rankProgress.rank}>{rankProgress.rank.slice(0, 8)}</span>
						</div>
					</div>
					</div>
				</div>
			{#if !operativeAvatarConfig}
				<div class="tw-mt-auto tw-shrink-0 tw-pt-3">
					<a
						href={resolve('/player/armory')}
						class="operative-init-btn tw-inline-flex tw-w-fit tw-min-h-[44px] tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-slate-700 tw-bg-slate-800 tw-px-4 tw-py-2.5 tw-font-mono tw-text-[0.5625rem] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-text-slate-100 tw-no-underline tw-transition-all tw-duration-150 hover:tw-border-slate-600 hover:tw-bg-slate-700 hover:tw-text-white active:tw-scale-[0.98]"
						data-sveltekit-preload-data="hover"
					>
						Initialize Operative
					</a>
				</div>
			{/if}
			</div>
		</div>

		<section
			class="combat-hud-shell tw-relative tw-z-50 tw-flex tw-h-full tw-min-h-0 tw-min-w-0 tw-w-full tw-flex-col tw-gap-3 tw-rounded-xl tw-border tw-border-slate-800 tw-bg-slate-950 tw-p-4 md:tw-p-5"
			aria-label="Core attributes and navigation"
		>
			<h2
				class="combat-attributes-heading tw-min-w-0 tw-text-center tw-text-slate-400 md:tw-text-left"
			>
				Core attributes
			</h2>
			<ul
				class="combat-attributes-list tw-m-0 tw-min-w-0 tw-w-full tw-list-none tw-space-y-2.5 tw-p-0 sm:tw-space-y-3"
				aria-label="Combat attribute bars"
			>
				{#each combatHudRows as row (row.label)}
					<li class="tw-min-w-0 tw-w-full">
						<div
							class="tw-mb-1.5 tw-flex tw-min-w-0 tw-w-full tw-items-baseline tw-justify-between tw-gap-3 tw-text-[0.7rem]"
						>
						<span
							class="tw-min-w-0 tw-flex-1 tw-truncate tw-font-black tw-uppercase tw-leading-tight tw-tracking-[0.12em] tw-text-slate-400"
							title={row.label}
						>
							{row.label}
						</span>
							<span
								class="tw-shrink-0 tw-font-mono tw-text-sm tw-font-black tw-tabular-nums tw-tracking-wide tw-text-slate-100"
							>
								{row.display}
							</span>
						</div>
						<div
							class="tw-h-2 tw-overflow-hidden tw-rounded-full tw-border tw-border-white/5 tw-bg-slate-900/80"
							role="presentation"
						>
							<div
								class="tw-h-full tw-rounded-full tw-bg-teal-500 tw-transition-[width] tw-duration-500"
								style={`width: ${row.pct}%;`}
							></div>
						</div>
					</li>
				{/each}
			</ul>
			{#if !combatTelemetryReady}
				<p
					class="tw-mb-0 tw-mt-1 tw-text-center tw-text-[0.65rem] tw-font-semibold tw-uppercase tw-tracking-[0.12em] tw-text-slate-500 md:tw-text-left"
				>
					Awaiting Coach Telemetry.
				</p>
			{/if}
		<nav
			class="lobby-quick-nav tw-mt-4 tw-flex tw-w-full tw-min-w-0 tw-flex-wrap tw-gap-3 tw-border-t tw-border-slate-800 tw-pt-3"
			aria-label="Primary navigation"
		>
			<a
				href={resolve('/player/tracker')}
				class="lobby-quick-nav__tile tw-group tw-inline-flex tw-w-fit tw-min-h-[44px] tw-min-w-[44px] tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-900 tw-px-4 tw-py-2.5 tw-text-center tw-no-underline tw-transition-colors tw-duration-150 hover:tw-border-slate-600 hover:tw-bg-slate-800 active:tw-scale-[0.98]"
				data-sveltekit-preload-data="hover"
				data-sveltekit-reload
			>
				<Icon
					name="game.zap"
					class="tw-shrink-0 tw-text-base tw-text-slate-400 tw-transition-transform tw-duration-150 group-hover:tw-scale-105"
				/>
				<span
					class="tw-font-mono tw-text-[0.58rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-[0.14em] tw-text-slate-200"
				>
					Today's Quests
				</span>
			</a>
			<a
				href={resolve('/player/armory')}
				class="lobby-quick-nav__tile tw-group tw-inline-flex tw-w-fit tw-min-h-[44px] tw-min-w-[44px] tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-900 tw-px-4 tw-py-2.5 tw-text-center tw-no-underline tw-transition-colors tw-duration-150 hover:tw-border-slate-600 hover:tw-bg-slate-800 active:tw-scale-[0.98]"
				data-sveltekit-preload-data="hover"
				data-sveltekit-reload
			>
				<Icon
					name="data.trending"
					class="tw-shrink-0 tw-text-base tw-text-slate-400 tw-transition-transform tw-duration-150 group-hover:tw-scale-105"
				/>
				<span
					class="tw-font-mono tw-text-[0.58rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-[0.14em] tw-text-slate-200"
				>
					Career Stats
				</span>
			</a>
		</nav>
		</section>
	</div>

	<section
		class="lobby-radar bento-span-8 bento-card tw-relative tw-z-40 tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-p-5 md:tw-p-6"
		aria-labelledby="lobby-radar-h"
	>
		<header class="tw-relative tw-z-50 tw-mb-3 tw-min-w-0">
			<p class="lobby-eyebrow tw-mb-1 tw-min-w-0 tw-break-words tw-text-slate-400">Combat stats</p>
			<h2
				id="lobby-radar-h"
				class="tw-m-0 tw-min-w-0 tw-break-words tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100"
			>
				Attribute radar
			</h2>
			<p
				class="tw-m-0 tw-mt-1 tw-min-w-0 tw-break-words tw-line-clamp-3 tw-text-xs tw-leading-relaxed tw-text-slate-500"
			>
				Six-axis Vanguard Prism — your live combat profile. Keep logging to harden the shape.
			</p>
		</header>
		<div
			class="lobby-radar-canvas tw-relative tw-z-30 tw-min-h-0 tw-min-w-0 tw-flex-1 tw-rounded-2xl tw-border tw-border-slate-800 tw-bg-slate-950 tw-p-4"
		>
			<div class="tw-relative tw-z-50 tw-flex tw-min-h-[260px] tw-max-w-sm tw-w-full tw-mx-auto tw-items-center tw-justify-center">
				<AttributeRadar values={attrRadarValues} />
			</div>
		</div>
	</section>

	<section
		class="bento-span-4 bento-card tw-relative tw-z-40 tw-min-w-0 tw-overflow-hidden tw-p-5 md:tw-p-6"
		aria-labelledby="lobby-capsules-h"
	>
		<header class="tw-mb-3 tw-min-w-0">
			<p class="lobby-eyebrow tw-mb-1 tw-text-slate-400">Self comparison</p>
			<h2
				id="lobby-capsules-h"
				class="tw-m-0 tw-min-w-0 tw-break-words tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100"
			>
				Time-Lapse Memory Capsules
			</h2>
			<p class="tw-mt-1 tw-min-w-0 tw-break-words tw-text-xs tw-leading-relaxed tw-text-slate-500">
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

	<section
		class="bento-span-12 bento-card tw-relative tw-z-40 tw-min-w-0 tw-overflow-hidden tw-p-5 md:tw-p-6"
		aria-labelledby="lobby-mission-log-h"
	>
		<header class="tw-relative tw-z-50 tw-mb-4 tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-slate-800 tw-pb-3">
			<div class="tw-min-w-0">
				<p class="lobby-eyebrow tw-mb-1 tw-min-w-0 tw-break-words tw-text-slate-400">Tactical ops</p>
				<h2
					id="lobby-mission-log-h"
					class="tw-m-0 tw-min-w-0 tw-break-words tw-font-sans tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100"
				>
					MISSION LOG
				</h2>
			</div>
			<span class="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-2.5 tw-py-1 tw-font-mono tw-text-[10px] tw-font-bold tw-tabular-nums tw-tracking-widest tw-text-slate-300">
				<span class="tw-block tw-h-1.5 tw-w-1.5 tw-animate-pulse tw-rounded-full tw-bg-teal-400"></span>
				{missionLogEntries.length} CARTRIDGES
			</span>
		</header>
		<div class="tw-relative tw-z-50 tw-min-w-0">
			{#if deploymentsLoading}
				<p class="tw-flex tw-items-center tw-gap-2 tw-py-4 tw-font-mono tw-text-xs tw-text-slate-500">
					<Icon name="status.loading" class="tw-animate-spin" />
					SYNCING CARTRIDGES…
				</p>
			{:else}
				<ul class="tw-m-0 tw-grid tw-list-none tw-grid-cols-1 tw-gap-4 tw-p-0 sm:tw-grid-cols-2 md:tw-gap-6">
					{#each missionLogEntries as dep (dep.id)}
						<li class="tw-group tw-flex tw-min-w-0 tw-flex-col tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-800 tw-bg-slate-900 tw-transition-colors tw-duration-150 hover:tw-border-slate-700">
						<!-- Pitch thumbnail -->
						<div class="tw-relative tw-aspect-video tw-w-full tw-overflow-hidden tw-border-b tw-border-slate-800 tw-bg-slate-950">
							<svg class="tw-block tw-h-full tw-w-full" viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
									<rect x="0" y="0" width="100" height="56" fill="#0f172a" />
									<!-- Pitch markings — high-contrast slate-50 @ 30%, analytics-grade -->
									<rect x="2" y="2" width="96" height="52" fill="none" stroke="rgba(241,245,249,0.30)" stroke-width="0.5" />
									<line x1="50" y1="2" x2="50" y2="54" stroke="rgba(241,245,249,0.25)" stroke-width="0.5" />
									<circle cx="50" cy="28" r="6" fill="none" stroke="rgba(241,245,249,0.25)" stroke-width="0.5" />
									<rect x="2" y="18" width="10" height="20" fill="none" stroke="rgba(241,245,249,0.25)" stroke-width="0.5" />
									<rect x="88" y="18" width="10" height="20" fill="none" stroke="rgba(241,245,249,0.25)" stroke-width="0.5" />
									<!-- Routes — flat, no neon filter -->
									{#each dep.thumbRoutes as r, ri (ri)}
										<path
											d={`M ${r.x1} ${r.y1} Q ${r.cx} ${r.cy} ${r.x2} ${r.y2}`}
											fill="none"
											stroke={r.color}
											stroke-width="1.6"
											stroke-linecap="round"
										/>
										<circle cx={r.x2} cy={r.y2} r="1.8" fill={r.color} />
									{/each}
								</svg>
							</div>
							<!-- Card body -->
							<div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-2 tw-p-3">
								<div class="tw-flex tw-min-w-0 tw-items-baseline tw-justify-between tw-gap-2">
									<p
										class="tw-m-0 tw-min-w-0 tw-break-words tw-font-mono tw-text-sm tw-font-bold tw-leading-snug tw-text-slate-100 tw-line-clamp-2"
										title={dep.title}
									>
										{dep.title}
									</p>
									<span class="tw-shrink-0 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-500">
										{dep.routeCount} RT
									</span>
								</div>
								<div class="tw-flex tw-min-w-0 tw-items-center tw-justify-between tw-gap-3">
									<div class="tw-flex tw-min-w-0 tw-flex-col tw-overflow-hidden">
										<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-white/40">
											XP BOUNTY
										</span>
										<span class="tw-font-mono tw-text-base tw-font-black tw-tabular-nums tw-text-teal-400">
											+{dep.xpBounty}
										</span>
									</div>
									<button
										type="button"
										class="tw-pointer-events-auto tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-3 tw-min-h-[44px] tw-min-w-[44px] tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-200 tw-transition-all tw-duration-150 hover:tw-border-slate-600 hover:tw-bg-slate-800 active:tw-scale-95"
										aria-label="Start session for {dep.title}"
									>
										<Icon name="status.circle-play" class="tw-text-xs" />
										START SESSION
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
	</div>
</div>

{/if}

<style>
	.lobby-hud-ring__inner {
		/* Size is controlled via the size="lg" prop on LevelProgressRing — no scale() transform
		   to avoid pushing text outside the SVG boundary. */
	}

	.lobby-hud-tile {
		box-sizing: border-box;
		min-width: 0;
	}

	.lobby-hud-tile--primary {
		flex-shrink: 1;
		flex-basis: auto;
	}

	.lobby-root {
		color: #f8fafc;
	}

	/* lobby-glass retained ONLY for the sticky top HUD bar (a floating chrome strip). */
	.lobby-glass {
		border-radius: 0;
		background: rgb(15 23 42 / 0.85);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
	}

	/* Opaque data cards — used everywhere glassmorphism is forbidden. */
	.bento-card {
		border-radius: 1.5rem;
		overflow: hidden;
		min-width: 0;
		border: 1px solid rgb(30 41 59); /* slate-800 */
		background: rgb(15 23 42); /* slate-900 */
	}

	/* Operative hero: balanced RPG-style split — player card | core attributes */
	.lobby-hero.bento-grid--2col {
		align-items: stretch;
	}

	@media (min-width: 40rem) {
		.lobby-hero.bento-grid--2col {
			grid-template-columns: minmax(0, 12fr) minmax(0, 12fr);
		}
	}

	.lobby-hero.bento-grid--2col > * {
		min-height: 0;
	}

	.combat-hud-shell {
		box-sizing: border-box;
	}

	.lobby-quick-nav__tile:focus-visible {
		outline: 2px solid rgb(20 184 166 / 0.45);
		outline-offset: 2px;
	}

	.lobby-eyebrow {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.combat-attributes-heading {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.75rem, 1.4vw, 0.875rem);
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgb(148 163 184);
		line-height: 1.2;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid rgb(51 65 85 / 0.55);
		margin: 0 0 clamp(0.6rem, 0.45rem + 0.75vw, 1rem) 0;
	}

	.operative-casefile {
		position: relative;
		box-sizing: border-box;
		padding: clamp(0.65rem, 0.45rem + 0.9vw, 0.95rem);
		border-radius: 2px;
		border: 1px solid rgb(51 65 85 / 0.85);
		background: linear-gradient(
			168deg,
			rgb(15 23 42 / 0.97) 0%,
			rgb(15 23 42 / 0.92) 45%,
			rgb(15 23 42 / 0.98) 100%
		);
		box-shadow:
			inset 0 0 0 1px rgb(15 23 42 / 0.5),
			inset 0 1px 0 rgb(255 255 255 / 0.04);
	}

	.operative-casefile--siem {
		background: rgb(15 23 42);
		min-height: 0;
	}

	.operative-casefile::before,
	.operative-casefile::after {
		content: '';
		position: absolute;
		width: 6px;
		height: 6px;
		border-color: rgb(100 116 139 / 0.75);
		border-style: solid;
		pointer-events: none;
	}

	.operative-casefile::before {
		top: 5px;
		left: 5px;
		border-width: 1px 0 0 1px;
	}

	.operative-casefile::after {
		bottom: 5px;
		right: 5px;
		border-width: 0 1px 1px 0;
	}

	.operative-casefile__rail {
		border-bottom-color: rgb(51 65 85 / 0.75);
	}

	.operative-siem-tile {
		box-sizing: border-box;
		min-width: 0;
		padding: 0.35rem 0.45rem 0.45rem;
		border-radius: 2px;
		border: 1px solid rgb(30 41 59);
		background: rgb(2 6 23 / 0.45);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
	}

	.operative-siem-tile__k {
		display: block;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.45rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgb(100 116 139);
		margin-bottom: 0.1rem;
	}

	.operative-siem-tile__v {
		display: block;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.7rem;
		font-weight: 700;
		color: rgb(241 245 249);
		line-height: 1.15;
	}

	.operative-siem-tile__v--truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.operative-init-btn:focus-visible {
		outline: 2px solid rgb(20 184 166 / 0.55);
		outline-offset: 2px;
	}


	.lobby-radar-canvas {
		position: relative;
		min-height: 280px;
	}


	.tabular-num {
		font-variant-numeric: tabular-nums;
	}

</style>
