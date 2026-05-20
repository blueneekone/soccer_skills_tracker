<script lang="ts">
	/** @type {{ profile: import('svelte').Snippet; quests: import('svelte').Snippet }} */
	let { profile, quests } = $props();
</script>

<div class="operative-hub" data-region="operative-hub">
	<div class="operative-hub__scanlines" aria-hidden="true"></div>
	<div class="operative-hub__profile">
		{@render profile()}
	</div>
	<div class="operative-hub__quests">
		{@render quests()}
	</div>
</div>

<style>
	.operative-hub {
		position: relative;
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 0;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		background: rgba(5, 10, 16, 0.95);
		clip-path: polygon(
			0 20px,
			20px 0,
			calc(100% - 20px) 0,
			100% 20px,
			100% calc(100% - 20px),
			calc(100% - 20px) 100%,
			20px 100%,
			0 calc(100% - 20px)
		);
		border: 1px solid rgba(0, 255, 255, 0.15);
		overflow: hidden;
	}

	.operative-hub__scanlines {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background-image:
			linear-gradient(rgba(0, 255, 255, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 255, 255, 0.04) 1px, transparent 1px);
		background-size: 22px 22px;
		opacity: 0.35;
	}

	.operative-hub__profile,
	.operative-hub__quests {
		position: relative;
		z-index: 1;
		min-width: 0;
		padding: 24px;
		box-sizing: border-box;
		background: transparent !important;
		border: none !important;
		border-radius: 0 !important;
		box-shadow: none !important;
		backdrop-filter: none !important;
		-webkit-backdrop-filter: none !important;
	}

	.operative-hub__profile {
		border-right: 1px solid rgba(0, 255, 255, 0.15) !important;
	}

	.operative-hub__profile :global(.player-hud-header),
	.operative-hub__profile :global(.player-hud-root),
	.operative-hub__quests :global(.quest-log-panel) {
		background: transparent !important;
		border: none !important;
		border-radius: 0 !important;
		box-shadow: none !important;
		backdrop-filter: none !important;
		-webkit-backdrop-filter: none !important;
	}

	@media (max-width: 900px) {
		.operative-hub {
			grid-template-columns: 1fr;
		}

		.operative-hub__profile {
			border-right: none !important;
			border-bottom: 1px solid rgba(0, 255, 255, 0.15) !important;
		}
	}
</style>
