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
	<div class="operative-hub__identity bento-span-4">
		{@render identity()}
	</div>
	<div class="operative-hub__metrics bento-span-8">
		{@render metrics()}
	</div>
	<div class="operative-hub__quests bento-span-12">
		{@render quests()}
	</div>
</div>

<style>
	.operative-hub {
		position: relative;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		background: rgba(2, 2, 2, 0.7);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
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
			linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 22px 22px;
		opacity: 0.35;
	}

	.operative-hub__identity,
	.operative-hub__metrics,
	.operative-hub__quests {
		position: relative;
		z-index: 1;
		min-width: 0;
		box-sizing: border-box;
	}

	.operative-hub__identity {
		border-bottom: 1px solid #334155;
	}

	.operative-hub__metrics {
		border-bottom: 1px solid #334155;
	}

	@media (min-width: 768px) {
		.operative-hub__identity {
			border-bottom: none;
			border-right: 1px solid #334155;
		}

		.operative-hub__metrics {
			border-bottom: 1px solid #334155;
		}
	}
</style>
