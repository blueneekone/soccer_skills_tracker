<script lang="ts">
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';
	import {
		questCtaLabel,
		questTerminalCmd,
		questHudCtaFor,
		questHudCtaBlockedCadence,
		formatCadenceProgress,
		countCadenceSessionsInWindow,
		formatIntentXpProgressLine,
		computeCoachIntentEarnedXp,
		coachIntentCreditedToday,
		questCadenceBlockedToday,
		COACH_INTENT_TODAY_COMPLETE,
		type QuestTask,
	} from '$lib/player/dashboard/activeBounties.js';
	import type { CadenceCompletionRow } from '$lib/player/dashboard/cadenceCompletions.js';

	let {
		quest,
		variant = 'bounty',
		embedded = false,
		cadenceCompletions = [],
		intentRow = undefined,
		playerUid = '',
		playerXpByAttribute = {},
		playerEmail = '',
		drillPreview = undefined,
		isParentVerified = false,
		onAction,
	}: {
		quest: QuestTask;
		variant?: 'bounty' | 'habit';
		embedded?: boolean;
		cadenceCompletions?: CadenceCompletionRow[];
		intentRow?: Record<string, unknown>;
		playerUid?: string;
		playerXpByAttribute?: Record<string, number>;
		playerEmail?: string;
		drillPreview?: { id: string; title: string; line: string };
		isParentVerified?: boolean;
		onAction: (quest: QuestTask) => void;
	} = $props();

	let cadenceBlocked = $derived(embedded ? questCadenceBlockedToday(quest, cadenceCompletions) : false);
	let coachRequiredXp = $derived(
		quest.source === 'coach_intent'
			? Math.max(0, Math.floor(Number(intentRow?.requiredXp) || quest.xpReward || 0))
			: 0
	);
	let coachEarnedXp = $derived(
		quest.source === 'coach_intent'
			? computeCoachIntentEarnedXp(intentRow, playerUid, playerXpByAttribute, playerEmail)
			: 0
	);
	let coachXpProgressLine = $derived(
		quest.source === 'coach_intent'
			? formatIntentXpProgressLine(coachEarnedXp, coachRequiredXp)
			: ''
	);
	let creditedToday = $derived(
		quest.source === 'coach_intent' ? coachIntentCreditedToday(quest, cadenceCompletions) : false
	);
</script>

{#if embedded}
	<div
		class="hud-bounty-row quest-row quest-row--embedded"
		class:quest-row--cadence-blocked={cadenceBlocked}
	>
		<div class="hud-bounty-row__copy quest-row__copy quest-row__copy--embedded">
			{#if quest.senderLabel}
				<p class="quest-row__sender">{quest.senderLabel}</p>
			{/if}
			<h3 class="quest-row__title" title={quest.title}>
				<span class="quest-row__title-text">{quest.title}</span>
			</h3>
			{#if coachXpProgressLine}
				<p class="quest-row__cadence pw-mono" aria-label="XP progress">
					{coachXpProgressLine}
				</p>
			{/if}
			{#if creditedToday}
				<p class="quest-row__cadence quest-row__cadence--today pw-mono" role="status">
					{COACH_INTENT_TODAY_COMPLETE}
				</p>
			{/if}
			{#if quest.source === 'coach_intent'}
				{#if drillPreview}
					<p class="quest-row__drill">{drillPreview.line}</p>
				{/if}
				{#if quest.cadence && quest.targetAttributeId}
					{@const completed = countCadenceSessionsInWindow(
						cadenceCompletions,
						quest.targetAttributeId,
						quest.cadence.windowDays,
						undefined,
						quest.id,
					)}
					<p class="quest-row__cadence pw-mono" aria-label="Cadence progress">
						{formatCadenceProgress(completed, quest.cadence.sessionsPerWindow, quest.cadence.windowDays)}
					</p>
				{/if}
				{#if isParentVerified}
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
			onclick={() => onAction(quest)}
		>
			{cadenceBlocked ? questHudCtaBlockedCadence() : questHudCtaFor(quest)}
		</button>
	</div>
{:else}
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
			onclick={() => onAction(quest)}
		>
			{questTerminalCmd(quest.lifecycle)}
		</button>
	</div>
{/if}
