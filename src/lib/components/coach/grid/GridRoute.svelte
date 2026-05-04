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
		onPathClick,
		onControlPointDrag,
		onRouteHoverEnter,
		onRouteHoverLeave,
	} = $props();
</script>

{#if renderLayer === 'stroke'}
	<g aria-current={isSelected ? 'true' : undefined} data-timeline-ms={timelineMs}>
		<path
			d={pathD}
			fill="none"
			stroke={route.color}
			stroke-width="12"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.25"
			pointer-events="none"
		/>
		<path
			d={pathD}
			fill="none"
			stroke={route.color}
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.9"
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
		<animate attributeName="opacity" values="0.22;0.42;0.22" dur="1.5s" repeatCount="indefinite" />
		<circle
			cx="0"
			cy="0"
			r="14"
			fill="none"
			stroke={route.color}
			stroke-width="2"
		/>
		<line x1="-10" y1="-5" x2="10" y2="-5" stroke="#ffffff" stroke-width="1" opacity="0.5" />
		<line x1="-10" y1="5" x2="10" y2="5" stroke="#ffffff" stroke-width="1" opacity="0.5" />
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
