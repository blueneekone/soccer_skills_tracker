export function tierAccent(tier: string): string {
	switch ((tier || '').toUpperCase()) {
		case 'VANGUARD': return '#14b8a6';
		case 'ELITE': return '#f59e0b';
		case 'PRO': return '#a855f7';
		default: return '#64748b';
	}
}

export function tierBg(tier: string): string {
	return `${tierAccent(tier)}18`;
}

export function eligColor(gpa: number | null | undefined): string {
	if (gpa == null) return 'rgba(100,116,139,0.7)';
	if (gpa >= 3.5) return '#fbbf24';
	if (gpa >= 2.0) return '#14b8a6';
	if (gpa >= 1.5) return '#f59e0b';
	return '#ff003c';
}

export function buildSparkline(points: number[], width: number, height: number) {
	if (!points || points.length === 0) {
		return { path: `M 0,${height} L ${width},${height}`, max: 0, min: 0, last: 0, pct: 0 };
	}
	const max = Math.max(...points, 1);
	const min = Math.min(...points, 0);
	const range = max - min || 1;
	const dx = width / Math.max(points.length - 1, 1);
	const coords = points.map((p, i) => {
		const x = i * dx;
		const y = height - ((p - min) / range) * height;
		return `${x},${y}`;
	});
	const last = points[points.length - 1];
	const pct = points.length >= 2
		? Math.round(((last - points[0]) / Math.abs(points[0] || 1)) * 100)
		: 0;
	return { path: `M ${coords.join(' L ')}`, max, min, last, pct };
}
