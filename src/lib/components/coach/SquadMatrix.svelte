<script lang="ts">
	import '$lib/styles/hud-telemetry.css';
	import SquadMatrixHUD from './SquadMatrixHUD.svelte';
	import SquadMatrixArena from './SquadMatrixArena.svelte';
	import { SquadMatrixEngine } from './SquadMatrixEngine.svelte.js';

	let {
		teamId = '',
		teams = [],
		showLiveTelemetry = true,
		selectedPlayerId = 'ALL',
		onSelectPlayer = undefined,
	}: {
		teamId?: string;
		teams?: any[];
		showLiveTelemetry?: boolean;
		selectedPlayerId?: string;
		onSelectPlayer?: (statsId: string, name: string) => void;
	} = $props();

	const engine = new SquadMatrixEngine({
		teamId,
		teams,
		showLiveTelemetry,
		selectedPlayerId,
		onSelectPlayer,
	});

	$effect(() => {
		engine.teamId = teamId;
		engine.teams = teams;
		engine.showLiveTelemetry = showLiveTelemetry;
		engine.selectedPlayerId = selectedPlayerId;
		engine.onSelectPlayer = onSelectPlayer;
	});
</script>

<div class="tw-w-full tw-flex tw-flex-col tw-gap-4">
	<SquadMatrixHUD {engine} />
	<SquadMatrixArena {engine} />
</div>
