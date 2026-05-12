/**
 * phoneUtils.ts
 * ──────────────
 * Phase 2, Epic 3 — Native Firebase Phone Number Verification.
 *
 * Thin wrappers around libphonenumber-js for E.164 parsing and formatting.
 * Tree-shakeable — only the `parsePhoneNumberFromString` function is imported,
 * keeping the bundle cost to ~25 kB (min+gzip).
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Parse a raw string into an E.164 number.
 * Returns null if the string is not a recognisable phone number.
 *
 * @param raw       User-typed input (may include spaces, dashes, parens).
 * @param country   ISO 3166-1 alpha-2 country code for national number parsing
 *                  (e.g. 'US'). Used when `raw` does NOT start with '+'.
 *
 * @example
 *   toE164('(555) 555-0123', 'US') // → '+15555550123'
 *   toE164('+44 20 7946 0958')     // → '+442079460958'
 *   toE164('not-a-number', 'US')   // → null
 */
export function toE164(raw: string, country?: string): string | null {
	try {
		const parsed = parsePhoneNumberFromString(raw, country as Parameters<typeof parsePhoneNumberFromString>[1]);
		if (!parsed || !parsed.isValid()) return null;
		return parsed.format('E.164');
	} catch {
		return null;
	}
}

/**
 * True when `raw` (+ optional country) parses to a valid E.164 number.
 */
export function isValidPhone(raw: string, country?: string): boolean {
	return toE164(raw, country) !== null;
}

/** Maps a country-code prefix string (e.g. '+1') to the first matching ISO country. */
const PREFIX_TO_COUNTRY: Record<string, string> = {
	'+1':  'US',
	'+44': 'GB',
	'+52': 'MX',
	'+55': 'BR',
	'+61': 'AU',
	'+49': 'DE',
	'+33': 'FR',
	'+81': 'JP',
	'+82': 'KR',
	'+91': 'IN',
};

/**
 * Given the country-prefix string selected in the UI dropdown ('+1', '+44', …)
 * and the national number typed by the user, return a valid E.164 string or null.
 *
 * @param prefix  Country dialling code with leading '+' (e.g. '+1')
 * @param national National number digits typed by the user (may have formatting)
 */
export function prefixAndNationalToE164(prefix: string, national: string): string | null {
	const country = PREFIX_TO_COUNTRY[prefix];
	// Try "prefix + digits" as a full international number first.
	const full = `${prefix}${national.replace(/\D/g, '')}`;
	return toE164(full, country);
}
