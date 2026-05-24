<script lang="ts">
	import {
		formatQuestRewardLabel,
		isPromotedQuest,
		type QuestTask,
	} from '$lib/player/dashboard/activeBounties.js';

	let { quest = null }: { quest?: QuestTask | null } = $props();
</script>

<article
	class="quest-hero quest-hero--premium quest-hero--train"
	class:quest-hero--gold={quest && isPromotedQuest(quest)}
	class:quest-hero--teal={quest && !isPromotedQuest(quest)}
	aria-label="Mission briefing"
>
	{#if quest}
		{#if quest.senderLabel}<p class="quest-hero__sender">{quest.senderLabel}</p>{/if}
		<h3 class="quest-hero__title">{quest.title}</h3>
		{#if formatQuestRewardLabel(quest)}
			<p class="quest-hero__reward">{formatQuestRewardLabel(quest)}</p>
		{/if}
		<p class="quest-hero__brief-hint">Execute below · transmit when complete</p>
	{:else}
		<p class="quest-hero__brief-empty">Manual session — no active directive</p>
	{/if}
</article>
