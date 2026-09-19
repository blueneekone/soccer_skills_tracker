<script lang="ts">
	import { SquadTelemetryEngine } from './SquadTelemetryEngine.svelte.js';
	import SquadTelemetryArena from './SquadTelemetryArena.svelte';
	import SquadTelemetryHUD from './SquadTelemetryHUD.svelte';
	import '$lib/styles/hud-telemetry.css';

	let { teamId = '', teams = [], showLiveTelemetry = true }: { teamId?: string; teams?: any[]; showLiveTelemetry?: boolean } = $props();

	const engine = new SquadTelemetryEngine(teamId, teams);

	$effect(() => {
		engine.teamId = teamId;
		engine.teams = teams;
		engine.showLiveTelemetry = showLiveTelemetry;
	});
</script>

<div class="hud-telemetry-shell">
	<SquadTelemetryHUD {engine} />
	<SquadTelemetryArena {engine} />
</div>

<style>
	.hud-telemetry-shell {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
</style>
