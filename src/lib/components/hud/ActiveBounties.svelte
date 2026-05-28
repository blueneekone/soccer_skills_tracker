<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		collection,
		onSnapshot,
		orderBy,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { dopamineOnCommit } from '$lib/services/dopamine.svelte.js';
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';
	import { deduplicateById } from '$lib/utils/deduplicateMissions.js';
	import {
		buildDailyQuests,
		bountyFromCoachIntent,
		bountyFromHomeworkAssignment,
		bountyFromParentBounty,
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
		resolveQuestLifecycle,
		resolveHeroQuest,
		selectPrimaryBounty,
		sortQuestLog,
		type QuestTask,
	} from '$lib/player/dashboard/activeBounties.js';
	import {
		buildCoachHomeworkHandoff,
		buildCoachIntentHandoff,
		COACH_INTENT_HINT,
		formatSuggestedDrillLine,
		resolveHeuristicDrill,
		stashMissionHandoff,
	} from '$lib/player/workout/coachMissionFlow.js';
	import '$lib/styles/active-bounties.css';

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

	const quests = $derived(questsProp ?? internalQuests);
	const loading = $derived(loadingProp ?? internalLoading);

	const sortedQuests = $derived(sortQuestLog(quests));
	const dedupedQuests = $derived(deduplicateById(sortedQuests));
	const visibleQuests = $derived(
		showAllQuests ? dedupedQuests : dedupedQuests.slice(0, maxVisibleQuests()),
	);
	const hiddenCount = $derived(Math.max(0, dedupedQuests.length - maxVisibleQuests()));
	const showEmpty = $derived(!loading && dedupedQuests.length === 0);
	const heroQuest = $derived(
		embedded ? resolveHeroQuest(dedupedQuests, { lastTrainingUtc }) : null,
	);
	const visibleBounties = $derived(visibleQuests.filter((q) => q.tier === 'bounty'));
	const visibleDailies = $derived(visibleQuests.filter((q) => q.tier === 'daily'));
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
						typeof row.targetAttributeId === 'string' ? row.targetAttributeId.trim() : '';
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

	const playerUid = $derived(authStore.user?.uid ?? '');
	const playerEmail = $derived((authStore.user?.email || '').toLowerCase());
	const teamId = $derived(
		typeof authStore.userProfile?.teamId === 'string' ? authStore.userProfile.teamId.trim() : '',
	);

	$effect(() => {
		if (questsProp !== undefined) return;

		if (!browser || authStore.isLoading || authStore.role !== 'player') {
			internalLoading = false;
			internalQuests = [];
			return;
		}

		const uid = playerUid;
		const email = playerEmail;
		const tid = teamId;
		const profile = authStore.userProfile;

		if (!uid) {
			internalLoading = false;
			internalQuests = [];
			return;
		}

		internalLoading = true;
		questProgress = loadQuestProgress();

		/** @type {QuestTask[]} */
		let intents: QuestTask[] = [];
		/** @type {QuestTask[]} */
		let homework: QuestTask[] = [];
		/** @type {QuestTask[]} */
		let parentRows: QuestTask[] = [];

		const merge = () => {
			const progress = loadQuestProgress();
			const dailies = buildDailyQuests(
				profile && typeof profile === 'object' ?
					/** @type {Record<string, unknown>} */ (profile)
				:	null,
				progress,
			);
			const merged = [...intents, ...homework, ...parentRows, ...dailies].filter(
				(q) => !progress.claimedIds.includes(q.id),
			);
			internalQuests = sortQuestLog(merged);
			internalLoading = false;
		};

		const unsubs: Array<() => void> = [];

		if (tid) {
			const intentQ = query(
				collection(db, 'team_assignments'),
				where('teamId', '==', tid),
				where('status', '==', 'active'),
				orderBy('priority', 'asc'),
			);
			unsubs.push(
				onSnapshot(
					intentQ,
					(snap) => {
						const progress = loadQuestProgress();
						const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
						const scopedRows = uniqueDocs
							.map((d) => ({ id: d.id, ...d.data() }))
							.filter((row) => {
								if (!row.scope || row.scope === 'team') return true;
								return Array.isArray(row.targetUids) && row.targetUids.includes(uid);
							});
						intentDataById = Object.fromEntries(
							scopedRows.map((row) => [row.id, row as Record<string, unknown>]),
						);
						intents = scopedRows
							.map((row) => bountyFromCoachIntent(row.id, row, progress, uid))
							.filter((b): b is QuestTask => b != null);
						merge();
					},
					() => {
						intents = [];
						intentDataById = {};
						merge();
					},
				),
			);
		}

		const hwQ = query(
			collection(db, 'assignments'),
			where('playerId', '==', uid),
			where('status', '==', 'pending'),
		);
		unsubs.push(
			onSnapshot(
				hwQ,
				(snap) => {
					const progress = loadQuestProgress();
					const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
					const rows = uniqueDocs.map((d) => ({ id: d.id, ...d.data() }));
					homeworkDataById = Object.fromEntries(
						rows.map((row) => [row.id, row as Record<string, unknown>]),
					);
					homework = rows
						.map((row) => bountyFromHomeworkAssignment(row.id, row, progress))
						.filter((b): b is QuestTask => b != null);
					merge();
				},
				() => {
					homework = [];
					homeworkDataById = {};
					merge();
				},
			),
		);

		if (email) {
			const bountyQ = query(
				collection(db, 'bounties'),
				where('playerEmail', '==', email),
				where('status', 'in', ['active', 'verified']),
			);
			unsubs.push(
				onSnapshot(
					bountyQ,
					(snap) => {
						const progress = loadQuestProgress();
						const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
						parentRows = uniqueDocs
							.map((d) => bountyFromParentBounty(d.id, d.data(), progress))
							.filter((b): b is QuestTask => b != null);
						merge();
					},
					() => {
						parentRows = [];
						merge();
					},
				),
			);
		}

		return () => {
			for (const u of unsubs) u();
		};
	});

	function patchQuestLifecycle(list: QuestTask[]): QuestTask[] {
		return list.map((q) => ({
			...q,
			lifecycle: resolveQuestLifecycle(q.id, questProgress, {
				readyToClaim: q.lifecycle === 'claim',
			}),
		}));
	}

	function stashQuestHandoff(quest: QuestTask) {
		if (quest.source === 'coach_intent') {
			const row = intentDataById[quest.id] ?? {};
			const targetAttributeId =
				typeof row.targetAttributeId === 'string' ? row.targetAttributeId.trim() : '';
			const requiredXp = Math.max(0, Math.floor(Number(row.requiredXp) || 0));
			const preview = drillPreviewByQuestId[quest.id];
			stashMissionHandoff(
				buildCoachIntentHandoff({
					missionId: quest.id,
					targetAttributeId,
					requiredXp,
					drill: preview ? { id: preview.id, title: preview.title } : null,
				}),
			);
			return;
		}
		if (quest.source === 'coach_homework') {
			const row = homeworkDataById[quest.id] ?? {};
			stashMissionHandoff(
				buildCoachHomeworkHandoff({
					missionId: quest.id,
					drillTitle: quest.title,
					targetAttributeId:
						typeof row.targetAttributeId === 'string' ? row.targetAttributeId : undefined,
				}),
			);
		}
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
			const deferUntilLog = shouldDeferQuestCompletionUntilWorkoutLog(quest);
			if (!deferUntilLog) {
				questProgress = markQuestCompleted(quest.id, questProgress);
			}
			if (quest.source === 'coach_intent' || quest.source === 'coach_homework') {
				stashQuestHandoff(quest);
			}
			goto(resolve(quest.actionHref));
			if (!deferUntilLog && questsProp === undefined) {
				internalQuests = patchQuestLifecycle(internalQuests);
			}
			return;
		}

		questProgress = markQuestClaimed(quest.id, questProgress);
		dopamineOnCommit();
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
	<div
		class="hud-bounty-row quest-row quest-row--embedded quest-row--premium quest-row--rail"
		class:quest-row--habit={quest.tier === 'daily'}
		class:quest-row--bounty={quest.tier === 'bounty'}
		class:quest-row--hero={heroQuest?.id === quest.id}
		class:quest-row--promoted={!heroQuest && isPromotedQuest(quest)}
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
			aria-label={questCtaLabel(quest.lifecycle)}
			onclick={() => handleQuestAction(quest)}
		>
			{questHudCtaFor(quest)}
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

<section
	class="quest-log quest-log-panel"
	class:hud-telemetry-root={!embedded}
	class:quest-log-panel--embedded={embedded}
	class:quest-log-panel--rail={embedded}
	class:quest-log-panel--premium={embedded}
	class:quest-log--empty={showEmpty}
	aria-label="Quest log"
	aria-busy={loading}
>
	{#if loading}
		<p class="quest-log__status" role="status">
			{embedded ? 'SCANNING…' : 'SCANNING MISSION QUEUE…'}
		</p>
	{:else if sortedQuests.length > 0}
		{#if embedded}
			<header class="quest-log__head quest-log__head--embedded">
				<h2 class="quest-log__title quest-log__title--embedded">ACTIVE MISSIONS</h2>
			</header>

			<div
				class="quest-log__feed quest-log__feed--embedded bento-grid bento-grid--12col bento-grid--liquid"
				aria-label="Active missions"
			>
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
				<h2 class="quest-log__title">Active missions</h2>
			</header>

			<div class="quest-log__feed bento-grid bento-grid--12col bento-grid--liquid" aria-label="Active mission queue">
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
		<p class="quest-log__placeholder" aria-hidden="true">NO ACTIVE MISSIONS</p>
	{/if}
</section>

