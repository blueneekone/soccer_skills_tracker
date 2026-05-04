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
		/** Lock Target immediately on pointer down (before drag). */
		onSelect = () => {},
		onMouseEnter,
		onMouseLeave,
	} = $props();

	/** @param {PointerEvent} e */
	function handleEntityPointerDown(e) {
		onSelect();
		onPointerDown(e);
	}

	const visScale = $derived(isHovered && warRoomTool === 'DRAG' ? 1.1 : 1);
	const pointerOn = $derived(warRoomTool === 'DRAG' || warRoomTool === 'ROUTE');

	const discLabel = $derived(
		player.side === 'opponent' ? (player.position || 'X') : player.number || '',
	);

	const reactorSpinClass = $derived(
		isSelected
			? 'tw-animate-[slow-spin_2.8s_linear_infinite]'
			: 'tw-animate-[slow-spin_6s_linear_infinite]',
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
				<!-- Counter-rotating plasma orbital shells (Directive V21 pipeline). -->
				<g filter="url(#heavy-bloom)">
					<g>
						<animateTransform
							attributeName="transform"
							type="rotate"
							values="0 0 0;360 0 0"
							dur="3.2s"
							repeatCount="indefinite"
						/>
						<circle
							cx="0"
							cy="0"
							r={DISC_R + 22}
							fill="none"
							stroke="#00f0ff"
							stroke-width="1.5"
							stroke-dasharray="5 12"
							opacity="0.85"
						/>
						<circle
							cx="0"
							cy="0"
							r={DISC_R + 26}
							fill="none"
							stroke="#7df9ff"
							stroke-width="0.75"
							stroke-dasharray="2 14"
							opacity="0.45"
						/>
					</g>
					<g>
						<animateTransform
							attributeName="transform"
							type="rotate"
							values="360 0 0;0 0 0"
							dur="5.5s"
							repeatCount="indefinite"
						/>
						<circle
							cx="0"
							cy="0"
							r={DISC_R + 17}
							fill="none"
							stroke="#00f0ff"
							stroke-width="1"
							stroke-dasharray="8 10"
							opacity="0.55"
						/>
					</g>
				</g>
				<g filter="url(#identity-disc-glow)" opacity="0.95">
					<path
						d="M {-DISC_R - 22} -12 L {-DISC_R - 22} -24 L {-DISC_R - 12} -24"
						fill="none"
						stroke="#00f0ff"
						stroke-width="1.75"
					/>
					<path
						d="M {DISC_R + 22} 12 L {DISC_R + 22} 24 L {DISC_R + 12} 24"
						fill="none"
						stroke="#00f0ff"
						stroke-width="1.75"
					/>
				</g>
				<g font-family="monospace" font-size="8" fill="#00f0ff" filter="url(#heavy-bloom)" opacity="0.92">
					<text x={DISC_R + 28} y={-6}>STM: 92%</text>
					<text x={DISC_R + 28} y={6}>HR: 145</text>
				</g>
			</g>
		{/if}
		<g
			class="disc-visual"
			pointer-events="none"
			style="transform: scale({visScale}); transform-origin: 0px 0px; transition: transform 180ms ease-out;"
		>
			<!-- Reactor stack: bloom halo + magnet core + counter-spin inner conduit -->
			<circle
				cx="0"
				cy="0"
				r={DISC_R + 11}
				fill="none"
				stroke={ringStroke}
				stroke-width="3"
				opacity="0.18"
				filter="url(#heavy-bloom)"
				class="tg-reactor-halo tw-animate-[reactor-pulse_2s_ease-in-out_infinite]"
				style="transform-box: fill-box; transform-origin: center;"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R + 8}
				fill="none"
				stroke={ringStroke}
				stroke-width="4"
				opacity="0.28"
				filter="url(#identity-disc-glow)"
				class="tg-reactor-halo tw-animate-[reactor-pulse_2.2s_ease-in-out_infinite]"
				style="transform-box: fill-box; transform-origin: center;"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R}
				fill="url(#magnet-core-radial)"
				stroke={ringStroke}
				stroke-width="2.5"
				filter="url(#heavy-bloom)"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R - 3}
				fill="none"
				stroke={ringStroke}
				stroke-width="1"
				opacity="0.35"
				filter="url(#identity-disc-glow)"
			/>
			<circle
				cx="0"
				cy="0"
				r={DISC_R - 4}
				fill="none"
				stroke="#ffffff"
				stroke-width="1"
				stroke-dasharray="6 4"
				class={reactorSpinClass}
				opacity={isSelected ? 0.72 : 0.5}
				style="transform-box: fill-box; transform-origin: center;"
				filter="url(#heavy-bloom)"
			/>
			{#if isSelected}
				<g pointer-events="none" style="transform-box: fill-box; transform-origin: center;">
					<animateTransform
						attributeName="transform"
						type="rotate"
						values="360 0 0;0 0 0"
						dur="4.2s"
						repeatCount="indefinite"
					/>
					<circle
						cx="0"
						cy="0"
						r={DISC_R - 10}
						fill="none"
						stroke="#00f0ff"
						stroke-width="0.85"
						stroke-dasharray="3 9"
						opacity="0.5"
						filter="url(#heavy-bloom)"
					/>
				</g>
			{/if}
			<text
				x="0"
				y="0"
				font-family="monospace"
				font-size="12"
				fill="#f0fbff"
				font-weight="bold"
				text-anchor="middle"
				dominant-baseline="central"
				filter="url(#identity-disc-glow)"
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
		/>
	</g>
{/if}

<style>
	:global(.disc-visual) {
		transform-box: fill-box;
	}
</style>

