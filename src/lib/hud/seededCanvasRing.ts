/**
 * seededCanvasRing.ts — deterministic UID-seeded progress ring geometry (Epic 1.2).
 */

/** FNV-1a 32-bit hash for stable per-UID animation phase. */
export function hashUidSeed(uid: string): number {
	let h = 2166136261;
	for (let i = 0; i < uid.length; i++) {
		h ^= uid.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** Map seed + fill to ring arc parameters (deterministic, no Math.random). */
export function ringArcFromSeed(
	uid: string,
	fill: number,
): { startAngle: number; sweep: number; pulsePhase: number; glowStrength: number } {
	const seed = hashUidSeed(uid || 'default');
	const clamped = Math.min(1, Math.max(0, Number(fill) || 0));
	const startAngle = ((seed % 360) * Math.PI) / 180;
	const sweep = clamped * Math.PI * 2;
	const pulsePhase = ((seed % 1000) / 1000) * Math.PI * 2;
	const glowStrength = 0.35 + ((seed >> 8) % 40) / 100;
	return { startAngle, sweep, pulsePhase, glowStrength };
}

export type RingDrawOptions = {
	ctx: CanvasRenderingContext2D;
	cx: number;
	cy: number;
	radius: number;
	lineWidth: number;
	fill: number;
	uid: string;
	trackColor?: string;
	strokeColor?: string;
	timeMs?: number;
};

/** Draw a UID-seeded progress ring on canvas (deterministic animation). */
export function drawSeededProgressRing(opts: RingDrawOptions): void {
	const {
		ctx,
		cx,
		cy,
		radius,
		lineWidth,
		fill,
		uid,
		trackColor = 'rgba(255,255,255,0.12)',
		strokeColor = '#60a5fa',
		timeMs = 0,
	} = opts;

	const { startAngle, sweep, pulsePhase, glowStrength } = ringArcFromSeed(uid, fill);
	const pulse = 0.85 + 0.15 * Math.sin(timeMs / 900 + pulsePhase);

	ctx.clearRect(cx - radius - lineWidth, cy - radius - lineWidth, (radius + lineWidth) * 2, (radius + lineWidth) * 2);

	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.strokeStyle = trackColor;
	ctx.lineWidth = lineWidth;
	ctx.stroke();

	if (sweep <= 0) return;

	ctx.save();
	ctx.shadowColor = strokeColor;
	ctx.shadowBlur = 6 * glowStrength * pulse;
	ctx.beginPath();
	ctx.arc(cx, cy, radius, startAngle - Math.PI / 2, startAngle - Math.PI / 2 + sweep);
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = lineWidth;
	ctx.lineCap = 'round';
	ctx.stroke();
	ctx.restore();
}
