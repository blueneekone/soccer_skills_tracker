<script lang="ts">
	import { browser } from '$app/environment';
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import { goto } from '$app/navigation';
	import {
		collection,
		onSnapshot,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import {
		MissionSnapshotRetryGate,
	} from '$lib/player/dashboard/missionRailAuth.js';
	import { fetchCoachIntentQuests, mapCoachIntentRows, coachIntentRemovalDelta, applyCoachIntentPurge, applyCoachIntentRefetch, subscribeCoachIntentSnapshot } from '$lib/player/dashboard/missionRailCoachIntents.js';
	import { MissionRailClaimsSync } from '$lib/player/dashboard/missionRailClaims.svelte.js';
	import {
		buildMissionRailDiagnostic,
		logMissionRailSnapshotOnce,
		missionRailEmptyMessageFor,
		missionRailSnapshotLogKey,
	} from '$lib/player/dashboard/missionRailDiagnostics.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { dopamineExplosion } from '$lib/services/dopamine.svelte.js';
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';
	import { deduplicateById } from '$lib/utils/deduplicateMissions.js';
	import {
		buildDailyQuests,
		bountyFromHomeworkAssignment,
		bountyFromParentBounty,
		coachIntentReadyToClaim,
		countCadenceSessionsInWindow,
		formatCadenceProgress,
		hasCadenceCreditToday,
		questCadenceBlockedToday,
		questHudCtaBlockedCadence,
		loadQuestProgress,
		markQuestAccepted,
		markQuestClaimed,
		markQuestCompleted,
		maxVisibleQuests,
		purgeCoachIntentIds,
		formatQuestRewardLabel,
		isPromotedQuest,
		questCtaLabel,
		shouldDeferQuestCompletionUntilWorkoutLog,
		questHudCtaFor,
		questHudCtaShort,
		questTerminalCmd,
		resolveQuestLifecycle,
		resolveHeroQuest,
		selectPrimaryBounty,
		sortQuestLog,
		type QuestTask,
		questVisibleInMissionRail,
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
	let coachIntentListenerAttached = $state(false);
	let serverRefetchIntentCount = $state<number | null>(null);
	let missionRailLogKey = $state('');
	const missionClaimsSync = new MissionRailClaimsSync();
	const missionRetryGate = new MissionSnapshotRetryGate();
	let lastCoachIntentIds = $state<string[]>([]);
	/** Flat completion records for cadence progress — fetched once per uid, not real-time. */
	let cadenceCompletions = $state<CadenceCompletionRow[]>([]);
	/**
	 * B4b advisory badge: intentIds that have an 'approved' completion_verifications record
	 * for this player. Subscribed player-own only (playerUid == auth.uid). Read-only display —
	 * does NOT affect XP, progress, or intent fulfilment.
	 */
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
	const missionRailDiagnostic = $derived(
		buildMissionRailDiagnostic({
			missionSyncBlocked,
			authLoaded: playerAuthLoaded,
			teamIdUsed: teamId,
			intentSnapshotCount,
			intentScopedCount,
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
		const hasCadenceQuests = dedupedQuests.some(
			(q) => q.source === 'coach_intent' && q.cadence,
		);
		if (!hasCadenceQuests) return;
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

		void refreshNonce; void missionClaimsSync.claimsSyncNonce; void missionClaimsSync.tokenTeamId;

		if (!browser || authStore.isLoading || authStore.role !== 'player' || !playerUid) {
			internalLoading = false;
			internalQuests = [];
			hasQuestLogLoaded = false;
			missionRetryGate.reset();
			intentSnapshotCount = 0;
			intentScopedCount = 0;
			coachIntentListenerAttached = false;
			serverRefetchIntentCount = null;
			return;
		}

		const uid = playerUid;
		const email = playerEmail;
		const tid = teamId;
		const profile = authStore.userProfile;

		if (!hasQuestLogLoaded) internalLoading = true;
		questProgress = loadQuestProgress();

		/** @type {QuestTask[]} */
		let intents: QuestTask[] = [];
		/** @type {QuestTask[]} */
		let homework: QuestTask[] = [];
		/** @type {QuestTask[]} */
		let parentRows: QuestTask[] = [];
		/** @type {Set<string>} */
		let activeCoachIntentIds = new Set<string>();

		const merge = () => {
			const progress = loadQuestProgress();
			const dailies = buildDailyQuests(
				profile && typeof profile === 'object' ?
					/** @type {Record<string, unknown>} */ (profile)
				:	null,
				progress,
			);
			const merged = [...intents, ...homework, ...parentRows, ...dailies].filter((q) =>
				questVisibleInMissionRail(q, progress, activeCoachIntentIds));
			internalQuests = sortQuestLog(merged);
			internalLoading = false;
			hasQuestLogLoaded = true;
		};

		const syncCoachIntentRemoval = (activeIds: Set<string>) => {
			activeCoachIntentIds = activeIds;
			const { removed, nextIds } = coachIntentRemovalDelta(lastCoachIntentIds, activeIds);
			lastCoachIntentIds = nextIds;
			if (removed.length === 0) return;
			questProgress = applyCoachIntentPurge(questProgress, removed);
		};

		const applyCoachIntents = (scopedRows: Array<{ id: string } & Record<string, unknown>>) => {
			const progress = loadQuestProgress();
			const { quests, intentDataById: nextIntentData, activeIds } = mapCoachIntentRows(
				scopedRows,
				progress,
				uid,
			);
			syncCoachIntentRemoval(activeIds);
			intentDataById = nextIntentData;
			intents = quests;
			merge();
		};

		const unsubs: Array<() => void> = [];

		if (tid) {
			coachIntentListenerAttached = true;
			unsubs.push(
				subscribeCoachIntentSnapshot(db, tid, uid, {
					onSuccess: () => {
						missionSyncBlocked = false;
						missionRetryGate.onSuccess();
						isRefreshing = false;
					},
					onEmpty: () => {
						intentSnapshotCount = 0;
						intentScopedCount = 0;
						syncCoachIntentRemoval(new Set());
						intentDataById = {};
						intents = [];
						merge();
					},
					onRows: (scopedRows, rawCount, scopedCount) => {
						intentSnapshotCount = rawCount;
						intentScopedCount = scopedCount;
						applyCoachIntents(scopedRows);
					},
					onError: (err) => {
						console.error('[ActiveBounties] team_assignments snapshot error:', err, {
							teamId: tid,
							clubId,
						});
						missionRetryGate.onError(
							() => {
								isRefreshing = true;
								void authStore.refreshClaims().finally(() => {
									refreshNonce += 1;
								});
							},
							() => {
								missionSyncBlocked = true;
								isRefreshing = false;
								coachIntentListenerAttached = false;
								intentSnapshotCount = 0;
								intentScopedCount = 0;
								syncCoachIntentRemoval(new Set());
								intents = [];
								intentDataById = {};
								merge();
							},
						);
					},
				}),
			);
		} else {
			coachIntentListenerAttached = false;
			intentSnapshotCount = 0;
			intentScopedCount = 0;
		}

		const hwQ = query(collection(db, 'assignments'), where('playerId', '==', uid), where('status', '==', 'pending'));
		unsubs.push(onSnapshot(hwQ, (snap) => {
			const progress = loadQuestProgress();
			const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
			const rows = uniqueDocs.map((d) => ({ id: d.id, ...d.data() }));
			homeworkDataById = Object.fromEntries(rows.map((row) => [row.id, row as Record<string, unknown>]));
			homework = rows.map((row) => bountyFromHomeworkAssignment(row.id, row, progress)).filter((b): b is QuestTask => b != null);
			merge();
		}, () => { homework = []; homeworkDataById = {}; merge(); }));

		if (email) {
			const bountyQ = query(collection(db, 'bounties'), where('playerEmail', '==', email), where('status', 'in', ['active', 'verified']));
			unsubs.push(onSnapshot(bountyQ, (snap) => {
				const progress = loadQuestProgress();
				const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
				parentRows = uniqueDocs.map((d) => bountyFromParentBounty(d.id, d.data(), progress)).filter((b): b is QuestTask => b != null);
				merge();
			}, () => { parentRows = []; merge(); }));
		}

		return () => {
			for (const u of unsubs) u();
		};
	});

	$effect(() => {
		if (questsProp !== undefined) return;
		void refreshNonce;
		void missionClaimsSync.claimsSyncNonce;
		if (!browser || authStore.isLoading || authStore.role !== 'player') return;
		const tid = teamId;
		if (!tid || (refreshNonce === 0 && missionClaimsSync.claimsSyncNonce === 0)) return;
		isRefreshing = true;
		void fetchCoachIntentQuests(db, tid, playerUid, loadQuestProgress())
			.then((snapshot) => {
				missionSyncBlocked = false;
				missionRetryGate.onSuccess();
				serverRefetchIntentCount = snapshot.quests.length;
				const applied = applyCoachIntentRefetch({
					snapshot,
					lastCoachIntentIds,
					internalQuests,
					questProgress,
				});
				lastCoachIntentIds = applied.lastCoachIntentIds;
				questProgress = applied.questProgress;
				intentDataById = applied.intentDataById;
				internalQuests = applied.internalQuests;
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

	function patchQuestLifecycle(list: QuestTask[]): QuestTask[] {
		return list.map((q) => ({
			...q,
			lifecycle: resolveQuestLifecycle(q.id, questProgress, {
				readyToClaim: q.lifecycle === 'claim',
			}),
		}));
	}

	function stashQuestHandoff(quest: QuestTask) {
		void stashQuestTrainHandoff(db, quest, {
			intentRow: intentDataById[quest.id],
			homeworkRow: homeworkDataById[quest.id],
			drillPreview: drillPreviewByQuestId[quest.id] ?? null,
			clubId: String(authStore.userProfile?.clubId ?? authStore.tenantId ?? ''),
		});
	}

	function completeQuestHandoff(quest: QuestTask) {
		const deferUntilLog = shouldDeferQuestCompletionUntilWorkoutLog(quest);
		if (!deferUntilLog) {
			questProgress = markQuestCompleted(quest.id, questProgress);
		}
		if (quest.source === 'coach_intent' || quest.source === 'coach_homework') {
			stashQuestHandoff(quest);
		}
		goto(resolveAppPath(quest.actionHref));
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

	/** @param {QuestTask} quest */
	function handleQuestAction(quest: QuestTask) {
		if (quest.lifecycle === 'accept') {
			questProgress = markQuestAccepted(quest.id, questProgress);
			if (quest.source === 'coach_intent' || quest.source === 'coach_homework') {
				stashQuestHandoff(quest);
			}
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

		if (quest.source === 'coach_intent' && !coachIntentReadyToClaim(intentDataById[quest.id], authStore.user?.uid ?? '')) return;

		questProgress = markQuestClaimed(quest.id, questProgress);
		void dopamineExplosion('grit');
		if (questsProp === undefined) {
			internalQuests = internalQuests.filter((q) => q.id !== quest.id);
		}
	}
</script>

{#snippet questCardContent(quest: QuestTask)}
	{#if quest.senderLabel}
		<p class="quest-hero__sender">{quest.senderLabel}</p>
	{/if}
	<h3 class="quest-hero__title">{quest.title}</h3>
	{#if formatQuestRewardLabel(quest)}
		<p class="quest-hero__reward">{formatQuestRewardLabel(quest)}</p>
	{/if}
	<button
		type="button"
		class="quest-hero__cta"
		aria-label={questCtaLabel(quest.lifecycle)}
		onclick={() => handleQuestAction(quest)}
	>
		{questHudCtaFor(quest)}
	</button>
{/snippet}

{#snippet questHeroCard(quest: QuestTask, accent: 'gold' | 'teal', primary = false)}
	<article
		class="quest-hero quest-hero--premium"
		class:quest-hero--primary={primary}
		class:quest-hero--gold={accent === 'gold'}
		class:quest-hero--teal={accent === 'teal'}
		data-partial={quest.lifecycle === 'complete' ? 'true' : undefined}
		aria-label="Mission"
	>{@render questCardContent(quest)}</article>
{/snippet}

{#snippet questSecondaryCard(quest: QuestTask)}
	<article
		class="quest-hero quest-hero--compact quest-hero--teal"
		data-partial={quest.lifecycle === 'complete' ? 'true' : undefined}
		aria-label="Secondary mission"
	>{@render questCardContent(quest)}</article>
{/snippet}

{#snippet questRowEmbedded(quest: QuestTask)}
	{@const cadenceBlocked = questCadenceBlockedToday(quest, cadenceCompletions)}
	<div
		class="hud-bounty-row quest-row quest-row--embedded quest-row--premium quest-row--rail"
		class:quest-row--habit={quest.tier === 'daily'}
		class:quest-row--bounty={quest.tier === 'bounty'}
		class:quest-row--hero={heroQuest?.id === quest.id}
		class:quest-row--promoted={isPromotedQuest(quest) && heroQuest?.id !== quest.id}
	>
		{#if quest.lifecycle === 'accept'}
			<span class="quest-row__status" aria-hidden="true"></span>
		{:else}
			<span class="quest-row__status quest-row__status--idle" aria-hidden="true"></span>
		{/if}

		<div class="hud-bounty-row__copy quest-row__copy quest-row__copy--embedded">
			<p class="quest-row__line" title={quest.title}>
				<span class="quest-row__sender">{quest.senderLabel}</span>
				<span class="quest-row__sep" aria-hidden="true">·</span>
				<span class="quest-row__title-text">{quest.title}</span>
				{#if formatQuestRewardLabel(quest)}
					<span class="quest-row__sep quest-row__sep--reward" aria-hidden="true">·</span>
					<span class="quest-row__xp quest-row__xp--inline">{formatQuestRewardLabel(quest)}</span>
				{/if}
			</p>
			{#if formatQuestRewardLabel(quest)}
				<p class="quest-row__lede quest-row__lede--rail-wide">{formatQuestRewardLabel(quest)}</p>
			{/if}
			{#if quest.source === 'coach_intent'}
				<p class="quest-row__hint">{COACH_INTENT_HINT}</p>
				{#if drillPreviewByQuestId[quest.id]?.line}
					<p class="quest-row__drill">{drillPreviewByQuestId[quest.id].line}</p>
				{/if}
				{#if quest.cadence && quest.targetAttributeId}
					{@const completed = countCadenceSessionsInWindow(
						cadenceCompletions,
						quest.targetAttributeId,
						quest.cadence.windowDays,
					)}
					<p class="quest-row__cadence pw-mono" aria-label="Cadence progress">
						{formatCadenceProgress(completed, quest.cadence.sessionsPerWindow, quest.cadence.windowDays)}
					</p>
				{/if}
				{#if approvedIntentIds.has(quest.id)}
					<span class="quest-row__parent-verified" aria-label="Parent-verified">
						Parent-verified
					</span>
				{/if}
			{:else if quest.source === 'coach_homework'}
				<p class="quest-row__drill">Assigned drill: {quest.title}</p>
			{/if}
		</div>

		<div
			class="hud-bounty-row__reward quest-row__reward quest-row__reward--embedded"
			aria-hidden="true"
		></div>

		<button
			type="button"
			class="hud-bounty-row__cmd quest-row__cmd quest-row__cmd--embedded quest-row__cmd--rail-chip"
			class:quest-row__cmd--accept={quest.lifecycle === 'accept'}
			class:quest-row__cmd--complete={quest.lifecycle === 'complete'}
			class:quest-row__cmd--claim={quest.lifecycle === 'claim'}
			class:quest-row__cmd--cadence-blocked={cadenceBlocked}
			disabled={cadenceBlocked}
			aria-label={cadenceBlocked ? questHudCtaBlockedCadence() : questCtaLabel(quest.lifecycle)}
			onclick={() => handleQuestAction(quest)}
		>
			{cadenceBlocked ? questHudCtaBlockedCadence() : questHudCtaFor(quest)}
		</button>
	</div>
{/snippet}

{#snippet questRow(quest: QuestTask, variant: 'bounty' | 'habit')}
	<div class="hud-bounty-row quest-row" class:quest-row--habit={variant === 'habit'}>
		<div class="hud-bounty-row__copy quest-row__copy">
			<p class="quest-row__sender">{quest.senderLabel}</p>
			<h3 class="quest-row__title" title={quest.title}>
				{#if quest.lifecycle === 'accept'}
					<span class="quest-row__status" aria-hidden="true"></span>
				{/if}
				<span class="quest-row__title-text">{quest.title}</span>
			</h3>
		</div>

		<div class="hud-bounty-row__ring">
			<HudSeededRingCanvas
				uid={quest.id}
				size={48}
				fill={Math.min(1, quest.xpReward / 500)}
				strokeColor={variant === 'bounty' ? 'var(--color-accent, #fbbf24)' : 'var(--pd-accent-data, #14b8a6)'}
				showCenter={false}
			/>
		</div>

		<div class="hud-bounty-row__reward quest-row__reward" aria-label="Reward">
			{#if variant === 'bounty'}
				<span class="quest-row__axis" title={quest.axisId}>{quest.axisId}</span>
			{/if}
			{#if quest.xpReward > 0}
				<span class="quest-row__xp" class:quest-row__xp--habit={variant === 'habit'}>
					+{quest.xpReward.toLocaleString()} XP
				</span>
			{:else if quest.rewardLabel}
				<span class="quest-row__xp quest-row__xp--cash">{quest.rewardLabel}</span>
			{/if}
		</div>

		<button
			type="button"
			class="hud-bounty-row__cmd quest-row__cmd"
			class:quest-row__cmd--accept={quest.lifecycle === 'accept'}
			class:quest-row__cmd--complete={quest.lifecycle === 'complete'}
			class:quest-row__cmd--claim={quest.lifecycle === 'claim'}
			aria-label={questCtaLabel(quest.lifecycle)}
			onclick={() => handleQuestAction(quest)}
		>
			{questTerminalCmd(quest.lifecycle)}
		</button>
	</div>
{/snippet}

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
				class="quest-log__feed quest-log__feed--embedded bento-grid bento-grid--12col bento-grid--liquid"
				aria-label="Active missions"
			>
				{@render coachAssignHintBlock()}
				{#each embeddedFeed as quest (quest.id)}
					<div
						class="bento-span-12 quest-terminal-row quest-terminal-row--embedded"
						class:quest-terminal-row--habit={quest.tier === 'daily'}
						class:quest-terminal-row--bounty={quest.tier === 'bounty'}
					>
						{@render questRowEmbedded(quest)}
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

			<div class="quest-log__feed bento-grid bento-grid--12col bento-grid--liquid" aria-label="Active mission queue">
				{@render coachAssignHintBlock()}
				{#if visibleBounties.length > 0}
					<p class="quest-log__section-tag">// PRIORITY DIRECTIVES</p>
					{#each visibleBounties as quest (quest.id)}
						<div class="bento-span-12 quest-terminal-row quest-terminal-row--bounty">
							{@render questRow(quest, 'bounty')}
						</div>
					{/each}
				{/if}

				{#if visibleDailies.length > 0}
					<p class="quest-log__section-tag">// ACTIVE DIRECTIVES</p>
					{#each visibleDailies as quest (quest.id)}
						<div class="bento-span-12 quest-terminal-row quest-terminal-row--habit">
							{@render questRow(quest, 'habit')}
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

