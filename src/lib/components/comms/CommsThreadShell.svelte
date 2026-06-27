<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = '',
		headingId,
		logLabel = 'Messages',
		scrollEl = $bindable(null as HTMLDivElement | null),
		body,
		footer,
	}: {
		title: string;
		subtitle?: string;
		headingId: string;
		logLabel?: string;
		scrollEl?: HTMLDivElement | null;
		body?: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<section class="plp-root" aria-labelledby={headingId}>
	<header class="plp-head">
		<div>
			<h3 id={headingId} class="plp-title">{title}</h3>
			{#if subtitle}
				<p class="plp-sub">{subtitle}</p>
			{/if}
		</div>
	</header>

	<div
		class="plp-scroll"
		bind:this={scrollEl}
		role="log"
		aria-live="polite"
		aria-label={logLabel}
	>
		{@render body?.()}
	</div>

	{@render footer?.()}
</section>
