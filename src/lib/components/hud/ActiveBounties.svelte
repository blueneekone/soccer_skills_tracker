<script lang="ts">
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import { goto } from '$app/navigation';
	import { onSnapshot, query, where, collection } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import {
		MissionSnapshotRetryGate,
	} from '$lib/player/dashboard/missionRailAuth.js';
	import { applyCoachIntentPurge, runCoachIntentRefetch } from '$lib/player/dashboard/missionRailCoachIntents.js';
	import { MissionRailClaimsSync } from '$lib/player/dashboard/missionRailClaims.svelte.js';
	import { attachMissionQuestSubscriptions } from '$lib/player/dashboard/missionRailQuestSubscriptions.js';
	import {
		buildMissionRailDiagnostic,
		logMissionRailSnapshotOnce,
		missionRailEmptyMessageFor,
		missionRailSnapshotLogKey,
	} from '$lib/player/dashboard/missionRailDiagnostics.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { dopamineExplosion } from '$lib/services/dopamine.svelte.js';
	import { commitBountyClaim } from '$lib/services/writes.svelte.js';
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';
	import { deduplicateById } from '$lib/utils/deduplicateMissions.js';
	import {
		coachIntentReadyToClaim,
		coachIntentCreditedToday,
		computeCoachIntentEarnedXp,
		COACH_INTENT_TODAY_COMPLETE,
		countCadenceSessionsInWindow,
		formatCadenceProgress,
		formatIntentXpProgressLine,
		questCadenceBlockedToday,
		questHudCtaBlockedCadence,
		loadQuestProgress,
		markQuestAccepted,
		markQuestClaimed,
		markQuestCompleted,
		maxVisibleQuests,
		formatQuestRewardLabel,
		isPromotedQuest,
		questCtaLabel,
		shouldDeferQuestCompletionUntilWorkoutLog,
		questHudCtaFor,
		questHudCtaShort,
		questTerminalCmd,
		resolveCoachIntentLifecycle,
		resolveQuestLifecycle,
		resolveHeroQuest,
		selectPrimaryBounty,
		sortQuestLog,
		type QuestTask,
		formatMissionRailId,
		buildMissionRailModalReadout,
		shouldOpenMissionRailHeroModal,
	} from '$lib/player/dashboard/activeBounties.js';
	import {
		COACH_INTENT_HINT,
		formatSuggestedDrillLine,
		resolveHeuristicDrill,
		stashQuestTrainHandoff,
	} from '$lib/player/workout/coachMissionFlow.js';
	import {
		subscribePlayerCadenceCompletions,
		type CadenceCompletionRow,
	} from '$lib/player/dashboard/cadenceCompletions.js';
	import '$lib/styles/active-bounties.css';
	import MissionHeroModal from '$lib/components/hud/MissionHeroModal.svelte';
	import BountyRow from '$lib/components/hud/BountyRow.svelte';

	let {
		embedded = false,
		quests: questsProp = undefined,
		loading: loadingProp = undefined,
		lastTrainingUtc = null,
		onCoachBountyCount = undefined,
		onHeroQuestId = undefined,
	}: {
		embedded?: boolean;
		quests?: QuestTask[];
		loading?: boolean;
		lastTrainingUtc?: string | null;
		onCoachBountyCount?: (count: number) => void;
		onHeroQuestId?: (id: string | null) => void;
	} = $props();

	let internalQuests = $state<QuestTask[]>([]);
	let internalLoading = $state(true);
	let questProgress = $state(loadQuestProgress());
	let showAllQuests = $state(false);
	let intentDataById = $state<Record<string, Record<string, unknown>>>({});
	let homeworkDataById = $state<Record<string, Record<string, unknown>>>({});
	let drillPreviewByQuestId = $state<
		Record<string, { id: string; title: string; line: string }>
	>({});
	let refreshNonce = $state(0);
	let isRefreshing = $state(false);
	let missionSyncBlocked = $state(false);
	let hasQuestLogLoaded = $state(false);
	let intentSnapshotCount = $state(0);
	let intentScopedCount = $state(0);
	let mappedIntentQuestCount = $state(0);
	let coachIntentListenerAttached = $state(false);
	let serverRefetchIntentCount = $state<number | null>(null);
	let missionRailLogKey = $state('');
	const missionClaimsSync = new MissionRailClaimsSync();
	const missionRetryGate = new MissionSnapshotRetryGate();
	let lastCoachIntentIds = $state<string[]>([]);
	let cadenceCompletions = $state<CadenceCompletionRow[]>([]);
	/** B4b — parent-verified badge from completion_verifications (read-only). */
	let approvedIntentIds = $state<Set<string>>(new Set());
	let missionModalQuest = $state<QuestTask | null>(null);

	const quests = $derived(questsProp ?? internalQuests);
	const loading = $derived(loadingProp ?? internalLoading);

	const playerUid = $derived(authStore.user?.uid ?? '');
	const playerEmail = $derived((authStore.user?.email || '').toLowerCase());
	const profileTeamId = $derived(
		typeof authStore.userProfile?.teamId === 'string' ? authStore.userProfile.teamId.trim() : '',
	);
	const teamId = $derived(
		missionClaimsSync.resolveTeamId(profileTeamId, workspaceContextStore.activeTeamId),
	);
	const clubId = $derived(
		typeof authStore.userProfile?.clubId === 'string' ? authStore.userProfile.clubId.trim() : '',
	);

	const sortedQuests = $derived(sortQuestLog(quests));
	const dedupedQuests = $derived(deduplicateById(sortedQuests));
	const visibleQuests = $derived(
		showAllQuests ? dedupedQuests : dedupedQuests.slice(0, maxVisibleQuests()),
	);
	const hiddenCount = $derived(Math.max(0, dedupedQuests.length - maxVisibleQuests()));
	const showEmpty = $derived(!loading && dedupedQuests.length === 0 && !missionSyncBlocked);
	const heroQuest = $derived(
		embedded ? resolveHeroQuest(dedupedQuests, { lastTrainingUtc }) : null,
	);
	const visibleBounties = $derived(visibleQuests.filter((q) => q.tier === 'bounty'));
	const visibleDailies = $derived(visibleQuests.filter((q) => q.tier === 'daily'));
	const showCoachAssignHint = $derived(
		!loading && !missionSyncBlocked && visibleBounties.length === 0,
	);
	const playerAuthLoaded = $derived(
		browser && !authStore.isLoading && authStore.role === 'player' && Boolean(playerUid),
	);
	const playerXpByAttribute = $derived(
		authStore.userProfile?.xpByAttribute && typeof authStore.userProfile.xpByAttribute === 'object'
			? (authStore.userProfile.xpByAttribute as Record<string, number>)
			: {},
	);
	const missionRailDiagnostic = $derived(
		buildMissionRailDiagnostic({
			missionSyncBlocked,
			authLoaded: playerAuthLoaded,
			teamIdUsed: teamId,
			intentSnapshotCount,
			intentScopedCount,
			mappedQuestCount: mappedIntentQuestCount,
			visibleBountyCount: visibleBounties.length,
			profileTeamId,
			tokenTeamId: missionClaimsSync.tokenTeamId,
			tokenClubId: missionClaimsSync.tokenClubId,
			listenerAttached: coachIntentListenerAttached,
			serverRefetchCount: serverRefetchIntentCount,
		}),
	);
	const missionRailEmptyMessage = $derived(missionRailEmptyMessageFor(missionRailDiagnostic));
	const embeddedFeed = $derived(
		heroQuest ?
			[heroQuest, ...visibleQuests.filter((q) => q.id !== heroQuest.id)]
		:	visibleQuests,
	);

	const coachBountyCount = $derived(
		dedupedQuests.filter(
			(q) => q.tier === 'bounty' && (q.source === 'coach_intent' || q.source === 'coach_homework'),
		).length,
	);

	const recentFrustration = $derived(
		String(authStore.userProfile?.recentFrustration ?? 'low'),
	);

	$effect(() => {
		const coachIntents = dedupedQuests.filter((q) => q.source === 'coach_intent');
		const frustration = recentFrustration;
		const rows = intentDataById;
		let cancelled = false;

		async function loadPreviews() {
			if (coachIntents.length === 0) {
				if (!cancelled) drillPreviewByQuestId = {};
				return;
			}
			const next: Record<string, { id: string; title: string; line: string }> = {};
			await Promise.all(
				coachIntents.map(async (quest) => {
					const row = rows[quest.id] ?? {};
					const targetAttributeId =
						(typeof row.targetAttributeId === 'string' ? row.targetAttributeId.trim() : '') ||
						(typeof quest.targetAttributeId === 'string' ? quest.targetAttributeId.trim() : '');
					if (!targetAttributeId) return;
					const drill = await resolveHeuristicDrill(db, targetAttributeId, frustration);
					if (!drill) return;
					next[quest.id] = {
						id: drill.id,
						title: drill.title,
						line: formatSuggestedDrillLine(drill.title),
					};
				}),
			);
			if (!cancelled) drillPreviewByQuestId = next;
		}

		void loadPreviews();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		onCoachBountyCount?.(coachBountyCount);
	});

	$effect(() => {
		onHeroQuestId?.(heroQuest?.id ?? visibleQuests[0]?.id ?? null);
	});

	$effect(() => {
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		const uid = authStore.user?.uid ?? '';
		if (!uid) return;
		const hasCoachIntentQuests = dedupedQuests.some((q) => q.source === 'coach_intent');
		if (!hasCoachIntentQuests) return;
		return subscribePlayerCadenceCompletions(db, uid, (rows) => {
			cadenceCompletions = rows;
		});
	});

	// B4b — subscribe to player's own approved completion_verifications for advisory badge.
	// Reads are player-own only (playerUid == auth.uid); no XP or progress logic is touched.
	$effect(() => {
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		const uid = authStore.user?.uid ?? '';
		if (!uid) return;

		const unsub = onSnapshot(
			query(
				collection(db, 'completion_verifications'),
				where('playerUid', '==', uid),
				where('status', '==', 'approved'),
			),
			(snap) => {
				const ids = new Set<string>();
				snap.docs.forEach((d) => {
					const intentId = d.data().intentId;
					if (typeof intentId === 'string' && intentId) ids.add(intentId);
				});
				approvedIntentIds = ids;
			},
			() => { /* non-fatal: badge stays hidden on read error */ },
		);
		return unsub;
	});

	$effect(() => missionClaimsSync.watch(profileTeamId, clubId));
	$effect(() => missionClaimsSync.watchClaimsAheadOfProfile(profileTeamId));

	$effect(() => {
		if (!playerAuthLoaded) return;
		const nextKey = missionRailSnapshotLogKey({
			teamId,
			intentSnapshotCount,
			intentScopedCount,
			listenerAttached: coachIntentListenerAttached,
		});
		missionRailLogKey = logMissionRailSnapshotOnce(nextKey, missionRailLogKey, missionRailDiagnostic);
	});

	$effect(() => {
		if (questsProp !== undefined) return;

		void missionClaimsSync.claimsSyncNonce; void missionClaimsSync.tokenTeamId;

		if (!browser || authStore.isLoading || authStore.role !== 'player' || !playerUid) {
			internalLoading = false;
			internalQuests = [];
			hasQuestLogLoaded = false;
			missionRetryGate.reset();
			intentSnapshotCount = 0;
			intentScopedCount = 0;
			mappedIntentQuestCount = 0;
			coachIntentListenerAttached = false;
			serverRefetchIntentCount = null;
			return;
		}

		const profile = authStore.userProfile;
		return attachMissionQuestSubscriptions({
			db,
			uid: playerUid,
			email: playerEmail,
			tid: teamId,
			jwtTeam: missionClaimsSync.tokenTeamId,
			tenantFilter: (missionClaimsSync.tokenClubId || clubId || '').trim(),
			tokenClub: missionClaimsSync.tokenClubId,
			profileTeamId,
			profile: profile && typeof profile === 'object' ? profile as Record<string, unknown> : null,
			clubId,
			hasQuestLogLoaded,
			sink: {
				setInternalQuests: (q) => { internalQuests = q; },
				setInternalLoading: (v) => { internalLoading = v; },
				setHasQuestLogLoaded: (v) => { hasQuestLogLoaded = v; },
				setQuestProgress: (p) => { questProgress = p; },
				setIntentDataById: (d) => { intentDataById = d; },
				setHomeworkDataById: (d) => { homeworkDataById = d; },
				setIntentSnapshotCount: (n) => { intentSnapshotCount = n; },
				setIntentScopedCount: (n) => { intentScopedCount = n; },
				setMappedIntentQuestCount: (n) => { mappedIntentQuestCount = n; },
				setCoachIntentListenerAttached: (v) => { coachIntentListenerAttached = v; },
				setMissionSyncBlocked: (v) => { missionSyncBlocked = v; },
				setIsRefreshing: (v) => { isRefreshing = v; },
				getLastCoachIntentIds: () => lastCoachIntentIds,
				setLastCoachIntentIds: (ids) => { lastCoachIntentIds = ids; },
				getQuestProgress: () => questProgress,
				loadQuestProgress,
				missionRetryGate,
				refreshClaims: () => authStore.refreshClaims(),
				bumpRefreshNonce: () => { refreshNonce += 1; },
			},
		});
	});

	$effect(() => {
		if (questsProp !== undefined) return;
		const nonce = refreshNonce;
		const claimsNonce = missionClaimsSync.claimsSyncNonce;
		const tid = teamId;
		const uid = playerUid;
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		if (!tid || (nonce === 0 && claimsNonce === 0)) return;

		const refetchPayload = untrack(() => ({
			lastCoachIntentIds,
			internalQuests,
			questProgress,
			intentDataById,
			listenerScopedCount: intentScopedCount,
			mappedIntentQuestCount,
		}));

		isRefreshing = true;
		void runCoachIntentRefetch({
			db,
			teamId: tid,
			playerUid: uid,
			tenantId: (missionClaimsSync.tokenClubId || clubId || '').trim(),
			...refetchPayload,
		})
			.then((applied) => {
				missionSyncBlocked = false;
				missionRetryGate.onSuccess();
				serverRefetchIntentCount = applied.serverRefetchIntentCount;
				lastCoachIntentIds = applied.lastCoachIntentIds;
				questProgress = applied.questProgress;
				intentDataById = applied.intentDataById;
				internalQuests = applied.internalQuests;
				mappedIntentQuestCount = applied.mappedIntentQuestCount;
				internalLoading = false;
				hasQuestLogLoaded = true;
			})
			.catch((err) => {
				console.error('[ActiveBounties] coach intent refetch failed:', err);
				missionSyncBlocked = true;
				serverRefetchIntentCount = null;
				if (lastCoachIntentIds.length > 0) {
					questProgress = applyCoachIntentPurge(questProgress, lastCoachIntentIds);
				}
				lastCoachIntentIds = [];
				intentDataById = {};
				internalQuests = internalQuests.filter((q) => q.source !== 'coach_intent');
				internalLoading = false;
				hasQuestLogLoaded = true;
			})
			.finally(() => {
				isRefreshing = false;
			});
	});

	function refreshQuestLog() {
		if (isRefreshing || questsProp !== undefined) return;
		isRefreshing = true;
		refreshNonce += 1;
	}

	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';

	let claimVideoQuest = $state<QuestTask | null>(null);
	let claimVideoUrl = $state('');
	let claimVideoBusy = $state(false);
	let claimVideoError = $state('');

	async function submitClaimVideo() {
		if (!claimVideoQuest) return;
		claimVideoBusy = true;
		claimVideoError = '';
		try {
			const fn = httpsCallable(functions, 'secureFulfillIntent');
			await fn({
				intentId: claimVideoQuest.id,
				teamId: authStore.userProfile?.teamId || authStore.tenantId,
				requiredVideoUrls: [claimVideoUrl],
			});
			questProgress = markQuestClaimed(claimVideoQuest.id, questProgress);
			void dopamineExplosion('grit');
			if (questsProp === undefined) {
				internalQuests = internalQuests.filter((q) => q.id !== claimVideoQuest?.id);
			}
			claimVideoQuest = null;
			claimVideoUrl = '';
		} catch (err) {
			console.error('[ActiveBounties] claim failed:', err);
			claimVideoError = (err as Error).message;
		} finally {
			claimVideoBusy = false;
		}
	}

	function patchQuestLifecycle(list: QuestTask[]): QuestTask[] {
		const uid = authStore.user?.uid ?? '';
		return list.map((q) => {
			if (q.source === 'coach_intent') {
				const intentRow = intentDataById[q.id];
				const reqXp = Math.max(0, Math.floor(Number(intentRow?.requiredXp) || q.xpReward || 0));
				const earnedXp = computeCoachIntentEarnedXp(intentRow, uid, playerXpByAttribute, playerEmail);
				let cadenceMet = true;
				if (q.cadence && q.targetAttributeId) {
					const count = countCadenceSessionsInWindow(cadenceCompletions, q.targetAttributeId, q.cadence.windowDays, undefined, q.id);
					cadenceMet = count >= q.cadence.sessionsPerWindow;
				}
				const playerReady = coachIntentReadyToClaim(earnedXp, reqXp, cadenceMet);
				return {
					...q,
					lifecycle: resolveCoachIntentLifecycle(q.id, questProgress, {
						readyToClaim: playerReady || q.lifecycle === 'claim',
					}),
				};
			}
			return {
				...q,
				lifecycle: resolveQuestLifecycle(q.id, questProgress, {
					readyToClaim: q.lifecycle === 'claim',
				}),
			};
		});
	}

	function stashQuestHandoff(quest: QuestTask, armExplicit = false) {
		return stashQuestTrainHandoff(db, quest, {
			intentRow: intentDataById[quest.id],
			homeworkRow: homeworkDataById[quest.id],
			drillPreview: drillPreviewByQuestId[quest.id] ?? null,
			clubId: String(authStore.userProfile?.clubId ?? authStore.tenantId ?? ''),
			armExplicit,
		});
	}

	async function completeQuestHandoff(quest: QuestTask) {
		const deferUntilLog = shouldDeferQuestCompletionUntilWorkoutLog(quest);
		if (!deferUntilLog) {
			questProgress = markQuestCompleted(quest.id, questProgress);
		}
		let navHandoff = null;
		if (quest.source === 'coach_intent' || quest.source === 'coach_homework') {
			navHandoff = await stashQuestHandoff(quest, true);
		}
		goto(resolveAppPath('/player/workout'), {
			state: navHandoff ? { missionHandoff: navHandoff } : undefined,
		});
		if (!deferUntilLog && questsProp === undefined) {
			internalQuests = patchQuestLifecycle(internalQuests);
		}
	}

	function engageMissionModal() {
		const quest = missionModalQuest;
		if (!quest) return;
		missionModalQuest = null;
		completeQuestHandoff(quest);
	}

	function terminateMissionModal() {
		missionModalQuest = null;
	}

	let claimingStandardQuest = $state<string | null>(null);

	/** @param {QuestTask} quest */
	async function handleQuestAction(quest: QuestTask) {
		if (quest.lifecycle === 'accept') {
			questProgress = markQuestAccepted(quest.id, questProgress);
			if (questsProp === undefined) {
				internalQuests = patchQuestLifecycle(internalQuests);
			}
			return;
		}

		if (quest.lifecycle === 'complete') {
			if (questCadenceBlockedToday(quest, cadenceCompletions)) return;
			if (shouldOpenMissionRailHeroModal(quest)) {
				missionModalQuest = quest;
				return;
			}
			completeQuestHandoff(quest);
			return;
		}

		if (quest.source === 'coach_intent') {
			const intentRow = intentDataById[quest.id];
			const uid = authStore.user?.uid ?? '';
			const reqXp = Math.max(0, Math.floor(Number(intentRow?.requiredXp) || quest.xpReward || 0));
			const earnedXp = computeCoachIntentEarnedXp(intentRow, uid, playerXpByAttribute, playerEmail);
			let cadenceMet = true;
			if (quest.cadence && quest.targetAttributeId) {
				const count = countCadenceSessionsInWindow(cadenceCompletions, quest.targetAttributeId, quest.cadence.windowDays, undefined, quest.id);
				cadenceMet = count >= quest.cadence.sessionsPerWindow;
			}
			if (!coachIntentReadyToClaim(earnedXp, reqXp, cadenceMet)) return;

			// Sprint 5.1: Actionable Video Evidence required
			claimVideoQuest = quest;
			claimVideoUrl = '';
			claimVideoError = '';
			return;
		}

		if (claimingStandardQuest === quest.id) return;
		claimingStandardQuest = quest.id;

		try {
			// Sprint 5.2: Decoupled telemetry tracking
			const playerUid = authStore.user?.uid ?? '';
			const userKey = (authStore.user?.email ?? '').toLowerCase();
			const xpAwarded = Math.max(0, Math.floor(Number(quest.xpReward) || 0));
			await commitBountyClaim({
				playerUid,
				userKey,
				questId: quest.id,
				xpAwarded,
				reason: `Bounty Claim — ${quest.title}`,
			});

			questProgress = markQuestClaimed(quest.id, questProgress);
			if (quest.rewardLabel) {
				void dopamineExplosion('escrow');
			} else {
				void dopamineExplosion('grit');
			}
			if (questsProp === undefined) {
				internalQuests = internalQuests.filter((q) => q.id !== quest.id);
			}
		} catch (err) {
			console.error('[ActiveBounties] Non-coach claim failed:', err);
		} finally {
			claimingStandardQuest = null;
		}
	}
</script>



{#snippet coachAssignHintBlock()}
	{#if showCoachAssignHint}
		<p class="quest-log__coach-hint bento-span-12" role="status">{missionRailEmptyMessage}</p>
	{/if}
{/snippet}

<section
	class="quest-log quest-log-panel"
	class:hud-telemetry-root={!embedded}
	class:quest-log-panel--embedded={embedded}
	class:quest-log-panel--rail={embedded}
	class:quest-log-panel--premium={embedded}
	class:quest-log--empty={showEmpty}
	aria-label="Quest log"
	aria-busy={loading}
	data-mission-rail-state={JSON.stringify(missionRailDiagnostic)}
>
	{#if loading}
		<p class="quest-log__status" role="status">
			{embedded ? 'SCANNING…' : 'SCANNING MISSION QUEUE…'}
		</p>
	{:else if sortedQuests.length > 0}
		{#if embedded}
			<header class="quest-log__head quest-log__head--embedded">
				<h2 class="quest-log__title quest-log__title--embedded">ACTIVE MISSIONS</h2>
				<button
					type="button"
					class="quest-log__refresh pw-mono"
					disabled={loading || isRefreshing}
					onclick={refreshQuestLog}
				>
					{isRefreshing ? 'SYNC…' : 'REFRESH'}
				</button>
			</header>

			<div
				class="quest-log__feed quest-log__feed--embedded bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12"
				aria-label="Active missions"
			>
				{@render coachAssignHintBlock()}
				{#each embeddedFeed as quest (quest.id)}
					<div
						class="bento-span-12 quest-terminal-row quest-terminal-row--embedded"
						class:quest-terminal-row--habit={quest.tier === 'daily'}
						class:quest-terminal-row--bounty={quest.tier === 'bounty'}
					>
						<BountyRow {quest} embedded={true} {cadenceCompletions} intentRow={intentDataById[quest.id]} {playerUid} {playerXpByAttribute} {playerEmail} drillPreview={drillPreviewByQuestId[quest.id]} isParentVerified={approvedIntentIds.has(quest.id)} onAction={handleQuestAction} />
					</div>
				{/each}
			</div>
		{:else}
			<header class="quest-log__head">
				<p class="quest-log__eyebrow">Mission queue</p>
				<div class="quest-log__head-row">
					<h2 class="quest-log__title">Active missions</h2>
					<button
						type="button"
						class="quest-log__refresh pw-mono"
						disabled={loading || isRefreshing}
						onclick={refreshQuestLog}
					>
						{isRefreshing ? 'SYNC…' : 'REFRESH'}
					</button>
				</div>
			</header>

			<div class="quest-log__feed bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12" aria-label="Active mission queue">
				{@render coachAssignHintBlock()}
				{#if visibleBounties.length > 0}
					<p class="quest-log__section-tag">// PRIORITY DIRECTIVES</p>
					{#each visibleBounties as quest (quest.id)}
						<div class="bento-span-12 quest-terminal-row quest-terminal-row--bounty">
							<BountyRow {quest} variant="bounty" onAction={handleQuestAction} />
						</div>
					{/each}
				{/if}

				{#if visibleDailies.length > 0}
					<p class="quest-log__section-tag">// ACTIVE DIRECTIVES</p>
					{#each visibleDailies as quest (quest.id)}
						<div class="bento-span-12 quest-terminal-row quest-terminal-row--habit">
							<BountyRow {quest} variant="habit" onAction={handleQuestAction} />
						</div>
					{/each}
				{/if}
			</div>
		{/if}

		{#if hiddenCount > 0 && !showAllQuests}
			<button type="button" class="quest-log__more" class:quest-log__more--embedded={embedded} onclick={() => (showAllQuests = true)}>
				{#if embedded}
					View all missions ({sortedQuests.length})
				{:else}
					[ VIEW ALL ({sortedQuests.length}) ]
				{/if}
			</button>
		{/if}
	{:else}
		<p class="quest-log__placeholder" role="status">
			{missionRailEmptyMessage}
		</p>
	{/if}
</section>

<MissionHeroModal
	open={missionModalQuest != null}
	missionId={missionModalQuest ? formatMissionRailId(missionModalQuest.id) : ''}
	title={missionModalQuest?.title ?? ''}
	readout={missionModalQuest ?
		buildMissionRailModalReadout(missionModalQuest, drillPreviewByQuestId[missionModalQuest.id]?.line)
	:	''}
	onEngage={engageMissionModal}
	onTerminate={terminateMissionModal}
/>

{#if claimVideoQuest}
	<div
		class="hud-modal-backdrop"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => (claimVideoQuest = null)}
		onkeydown={(e) => { if (e.key === 'Escape') claimVideoQuest = null; }}
	>
		<div
			class="hud-modal-surface dark-form-surface"
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3 class="hud-modal-title">Submit Video Evidence</h3>
			<p class="hud-modal-desc">Provide a valid YouTube or Hudl URL to claim your XP bounty.</p>
			{#if claimVideoError}
				<p class="hud-modal-error" role="alert">{claimVideoError}</p>
			{/if}
			<input
				type="url"
				class="hud-modal-input"
				bind:value={claimVideoUrl}
				placeholder="https://youtu.be/..."
				disabled={claimVideoBusy}
			/>
			<div class="hud-modal-actions">
				<button class="hud-modal-btn" onclick={() => (claimVideoQuest = null)} disabled={claimVideoBusy}>Cancel</button>
				<button class="hud-modal-btn hud-modal-btn--primary" onclick={submitClaimVideo} disabled={claimVideoBusy}>
					{claimVideoBusy ? 'Submitting...' : 'Submit Evidence'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.hud-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.hud-modal-surface {
		background: var(--color-surface, #18181b);
		padding: 1.5rem;
		border-radius: 8px;
		width: 90%;
		max-width: 400px;
		border: 1px solid var(--color-border, #3f3f46);
	}
	.hud-modal-title {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 1.125rem;
		color: var(--color-text, #fafafa);
		margin-bottom: 0.5rem;
	}
	.hud-modal-desc {
		font-size: 0.875rem;
		color: var(--color-text-muted, #a1a1aa);
		margin-bottom: 1rem;
	}
	.hud-modal-error {
		font-size: 0.875rem;
		color: #ef4444;
		margin-bottom: 0.75rem;
	}
	.hud-modal-input {
		width: 100%;
		padding: 0.5rem;
		border-radius: 4px;
		border: 1px solid #3f3f46;
		background: #000;
		color: #fafafa;
		margin-bottom: 1rem;
	}
	.hud-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}
	.hud-modal-btn {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.875rem;
		background: transparent;
		color: #a1a1aa;
		border: none;
		cursor: pointer;
	}
	.hud-modal-btn:hover:not(:disabled) {
		color: #fafafa;
	}
	.hud-modal-btn--primary {
		background: var(--color-accent, #fbbf24);
		color: #000;
	}
	.hud-modal-btn--primary:hover:not(:disabled) {
		background: #f59e0b;
		color: #000;
	}
	.hud-modal-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

