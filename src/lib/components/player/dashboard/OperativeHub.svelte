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

<section
	class="operative-hub pd-os-deck pd-os-deck--hero bento-span-12 tw-min-w-0"
	data-region="operative-hub"
	aria-label="Operative command deck"
>
	<header class="pd-hq-section-head operative-hub__head">
		<h2 class="pd-hq-section-head__title operative-hub__title">Operative status</h2>
		<p class="pd-hq-section-head__eyebrow pd-label operative-hub__eyebrow">Command</p>
	</header>
	<div
		class="operative-hub__grid bento-grid bento-grid--12col bento-grid--liquid"
		data-region="operative-hub-grid"
	>
	<div class="operative-hub__main tw-col-span-12 lg:tw-col-span-8">
		<div class="operative-hub__identity-stage">
			<div class="operative-hub__identity">
				{@render identity()}
			</div>
		</div>
		<div class="operative-hub__metrics">
			{@render metrics()}
		</div>
	</div>
	<div class="operative-hub__missions tw-col-span-12 lg:tw-col-span-4">
		{@render quests()}
	</div>
	</div>
</section>

<style>
	.operative-hub {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--pd-hq-section-head-gap, clamp(0.5rem, 1vw, 0.75rem));
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		overflow: visible;
	}

	.operative-hub__grid {
		position: relative;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.operative-hub__main,
	.operative-hub__missions,
	.operative-hub__identity-stage,
	.operative-hub__identity,
	.operative-hub__metrics {
		position: relative;
		z-index: 1;
		min-width: 0;
		box-sizing: border-box;
	}

	.operative-hub__identity-stage {
		padding: var(--player-hud-pad, clamp(8px, 1.8vw, 12px));
	}

	.operative-hub__main {
		display: flex;
		flex-direction: column;
	}

	.operative-hub__metrics:empty {
		display: none;
		border: none;
	}

	.operative-hub__missions {
		align-self: stretch;
	}

	@media (min-width: 768px) {
		.operative-hub__missions {
			border-left: none;
			box-shadow: none;
		}
	}
</style>
