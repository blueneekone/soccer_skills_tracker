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

<div
	class="operative-hub pd-os-deck pd-os-deck--hero bento-grid bento-grid--12col bento-grid--liquid"
	data-region="operative-hub"
>
	<div class="operative-hub__main bento-span-12 md:bento-span-8">
		<div class="operative-hub__identity-stage">
			<div class="operative-hub__identity">
				{@render identity()}
			</div>
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
		overflow: hidden;
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

	.operative-hub__identity-stage:has([data-streak-active='true']) {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pd-accent-action, #fbbf24) 12%, transparent);
	}

	.operative-hub__identity-stage:has([data-streak-active='true'])::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(ellipse 40% 50% at 0% 0%, color-mix(in srgb, var(--pd-accent-action, #fbbf24) 10%, transparent), transparent 70%),
			radial-gradient(ellipse 40% 50% at 100% 100%, color-mix(in srgb, var(--pd-accent-data, #14b8a6) 8%, transparent), transparent 70%);
		opacity: 0.85;
	}

	.operative-hub__main {
		display: flex;
		flex-direction: column;
	}

	.operative-hub__metrics:empty {
		display: none;
		border: none;
	}

	.operative-hub__metrics {
		border-top: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
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
