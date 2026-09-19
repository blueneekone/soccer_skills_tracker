<script lang="ts">
	import '$lib/styles/director-os.css';
	import '$lib/styles/player-dossier.css';
	import '$lib/styles/player-armory-stats-telemetry.css';
	import '$lib/styles/player-dashboard-hud.css';
	import StatsHUD from './StatsHUD.svelte';
	import StatsArena from './StatsArena.svelte';
	import { StatsEngine } from './StatsEngine.svelte.js';

	const engine = new StatsEngine();
</script>

<div
	class="ec-page ec-player-stats view-section dossier-page player-dossier-root pd-page-root tw-font-mono"
	class:player-hud-root={engine.isPlayerRole}
	class:pos-stats={engine.isPlayerRole}
>
	<div class="pd-content-wrap" class:pd-route-stack={engine.isPlayerRole}>
		<StatsHUD {engine} />
		<StatsArena {engine} />
	</div>
</div>

<style>
	:global(:where(.dossier-page.player-dossier-root)) {
		--d-bg: var(--pd-bg, #000000);
		--d-panel: var(--pd-panel, #05050a);
		--d-line: var(--pd-line, rgba(255, 255, 255, 0.1));
		--d-cyber: var(--pd-accent-data, #14b8a6);
		--d-iso: #4ade80;
		background: var(--d-bg);
		color: var(--pd-text, #f4f4f5);
		padding-bottom: clamp(1.25rem, 3vw, 2rem);
	}
</style>
