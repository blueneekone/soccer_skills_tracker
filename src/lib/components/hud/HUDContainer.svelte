<script lang="ts">
	/**
	 * HUDContainer — Sprint 1.6.
	 *
	 * Viewport-spanning 12-column Bento Grid container. All HUD children must
	 * use bento-span-* utilities to claim slots inside this rigid grid.
	 *
	 * This is the structural floor of the Player OS dashboard — no fixed-width
	 * columns, no flex-fallbacks. Children that try to set their own width are
	 * stripped to 100% by the wrapper.
	 */
	import type { Snippet } from 'svelte';

	let {
		children,
		ariaLabel = 'Player HUD',
	}: {
		children: Snippet;
		ariaLabel?: string;
	} = $props();
</script>

<section
	class="hud-container bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12"
	data-region="hud-container"
	aria-label={ariaLabel}
>
	{@render children()}
</section>

<style>
	.hud-container {
		position: relative;
		width: 100%;
		min-width: 0;
		max-width: 72rem;
		margin-inline: auto;
		box-sizing: border-box;
		padding: var(--bento-pad-liquid, clamp(12px, 2.5vw, 20px));
		gap: var(--bento-gap-liquid, clamp(12px, 2vw, 18px));
		isolation: isolate;
		z-index: 30;
	}

	.hud-container > :global(*) {
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
	}
</style>
