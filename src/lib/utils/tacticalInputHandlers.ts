import { normalizeRoute, midCtrl } from '$lib/states/war-room/routeModel';
import { VIEW_W, VIEW_H, FRIENDLY_RING, OPP_RING } from '$lib/states/war-room/constants';
import { snapPointToDockingCore } from '$lib/utils/canvasPhysics';
import type { TacticalPointerHost, AnchorDrag } from '$lib/states/war-room/TacticalInputEngine.svelte';
import type { TacticalToken, TacticalRoute } from '$lib/states/war-room/types';

function handleAnchorDrag(ev: PointerEvent, host: TacticalPointerHost, ad: AnchorDrag) {
	const svgEl = host.pitchSvgEl;
	const rect = svgEl?.getBoundingClientRect();
	const uniformScale = rect ? Math.max(VIEW_W / rect.width, VIEW_H / rect.height) : 1;
	const dxScreen = ev.clientX - ad.startClientX;
	const dyScreen = ev.clientY - ad.startClientY;
	const p = host.clampToPitch(
		ad.anchorX + dxScreen * uniformScale,
		ad.anchorY + dyScreen * uniformScale,
	);
	const { routeId, kind } = ad;
	host.setDrawnRoutes(
		host.drawnRoutes().map((rawR) => {
			const r = normalizeRoute(rawR as TacticalRoute);
			if (r.id !== routeId) return rawR;
			if (kind === 'start') {
				const dock = snapPointToDockingCore(p.x, p.y, [...host.wrBucketPitch(), ...host.wrOppPitch()]);
				const nextBindId = dock.bindPlayerId !== null ? dock.bindPlayerId : r.bindPlayerId;
				return { ...r, x1: dock.x, y1: dock.y, bindPlayerId: nextBindId };
			}
			if (kind === 'ctrl') return { ...r, cx: p.x, cy: p.y };
			const dock = snapPointToDockingCore(p.x, p.y, [...host.wrBucketPitch(), ...host.wrOppPitch()]);
			return { ...r, x2: dock.x, y2: dock.y };
		}),
	);
}

function handleRouteBodyDrag(ev: PointerEvent, host: TacticalPointerHost, rb: any) {
	const raw = host.clientToSvg(ev);
	const p = host.clampToPitch(raw.x, raw.y);
	const dx = p.x - rb.ox;
	const dy = p.y - rb.oy;
	const s = rb.snap;
	host.setDrawnRoutes(
		host.drawnRoutes().map((rawR) => {
			const r = normalizeRoute(rawR as TacticalRoute);
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
}

function handlePlayerDrag(ev: PointerEvent, host: TacticalPointerHost, dp: TacticalToken) {
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
				const r = normalizeRoute(rawR as TacticalRoute);
				if (r.bindPlayerId !== pid) return rawR;
				return { ...r, x1: p.x, y1: p.y };
			}),
		);
	}
}

function handleRouteDrafting(ev: PointerEvent, host: TacticalPointerHost, draft: TacticalRoute) {
	const raw = host.clientToSvg(ev);
	const p = host.clampToPitch(raw.x, raw.y);
	const dock = snapPointToDockingCore(p.x, p.y, [...host.wrBucketPitch(), ...host.wrOppPitch()]);
	const mc = midCtrl(draft.x1, draft.y1, dock.x, dock.y);
	const bindPlayerId =
		dock.bindPlayerId !== null ? dock.bindPlayerId : (draft.bindPlayerId ?? null);
	host.setRouteDraft({ ...draft, x2: dock.x, y2: dock.y, cx: mc.cx, cy: mc.cy, bindPlayerId });
}

export function executePointerMove(ev: PointerEvent, host: TacticalPointerHost) {
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
		handleAnchorDrag(ev, host, ad);
		return;
	}

	const rb = host.routeBodyDrag();
	if (rb && host.warRoomTool() === 'ROUTE') {
		handleRouteBodyDrag(ev, host, rb);
		return;
	}

	const dp = host.draggingPlayer();
	if (dp && host.warRoomTool() === 'DRAG') {
		handlePlayerDrag(ev, host, dp);
		return;
	}

	const routingActive = host.routingActive();
	const draft = host.routeDraft();
	if (routingActive && draft && host.warRoomTool() === 'ROUTE') {
		handleRouteDrafting(ev, host, draft);
	}
}

export function executePointerDown(ev: MouseEvent | TouchEvent | PointerEvent, host: TacticalPointerHost) {
	if (host.anchorDrag()) return;
	const tgt = ev.target as EventTarget | null;
	const hitRoute = tgt && (tgt as Element).closest?.('[data-route-hit]');
	if (hitRoute) return;
	const hitAnchor = tgt && (tgt as Element).closest?.('[data-anchor-hit]');
	if (hitAnchor) return;

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

	if (host.selectedRouteId() !== null) {
		host.setSelectedRouteId(null);
		return;
	}

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

export function executePointerUp(ev: PointerEvent, host: TacticalPointerHost, releaseRouteBody: () => void, releasePitchDrag: () => void, anchorCapturePid: number | null) {
	host.cancelRadialLongPress();
	if (host.tryConsumeRadialPointerUp(ev)) return anchorCapturePid;
	if (host.routeBodyDrag()) {
		releaseRouteBody();
		host.setRouteBodyDrag(null);
		return anchorCapturePid;
	}
	if (host.anchorDrag()) {
		const svgEl = host.pitchSvgEl;
		if (svgEl && anchorCapturePid != null) {
			try { svgEl.releasePointerCapture(anchorCapturePid); } catch { /* ignore */ }
			anchorCapturePid = null;
		}
		host.teardownAnchorDrag();
		return anchorCapturePid;
	}
	if (host.draggingPlayer()) {
		releasePitchDrag();
		host.setActiveDragTrail([]);
		host.setDraggingPlayer(null);
		return anchorCapturePid;
	}
	const routingActive = host.routingActive();
	const draft = host.routeDraft();
	if (routingActive && draft && host.warRoomTool() === 'ROUTE') {
		const raw = host.clientToSvg(ev);
		const p = host.clampToPitch(raw.x, raw.y);
		const dock = snapPointToDockingCore(p.x, p.y, [...host.wrBucketPitch(), ...host.wrOppPitch()]);
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
			const _newRoute = { id, x1: draft.x1, y1: draft.y1, cx: mc.cx, cy: mc.cy, x2: dock.x, y2: dock.y, color: host.activeRouteColor(), bindPlayerId: bindId, pathKind: draft.pathKind ?? host.routeDrawKind(), delay: draft.delay ?? 0 };
			host.setDrawnRoutes([...host.drawnRoutes(), _newRoute]);
			host.setSelectedRouteId(id);
		}
	}
	host.setRoutingActive(false);
	host.setRouteDraft(null);
	return anchorCapturePid;
}

export function executeStartDrag(ev: PointerEvent, player: TacticalToken, host: TacticalPointerHost) {
	if (host.warRoomTool() === 'DRAG') {
		ev.preventDefault();
		ev.stopPropagation();
		const resolved = host.resolvePitchToken(player);
		host.setDraggingPlayer(resolved);
		host.setActiveDragTrail([]);
		const fallbackRing = (p: TacticalToken) => p.side === 'opponent' ? OPP_RING : p.color || FRIENDLY_RING;
		host.ribbon.value = typeof resolved.color === 'string' && resolved.color ? resolved.color : fallbackRing(resolved);
		if (typeof (ev.currentTarget as HTMLElement).setPointerCapture === 'function' && ev.pointerId != null) {
			try {
				(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
				host.pitchDragCapture.el = ev.currentTarget as Element;
				host.pitchDragCapture.id = ev.pointerId;
			} catch { /* ignore */ }
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

export function executeAnchorDown(ev: MouseEvent | PointerEvent, routeId: string, kind: AnchorDrag['kind'], host: TacticalPointerHost) {
	ev.stopPropagation();
	if (host.warRoomTool() !== 'ROUTE') return null;
	host.setSelectedRouteId(routeId);

	const route = (host.drawnRoutes() as TacticalRoute[]).map(normalizeRoute).find((r) => r.id === routeId);
	const pe = ev as PointerEvent;
	const startClientX = pe.clientX ?? 0;
	const startClientY = pe.clientY ?? 0;

	let anchorX = 0;
	let anchorY = 0;
	if (route) {
		if (kind === 'start') { anchorX = route.x1; anchorY = route.y1; }
		else if (kind === 'ctrl') { anchorX = route.cx; anchorY = route.cy; }
		else { anchorX = route.x2; anchorY = route.y2; }
	}

	host.setAnchorDrag({ routeId, kind, anchorX, anchorY, startClientX, startClientY });
	const svgEl = host.pitchSvgEl;
	if (svgEl && pe.pointerId != null && typeof svgEl.setPointerCapture === 'function') {
		try {
			svgEl.setPointerCapture(pe.pointerId);
			return pe.pointerId;
		} catch { return null; }
	}
	return null;
}

export function executeRouteStrokePointerDown(ev: PointerEvent, route: TacticalRoute, host: TacticalPointerHost) {
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
		} catch { /* ignore */ }
	}
}
