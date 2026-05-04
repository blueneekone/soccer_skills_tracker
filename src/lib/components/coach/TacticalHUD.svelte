<script>
	import GridHUD from './grid/GridHUD.svelte';

	/** @type {{ model: import('./TacticalEngine.svelte').TacticalWarRoomModel }} */
	let { model, warRoomTool = $bindable('DRAG') } = $props();
</script>

<div
	class="tw-relative tw-z-50 tw-min-h-28 tw-shrink-0 tw-overflow-visible tw-border-t tw-border-white/10 tw-bg-[#020202]/85 tw-py-2 tw-backdrop-blur-2xl tw-transition-[box-shadow] tw-duration-300 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_-12px_40px_rgba(0,0,0,0.45)] {model.focusedPlayerId ?
		'tw-shadow-[inset_0_1px_0_rgba(255,0,60,0.35)]'
	:	''}"
>
	<GridHUD
		bind:warRoomTool
		bind:isHolotableMode={model.isHolotableMode}
		simulator={model.simulator}
		bind:showLabels={model.showLabels}
		bind:activeRouteColor={model.activeRouteColor}
		bind:routeDrawKind={model.routeDrawKind}
		focusedPlayerId={model.focusedPlayerId}
		allTokens={model.allPitchTokens}
		recallBench={model.recallBench}
		clearRoutesOnly={model.clearRoutesOnly}
	/>
</div>
