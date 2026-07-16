import { VIEW_W, VIEW_H, DISC_HIT_R } from '$lib/states/war-room/constants';
import type { TacticalToken } from '$lib/states/war-room/types';

export const ROUTE_DOCK_SNAP_RADIUS = 25;

export function clientToSvg(
	ev: MouseEvent | TouchEvent | PointerEvent,
	pitchSvgEl: SVGSVGElement | undefined,
): { x: number; y: number } {
	if (!pitchSvgEl) return { x: 0, y: 0 };
	const clientX = 'touches' in ev ? (ev.touches[0]?.clientX ?? 0) : (ev as MouseEvent).clientX;
	const clientY = 'touches' in ev ? (ev.touches[0]?.clientY ?? 0) : (ev as MouseEvent).clientY;

	try {
		const pt = pitchSvgEl.createSVGPoint();
		pt.x = clientX;
		pt.y = clientY;
		const ctm = pitchSvgEl.getScreenCTM();
		if (ctm && Math.abs(ctm.a * ctm.d - ctm.b * ctm.c) > 0.00001) {
			return pt.matrixTransform(ctm.inverse());
		}
	} catch {
		/* DOMException — fall through to hard-coded fallback. */
	}

	const rect = pitchSvgEl.getBoundingClientRect();
	const rw = rect.width || 1;
	const rh = rect.height || 1;
	return {
		x: (clientX - rect.left) * (VIEW_W / rw),
		y: (clientY - rect.top) * (VIEW_H / rh),
	};
}

export function clampToPitch(x: number, y: number) {
	const pad = DISC_HIT_R + 6;
	return {
		x: Math.min(VIEW_W - pad, Math.max(pad, x)),
		y: Math.min(VIEW_H - pad, Math.max(pad, y)),
	};
}

export function bindPlayerIdAtRouteStart(x1: number, y1: number, allPitchTokens: TacticalToken[]) {
	const rHit = DISC_HIT_R + 2;
	for (const t of allPitchTokens) {
		if (typeof t.x !== 'number' || typeof t.y !== 'number') continue;
		if (Math.hypot(t.x - x1, t.y - y1) <= rHit) return t.id;
	}
	return null;
}

export function snapPointToDockingCore(
	x: number,
	y: number,
	tokens: TacticalToken[],
): { x: number; y: number; bindPlayerId: string | null } {
	let best: { x: number; y: number; id: string; dist: number } | null = null;
	for (const t of tokens) {
		if (typeof t.x !== 'number' || typeof t.y !== 'number') continue;
		const dist = Math.hypot(t.x - x, t.y - y);
		if (dist <= ROUTE_DOCK_SNAP_RADIUS && (!best || dist < best.dist)) {
			best = { x: t.x, y: t.y, id: t.id, dist };
		}
	}
	if (!best) return { x, y, bindPlayerId: null };
	return { x: best.x, y: best.y, bindPlayerId: best.id };
}
