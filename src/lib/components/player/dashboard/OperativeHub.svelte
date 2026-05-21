<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		identity,
		metrics,
		quests,
	}: {
		identity: Snippet;
		metrics: Snippet;
		quests: Snippet;
	} = $props();
</script>

<div class="operative-hub bento-grid bento-grid--12col bento-grid--liquid" data-region="operative-hub">
	<div class="operative-hub__scanlines" aria-hidden="true"></div>
	<div class="operative-hub__main bento-span-12 md:bento-span-8">
		<div class="operative-hub__identity">
			{@render identity()}
		</div>
		<div class="operative-hub__metrics">
			{@render metrics()}
		</div>
	</div>
	<div class="operative-hub__missions bento-span-12 md:bento-span-4">
		{@render quests()}
	</div>
</div>

<style>
	.operative-hub {
		position: relative;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		background: var(--color-dominant, #0f172a);
		border: 1px solid #334155;
		box-shadow: var(--shadow-liquid);
		overflow: hidden;
		clip-path: polygon(
			0 12px,
			12px 0,
			calc(100% - 12px) 0,
			100% 12px,
			100% calc(100% - 12px),
			calc(100% - 12px) 100%,
			12px 100%,
			0 calc(100% - 12px)
		);
	}

	.operative-hub__scanlines {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		grid-column: 1 / -1;
		background-image:
			linear-gradient(color-mix(in srgb, #fbbf24 4%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, #fbbf24 4%, transparent) 1px, transparent 1px);
		background-size: 22px 22px;
		opacity: 0.08;
	}

	.operative-hub__main,
	.operative-hub__missions,
	.operative-hub__identity,
	.operative-hub__metrics {
		position: relative;
		z-index: 1;
		min-width: 0;
		box-sizing: border-box;
	}

	.operative-hub__main {
		display: flex;
		flex-direction: column;
	}

	.operative-hub__metrics {
		border-top: 1px solid #334155;
	}

	@media (min-width: 768px) {
		.operative-hub__missions {
			border-left: 1px solid #334155;
		}
	}
</style>
