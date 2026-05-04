import type { TacticalRoute, TacticalToken } from './types';
import { normalizeRoute, midCtrl } from './routeModel';
import { VIEW_W, VIEW_H, FRIENDLY_RING, OPP_RING } from './constants';

/** Dock snap radius (px, SVG user space) — matches docking core hit tolerance. */
const ROUTE_DOCK_SNAP_RADIUS = 25;

export type AnchorDrag = { routeId: string; kind: 'start' | 'ctrl' | 'end' };
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
}

export function createTacticalInputEngine(host: TacticalPointerHost) {
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

	/** Snap route endpoints to the nearest pitch token within dock radius, else leave point as-is. */
	function snapPointToDockingCore(
		x: number,
		y: number,
	): { x: number; y: number; bindPlayerId: string | null } {
		let best: { x: number; y: number; id: string; dist: number } | null = null;
		const consider = (tokens: TacticalToken[]) => {
			for (const t of tokens) {
				if (typeof t.x !== 'number' || typeof t.y !== 'number') continue;
				const dist = Math.hypot(t.x - x, t.y - y);
				if (dist <= ROUTE_DOCK_SNAP_RADIUS && (!best || dist < best.dist)) {
					best = { x: t.x, y: t.y, id: t.id, dist };
				}
			}
		};
		consider(host.wrBucketPitch());
		consider(host.wrOppPitch());
		if (!best) return { x, y, bindPlayerId: null };
		return { x: best.x, y: best.y, bindPlayerId: best.id };
	}

	function onRouteStrokePointerDown(ev: PointerEvent, route: TacticalRoute) {
		ev.stopPropagation();
		if (host.warRoomTool() !== 'ROUTE') return;
		const r = normalizeRoute(route);
		const p = host.clientToSvg(ev);
		host.setRouteBodyDrag({ routeId: r.id, ox: p.x, oy: p.y, snap: { ...r } });
		host.setSelectedRouteId(r.id);
		const el = ev.currentTarget as Element | null;
		if (el && typeof el.setPointerCapture === 'function' && ev.pointerId != null) {
			try {
				el.setPointerCapture(ev.pointerId);
				host.routeBodyCapture.el = el;
				host.routeBodyCapture.id = ev.pointerId;
			} catch {
				/* ignore */
			}
		}
	}

	function onPitchPointerDown(ev: MouseEvent | TouchEvent | PointerEvent) {
		if (host.anchorDrag()) return;
		const tgt = ev.target as EventTarget | null;
		const hitRoute = tgt && (tgt as Element).closest?.('[data-route-hit]');
		if (hitRoute) return;

		const onDisc = tgt && (tgt as Element).closest?.('[data-light-disc]');

		if (host.warRoomTool() === 'DRAG') {
			host.setSelectedRouteId(null);
			const pe = 'pointerId' in ev ? (ev as PointerEvent) : undefined;
			const primary = !pe || pe.pointerType !== 'mouse' || pe.button === 0;

			if (primary && !onDisc && pe) {
				host.setRadialLongPressOrigin({ x: pe.clientX, y: pe.clientY, ev: pe });
				host.cancelRadialLongPress();
				const t = setTimeout(() => {
					host.setRadialLongPressTimer(null);
					const o = host.radialLongPressOrigin();
					host.setRadialLongPressOrigin(null);
					if (o) host.openRadialHub(o.ev, o.ev.pointerId, false);
				}, 500);
				host.setRadialLongPressTimer(t);
				return;
			}

			if (!onDisc) return;
		}

		if (host.warRoomTool() !== 'ROUTE') return;

		if (onDisc) return;

		const raw = host.clientToSvg(ev);
		const p = host.clampToPitch(raw.x, raw.y);
		const mc = midCtrl(p.x, p.y, p.x, p.y);
		host.setRoutingActive(true);
		host.setSelectedRouteId(null);
		host.setRouteDraft({
			id: '',
			x1: p.x,
			y1: p.y,
			cx: mc.cx,
			cy: mc.cy,
			x2: p.x,
			y2: p.y,
			color: host.activeRouteColor(),
			bindPlayerId: null,
			pathKind: host.routeDrawKind(),
			delay: 0,
		});
	}

	function handlePointerMove(ev: PointerEvent) {
		host.updateRadialHover(ev);
		const origin = host.radialLongPressOrigin();
		const timer = host.radialLongPressTimer();
		if (origin && timer != null) {
			const dx = ev.clientX - origin.x;
			const dy = ev.clientY - origin.y;
			if (Math.hypot(dx, dy) > 14) host.cancelRadialLongPress();
		}
		const ad = host.anchorDrag();
		if (ad && host.warRoomTool() === 'ROUTE') {
			const raw = host.clientToSvg(ev);
			const p = host.clampToPitch(raw.x, raw.y);
			const { routeId, kind } = ad;
			host.setDrawnRoutes(
				host.drawnRoutes().map((rawR) => {
					const r = normalizeRoute(rawR);
					if (r.id !== routeId) return rawR;
					if (kind === 'start') {
						const dock = snapPointToDockingCore(p.x, p.y);
						return { ...r, x1: dock.x, y1: dock.y, bindPlayerId: dock.bindPlayerId };
					}
					if (kind === 'ctrl') return { ...r, cx: p.x, cy: p.y };
					const dock = snapPointToDockingCore(p.x, p.y);
					return { ...r, x2: dock.x, y2: dock.y, bindPlayerId: dock.bindPlayerId };
				}),
			);
			return;
		}
		const rb = host.routeBodyDrag();
		if (rb && host.warRoomTool() === 'ROUTE') {
			const raw = host.clientToSvg(ev);
			const p = host.clampToPitch(raw.x, raw.y);
			const dx = p.x - rb.ox;
			const dy = p.y - rb.oy;
			const s = rb.snap;
			host.setDrawnRoutes(
				host.drawnRoutes().map((rawR) => {
					const r = normalizeRoute(rawR);
					if (r.id !== rb.routeId) return rawR;
					let next = {
						...r,
						x1: s.x1 + dx,
						y1: s.y1 + dy,
						cx: s.cx + dx,
						cy: s.cy + dy,
						x2: s.x2 + dx,
						y2: s.y2 + dy,
					};
					const q1 = host.clampToPitch(next.x1, next.y1);
					const qc = host.clampToPitch(next.cx, next.cy);
					const q2 = host.clampToPitch(next.x2, next.y2);
					next = { ...next, x1: q1.x, y1: q1.y, cx: qc.x, cy: qc.y, x2: q2.x, y2: q2.y };
					return next;
				}),
			);
			return;
		}
		const dp = host.draggingPlayer();
		if (dp && host.warRoomTool() === 'DRAG') {
			const raw = host.clientToSvg(ev);
			const p = host.clampToPitch(raw.x, raw.y);
			dp.x = p.x;
			dp.y = p.y;
			host.appendTrailPoint(p.x, p.y);
			if (host.wrBucketPitch().some((t) => t === dp)) host.setWrBucketPitch([...host.wrBucketPitch()]);
			else host.setWrOppPitch([...host.wrOppPitch()]);
			const pid = dp.id;
			if (pid) {
				host.setDrawnRoutes(
					host.drawnRoutes().map((rawR) => {
						const r = normalizeRoute(rawR);
						if (r.bindPlayerId !== pid) return rawR;
						return { ...r, x1: p.x, y1: p.y };
					}),
				);
			}
			return;
		}
		const routingActive = host.routingActive();
		const draft = host.routeDraft();
		if (routingActive && draft && host.warRoomTool() === 'ROUTE') {
			const raw = host.clientToSvg(ev);
			const p = host.clampToPitch(raw.x, raw.y);
			const dock = snapPointToDockingCore(p.x, p.y);
			const mc = midCtrl(draft.x1, draft.y1, dock.x, dock.y);
			const bindPlayerId =
				dock.bindPlayerId !== null ? dock.bindPlayerId : (draft.bindPlayerId ?? null);
			host.setRouteDraft({ ...draft, x2: dock.x, y2: dock.y, cx: mc.cx, cy: mc.cy, bindPlayerId });
		}
	}

	function handlePointerUp(ev: PointerEvent) {
		host.cancelRadialLongPress();
		if (host.tryConsumeRadialPointerUp(ev)) return;
		if (host.routeBodyDrag()) {
			releaseRouteBodyCapture();
			host.setRouteBodyDrag(null);
			return;
		}
		if (host.anchorDrag()) {
			host.teardownAnchorDrag();
			return;
		}
		if (host.draggingPlayer()) {
			releasePitchDragCapture();
			host.setActiveDragTrail([]);
			host.setDraggingPlayer(null);
			return;
		}
		const routingActive = host.routingActive();
		const draft = host.routeDraft();
		if (routingActive && draft && host.warRoomTool() === 'ROUTE') {
			const raw = host.clientToSvg(ev);
			const p = host.clampToPitch(raw.x, raw.y);
			const dock = snapPointToDockingCore(p.x, p.y);
			const dx = dock.x - draft.x1;
			const dy = dock.y - draft.y1;
			if (Math.hypot(dx, dy) > 14) {
				const id =
					typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
						? crypto.randomUUID()
						: `r-${Date.now()}`;
				const mc = midCtrl(draft.x1, draft.y1, dock.x, dock.y);
				let bindId = draft.bindPlayerId ?? null;
				if (dock.bindPlayerId !== null) bindId = dock.bindPlayerId;
				else if (!bindId) bindId = host.bindPlayerIdAtRouteStart(draft.x1, draft.y1);
				host.setDrawnRoutes([
					...host.drawnRoutes(),
					{
						id,
						x1: draft.x1,
						y1: draft.y1,
						cx: mc.cx,
						cy: mc.cy,
						x2: dock.x,
						y2: dock.y,
						color: host.activeRouteColor(),
						bindPlayerId: bindId,
						pathKind: draft.pathKind ?? host.routeDrawKind(),
						delay: draft.delay ?? 0,
					},
				]);
			}
		}
		host.setRoutingActive(false);
		host.setRouteDraft(null);
	}

	function startDrag(ev: PointerEvent, player: TacticalToken) {
		if (host.warRoomTool() === 'DRAG') {
			ev.preventDefault();
			ev.stopPropagation();
			const resolved = host.resolvePitchToken(player);
			host.setDraggingPlayer(resolved);
			host.setActiveDragTrail([]);
			host.ribbon.value =
				typeof resolved.color === 'string' && resolved.color ? resolved.color : fallbackRing(resolved);
			if (typeof (ev.currentTarget as HTMLElement).setPointerCapture === 'function' && ev.pointerId != null) {
				try {
					(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
					host.pitchDragCapture.el = ev.currentTarget as Element;
					host.pitchDragCapture.id = ev.pointerId;
				} catch {
					/* ignore */
				}
			}
			const sx = resolved.x ?? VIEW_W / 2;
			const sy = resolved.y ?? VIEW_H / 2;
			const p0 = host.clampToPitch(sx, sy);
			host.appendTrailPoint(p0.x, p0.y);
			return;
		}
		if (host.warRoomTool() === 'ROUTE') {
			ev.preventDefault();
			ev.stopPropagation();
			const sx = player.x ?? VIEW_W / 2;
			const sy = player.y ?? VIEW_H / 2;
			const p0 = host.clampToPitch(sx, sy);
			const mc = midCtrl(p0.x, p0.y, p0.x, p0.y);
			host.setRoutingActive(true);
			host.setSelectedRouteId(null);
			host.setRouteDraft({
				id: '',
				x1: p0.x,
				y1: p0.y,
				cx: mc.cx,
				cy: mc.cy,
				x2: p0.x,
				y2: p0.y,
				color: host.activeRouteColor(),
				bindPlayerId: player.id,
				pathKind: host.routeDrawKind(),
				delay: 0,
			});
		}
	}

	function fallbackRing(p: TacticalToken) {
		return p.side === 'opponent' ? OPP_RING : p.color || FRIENDLY_RING;
	}

	function onAnchorDown(ev: MouseEvent | PointerEvent, routeId: string, kind: AnchorDrag['kind']) {
		ev.stopPropagation();
		if (host.warRoomTool() !== 'ROUTE') return;
		host.setAnchorDrag({ routeId, kind });
		if (kind === 'start') {
			host.setDrawnRoutes(
				host.drawnRoutes().map((rawR) => {
					const r = normalizeRoute(rawR);
					if (r.id !== routeId) return rawR;
					return { ...r, bindPlayerId: null };
				}),
			);
		}
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
