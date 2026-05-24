<script lang="ts">
	let {
		nextEventLabel = null,
		badges = [],
		inline = false,
		showScheduleMeta = true,
	}: {
		nextEventLabel: string | null;
		badges: Array<{ id: string; label: string }>;
		inline?: boolean;
		/** Inline strap: always show schedule slot (event tag or ghost). */
		showScheduleMeta?: boolean;
	} = $props();

	const hasContent = $derived(
		inline && showScheduleMeta
			? true
			: Boolean(nextEventLabel) || badges.length > 0,
	);
</script>

{#if hasContent}
	<section
		class="hq-world-context"
		class:hq-world-context--inline={inline}
		class:bento-span-12={!inline}
		aria-label="HQ world context"
	>
		{#if inline}
			<div class="hq-world-context__row">
				{#if nextEventLabel}
					<span class="hq-world-context__event-tag pd-mono">{nextEventLabel}</span>
				{:else if showScheduleMeta}
					<p class="hq-world-context__ghost pd-mono" role="status">No sessions scheduled</p>
				{/if}
				{#each badges as badge (badge.id)}
					<span class="hq-world-context__chip pd-label pd-mono">{badge.label}</span>
				{/each}
			</div>
		{:else}
			<div class="hq-world-context__row hq-world-context__event">
				{#if nextEventLabel}
					<span class="hq-world-context__event-tag pd-mono">{nextEventLabel}</span>
				{:else}
					<p class="hq-world-context__ghost pd-mono" role="status">No sessions scheduled</p>
				{/if}
			</div>
			{#if badges.length > 0}
				<div class="hq-world-context__row hq-world-context__chips" aria-label="HQ status">
					{#each badges as badge (badge.id)}
						<span class="hq-world-context__chip pd-label pd-mono">{badge.label}</span>
					{/each}
				</div>
			{/if}
		{/if}
	</section>
{/if}
