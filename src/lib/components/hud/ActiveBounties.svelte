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
	import '$lib/styles/hud-telemetry.css';
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
		questCtaLabel,
		questHudCtaShort,
		questTerminalCmd,
		resolveQuestLifecycle,
		sortQuestLog,
		type QuestTask,
	} from '$lib/player/dashboard/activeBounties.js';

	let {
		embedded = false,
		quests: questsProp = undefined,
		loading: loadingProp = undefined,
	}: {
		embedded?: boolean;
		quests?: QuestTask[];
		loading?: boolean;
	} = $props();

	let internalQuests = $state<QuestTask[]>([]);
	let internalLoading = $state(true);
	let questProgress = $state(loadQuestProgress());
	let showAllQuests = $state(false);

	const quests = $derived(questsProp ?? internalQuests);
	const loading = $derived(loadingProp ?? internalLoading);

	const sortedQuests = $derived(sortQuestLog(quests));
	const dedupedQuests = $derived(deduplicateById(sortedQuests));
	const visibleQuests = $derived(
		showAllQuests ? dedupedQuests : dedupedQuests.slice(0, maxVisibleQuests()),
	);
	const hiddenCount = $derived(Math.max(0, dedupedQuests.length - maxVisibleQuests()));
	const showEmpty = $derived(!loading && dedupedQuests.length === 0);
	const visibleBounties = $derived(visibleQuests.filter((q) => q.tier === 'bounty'));
	const visibleDailies = $derived(visibleQuests.filter((q) => q.tier === 'daily'));

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
						intents = uniqueDocs
							.map((d) => ({ id: d.id, ...d.data() }))
							.filter((row) => {
								if (!row.scope || row.scope === 'team') return true;
								return Array.isArray(row.targetUids) && row.targetUids.includes(uid);
							})
							.map((row) => bountyFromCoachIntent(row.id, row, progress, uid))
							.filter((b): b is QuestTask => b != null);
						merge();
					},
					() => {
						intents = [];
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
					homework = uniqueDocs
						.map((d) => bountyFromHomeworkAssignment(d.id, d.data(), progress))
						.filter((b): b is QuestTask => b != null);
					merge();
				},
				() => {
					homework = [];
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

	/** @param {QuestTask} quest */
	function handleQuestAction(quest: QuestTask) {
		if (quest.lifecycle === 'accept') {
			questProgress = markQuestAccepted(quest.id, questProgress);
			if (quest.source === 'coach_intent' && typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('player_active_mission_id', quest.id);
			}
			if (quest.source === 'coach_homework' && typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('player_active_assignment_id', quest.id);
			}
			if (questsProp === undefined) {
				internalQuests = patchQuestLifecycle(internalQuests);
			}
			return;
		}

		if (quest.lifecycle === 'complete') {
			questProgress = markQuestCompleted(quest.id, questProgress);
			if (quest.source === 'coach_intent' && typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('player_active_mission_id', quest.id);
			}
			if (quest.source === 'coach_homework' && typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('player_active_assignment_id', quest.id);
			}
			goto(resolve(quest.actionHref));
			return;
		}

		questProgress = markQuestClaimed(quest.id, questProgress);
		dopamineOnCommit();
		if (questsProp === undefined) {
			internalQuests = internalQuests.filter((q) => q.id !== quest.id);
		}
	}
</script>

{#snippet questRowEmbedded(quest: QuestTask)}
	<div
		class="hud-bounty-row quest-row quest-row--embedded"
		class:quest-row--habit={quest.tier === 'daily'}
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
			</p>
		</div>

		<div class="hud-bounty-row__reward quest-row__reward quest-row__reward--embedded" aria-label="Reward">
			{#if quest.xpReward > 0}
				<span class="quest-row__xp">+{quest.xpReward.toLocaleString()} XP</span>
			{:else if quest.rewardLabel}
				<span class="quest-row__xp quest-row__xp--cash">{quest.rewardLabel}</span>
			{/if}
		</div>

		<button
			type="button"
			class="hud-bounty-row__cmd quest-row__cmd quest-row__cmd--embedded"
			class:quest-row__cmd--accept={quest.lifecycle === 'accept'}
			class:quest-row__cmd--complete={quest.lifecycle === 'complete'}
			class:quest-row__cmd--claim={quest.lifecycle === 'claim'}
			aria-label={questCtaLabel(quest.lifecycle)}
			onclick={() => handleQuestAction(quest)}
		>
			{questHudCtaShort(quest.lifecycle)}
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
				strokeColor={variant === 'bounty' ? 'var(--color-accent, #fbbf24)' : '#22d3ee'}
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
	class="quest-log quest-log-panel hud-telemetry-root"
	class:quest-log-panel--embedded={embedded}
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
				<p class="quest-log__eyebrow quest-log__eyebrow--deck">// MISSION DECK</p>
				<h2 class="quest-log__title quest-log__title--embedded">ACTIVE MISSIONS</h2>
			</header>

			<div
				class="quest-log__feed quest-log__feed--embedded bento-grid bento-grid--12col bento-grid--liquid"
				aria-label="Active mission deck"
			>
				{#each visibleQuests as quest (quest.id)}
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

<style>
	.quest-log-panel {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		padding: clamp(14px, 2.5vw, 20px);
		background: rgba(5, 10, 16, 0.95);
		clip-path: polygon(
			0 16px,
			16px 0,
			calc(100% - 16px) 0,
			100% 16px,
			100% calc(100% - 16px),
			calc(100% - 16px) 100%,
			16px 100%,
			0 calc(100% - 16px)
		);
		border: 1px solid rgba(0, 255, 255, 0.15);
	}

	.quest-log-panel--embedded {
		padding: 0 !important;
		border: none !important;
		border-radius: 0 !important;
		background: transparent !important;
		box-shadow: none !important;
		clip-path: none !important;
	}

	.quest-log--empty {
		min-height: 0;
		padding-block: 0.25rem;
	}

	.quest-log__head {
		margin-bottom: clamp(8px, 1.5vw, 12px);
	}

	.quest-log__head--embedded {
		margin-bottom: clamp(6px, 1vw, 8px);
	}

	.quest-log__eyebrow--deck {
		margin: 0 0 0.15rem;
		font-size: 0.48rem;
		color: rgb(148 163 184 / 0.55);
	}

	.quest-log__title--embedded {
		font-size: clamp(0.62rem, 1.4vw, 0.72rem);
		letter-spacing: 0.14em;
	}

	.quest-log__eyebrow {
		margin: 0 0 0.25rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.55rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 70%, #94a3b8);
	}

	.quest-log__title {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.82rem, 2vw, 0.95rem);
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.quest-log__status {
		margin: 0;
		padding: 0.35rem 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 55%, #64748b);
	}

	.quest-log__placeholder {
		margin: 0;
		padding: 0.15rem 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgb(148 163 184 / 0.28);
	}

	.quest-log__feed {
		margin: 0;
		padding: 0;
		width: 100%;
		min-width: 0;
	}

	.quest-log__section-tag {
		margin: 0.65rem 0 0.35rem;
		padding: 0;
		grid-column: 1 / -1;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.48rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: rgba(0, 255, 255, 0.55);
	}

	.quest-log__section-tag:first-child {
		margin-top: 0;
	}

	.quest-terminal-row--embedded {
		padding: clamp(6px, 1vw, 8px) 0;
		min-height: 44px;
	}

	.quest-row--embedded .quest-row__line {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0;
		min-width: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.62rem, 1.4vw, 0.72rem);
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.quest-row--embedded .quest-row__sender {
		margin: 0;
		flex-shrink: 0;
		font-size: 0.48rem;
		color: color-mix(in srgb, var(--color-accent, #fbbf24) 85%, #94a3b8);
	}

	.quest-row--embedded .quest-row__sep {
		flex-shrink: 0;
		color: rgb(148 163 184 / 0.45);
	}

	.quest-row--embedded .quest-row__title-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.quest-row__status--idle {
		background: rgb(148 163 184 / 0.25);
		box-shadow: none;
		animation: none;
	}

	.quest-row__cmd--embedded {
		color: var(--color-accent, #fbbf24);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.quest-row__cmd--embedded.quest-row__cmd--complete,
	.quest-row__cmd--embedded.quest-row__cmd--claim {
		color: var(--color-accent, #fbbf24);
	}

	.quest-row--embedded .quest-row__xp {
		font-size: clamp(0.58rem, 1.2vw, 0.68rem);
		color: var(--color-accent, #fbbf24);
	}

	.quest-row--embedded .quest-row__xp--habit {
		color: color-mix(in srgb, var(--color-accent, #fbbf24) 75%, #94a3b8);
	}

	.quest-log__more--embedded {
		font-size: 0.52rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: none;
		color: color-mix(in srgb, var(--color-accent, #fbbf24) 70%, #94a3b8);
	}

	.quest-log__more--embedded:hover {
		color: var(--color-accent, #fbbf24);
		text-shadow: 0 0 8px rgb(251 191 36 / 0.45);
	}

	.quest-terminal-row {
		padding: clamp(6px, 1.2vw, 10px) 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		background: transparent !important;
		border-radius: 0 !important;
		min-width: 0;
	}

	.quest-terminal-row:last-child {
		border-bottom: none;
	}

	.quest-log__more {
		margin: 0.75rem 0 0;
		padding: 0;
		border: none;
		background: transparent;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 75%, #94a3b8);
		cursor: pointer;
		transition: text-shadow 0.15s ease, color 0.15s ease;
	}

	.quest-log__more:hover {
		color: var(--color-structural, #3b82f6);
		text-shadow: 0 0 8px currentColor;
	}

	.quest-row {
		width: 100%;
		min-width: 0;
	}

	.quest-row__copy {
		min-width: 0;
	}

	.quest-row__sender {
		margin: 0 0 0.2rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 70%, #94a3b8);
	}

	.quest-card--bounty .quest-row__sender {
		color: var(--color-accent, #fbbf24);
	}

	.quest-row__title {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		min-width: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.78rem, 1.8vw, 0.9rem);
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.quest-row__title-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.quest-row__status {
		display: inline-block;
		width: 6px;
		height: 6px;
		flex-shrink: 0;
		background: var(--color-accent, #fbbf24);
		box-shadow: 0 0 8px var(--color-accent, #fbbf24);
		animation: quest-status-pulse 1.35s ease-in-out infinite;
	}

	@keyframes quest-status-pulse {
		0%,
		100% {
			opacity: 1;
			box-shadow: 0 0 6px var(--color-accent, #fbbf24);
		}
		50% {
			opacity: 0.45;
			box-shadow: 0 0 14px var(--color-accent, #fbbf24);
		}
	}

	.quest-row__reward {
		display: grid;
		gap: clamp(4px, 0.8vw, 8px);
		justify-items: end;
		min-width: 0;
	}

	.quest-row__axis {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: color-mix(in srgb, var(--color-structural, #3b82f6) 85%, #e2e8f0);
		background: transparent !important;
		border: none !important;
		border-radius: 0 !important;
		width: auto;
		height: auto;
		padding: 0;
	}

	.quest-row__xp {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.8rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent, #fbbf24);
		white-space: nowrap;
	}

	.quest-row__xp--habit {
		color: #22d3ee;
	}

	.quest-row__xp--cash {
		color: var(--color-accent, #fbbf24);
	}

	.quest-row__cmd {
		flex-shrink: 0;
		margin: 0;
		padding: 0;
		border: none !important;
		border-radius: 0 !important;
		background: transparent !important;
		box-shadow: none !important;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: text-shadow 0.15s ease, color 0.15s ease;
	}

	.quest-row__cmd--accept {
		color: #22d3ee;
	}

	.quest-row__cmd--complete {
		color: var(--color-accent, #fbbf24);
	}

	.quest-row__cmd--claim {
		color: #2dff9a;
	}

	.quest-row__cmd:hover {
		text-shadow: 0 0 8px currentColor;
	}

	.quest-row__cmd:focus-visible {
		outline: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 50%, transparent);
		outline-offset: 3px;
	}

	@media (max-width: 640px) {
		.quest-row {
			flex-wrap: wrap;
			align-items: flex-start;
		}

		.quest-row__cmd {
			width: 100%;
			text-align: left;
		}
	}
</style>
