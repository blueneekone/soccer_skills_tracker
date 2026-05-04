<script>
	const ROUTE_HIT_STROKE = 22;
	const ANCHOR_R = 10;

	/**
	 * @typedef {{
	 *   id: string;
	 *   x1: number; y1: number; cx: number; cy: number; x2: number; y2: number;
	 *   color: string;
	 *   bindPlayerId?: string | null;
	 *   pathKind?: 'curve' | 'cut';
	 *   delay?: number;
	 * }} TacticalRoute
	 */

	let {
		route,
		pathD = '',
		renderLayer,
		timelineMs = 0,
		warRoomTool = /** @type {'DRAG' | 'ROUTE'} */ ('DRAG'),
		isSelected = false,
		onPathClick,
		onControlPointDrag,
		onRouteHoverEnter,
		onRouteHoverLeave,
	} = $props();

	const aresMarkerFragment = $derived(String(route.color ?? '').replace(/#/g, ''));
	const markerEndUrl = $derived(`url(#ares-disc-${aresMarkerFragment})`);
</script>

{#if renderLayer === 'stroke'}
	<g aria-current={isSelected ? 'true' : undefined} data-timeline-ms={timelineMs}>
		<path
			d={pathD}
			fill="none"
			stroke={route.color}
			stroke-width="16"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.15"
			filter="url(#heavy-bloom)"
			pointer-events="none"
		/>
		<path
			d={pathD}
			fill="none"
			stroke={route.color}
			stroke-width="4"
			stroke-linecap="round"
			stroke-linejoin="round"
			filter="url(#heavy-bloom)"
			stroke-dasharray="10 15"
			class="tw-animate-[plasma-flow_1.5s_linear_infinite]"
			pointer-events="none"
		/>
		<path
			d={pathD}
			fill="none"
			stroke="#ffffff"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			pointer-events="none"
			marker-end={markerEndUrl}
		/>
	</g>
{/if}

{#if renderLayer === 'hit'}
	<!-- Global hit pass: all routes’ strokes, then interaction -->
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
		opacity="0.3"
		class="tw-mix-blend-screen tw-animate-pulse"
		pointer-events="none"
		data-timeline-ms={timelineMs}
	>
		<circle
			cx="0"
			cy="0"
			r="14"
			fill="none"
			stroke={route.color}
			stroke-width="2"
			filter="url(#heavy-bloom)"
		/>
		<line x1="-10" y1="-5" x2="10" y2="-5" stroke="#ffffff" stroke-width="1" opacity="0.5" />
		<line x1="-10" y1="5" x2="10" y2="5" stroke="#ffffff" stroke-width="1" opacity="0.5" />
	</g>
{/if}

{#if renderLayer === 'anchors'}
	<!-- Global anchor pass (parent gates visibility per route) -->
	<g data-timeline-ms={timelineMs} data-route-anchor-layer={isSelected ? 'selected' : undefined}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<circle
			cx={route.x1}
			cy={route.y1}
			r={ANCHOR_R}
			fill="rgba(0,240,255,0.35)"
			stroke="#ffffff"
			stroke-width="2"
			class="tw-cursor-move"
			pointer-events="all"
			role="presentation"
			onmousedown={(e) => onControlPointDrag?.(e, 'start')}
		/>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<circle
			cx={route.cx}
			cy={route.cy}
			r={ANCHOR_R}
			fill="rgba(255,0,255,0.35)"
			stroke="#ffffff"
			stroke-width="2"
			class="tw-cursor-move"
			pointer-events="all"
			role="presentation"
			onmousedown={(e) => onControlPointDrag?.(e, 'ctrl')}
		/>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<circle
			cx={route.x2}
			cy={route.y2}
			r={ANCHOR_R}
			fill="rgba(250,250,255,0.4)"
			stroke="#ffffff"
			stroke-width="2"
			class="tw-cursor-move"
			pointer-events="all"
			role="presentation"
			onmousedown={(e) => onControlPointDrag?.(e, 'end')}
		/>
	</g>
{/if}
