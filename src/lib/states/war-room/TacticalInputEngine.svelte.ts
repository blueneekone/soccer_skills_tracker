import type { TacticalRoute, TacticalToken } from './types';
import { normalizeRoute, midCtrl } from './routeModel';
import { VIEW_W, VIEW_H, FRIENDLY_RING, OPP_RING } from './constants';
import { executePointerMove, executePointerDown, executePointerUp, executeStartDrag, executeAnchorDown, executeRouteStrokePointerDown } from '$lib/utils/tacticalInputHandlers';
/** Dock snap radius (px, SVG user space) — matches docking core hit tolerance. */
const ROUTE_DOCK_SNAP_RADIUS = 25;

export type AnchorDrag = {
	routeId: string;
	kind: 'start' | 'ctrl' | 'end';
	/** Route anchor's SVG position at drag start — never mutated; absolute delta applied each frame */
	anchorX: number;
	anchorY: number;
	/** Client (screen) coordinates recorded at pointerdown — delta base for absolute tracking */
	startClientX: number;
	startClientY: number;
};
export type RouteBodyDrag = { routeId: string; ox: number; oy: number; snap: TacticalRoute };

export type TrailPt = { x: number; y: number; t: number; c?: string };

/** Mutable pointer-capture handles owned by the engine. */
export type CapturePair = { el: Element | null; id: number | null };

/** Ribbon color is plain assignment on TacticalGrid — boxed for engine writes. */
export type RibbonBox = { value: string };

export interface TacticalPointerHost {
	svg(): SVGSVGElement | undefined;
	warRoomTool(): 'DRAG' | 'ROUTE';
	clientToSvg(ev: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number };
	clampToPitch(x: number, y: number): { x: number; y: number };
	anchorDrag(): AnchorDrag | null;
	setAnchorDrag(v: AnchorDrag | null): void;
	routeBodyDrag(): RouteBodyDrag | null;
	setRouteBodyDrag(v: RouteBodyDrag | null): void;
	draggingPlayer(): TacticalToken | null;
	setDraggingPlayer(v: TacticalToken | null): void;
	routingActive(): boolean;
	setRoutingActive(v: boolean): void;
	routeDraft(): TacticalRoute | null;
	setRouteDraft(v: TacticalRoute | null): void;
	drawnRoutes(): unknown[];
	setDrawnRoutes(v: unknown[]): void;
	wrBucketPitch(): TacticalToken[];
	setWrBucketPitch(v: TacticalToken[]): void;
	wrOppPitch(): TacticalToken[];
	setWrOppPitch(v: TacticalToken[]): void;
	activeDragTrail(): TrailPt[];
	setActiveDragTrail(v: TrailPt[]): void;
	activeRouteColor(): string;
	routeDrawKind(): 'curve' | 'cut';
	selectedRouteId(): string | null;
	setSelectedRouteId(v: string | null): void;
	ribbon: RibbonBox;
	appendTrailPoint(x: number, y: number, color?: string): void;
	bindPlayerIdAtRouteStart(x1: number, y1: number): string | null;
	resolvePitchToken(player: TacticalToken): TacticalToken;
	updateRadialHover(ev: PointerEvent): void;
	cancelRadialLongPress(): void;
	tryConsumeRadialPointerUp(ev: PointerEvent): boolean;
	radialLongPressOrigin(): { x: number; y: number; ev: PointerEvent } | null;
	setRadialLongPressOrigin(v: { x: number; y: number; ev: PointerEvent } | null): void;
	radialLongPressTimer(): ReturnType<typeof setTimeout> | null;
	setRadialLongPressTimer(v: ReturnType<typeof setTimeout> | null): void;
	openRadialHub(
		ev: MouseEvent | TouchEvent | PointerEvent,
		openerPointerId: number | null,
		viaContext?: boolean,
	): void;
	/** True while radial hub open or spring pop-out visible (pitch leave must not cancel). */
	radialBlocking(): boolean;
	teardownAnchorDrag(): void;
	routeBodyCapture: CapturePair;
	pitchDragCapture: CapturePair;
	pitchSvgEl: SVGSVGElement | undefined;
}

 
export function createTacticalInputEngine(host: TacticalPointerHost) {
	let _anchorSvgCapturePid: number | null = null;

	function releasePitchDragCapture() {
		const { el, id } = host.pitchDragCapture;
		if (el && id != null) {
			try {
				el.releasePointerCapture(id);
			} catch {
				/* ignore */
			}
		}
		host.pitchDragCapture.el = null;
		host.pitchDragCapture.id = null;
	}

	function releaseRouteBodyCapture() {
		const { el, id } = host.routeBodyCapture;
		if (el && id != null) {
			try {
				el.releasePointerCapture(id);
			} catch {
				/* ignore */
			}
		}
		host.routeBodyCapture.el = null;
		host.routeBodyCapture.id = null;
	}



	function onRouteStrokePointerDown(ev: PointerEvent, route: TacticalRoute) {
		executeRouteStrokePointerDown(ev, route, host);
	}

	function onPitchPointerDown(ev: MouseEvent | TouchEvent | PointerEvent) {
		executePointerDown(ev, host);
	}

	function handlePointerMove(ev: PointerEvent) {
		executePointerMove(ev, host);
	}

	function handlePointerUp(ev: PointerEvent) {
		_anchorSvgCapturePid = executePointerUp(ev, host, releaseRouteBodyCapture, releasePitchDragCapture, _anchorSvgCapturePid);
	}

	function startDrag(ev: PointerEvent, player: TacticalToken) {
		executeStartDrag(ev, player, host);
	}

	function fallbackRing(p: TacticalToken) {
		return p.side === 'opponent' ? OPP_RING : p.color || FRIENDLY_RING;
	}

	function onAnchorDown(ev: MouseEvent | PointerEvent, routeId: string, kind: AnchorDrag['kind']) {
		const pid = executeAnchorDown(ev, routeId, kind, host);
		if (pid !== null) _anchorSvgCapturePid = pid;
	}

	function onPitchMouseLeave(ev: MouseEvent | PointerEvent) {
		if (host.anchorDrag()) return;
		if (host.draggingPlayer()) return;
		if (host.radialBlocking()) return;
		handlePointerUp(ev as PointerEvent);
	}

	return {
		onRouteStrokePointerDown,
		onPitchPointerDown,
		handlePointerMove,
		handlePointerUp,
		startDrag,
		onAnchorDown,
		onPitchMouseLeave,
		releasePitchDragCapture,
		releaseRouteBodyCapture,
	};
}
