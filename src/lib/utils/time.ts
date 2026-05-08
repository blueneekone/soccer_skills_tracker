/**
 * time.ts — Vanguard Temporal Alignment Utilities
 * ─────────────────────────────────────────────────
 * All display timestamps in the platform route through this module.
 * Rule: every date stored in Firestore is UTC. This layer is responsible
 * for safe, locale-aware conversion to human-readable strings with
 * explicit IANA/TZDB identifiers and short timezone abbreviations.
 *
 * Design
 * ──────
 * • Uses `Intl.DateTimeFormat` exclusively — no external libraries, no
 *   locale-specific string parsing, no regex date hacks.
 * • Accepts any "date-like" value (Firestore Timestamp, JS Date, ISO
 *   string, epoch ms) so callers never need to normalise first.
 * • `facilityTimezone` opt-in: if a fixture knows which physical pitch's
 *   IANA timezone it belongs to, the display renders in that zone and a
 *   mismatch flag signals the UI to warn the user.
 *
 * ZERO-TRUST NOTE
 * ───────────────
 * Input `facilityTimezone` is validated against a known-good IANA check
 * before use. Malformed timezone strings fall back to the browser zone.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Any value that can be coerced to an epoch timestamp. */
export type AnyDate =
	| Date
	| { toDate(): Date }            // Firestore Timestamp
	| { seconds: number; nanoseconds?: number } // Firestore Timestamp shape (plain obj)
	| string
	| number;

/** Structured result of a fixture date format pass. */
export interface FixtureDateDisplay {
	/** e.g. "TUE" */
	day: string;
	/** e.g. "27 MAY" */
	date: string;
	/** e.g. "5:00 PM" */
	time: string;
	/** e.g. "MDT" or "UTC+2" */
	tzAbbr: string;
	/** True when `facilityTimezone` is set AND differs from the browser's local zone. */
	hasTzMismatch: boolean;
	/** Compact single-line summary: "TUE 27 MAY · 5:00 PM MDT" */
	full: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Coerce an `AnyDate` to epoch milliseconds, or return `null` on failure. */
export function toMs(val: AnyDate | undefined | null): number | null {
	if (val == null) return null;
	if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
	if (typeof val === 'number') return val;
	if (typeof val === 'string') {
		const d = new Date(val);
		return isNaN(d.getTime()) ? null : d.getTime();
	}
	if (typeof val === 'object') {
		// Firestore Timestamp with .toDate()
		if ('toDate' in val && typeof val.toDate === 'function') {
			try { const d = val.toDate(); return isNaN(d.getTime()) ? null : d.getTime(); } catch { return null; }
		}
		// Firestore Timestamp plain shape { seconds, nanoseconds }
		if ('seconds' in val && typeof val.seconds === 'number') {
			return val.seconds * 1000 + Math.floor((val.nanoseconds ?? 0) / 1_000_000);
		}
	}
	return null;
}

/**
 * Convert any date-like value to a UTC Firestore-compatible timestamp object.
 * Returns `{ seconds, nanoseconds }` — write this directly to Firestore.
 * Returns `null` if the input cannot be resolved.
 */
export function toUtcFirestoreTimestamp(
	val: AnyDate | undefined | null,
): { seconds: number; nanoseconds: number } | null {
	const ms = toMs(val);
	if (ms == null) return null;
	return {
		seconds: Math.floor(ms / 1000),
		nanoseconds: (ms % 1000) * 1_000_000,
	};
}

/** Returns the browser's IANA timezone identifier (e.g. "America/Denver"). */
export function getBrowserTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Validates whether a string is a parseable IANA timezone.
 * Fallback-safe: catches the RangeError thrown by `Intl` for unknown zones.
 */
export function isValidTimezone(tz: string): boolean {
	try {
		Intl.DateTimeFormat('en', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

/**
 * Extract the short timezone abbreviation (e.g. "MDT", "EST", "UTC").
 * Falls back to `tz` string if Intl cannot resolve a short name.
 */
export function getTzAbbr(tz: string, date?: Date): string {
	const d = date ?? new Date();
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			timeZoneName: 'short',
		}).formatToParts(d);
		return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
	} catch {
		return tz;
	}
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Format a fixture date for display.
 *
 * @param val            - The raw datetime value from Firestore.
 * @param facilityTimezone - Optional IANA timezone of the physical venue
 *                           (e.g. "America/New_York"). When provided and it
 *                           differs from the browser zone, `hasTzMismatch`
 *                           is set to `true` so the UI can render a warning.
 */
export function formatFixtureDateFull(
	val: AnyDate | undefined | null,
	facilityTimezone?: string,
): FixtureDateDisplay {
	const ms = toMs(val);
	const EMPTY: FixtureDateDisplay = {
		day: '—', date: '—', time: '—', tzAbbr: '—', hasTzMismatch: false, full: '—',
	};
	if (!ms) return EMPTY;

	const browserTz  = getBrowserTimezone();
	const safeIana   = facilityTimezone && isValidTimezone(facilityTimezone)
		? facilityTimezone
		: browserTz;
	const d = new Date(ms);

	const fmt = (opts: Intl.DateTimeFormatOptions) =>
		new Intl.DateTimeFormat('en-US', { ...opts, timeZone: safeIana }).format(d);

	const day    = fmt({ weekday: 'short' }).toUpperCase().slice(0, 3);
	const dayNum = fmt({ day: '2-digit' });
	const month  = fmt({ month: 'short' }).toUpperCase();
	const time   = fmt({ hour: 'numeric', minute: '2-digit', hour12: true });
	const tzAbbr = getTzAbbr(safeIana, d);

	return {
		day,
		date:         `${dayNum} ${month}`,
		time,
		tzAbbr,
		hasTzMismatch: !!facilityTimezone &&
			isValidTimezone(facilityTimezone) &&
			facilityTimezone !== browserTz,
		full: `${day} ${dayNum} ${month} · ${time} ${tzAbbr}`,
	};
}

/**
 * Lightweight single-line formatter (replaces the old `formatFixtureDate`
 * in league.ts — still returns a plain string).
 */
export function formatFixtureDate(
	val: AnyDate | undefined | null,
	facilityTimezone?: string,
): string {
	return formatFixtureDateFull(val, facilityTimezone).full;
}

/**
 * Relative time string for recency display (e.g. "2 hours ago", "in 3 days").
 * Uses `Intl.RelativeTimeFormat` for proper i18n.
 */
export function relativeTime(val: AnyDate | undefined | null): string {
	const ms = toMs(val);
	if (!ms) return '—';
	const diff = ms - Date.now(); // positive = future, negative = past
	const abs = Math.abs(diff);

	const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
	if (abs < 60_000)                return rtf.format(Math.round(diff / 1_000), 'second');
	if (abs < 3_600_000)             return rtf.format(Math.round(diff / 60_000), 'minute');
	if (abs < 86_400_000)            return rtf.format(Math.round(diff / 3_600_000), 'hour');
	if (abs < 7 * 86_400_000)        return rtf.format(Math.round(diff / 86_400_000), 'day');
	if (abs < 30 * 86_400_000)       return rtf.format(Math.round(diff / 604_800_000), 'week');
	if (abs < 365 * 86_400_000)      return rtf.format(Math.round(diff / 2_592_000_000), 'month');
	return rtf.format(Math.round(diff / 31_536_000_000), 'year');
}
