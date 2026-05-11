<script>
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import TeamLeaderboard from '$lib/components/tracker/TeamLeaderboard.svelte';
	import OperativeAvatarPreview from '$lib/components/player/OperativeAvatarPreview.svelte';
	import VanguardPrism from '$lib/components/player/VanguardPrism.svelte';
	import PlayerActionInbox from '$lib/components/shell/PlayerActionInbox.svelte';
	import PlayerActivityStreak from '$lib/components/shell/PlayerActivityStreak.svelte';
	import PlayerSkillRadar from '$lib/components/PlayerSkillRadar.svelte';
	import AttributeRadar from './AttributeRadar.svelte';
	import { DEFAULT_SPORT_CONFIG, mapToDefaultAttributes } from '$lib/config/sports.js';
	import { parseOperativeAvatar } from '$lib/avatars/operativeAvatar.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import {
		getAttributeSchemaForSport,
		deriveSkillValuesForSchema,
		hasDocumentedSkillRatings,
		pickSkillRatingForKey,
	} from '$lib/utils/sport-attributes.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';

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
	const streakDays = $derived(Math.max(0, Math.floor(Number(activePlayer?.currentStreak) || 0)));

	const skillRadar = $derived(
		deriveSkillValuesForSchema(statsRaw, attributeSchema, totalXpHud, streakDays),
	);

	const attrRadarValues = $derived(
		mapToDefaultAttributes(
			statsRaw && typeof statsRaw === 'object' ? /** @type {Record<string,unknown>} */(statsRaw) : null,
			skillRadar.values,
		)
	);

	const streak = $derived(Number(activePlayer?.currentStreak) || 0);
	const longestStreak = $derived(Number(activePlayer?.longestStreak) || streak);

	/** @type {Array<{ id: string; title: string; routeCount: number; xpBounty: number; thumbRoutes: Array<{ x1: number; y1: number; cx: number; cy: number; x2: number; y2: number; color: string }> }>} */
	let tacticalDeployments = $state([]);
	let deploymentsLoading = $state(true);

	// Mock TacticalCartridge fallback — used when no live deployments in Firestore.
	const MOCK_CARTRIDGES = [
		{
			id: 'cart-mock-alpha',
			title: 'Phoenix · 4-3-3 Press',
			routeCount: 3,
			xpBounty: 240,
			thumbRoutes: [
				{ x1: 30, y1: 70, cx: 60, cy: 25, x2: 92, y2: 35, color: '#00f0ff' },
				{ x1: 50, y1: 78, cx: 70, cy: 50, x2: 88, y2: 60, color: '#a855f7' },
				{ x1: 18, y1: 55, cx: 40, cy: 40, x2: 75, y2: 25, color: '#ffff00' },
			],
		},
		{
			id: 'cart-mock-bravo',
			title: 'Vanguard · Counter Strike',
			routeCount: 2,
			xpBounty: 180,
			thumbRoutes: [
				{ x1: 22, y1: 80, cx: 55, cy: 40, x2: 90, y2: 22, color: '#00f0ff' },
				{ x1: 38, y1: 72, cx: 62, cy: 55, x2: 85, y2: 50, color: '#ff003c' },
			],
		},
		{
			id: 'cart-mock-charlie',
			title: 'Aegis · Set Piece Spin',
			routeCount: 4,
			xpBounty: 320,
			thumbRoutes: [
				{ x1: 42, y1: 18, cx: 55, cy: 45, x2: 70, y2: 70, color: '#00f0ff' },
				{ x1: 28, y1: 28, cx: 50, cy: 55, x2: 78, y2: 38, color: '#a855f7' },
				{ x1: 60, y1: 25, cx: 70, cy: 50, x2: 92, y2: 55, color: '#ffff00' },
				{ x1: 18, y1: 62, cx: 38, cy: 70, x2: 65, y2: 80, color: '#ff003c' },
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

	/**
	 * VanguardPrism stats — derived from the player's armory (ScoutsSix map
	 * stored in users/{email}.armory.stats).  Falls back to zero-values so the
	 * prism renders a minimal shape instead of nothing while data loads.
	 * @type {import('$lib/states/ArmoryEngine.svelte.js').ScoutsSix}
	 */
	const prismStats = $derived.by(() => {
		/** @type {Record<string, unknown>} */
		const s = /** @type {Record<string, unknown>} */ (
			/** @type {Record<string, unknown> | null} */ (activePlayer)?.armory?.stats ?? {}
		);
		return {
			PAC: String(s.PAC ?? '0 MPH'),
			ACC: String(s.ACC ?? '3.5s'),
			AGI: String(s.AGI ?? '5.0s'),
			STM: String(s.STM ?? 'Lvl 0'),
			POW: String(s.POW ?? '0 in'),
			VAN: String(s.VAN ?? '0'),
		};
	});

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
		const keys = schema.keys.slice(0, 3);
		const labels = schema.labels.slice(0, 3);
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
							color: typeof r?.color === 'string' ? r.color : '#00f0ff',
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
		updateDoc(doc(db, 'users', email), { sportId: DEFAULT_SPORT_CONFIG.sportId }).catch(
			(e) => console.warn('[player-dash] sportId read-repair failed', e),
		);
	});

</script>

<svelte:head>
	<title>Player Dashboard · SSTRACKER</title>
</svelte:head>

{#if authStore.isLoading}
	<div
		class="tw-flex tw-h-64 tw-min-h-[40vh] tw-w-full tw-items-center tw-justify-center tw-bg-black tw-py-16 tw-text-slate-400"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<i class="ph ph-spinner-gap tw-animate-spin tw-text-4xl tw-text-cyan-400/90" aria-hidden="true"></i>
		<span class="tw-sr-only">Loading player dashboard</span>
	</div>
{:else if !activePlayer}
	<div
		class="tw-mx-auto tw-flex tw-min-h-[40vh] tw-max-w-lg tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-rounded-xl tw-border tw-border-amber-500/25 tw-bg-slate-950/90 tw-px-6 tw-py-14 tw-text-center tw-text-slate-200"
		role="alert"
	>
		<i class="ph ph-warning-circle tw-text-4xl tw-text-amber-400" aria-hidden="true"></i>
		<p class="tw-m-0 tw-text-base tw-font-semibold tw-text-slate-100">
			Unable to load this operative profile. Try refreshing the page.
		</p>
		{#if impersonationStore.active}
			<p class="tw-m-0 tw-text-xs tw-leading-relaxed tw-text-slate-500">
				Impersonation is active for
				<span class="tw-font-mono tw-text-slate-400"
					>{impersonationStore.targetEmail || impersonationStore.targetUid}</span
				>. If this keeps happening, exit impersonation from the banner and try again.
			</p>
		{/if}
	</div>
{:else}
<div
	class="lobby-page tw-relative tw-isolate tw-min-w-0 tw-overflow-x-hidden tw-bg-black tw-text-slate-50"
	data-region="player-lobby"
>
	<!-- Top HUD: level ring + streak — isolated above main scroll content -->
	<header
		class="lobby-hud-bar tw-relative tw-z-40 tw-mb-8 tw-flex tw-w-full tw-items-center tw-justify-center tw-border-b tw-border-white/10 tw-bg-slate-900/80 tw-py-4 tw-backdrop-blur-xl"
		aria-label="Combat HUD"
	>
		<div
			class="tw-relative tw-z-40 tw-flex tw-w-full tw-max-w-6xl tw-min-w-0 tw-flex-col tw-items-stretch tw-gap-5 tw-px-6 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between"
		>
			<div
				class="lobby-hud-ring tw-relative tw-z-50 tw-flex tw-min-w-0 tw-shrink-0 tw-items-center tw-justify-center sm:tw-justify-start"
			>
				<div class="lobby-hud-ring__inner">
					<LevelProgressRing
						currentXp={rankProgress.xpInCurrentTier}
						nextRankXp={rankProgress.xpToNextRank}
						rankName={rankProgress.rank}
						totalXp={totalXpHud}
						level={osLevel}
						size="md"
						variant="dark"
						showLevelSegment={true}
					/>
				</div>
			</div>
			<div class="tw-relative tw-z-50 tw-min-w-0 tw-flex-1 sm:tw-max-w-md md:tw-max-w-lg">
				<PlayerActivityStreak compact />
			</div>
		</div>
	</header>

	<div
		class="lobby-root tw-relative tw-z-30 tw-mx-auto tw-box-border tw-flex tw-min-w-0 tw-w-full tw-max-w-6xl tw-flex-col tw-gap-8 tw-overflow-x-hidden tw-px-3 tw-pb-28 tw-pt-0 sm:tw-px-5"
	>
		<!-- Primary action row — AAA lobby launch tiles -->
		<nav
			class="lobby-action-row tw-relative tw-z-50 tw-grid tw-min-w-0 tw-grid-cols-2 tw-gap-4 sm:tw-gap-6"
			aria-label="Primary navigation"
		>
			<a
				href={resolve('/player/tracker')}
				class="lobby-action-btn tw-group tw-relative tw-z-50 tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-items-center tw-justify-center tw-rounded-2xl tw-border tw-border-slate-600/80 tw-bg-gradient-to-br tw-from-slate-800 tw-to-slate-900 tw-py-8 tw-px-6 tw-text-center tw-no-underline tw-shadow-[0_8px_30px_-8px_rgba(0,0,0,0.75)] tw-transition-all tw-duration-300 hover:tw--translate-y-1 hover:tw-border-cyan-400/50 hover:tw-shadow-[0_10px_40px_-10px_rgba(0, 240, 255,0.5)] active:tw-scale-[0.99]"
				data-sveltekit-preload-data="hover"
			>
				<i class="ph ph-lightning tw-mb-3 tw-text-3xl tw-text-cyan-400 tw-transition-transform tw-duration-300 tw-group-hover:tw-scale-110" aria-hidden="true"></i>
				<span
			class="tw-line-clamp-2 tw-text-[clamp(1.25rem,2.5vw,2rem)] tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-slate-100"
				>Today's quests</span
				>
			</a>
			<a
				href={resolve('/player/armory')}
				class="lobby-action-btn tw-group tw-relative tw-z-50 tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-items-center tw-justify-center tw-rounded-2xl tw-border tw-border-slate-600/80 tw-bg-gradient-to-br tw-from-slate-800 tw-to-slate-900 tw-py-8 tw-px-6 tw-text-center tw-no-underline tw-shadow-[0_8px_30px_-8px_rgba(0,0,0,0.75)] tw-transition-all tw-duration-300 hover:tw--translate-y-1 hover:tw-border-cyan-400/50 hover:tw-shadow-[0_10px_40px_-10px_rgba(0, 240, 255,0.5)] active:tw-scale-[0.99]"
				data-sveltekit-preload-data="hover"
			>
				<i class="ph ph-chart-line-up tw-mb-3 tw-text-3xl tw-text-fuchsia-400 tw-transition-transform tw-duration-300 tw-group-hover:tw-scale-110" aria-hidden="true"></i>
				<span
			class="tw-line-clamp-2 tw-text-[clamp(1.25rem,2.5vw,2rem)] tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-slate-100"
				>Career stats</span
				>
			</a>
		</nav>

	<div
		class="lobby-hero lobby-glass tw-relative tw-z-30 tw-grid tw-min-h-[300px] tw-min-w-0 tw-grid-cols-1 tw-gap-8 tw-overflow-hidden tw-rounded-3xl tw-p-6 md:tw-grid-cols-2 md:tw-items-stretch md:tw-gap-10 md:tw-p-8"
		aria-label="Operative profile"
	>
		<div
			class="tw-relative tw-z-50 tw-flex tw-min-h-[300px] tw-min-w-0 tw-flex-col tw-items-center tw-justify-center md:tw-items-start"
		>
			<p class="lobby-eyebrow tw-mb-4 tw-w-full tw-text-center md:tw-text-left">The operative</p>
			<div class="holo-stage tw-relative tw-z-30 tw-mx-auto md:tw-mx-0">
				<div
					class="holo-glow tw-pointer-events-none -tw-z-10"
					aria-hidden="true"
				></div>
				<!--
					VanguardPrism — atmospheric stat hexagon rendered behind the operative
					avatar.  z-10 keeps it above the holo-glow but below the avatar (z-50).
					pointer-events: none ensures it doesn't intercept any clicks on the avatar.
				-->
				<div
					class="tw-pointer-events-none tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10"
					aria-hidden="true"
				>
					<VanguardPrism
						stats={prismStats}
						size={220}
						accent="#00f0ff"
						showLabels={false}
						animated={true}
					/>
				</div>
				<div class="holo-plate tw-relative tw-z-50">
					<OperativeAvatarPreview
						config={operativeAvatarConfig}
						size={176}
						showInitializeCta={true}
						class="tw-rounded-full"
					/>
				</div>
				<div
					class="holo-base tw-pointer-events-none -tw-z-10"
					aria-hidden="true"
				></div>
			</div>
			<p
				class="tw-mt-5 tw-mb-0 tw-w-full tw-min-w-0 tw-truncate tw-text-center tw-font-mono tw-text-[clamp(0.75rem,1vw,0.875rem)] tw-font-bold tw-tracking-wide tw-text-slate-300 md:tw-text-left"
				title={callsign}
			>
				{callsign}
			</p>
			{#if teamAssignmentLabel}
				<p
					class="tw-mt-1 tw-mb-0 tw-w-full tw-min-w-0 tw-line-clamp-2 tw-text-center tw-text-xs tw-tracking-widest tw-text-slate-500 md:tw-text-left"
					title={teamAssignmentLabel}
				>
					{teamAssignmentLabel}
				</p>
			{/if}
		</div>

		<div
			class="tw-relative tw-z-50 tw-flex tw-min-h-[300px] tw-min-w-0 tw-flex-1 tw-flex-col tw-items-center tw-gap-5 md:tw-items-stretch"
		>
			<div
				class="combat-hud-shell tw-flex tw-w-full tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-5 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-white/5 tw-bg-slate-900/60 tw-p-4 tw-backdrop-blur-md md:tw-gap-6 md:tw-p-5"
				aria-label="Combat stats"
			>
				<div
					class="tw-w-full tw-min-w-0 tw-flex-1 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-white/5 tw-bg-slate-950/50 tw-p-4 tw-backdrop-blur-sm"
				>
					<p class="lobby-eyebrow tw-mb-4 tw-text-center tw-text-cyan-400/90 md:tw-text-left">
						Core attributes
					</p>
					<ul class="tw-m-0 tw-list-none tw-space-y-3.5 tw-p-0" aria-label="Combat attribute bars">
						{#each combatHudRows as row (row.label)}
							<li class="tw-min-w-0">
								<div
									class="tw-mb-1 tw-flex tw-min-w-0 tw-items-center tw-justify-between tw-gap-2 tw-text-[0.7rem]"
								>
									<span
										class="tw-min-w-0 tw-truncate tw-font-black tw-uppercase tw-tracking-[0.16em] tw-text-slate-400"
										title={row.label}>{row.label}</span
									>
									<span
										class="tw-font-mono tw-text-sm tw-font-black tw-tabular-nums tw-tracking-wide tw-text-slate-100"
										>{row.display}</span
									>
								</div>
								<div
									class="tw-h-2 tw-overflow-hidden tw-rounded-full tw-border tw-border-white/5 tw-bg-slate-900/80"
									role="presentation"
								>
									<div
										class="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-emerald-500/90 tw-via-cyan-400/85 tw-to-fuchsia-500/80 tw-shadow-[0_0_12px_rgba(52,211,153,0.35)] tw-transition-[width] tw-duration-500"
										style={`width: ${row.pct}%;`}
									></div>
								</div>
							</li>
						{/each}
					</ul>
					{#if !combatTelemetryReady}
						<p
							class="tw-mb-0 tw-mt-4 tw-text-center tw-text-[0.68rem] tw-font-semibold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500 md:tw-text-left"
						>
							Awaiting Coach Telemetry.
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="tw-grid tw-min-w-0 tw-grid-cols-1 tw-gap-8 lg:tw-grid-cols-2">
		<section
			class="lobby-missions lobby-glass tw-relative tw-z-40 tw-min-h-0 tw-min-w-0 tw-overflow-hidden tw-p-5 md:tw-p-6"
			aria-labelledby="lobby-missions-h"
		>
			<header class="tw-relative tw-z-50 tw-mb-4 tw-min-w-0 tw-border-b tw-border-emerald-500/25 tw-pb-3">
				<p id="lobby-missions-h" class="lobby-eyebrow tw-mb-1 tw-text-emerald-400/90">Active missions</p>
				<h2
					class="tw-m-0 tw-line-clamp-2 tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100"
				>
					Assigned workouts · pending trials
				</h2>
			</header>
			<div class="tw-relative tw-z-50 tw-min-w-0">
				<PlayerActionInbox />
			</div>
		</section>

		<section
			class="lobby-radar lobby-glass tw-relative tw-z-40 tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-overflow-hidden tw-p-5 md:tw-p-6"
			aria-labelledby="lobby-radar-h"
		>
			<header class="tw-relative tw-z-50 tw-mb-3 tw-min-w-0">
				<p class="lobby-eyebrow tw-mb-1 tw-text-fuchsia-400/90">Combat stats</p>
				<h2 id="lobby-radar-h" class="tw-m-0 tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100">
					Attribute radar
				</h2>
			<p class="tw-m-0 tw-mt-1 tw-line-clamp-3 tw-text-xs tw-leading-relaxed tw-text-slate-500">
				Five-axis RPG loadout from your latest
				<span class="tw-font-semibold tw-text-slate-400">{DEFAULT_SPORT_CONFIG.displayName}</span>
				combat profile — keep logging to harden the shape.
			</p>
			</header>
			<div
				class="lobby-radar-canvas tw-relative tw-z-30 tw-min-h-0 tw-min-w-0 tw-flex-1 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-slate-700/80 tw-bg-slate-950 tw-bg-[radial-gradient(ellipse_at_center,_rgba(15,23,42,0.92)_0%,_#020617_72%)] tw-p-3 tw-shadow-[inset_0_0_60px_rgba(0,0,0,0.65)]"
			>
				<div
					class="tw-pointer-events-none tw-absolute tw-inset-0 -tw-z-10 tw-opacity-[0.08]"
					style="background-image: linear-gradient(rgba(148,163,184,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.9) 1px, transparent 1px); background-size: 18px 18px;"
					aria-hidden="true"
				></div>
			<div class="tw-relative tw-z-50 tw-min-h-[260px] tw-flex tw-items-center tw-justify-center">
				<AttributeRadar values={attrRadarValues} />
			</div>
			</div>
		</section>
	</div>

	<section
		class="pd-team-lb lobby-glass tw-relative tw-z-40 tw-min-w-0 tw-overflow-hidden tw-p-4"
		aria-label="Team leaderboard"
	>
		<TeamLeaderboard compact />
	</section>

	<section
		class="lobby-glass tw-relative tw-z-40 tw-min-w-0 tw-overflow-hidden tw-p-5 md:tw-p-6"
		aria-labelledby="lobby-mission-log-h"
	>
		<header class="tw-relative tw-z-50 tw-mb-4 tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-[#00f0ff]/20 tw-pb-3">
			<div class="tw-min-w-0">
				<p class="lobby-eyebrow tw-mb-1 tw-text-[#00f0ff]/90">Tactical ops</p>
				<h2 id="lobby-mission-log-h" class="tw-m-0 tw-font-mono tw-text-lg tw-font-black tw-tracking-tight tw-text-slate-100">
					MISSION LOG
				</h2>
			</div>
			<span class="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/30 tw-bg-[#00f0ff]/10 tw-px-2.5 tw-py-1 tw-font-mono tw-text-[10px] tw-font-bold tw-tabular-nums tw-tracking-widest tw-text-[#00f0ff]">
				<span class="tw-block tw-h-1.5 tw-w-1.5 tw-animate-pulse tw-rounded-full tw-bg-[#00f0ff] tw-shadow-[0_0_6px_rgba(0,240,255,0.7)]"></span>
				{missionLogEntries.length} CARTRIDGES
			</span>
		</header>
		<div class="tw-relative tw-z-50 tw-min-w-0">
			{#if deploymentsLoading}
				<p class="tw-flex tw-items-center tw-gap-2 tw-py-4 tw-font-mono tw-text-xs tw-text-slate-500">
					<i class="ph ph-spinner-gap tw-animate-spin" aria-hidden="true"></i>
					SYNCING CARTRIDGES…
				</p>
			{:else}
				<ul class="tw-m-0 tw-grid tw-list-none tw-grid-cols-1 tw-gap-3 tw-p-0 sm:tw-grid-cols-2">
					{#each missionLogEntries as dep (dep.id)}
						<li class="tw-group tw-flex tw-min-w-0 tw-flex-col tw-overflow-hidden tw-rounded-xl tw-border tw-border-white/8 tw-bg-[#020202]/80 tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] tw-transition-all hover:tw-border-[#00f0ff]/35 hover:tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_0_24px_rgba(0,240,255,0.18)]">
							<!-- Pitch thumbnail -->
							<div class="tw-relative tw-overflow-hidden tw-border-b tw-border-white/5 tw-bg-[#011018]">
								<svg class="tw-block tw-h-24 tw-w-full" viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
									<defs>
										<linearGradient id="missionPitch-{dep.id}" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stop-color="#013b4d" stop-opacity="0.85" />
											<stop offset="100%" stop-color="#001218" stop-opacity="1" />
										</linearGradient>
									</defs>
									<rect x="0" y="0" width="100" height="56" fill="url(#missionPitch-{dep.id})" />
									<!-- Pitch markings -->
									<rect x="2" y="2" width="96" height="52" fill="none" stroke="rgba(0,240,255,0.18)" stroke-width="0.4" />
									<line x1="50" y1="2" x2="50" y2="54" stroke="rgba(0,240,255,0.16)" stroke-width="0.4" />
									<circle cx="50" cy="28" r="6" fill="none" stroke="rgba(0,240,255,0.16)" stroke-width="0.4" />
									<rect x="2" y="18" width="10" height="20" fill="none" stroke="rgba(0,240,255,0.16)" stroke-width="0.4" />
									<rect x="88" y="18" width="10" height="20" fill="none" stroke="rgba(0,240,255,0.16)" stroke-width="0.4" />
									<!-- Routes -->
									{#each dep.thumbRoutes as r, ri (ri)}
										<path
											d={`M ${r.x1} ${r.y1} Q ${r.cx} ${r.cy} ${r.x2} ${r.y2}`}
											fill="none"
											stroke={r.color}
											stroke-width="1.2"
											stroke-linecap="round"
											filter="url(#neonBloom)"
											opacity="0.9"
										/>
										<circle cx={r.x2} cy={r.y2} r="1.4" fill={r.color} filter="url(#neonBloom)" />
									{/each}
								</svg>
							</div>
							<!-- Card body -->
							<div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-2 tw-p-3">
								<div class="tw-flex tw-min-w-0 tw-items-baseline tw-justify-between tw-gap-2">
									<p class="tw-m-0 tw-min-w-0 tw-truncate tw-font-mono tw-text-sm tw-font-bold tw-text-slate-100">{dep.title}</p>
									<span class="tw-shrink-0 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-500">
										{dep.routeCount} RT
									</span>
								</div>
								<div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
									<div class="tw-flex tw-flex-col">
										<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-white/40">
											XP BOUNTY
										</span>
										<span class="tw-font-mono tw-text-base tw-font-black tw-tabular-nums tw-text-[#00f0ff] tw-drop-shadow-[0_0_8px_rgba(0,240,255,0.45)]">
											+{dep.xpBounty}
										</span>
									</div>
									<button
										type="button"
										class="tw-pointer-events-auto tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/40 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#00f0ff]/80 hover:tw-bg-[#00f0ff]/10 hover:tw-shadow-[0_0_20px_rgba(0,240,255,0.4)] active:tw-scale-95"
										aria-label="Start session for {dep.title}"
									>
										<i class="ph ph-play tw-text-xs" aria-hidden="true"></i>
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

	<div
		class="lobby-glass tw-relative tw-z-40 tw-grid tw-w-full tw-min-w-0 tw-grid-cols-2 tw-gap-3 tw-overflow-hidden tw-rounded-3xl tw-p-4 md:tw-grid-cols-4 md:tw-gap-4 md:tw-p-5"
		aria-label="Career telemetry"
	>
		<a
			href={resolve('/stats')}
			class="lobby-stat-tile tw-relative tw-z-50 tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Total XP</span
			>
			<span class="tabular-num tw-min-w-0 tw-truncate tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-50 md:tw-text-2xl">
				{totalXpHud.toLocaleString()}
			</span>
		</a>
		<a
			href={resolve('/stats')}
			class="lobby-stat-tile tw-relative tw-z-50 tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Level</span
			>
			<span class="tabular-num tw-min-w-0 tw-truncate tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-50 md:tw-text-2xl">
				{osLevel}
			</span>
		</a>
		<a
			href={resolve('/player/workout')}
			class="lobby-stat-tile tw-relative tw-z-50 tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4 tw-no-underline tw-transition-transform tw-duration-200 hover:tw-scale-[1.02]"
			data-sveltekit-preload-data="hover"
		>
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Streak</span
			>
			<span class="tabular-num tw-min-w-0 tw-truncate tw-text-xl tw-font-black tw-tracking-tight tw-text-cyan-300 md:tw-text-2xl">
				{streak}<span class="tw-text-base tw-font-bold tw-text-slate-500">d</span>
			</span>
		</a>
		<div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-1 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-white/5 tw-bg-black/35 tw-px-3 tw-py-4">
			<span class="tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-slate-500"
				>Best</span
			>
			<span class="tabular-num tw-min-w-0 tw-truncate tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-50 md:tw-text-2xl">
				{longestStreak}<span class="tw-text-base tw-font-bold tw-text-slate-500">d</span>
			</span>
		</div>
	</div>
	</div>
</div>

{/if}

<style>
	.lobby-hud-ring__inner {
		transform: scale(1.12);
		transform-origin: center center;
	}

	@media (min-width: 640px) {
		.lobby-hud-ring__inner {
			transform: scale(1.18);
		}
	}

	.lobby-hud-bar :global(.pas__title) {
		color: rgb(148 163 184);
		letter-spacing: 0.14em;
	}

	.lobby-hud-bar :global(.pas__val) {
		color: rgb(241 245 249);
	}

	.lobby-hud-bar :global(.pas__unit) {
		color: rgb(226 232 240);
	}

	.lobby-root {
		color: #f8fafc;
	}

	.lobby-glass {
		border-radius: 1.5rem;
		overflow: hidden;
		border: 1px solid rgb(255 255 255 / 0.05);
		background: rgb(15 23 42 / 0.6);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
	}

	.lobby-eyebrow {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.holo-stage {
		position: relative;
		width: fit-content;
		perspective: 960px;
		perspective-origin: 50% 40%;
	}

	.holo-glow {
		position: absolute;
		inset: -18%;
		border-radius: 50%;
		background: radial-gradient(
			ellipse at 50% 45%,
			rgba(0, 240, 255, 0.35) 0%,
			rgba(168, 85, 247, 0.12) 42%,
			transparent 70%
		);
		filter: blur(12px);
		opacity: 0.95;
		pointer-events: none;
	}

	.holo-plate {
		position: relative;
		transform: rotateX(8deg) rotateY(-14deg);
		transform-style: preserve-3d;
		animation: holo-float 5.5s ease-in-out infinite;
		filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.55))
			drop-shadow(0 0 22px rgba(0, 240, 255, 0.28));
	}

	.holo-base {
		position: absolute;
		left: 50%;
		bottom: -8px;
		width: 72%;
		height: 14px;
		transform: translateX(-50%) rotateX(78deg);
		border-radius: 50%;
		background: radial-gradient(ellipse at center, rgba(0, 240, 255, 0.25), transparent 70%);
		opacity: 0.85;
		pointer-events: none;
	}

	@keyframes holo-float {
		0%,
		100% {
			transform: rotateX(8deg) rotateY(-14deg) translateY(0);
		}
		50% {
			transform: rotateX(5deg) rotateY(-8deg) translateY(-10px);
		}
	}

	.lobby-missions :global(.pai) {
		border: none;
		background: transparent;
		padding: 0;
		border-left: 4px solid rgb(16 185 129 / 0.85);
		padding-left: 1rem;
		box-shadow: none;
	}

	.lobby-missions :global(.pai__head) {
		color: rgb(167 243 208 / 0.95);
	}

	.lobby-missions :global(.pai__head .ph-lightning) {
		color: rgb(52 211 153);
		filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.45));
	}

	.lobby-missions :global(.pai__card) {
		background: rgb(2 6 23 / 0.55);
		border-color: rgb(16 185 129 / 0.22);
		box-shadow: inset 0 0 0 1px rgb(16 185 129 / 0.08), 0 0 28px rgb(16 185 129 / 0.06);
	}

	.lobby-missions :global(.pai__kicker) {
		color: rgb(52 211 153);
	}

	.lobby-missions :global(.pai__title) {
		color: rgb(241 245 249);
	}

	.lobby-missions :global(.pai__btn--primary) {
		background: linear-gradient(135deg, rgb(16 185 129), rgb(6 182 212));
		color: rgb(2 6 23);
		border-color: rgb(16 185 129 / 0.5);
	}

	.lobby-missions :global(.pai__btn--ghost) {
		color: rgb(209 250 229);
		border-color: rgb(52 211 153 / 0.4);
		background: rgb(2 6 23 / 0.35);
	}

	.lobby-missions :global(.pai__btn--ghost:hover) {
		border-color: rgb(52 211 153 / 0.75);
		background: rgb(6 78 59 / 0.35);
	}

	.lobby-missions :global(.pai__muted) {
		color: rgb(148 163 184);
	}

	.lobby-missions :global(.pai__details) {
		border-color: rgb(51 65 85 / 0.6);
		background: rgb(15 23 42 / 0.45);
	}

	.lobby-radar-canvas {
		position: relative;
		min-height: 280px;
	}

	:global(.pd-team-lb .lb-shell--compact) {
		background: rgba(2, 6, 23, 0.55) !important;
		border: 1px solid rgba(255, 255, 255, 0.06) !important;
		box-shadow: 0 12px 40px -18px rgba(0, 0, 0, 0.65) !important;
	}

	:global(.pd-team-lb .lb-title) {
		color: #f8fafc !important;
	}

	:global(.pd-team-lb .lb-sub),
	:global(.pd-team-lb .lb-hint) {
		color: rgba(226, 232, 240, 0.78) !important;
	}

	:global(.pd-team-lb .lb-card) {
		background: rgba(15, 23, 42, 0.55) !important;
		border-color: rgba(255, 255, 255, 0.06) !important;
	}

	:global(.pd-team-lb .lb-card:hover) {
		background: rgba(30, 41, 59, 0.65) !important;
	}

	.tabular-num {
		font-variant-numeric: tabular-nums;
	}

	.lobby-stat-tile {
		cursor: pointer;
		color: inherit;
	}

	.lobby-stat-tile:hover {
		border-color: rgb(34 211 238 / 0.25);
		box-shadow: 0 0 0 1px rgb(34 211 238 / 0.08);
	}

</style>
