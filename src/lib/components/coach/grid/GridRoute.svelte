<script>
	const ROUTE_HIT_STROKE = 22;

	/**
	 * @typedef {Object} TacticalRoute
	 * @property {string} id
	 * @property {number} x1
	 * @property {number} y1
	 * @property {number} cx
	 * @property {number} cy
	 * @property {number} x2
	 * @property {number} y2
	 * @property {string} color
	 * @property {string | null | undefined} [bindPlayerId]
	 * @property {'curve' | 'cut'} [pathKind]
	 * @property {number} [delay]
	 */

	let {
		route,
		pathD = '',
		renderLayer,
		timelineMs = 0,
		warRoomTool = /** @type {'DRAG' | 'ROUTE'} */ ('DRAG'),
		isSelected = false,
		showAnchors = true,
		playerStamina = 80,
		onPathClick,
		onControlPointDrag,
		onRouteHoverEnter,
		onRouteHoverLeave,
	} = $props();

	const routeDistance = $derived(Math.hypot(route.x2 - route.x1, route.y2 - route.y1));
	const successProb = $derived(Math.round(Math.max(0, Math.min(100, playerStamina * (1 - routeDistance / 2000)))));
	const probColor = $derived(successProb >= 70 ? '#00f0ff' : successProb >= 40 ? '#ffff00' : '#ff003c');
</script>

{#if renderLayer === 'stroke'}
	<g aria-current={isSelected ? 'true' : undefined} data-timeline-ms={timelineMs}>
		<path
			d={pathD}
			fill="none"
			stroke={route.color}
			stroke-width="6"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.9"
			filter="url(#premium-neon)"
			pointer-events="none"
		/>
		<path
			d={pathD}
			fill="none"
			stroke="#ffffff"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			marker-end="url(#tech-chevron)"
			pointer-events="none"
		/>
	</g>
{/if}

{#if renderLayer === 'hit'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<path
		data-route-hit
		data-timeline-ms={timelineMs}
		d={pathD}
		fill="none"
		stroke="transparent"
		stroke-width={ROUTE_HIT_STROKE}
		stroke-linecap="round"
		stroke-linejoin="round"
		class={warRoomTool === 'ROUTE' ? 'tw-cursor-grab active:tw-cursor-grabbing' : ''}
		pointer-events={warRoomTool === 'ROUTE' ? 'stroke' : 'none'}
		role="presentation"
		onmouseenter={() => onRouteHoverEnter?.()}
		onmouseleave={() => onRouteHoverLeave?.()}
		onpointerdown={(e) => onPathClick?.(e)}
	/>
{/if}

{#if renderLayer === 'ghost' && route.bindPlayerId}
	<g
		transform="translate({route.x2}, {route.y2})"
		class="tw-mix-blend-screen"
		pointer-events="none"
		data-timeline-ms={timelineMs}
	>
		<animate attributeName="opacity" values="0.25;0.55;0.25" dur="1.5s" repeatCount="indefinite" />
		<circle cx="0" cy="0" r="18" fill="none" stroke={probColor} stroke-width="2" filter="url(#premium-neon)" />
		<circle cx="0" cy="0" r="5" fill={probColor} opacity="0.25" />
		<line x1="-13" y1="0" x2="13" y2="0" stroke="#ffffff" stroke-width="1" opacity="0.45" />
		<line x1="0" y1="-13" x2="0" y2="13" stroke="#ffffff" stroke-width="1" opacity="0.45" />
		<text
			x="0"
			y="28"
			font-family="monospace"
			font-size="10"
			fill={probColor}
			text-anchor="middle"
			dominant-baseline="hanging"
			font-weight="bold"
			filter="url(#premium-neon)"
		>{successProb}%</text>
	</g>
{/if}

{#if renderLayer === 'anchors' && showAnchors}
	<g data-timeline-ms={timelineMs} data-route-anchor-layer={isSelected ? 'selected' : undefined}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<g
			transform="translate({route.x1},{route.y1}) rotate(45)"
			class="tw-cursor-pointer tw-origin-center tw-transition-transform hover:tw-scale-125"
			role="presentation"
			onpointerdown={(e) => onControlPointDrag?.(e, 'start')}
		>
			<rect
				x="-6"
				y="-6"
				width="12"
				height="12"
				fill="#050505"
				stroke={route.color}
				stroke-width="2"
			/>
			<circle cx="0" cy="0" r="2" fill="#ffffff" />
		</g>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<g
			transform="translate({route.cx},{route.cy}) rotate(45)"
			class="tw-cursor-pointer tw-origin-center tw-transition-transform hover:tw-scale-125"
			role="presentation"
			onpointerdown={(e) => onControlPointDrag?.(e, 'ctrl')}
		>
			<rect
				x="-6"
				y="-6"
				width="12"
				height="12"
				fill="#050505"
				stroke={route.color}
				stroke-width="2"
			/>
			<circle cx="0" cy="0" r="2" fill="#ffffff" />
		</g>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<g
			transform="translate({route.x2},{route.y2})"
			class="tw-cursor-pointer tw-origin-center tw-transition-transform hover:tw-scale-110"
			role="presentation"
			onpointerdown={(e) => onControlPointDrag?.(e, 'end')}
		>
			<circle cx="0" cy="0" r="10" fill="#050505" stroke={route.color} stroke-width="2" opacity="0.8" />
			<circle cx="0" cy="0" r="4" fill="#ffffff" />
			<line x1="-14" y1="0" x2="14" y2="0" stroke={route.color} stroke-width="1.5" opacity="0.5" />
			<line x1="0" y1="-14" x2="0" y2="14" stroke={route.color} stroke-width="1.5" opacity="0.5" />
		</g>
	</g>
{/if}
