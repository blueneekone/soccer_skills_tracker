/**
 * snowflakeGeometry.ts
 * ────────────────────
 * Pure geometry helpers for the Composite Snowflake skill tree.
 *
 * Coordinate contract
 * ────────────────────
 * All functions operate in the 400×400 SVG viewBox space. The core Vanguard
 * Prism sits centred at (200, 200). Branch nodes occupy three concentric
 * rings at radii 100, 140, and 180 units from centre.
 *
 * Axis angle convention
 * ─────────────────────
 * Angles are in degrees, measured clockwise from the top (−90° = up).
 * This matches the VanguardPrism vertex order so branches emerge perfectly
 * in line with the prism vertices:
 *
 *   PAC → −90°  (top)
 *   ACC → −30°  (top-right)
 *   POW →  30°  (bottom-right)
 *   VAN →  90°  (bottom)
 *   STM → 150°  (bottom-left)
 *   AGI → −150° (top-left)
 *
 * No imports — this module is intentionally dependency-free so the geometry
 * can be exercised in any test environment without Svelte/Firebase overhead.
 */

import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const SNOWFLAKE_CX = 200;
export const SNOWFLAKE_CY = 200;

/** Radii for rank 1, 2, 3 rings (distance from centre, not prism edge). */
export const RING_RADII: Record<1 | 2 | 3, number> = { 1: 100, 2: 140, 3: 180 };

/** Circumradius of each hex node polygon (px in viewBox units). */
export const HEX_CIRCUMRADIUS = 14;

// ── Attribute axis angles ─────────────────────────────────────────────────────

/**
 * Map from ScoutsSix key → branch axis angle (degrees, clockwise from top).
 * Matches VanguardPrism.svelte SLOTS vertex order.
 */
const BRANCH_ANGLES: Record<keyof ScoutsSix, number> = {
	PAC: -90,
	ACC: -30,
	POW:  30,
	VAN:  90,
	STM: 150,
	AGI: -150,
};

/**
 * Canonical axis angle for a ScoutsSix attribute branch.
 * Returns degrees (clockwise from top), matching VanguardPrism vertex order.
 */
export function branchAxisAngle(attr: keyof ScoutsSix): number {
	return BRANCH_ANGLES[attr];
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

/** Convert degrees (clockwise from top) to standard math radians. */
function toRad(deg: number): number {
	return (deg - 90) * (Math.PI / 180);
}

/**
 * Compute the SVG (x, y) centre for a branch node.
 *
 * @param rank         Ring distance from core (1 = closest, 3 = furthest).
 * @param fanOffsetDeg Angular offset from the branch axis (−25, −15, 0, 15, 25).
 * @param axisDeg      Branch axis angle in degrees (clockwise from top).
 */
export function nodePosition(
	rank: 1 | 2 | 3,
	fanOffsetDeg: number,
	axisDeg: number,
): { x: number; y: number } {
	const r = RING_RADII[rank];
	const angleDeg = axisDeg + fanOffsetDeg;
	const rad = toRad(angleDeg);
	return {
		x: SNOWFLAKE_CX + r * Math.cos(rad),
		y: SNOWFLAKE_CY + r * Math.sin(rad),
	};
}

/**
 * Compute SVG polygon `points` string for a regular hexagon.
 *
 * The hexagon is rendered "pointy-top" by default (first vertex at −90° from
 * centre) but can be rotated by `rotateDeg` to achieve flat-top or any other
 * orientation.
 *
 * @param cx         Centre x (viewBox units).
 * @param cy         Centre y (viewBox units).
 * @param r          Circumradius (viewBox units).
 * @param rotateDeg  Initial rotation in degrees (default 0 = pointy-top).
 */
export function hexPolygonPoints(
	cx: number,
	cy: number,
	r: number,
	rotateDeg = 0,
): string {
	const pts: string[] = [];
	for (let k = 0; k < 6; k++) {
		// Pointy-top: start at −90°; flat-top: start at 0°.
		const angleDeg = k * 60 + rotateDeg - 90;
		const rad = angleDeg * (Math.PI / 180);
		const x = (cx + r * Math.cos(rad)).toFixed(2);
		const y = (cy + r * Math.sin(rad)).toFixed(2);
		pts.push(`${x},${y}`);
	}
	return pts.join(' ');
}

// ── Spoke helpers ─────────────────────────────────────────────────────────────

/**
 * Start and end points for the faint spoke line drawn along each branch axis,
 * from just outside the prism boundary to the outermost node ring.
 *
 * `prismEdgeR` defaults to 68 (VanguardPrism MAX_R) + 10px clearance.
 */
export function spokeEndpoints(
	attr: keyof ScoutsSix,
	prismEdgeR = 78,
	outerR = RING_RADII[3] + HEX_CIRCUMRADIUS,
): { x1: number; y1: number; x2: number; y2: number } {
	const axisDeg = branchAxisAngle(attr);
	const rad = toRad(axisDeg);
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return {
		x1: SNOWFLAKE_CX + prismEdgeR * cos,
		y1: SNOWFLAKE_CY + prismEdgeR * sin,
		x2: SNOWFLAKE_CX + outerR * cos,
		y2: SNOWFLAKE_CY + outerR * sin,
	};
}

// ── Bezier edge helpers ───────────────────────────────────────────────────────

/**
 * SVG cubic Bezier `d` attribute connecting two node centres with a gentle
 * curve that "leans toward" the branch axis.
 *
 * Control points are placed at the midpoint with a slight radial inward pull,
 * creating the characteristic snowflake frost-crystal aesthetic.
 */
export function bezierEdgePath(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): string {
	const mx = (x1 + x2) / 2;
	const my = (y1 + y2) / 2;
	// Pull control points slightly toward the snowflake centre.
	const pull = 0.12;
	const cx1 = x1 + (mx - SNOWFLAKE_CX) * pull + (mx - x1) * 0.5;
	const cy1 = y1 + (my - SNOWFLAKE_CY) * pull + (my - y1) * 0.5;
	const cx2 = x2 + (mx - SNOWFLAKE_CX) * pull + (mx - x2) * 0.5;
	const cy2 = y2 + (my - SNOWFLAKE_CY) * pull + (my - y2) * 0.5;
	return `M${x1.toFixed(2)},${y1.toFixed(2)} C${cx1.toFixed(2)},${cy1.toFixed(2)} ${cx2.toFixed(2)},${cy2.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
}
