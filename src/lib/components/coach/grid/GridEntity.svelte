<script>
	const DISC_R = 30;
	const DISC_HIT_R = 32;

	/**
	 * Pitch token (minimal shape for this SVG entity).
	 * @typedef {{
	 *   id: string;
	 *   name?: string;
	 *   number?: string;
	 *   position?: string;
	 *   side?: 'friendly' | 'opponent';
	 *   x?: number;
	 *   y?: number;
	 * }} PitchToken
	 */

	let {
		player,
		isHovered = false,
		isSelected = false,
		ringStroke,
		charging = false,
		warRoomTool = /** @type {'DRAG' | 'ROUTE'} */ ('DRAG'),
		timelineMs = 0,
		onPointerDown,
		/** @type {(e: MouseEvent) => void} */
		onRightClick = undefined,
		onSelect = () => {},
		onMouseEnter,
		onMouseLeave,
	} = $props();

	function handleEntityPointerDown(/** @type {PointerEvent} */ e) {
		if (e.button !== 0) return;
		onSelect();
		onPointerDown(e);
	}

	function handleEntityContextMenu(/** @type {MouseEvent} */ e) {
		e.preventDefault();
		e.stopPropagation();
		onRightClick?.(e);
	}

	const visScale = $derived(isHovered && warRoomTool === 'DRAG' ? 1.06 : 1);
	const pointerOn = $derived(warRoomTool === 'DRAG' || warRoomTool === 'ROUTE');

	const discLabel = $derived(
		player.side === 'opponent' ? (player.position || 'X') : player.number || '',
	);
</script>

{#if typeof player.x === 'number' && typeof player.y === 'number'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<g
		data-light-disc
		data-timeline-ms={timelineMs}
		transform="translate({player.x}, {player.y})"
		class:tg-disc-charge={charging}
		class:grid-entity--selected={isSelected}
		pointer-events={pointerOn ? 'auto' : 'none'}
		onmouseenter={onMouseEnter}
		onmouseleave={onMouseLeave}
	>
		{#if isSelected}
			<g pointer-events="none" class="tg-target-lock-orbit">
				<circle
					cx="0"
					cy="0"
					r={DISC_R + 20}
					fill="none"
					stroke="#00f0ff"
					stroke-width="1.25"
					opacity="0.9"
					filter="url(#heavy-bloom)"
				/>
			</g>
		{/if}
		<g
			class="disc-visual"
			pointer-events="none"
			style="transform: scale({visScale}); transform-origin: 0px 0px; transition: transform 180ms ease-out;"
		>
			<circle
				cx="0"
				cy="0"
				r={DISC_R}
				fill="#050505"
				stroke={ringStroke}
				stroke-width="2"
				filter="url(#heavy-bloom)"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R - 4}
				fill="none"
				stroke="#ffffff"
				stroke-width="1.5"
				stroke-dasharray="12 6"
				opacity="0.4"
			>
				<animateTransform
					attributeName="transform"
					type="rotate"
					from="0 0 0"
					to="360 0 0"
					dur="10s"
					repeatCount="indefinite"
				/>
			</circle>
			<!-- Docking core: physical tether origin for route terminals -->
			<circle
				cx="0"
				cy="0"
				r="2.5"
				fill="#ffffff"
				filter="url(#heavy-bloom)"
				class="tw-pointer-events-none"
			/>
			<circle
				cx="0"
				cy="0"
				r="6"
				fill="none"
				stroke={ringStroke}
				stroke-width="1"
				opacity="0.5"
				class="tw-pointer-events-none"
			/>
			<text
				x="0"
				y="0"
				font-family="monospace"
				font-size="12"
				fill="#e8f4ff"
				font-weight="bold"
				text-anchor="middle"
				dominant-baseline="central"
			>
				{discLabel}
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
			onpointerdown={handleEntityPointerDown}
			oncontextmenu={onRightClick ? handleEntityContextMenu : undefined}
		/>
	</g>
{/if}

<style>
	:global(.disc-visual) {
		transform-box: fill-box;
	}
</style>
