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
	const pathKind = o.pathKind === 'cut' ? 'cut' : o.pathKind === 'pass' ? 'pass' : 'curve';
	const pivotX = o.pivotX != null && Number.isFinite(Number(o.pivotX)) ? Number(o.pivotX) : cx;
	const pivotY = o.pivotY != null && Number.isFinite(Number(o.pivotY)) ? Number(o.pivotY) : cy;
	const releaseU = o.releaseU != null && Number.isFinite(Number(o.releaseU))
		? Math.max(0, Math.min(1, Number(o.releaseU)))
		: 0.5;

	return {
		id: String(o.id ?? ''),
		x1,
		y1,
		cx,
		cy,
		x2,
		y2,
		color: String(o.color ?? (pathKind === 'pass' ? '#ffffff' : '#14b8a6')),
		bindPlayerId: o.bindPlayerId != null ? String(o.bindPlayerId) : null,
		pathKind,
		delay: Number.isFinite(Number(o.delay)) ? Math.max(0, Math.min(DELAY_MAX_MS, Number(o.delay))) : 0,
		attachedPlayerId: o.attachedPlayerId != null ? String(o.attachedPlayerId) : null,
		pivotX,
		pivotY,
		releaseU,
	};
}

/** @param {TacticalRoute} r */
export function routePathD(r: TacticalRoute): string {
	const kind = r.pathKind ?? 'curve';
	if (kind === 'cut' || kind === 'pass') {
		return `M ${r.x1} ${r.y1} L ${r.cx} ${r.cy} L ${r.x2} ${r.y2}`;
	}
	return `M ${r.x1} ${r.y1} Q ${r.cx} ${r.cy} ${r.x2} ${r.y2}`;
}

export function midCtrl(x1: number, y1: number, x2: number, y2: number) {
	return { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

/** @param {TacticalRoute} r @param {number} u */
export function sampleRoutePointAt(r: TacticalRoute, u: number): { x: number; y: number } {
	const t = Math.min(1, Math.max(0, u));
	if (r.pathKind === 'cut' || r.pathKind === 'pass') {
		const d1 = Math.hypot(r.cx - r.x1, r.cy - r.y1);
		const d2 = Math.hypot(r.x2 - r.cx, r.y2 - r.cy);
		const total = d1 + d2;
		if (total <= 0) return { x: r.x1, y: r.y1 };
		const split = d1 / total;
		if (t <= split) {
			const sub = split > 0 ? t / split : 0;
			return { x: r.x1 + (r.cx - r.x1) * sub, y: r.y1 + (r.cy - r.y1) * sub };
		} else {
			const sub = (1 - split) > 0 ? (t - split) / (1 - split) : 1;
			return { x: r.cx + (r.x2 - r.cx) * sub, y: r.cy + (r.y2 - r.cy) * sub };
		}
	}
	if (typeof document !== 'undefined' && typeof document.createElementNS === 'function') {
		try {
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('d', routePathD(r));
			const len = path.getTotalLength();
			if (Number.isFinite(len) && len > 0) {
				return path.getPointAtLength(len * t);
			}
		} catch {
			// Fallback to quadratic math
		}
	}
	const mt = 1 - t;
	return {
		x: mt * mt * r.x1 + 2 * mt * t * r.cx + t * t * r.x2,
		y: mt * mt * r.y1 + 2 * mt * t * r.cy + t * t * r.y2,
	};
}

export function applyPassRouteKinematics(
	kineticMap: Map<string, import('./types').TacticalToken>,
	passRoutes: TacticalRoute[],
	tokens: import('./types').TacticalToken[],
	tNow: number,
	maxT: number,
	dragId: string | null
) {
	for (const pr of passRoutes) {
		const delay = Math.max(0, pr.delay ?? 0);
		const span = Math.max(1, maxT - delay);
		const uRoute = tNow < delay ? 0 : Math.max(0, Math.min(1, (tNow - delay) / span));

		const d1 = Math.hypot(pr.cx - pr.x1, pr.cy - pr.y1);
		const d2 = Math.hypot(pr.x2 - pr.cx, pr.y2 - pr.cy);
		const total = d1 + d2;
		const split = total > 0 ? Math.max(0.05, Math.min(0.95, d1 / total)) : 0.5;

		let passerId = pr.attachedPlayerId || (pr.bindPlayerId !== 'BALL' ? pr.bindPlayerId : null);
		if (!passerId) {
			const nearPlayer = tokens.find(
				(t) => t.side === 'friendly' && t.id !== 'BALL' && Math.hypot((t.x ?? 0) - pr.x1, (t.y ?? 0) - pr.y1) < 45
			);
			if (nearPlayer) passerId = nearPlayer.id;
		}

		let currentPivotX = pr.cx;
		let currentPivotY = pr.cy;

		if (passerId && dragId !== passerId && kineticMap.has(passerId)) {
			const passerTok = kineticMap.get(passerId)!;
			if (uRoute <= split) {
				const sub = split > 0 ? uRoute / split : 1;
				passerTok.x = pr.x1 + (pr.cx - pr.x1) * sub;
				passerTok.y = pr.y1 + (pr.cy - pr.y1) * sub;
			} else {
				passerTok.x = pr.cx;
				passerTok.y = pr.cy;
			}
			currentPivotX = passerTok.x;
			currentPivotY = passerTok.y;
		}

		const ballTok = kineticMap.get('BALL');
		if (ballTok && dragId !== 'BALL') {
			if (uRoute <= split) {
				ballTok.x = currentPivotX;
				ballTok.y = currentPivotY;
			} else {
				const sub = (1 - split) > 0 ? (uRoute - split) / (1 - split) : 1;
				ballTok.x = pr.cx + (pr.x2 - pr.cx) * sub;
				ballTok.y = pr.cy + (pr.y2 - pr.cy) * sub;
			}
		}
	}
}
