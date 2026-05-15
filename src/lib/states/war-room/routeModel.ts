import type { TacticalRoute } from './types';

export const DELAY_MAX_MS = 60000;

/** @param {unknown} r */
export function normalizeRoute(r: unknown): TacticalRoute {
	const o = r as Record<string, number | string | null | undefined>;
	const x1 = Number(o.x1);
	const y1 = Number(o.y1);
	const x2 = Number(o.x2);
	const y2 = Number(o.y2);
	let cx = Number(o.cx);
	let cy = Number(o.cy);
	if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
		cx = (x1 + x2) / 2;
		cy = (y1 + y2) / 2;
	}
	return {
		id: String(o.id ?? ''),
		x1,
		y1,
		cx,
		cy,
		x2,
		y2,
		color: String(o.color ?? '#14b8a6'),
		bindPlayerId: o.bindPlayerId != null ? String(o.bindPlayerId) : null,
		pathKind: o.pathKind === 'cut' ? 'cut' : 'curve',
		delay: Number.isFinite(Number(o.delay)) ? Math.max(0, Math.min(DELAY_MAX_MS, Number(o.delay))) : 0,
	};
}

/** @param {TacticalRoute} r */
export function routePathD(r: TacticalRoute): string {
	const kind = r.pathKind ?? 'curve';
	if (kind === 'cut') return `M ${r.x1} ${r.y1} L ${r.cx} ${r.cy} L ${r.x2} ${r.y2}`;
	return `M ${r.x1} ${r.y1} Q ${r.cx} ${r.cy} ${r.x2} ${r.y2}`;
}

export function midCtrl(x1: number, y1: number, x2: number, y2: number) {
	return { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

/** @param {TacticalRoute} r @param {number} u */
export function sampleRoutePointAt(r: TacticalRoute, u: number): { x: number; y: number } {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', routePathD(r));
	const len = path.getTotalLength();
	if (!Number.isFinite(len) || len <= 0) return { x: r.x1, y: r.y1 };
	const t = Math.min(1, Math.max(0, u));
	return path.getPointAtLength(len * t);
}
