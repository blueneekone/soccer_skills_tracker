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
		warRoomTool = /** @type {'DRAG' | 'ROUTE'} */ ('DRAG'),
		isSelected = false,
		onPathClick,
		onControlPointDrag,
		onRouteHoverEnter,
		onRouteHoverLeave,
	} = $props();

	const aresMarkerFragment = $derived(String(route.color ?? '').replace(/#/g, ''));
</script>

{#if renderLayer === 'stroke'}
	<!-- Bloom + white core + marker (global stroke pass) -->
	<g aria-current={isSelected ? 'true' : undefined}>
		<path
			d={pathD}
			fill="none"
			stroke={route.color}
			stroke-width="6"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.75"
			filter="url(#neon-glow)"
			pointer-events="none"
		/>
		<path
			d={pathD}
			fill="none"
			stroke="#ffffff"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			pointer-events="none"
			marker-end={`url(#ares-disc-${aresMarkerFragment})`}
		/>
	</g>
{/if}

{#if renderLayer === 'hit'}
	<!-- Global hit pass: all routes’ strokes, then interaction -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<path
		data-route-hit
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

{#if renderLayer === 'anchors'}
	<!-- Global anchor pass (parent gates visibility per route) -->
	<g data-route-anchor-layer={isSelected ? 'selected' : undefined}>
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
