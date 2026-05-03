<script>
	const DISC_R = 30;
	const DISC_HIT_R = 32;

	/**
	 * Pitch token (minimal shape for this SVG entity).
	 * @typedef {{ id: string; number?: string; x?: number; y?: number }} PitchToken
	 */

	let {
		player,
		isHovered = false,
		isSelected = false,
		ringStroke,
		charging = false,
		warRoomTool = /** @type {'DRAG' | 'ROUTE'} */ ('DRAG'),
		onPointerDown,
		onMouseEnter,
		onMouseLeave,
	} = $props();

	const visScale = $derived(isHovered && warRoomTool === 'DRAG' ? 1.1 : 1);
	const pointerOn = $derived(warRoomTool === 'DRAG' || warRoomTool === 'ROUTE');
</script>

{#if typeof player.x === 'number' && typeof player.y === 'number'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<g
		data-light-disc
		transform="translate({player.x}, {player.y})"
		class:tg-disc-charge={charging}
		class:grid-entity--selected={isSelected}
		pointer-events={pointerOn ? 'auto' : 'none'}
		onpointerdown={onPointerDown}
		onmouseenter={onMouseEnter}
		onmouseleave={onMouseLeave}
	>
		<g
			class="disc-visual"
			pointer-events="none"
			style="transform: scale({visScale}); transform-origin: 0px 0px; transition: transform 180ms ease-out;"
		>
			<circle
				cx="0"
				cy="0"
				r={DISC_R}
				fill="url(#magnet-core-radial)"
				stroke="rgba(255,255,255,0.07)"
				stroke-width="1"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R - 1}
				class="tg-disc-ring-glow"
				fill="none"
				stroke={ringStroke}
				stroke-width="11"
				filter="url(#identity-disc-glow)"
				opacity="0.96"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R}
				class="tg-disc-ring-core"
				fill="none"
				stroke={ringStroke}
				stroke-width="3.5"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R - 11}
				fill="none"
				stroke="rgba(255,255,255,0.12)"
				stroke-width="1"
			/>
			<text
				x="0"
				y="6"
				text-anchor="middle"
				class="tw-fill-white tw-font-mono tw-text-[17px] tw-font-black tw-tracking-widest"
			>
				{player.number || '—'}
			</text>
		</g>
		<circle
			cx="0"
			cy="0"
			r={DISC_HIT_R}
			fill="transparent"
			stroke="none"
			pointer-events="all"
			class={warRoomTool === 'DRAG' ? 'tw-cursor-move' : warRoomTool === 'ROUTE' ? 'tw-cursor-crosshair' : ''}
		/>
	</g>
{/if}
