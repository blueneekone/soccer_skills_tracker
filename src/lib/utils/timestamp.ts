/** Converts Firestore timestamps, ISO strings, and epoch numbers to milliseconds. */
export function toEpochMs(v: unknown): number {
	if (v == null) return 0;
	if (v instanceof Date) return v.getTime();
	if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
	if (typeof v === 'string') {
		const n = Number(v);
		if (Number.isFinite(n) && n > 0) return n > 1e12 ? n : n * 1000;
		const parsed = Date.parse(v);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	if (typeof v === 'object' && v !== null) {
		const o = v as Record<string, unknown>;
		if (typeof o.toMillis === 'function') {
			try {
				return (o.toMillis as () => number)();
			} catch {
				/* fall through */
			}
		}
		if (typeof o.seconds === 'number') {
			return o.seconds * 1000 + (typeof o.nanoseconds === 'number' ? Math.floor(o.nanoseconds / 1e6) : 0);
		}
		if (typeof o.toDate === 'function') {
			try {
				return (o.toDate as () => Date)().getTime();
			} catch {
				/* fall through */
			}
		}
	}
	return 0;
}
