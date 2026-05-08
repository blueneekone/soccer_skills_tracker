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
		isDragging = false,
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
		e.stopPropagation();
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

	/** Base SIEM color: opponent = Ares Red (#ff2a2a), friendly = Cyan. */
	const siemColor = $derived(player.side === 'opponent' ? '#ff2a2a' : '#00f0ff');
	/**
	 * Contrast highlight: when an opponent token is selected or hovered the ring
	 * flips to Cyan so it reads cleanly against the Ares Red disc body.
	 */
	const highlightColor = $derived(
		player.side === 'opponent' && (isSelected || isHovered) ? '#00f0ff' : siemColor
	);

</script>

{#if typeof player.x === 'number' && typeof player.y === 'number'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!--
	  CSS transform places the disc at SVG coords. In SVG context 1 px = 1 SVG
	  user unit so translate({x}px, {y}px) positions correctly inside the
	  1600×900 viewBox.
	-->
	<g
		data-light-disc
		data-timeline-ms={timelineMs}
		class="tw-group"
		class:tg-disc-charge={charging}
		class:grid-entity--selected={isSelected}
		pointer-events={pointerOn ? 'auto' : 'none'}
		style="transform: translate({player.x}px, {player.y}px);"
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
					stroke={highlightColor}
					stroke-width="1.25"
					opacity="0.9"
					filter="url(#heavy-bloom)"
				/>
			</g>
		{/if}
		<!--
		  disc-visual: no scale pop on drag. Stays exactly the same size.
		  SIEM team color on all strokes; amber radar-lock ring appears while dragging.
		-->
		<g
			class="disc-visual"
			pointer-events="none"
			style="transform: scale({visScale}); transform-origin: 0px 0px; transition: transform 180ms ease-out;"
		>
			<!-- Ambient radar reticle — always visible, spins 10s, team color. -->
			<circle
				cx="0"
				cy="0"
				r={DISC_R + 4}
				fill="none"
				stroke={siemColor}
				stroke-width="1"
				stroke-dasharray="4 4"
				opacity="0.7"
				class="tw-animate-[spin_10s_linear_infinite]"
				style="transform-box: fill-box; transform-origin: center;"
			/>
			<!-- Amber precision lock ring — only while dragging. -->
			{#if isDragging}
				<circle
					cx="0"
					cy="0"
					r={DISC_R + 10}
					fill="none"
					stroke="#ffaa00"
					stroke-width="1.5"
					stroke-dasharray="2 4"
					opacity="0.9"
					class="tw-animate-[spin_4s_linear_infinite]"
					style="transform-box: fill-box; transform-origin: center; animation-direction: reverse;"
				/>
			{/if}
			<circle
				cx="0"
				cy="0"
				r={DISC_R}
				fill="#050505"
				stroke={isDragging ? '#ff2a2a' : siemColor}
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
			<!-- Route-mode anchor ring: pulses to show players are snap targets -->
			{#if warRoomTool === 'ROUTE'}
				<circle
					cx="0"
					cy="0"
					r="8"
					fill="none"
					stroke={siemColor}
					stroke-width="1.5"
					opacity="0.85"
					filter="url(#heavy-bloom)"
					pointer-events="none"
				>
					<animate attributeName="r" values="6;11;6" dur="1.4s" repeatCount="indefinite" />
					<animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.4s" repeatCount="indefinite" />
				</circle>
			{/if}
			<!-- Text background for maximum legibility -->
			<rect
				x="-14"
				y="-10"
				width="28"
				height="20"
				rx="3"
				fill="#020202"
				opacity="0.72"
				pointer-events="none"
			/>
			<text
				x="0"
				y="0"
				font-family="monospace"
				font-size="14"
				fill="#ffffff"
				font-weight="bold"
				text-anchor="middle"
				dominant-baseline="central"
				paint-order="stroke"
				stroke="#020202"
				stroke-width="3"
				stroke-linejoin="round"
				pointer-events="none"
			>
				{discLabel}
			</text>
		</g>
		<!--
		  Holographic stat billboard — opacity-0 by default, fades in on group hover.
		  Positioned above the token in SVG space; 3D counter-rotation lifts it
		  out of the pitch plane (best-effort in SVG's flattened 3D context).
		-->
		<g
			class="tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-300"
			transform="translate(-56, -{DISC_R + 14})"
			style="transform: translate(-56px, -{DISC_R + 14}px) rotateX(-50deg) translateZ(30px); transform-origin: bottom center; transform-box: fill-box;"
			pointer-events="none"
		>
			<rect x="0" y="-58" width="112" height="58" rx="4"
				fill="#040f16" fill-opacity="0.92"
				stroke="#00f0ff" stroke-width="0.5" stroke-opacity="0.4"
			/>
			<line x1="0" y1="-48" x2="112" y2="-48" stroke="#00f0ff" stroke-width="0.5" stroke-opacity="0.25" />
			<text x="56" y="-50" font-family="monospace" font-size="6" fill="#00f0ff" fill-opacity="0.5"
				text-anchor="middle" letter-spacing="2">OPERATOR_STATS</text>
			<text x="8" y="-37" font-family="monospace" font-size="8" fill="#00f0ff" text-anchor="start">
				ID: {player.number || 'XX'}
			</text>
			<text x="8" y="-25" font-family="monospace" font-size="8" fill="#00f0ff" text-anchor="start">
				SPD: 94  STM: 88
			</text>
			<text x="8" y="-13" font-family="monospace" font-size="8" fill="#00f0ff" text-anchor="start">
				POS: {player.position || 'FWD'}
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
		oncontextmenu={handleEntityContextMenu}
		/>
	</g>
{/if}

<style>
	:global(.disc-visual) {
		transform-box: fill-box;
	}
</style>
