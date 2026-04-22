/** @type {Record<string, string>} sport key → Phosphor icon (second class after `ph`) */
const SPORT_ICON_SUFFIX = {
	soccer: 'ph-soccer-ball',
	basketball: 'ph-basketball',
	baseball: 'ph-baseball',
	football: 'ph-football',
	volleyball: 'ph-volleyball',
	hockey: 'ph-ice-skate',
	lacrosse: 'ph-tennis-ball',
	generic: 'ph-shield-check',
};

/**
 * Normalize club `sport` field to a known key.
 * @param {string} [sport]
 * @returns {keyof typeof SPORT_ICON_SUFFIX}
 */
export function normalizeClubSport(sport) {
	const s = (sport || '').toLowerCase().trim();
	if (s && s in SPORT_ICON_SUFFIX) return /** @type {keyof typeof SPORT_ICON_SUFFIX} */ (s);
	// Legacy branding strings / loose matches
	if (s.includes('basket')) return 'basketball';
	if (s.includes('volley')) return 'volleyball';
	if (s.includes('baseball')) return 'baseball';
	if (s.includes('lacrosse')) return 'lacrosse';
	if (s.includes('hockey') || s.includes('ice')) return 'hockey';
	if (s.includes('football') && !s.includes('soccer')) return 'football';
	if (s === 'generic' || s.includes('generic')) return 'generic';
	if (s.includes('soccer')) return 'soccer';
	return 'generic';
}

/**
 * Full `class` value for a Phosphor sport icon, e.g. `ph ph-soccer-ball`.
 * @param {string} [sport]
 * @returns {string}
 */
export function clubSportIconClass(sport) {
	const key = normalizeClubSport(sport);
	const suffix = SPORT_ICON_SUFFIX[key] || SPORT_ICON_SUFFIX.generic;
	return `ph ${suffix}`;
}

/**
 * Second half of icon class (for templates that already prefix with `ph `).
 * @param {string} [sport]
 * @returns {string}
 */
export function clubSportIconSuffix(sport) {
	const key = normalizeClubSport(sport);
	return SPORT_ICON_SUFFIX[key] || SPORT_ICON_SUFFIX.generic;
}

/**
 * Phosphor icon class suffix (without leading `ph`) for team branding / legacy court type strings.
 * Prefer {@link clubSportIconSuffix} with `clubs/{clubId}.sport`.
 * @param {string} [courtType]
 * @returns {string}
 */
export function sportPhosphorIcon(courtType) {
	return clubSportIconSuffix(courtType);
}

/**
 * Sprint 2.6.5 — per-sport accent tokens for org-table icon chips.
 * `fg`   = icon fill (WCAG AA on #09090B backgrounds)
 * `glow` = rgba used in a 2-stop radial-gradient chip background
 * `ring` = 1px border for the chip
 */
/** @type {Record<string, { fg: string, glow: string, ring: string, label: string }>} */
const SPORT_ACCENT = {
	soccer:     { label: 'Soccer',     fg: '#22c55e', glow: 'rgba(34, 197, 94, 0.22)',  ring: 'rgba(34, 197, 94, 0.45)' },
	basketball: { label: 'Basketball', fg: '#fb923c', glow: 'rgba(251, 146, 60, 0.22)', ring: 'rgba(251, 146, 60, 0.45)' },
	baseball:   { label: 'Baseball',   fg: '#60a5fa', glow: 'rgba(96, 165, 250, 0.22)', ring: 'rgba(96, 165, 250, 0.45)' },
	football:   { label: 'Football',   fg: '#a78bfa', glow: 'rgba(167, 139, 250, 0.22)', ring: 'rgba(167, 139, 250, 0.45)' },
	volleyball: { label: 'Volleyball', fg: '#f472b6', glow: 'rgba(244, 114, 182, 0.22)', ring: 'rgba(244, 114, 182, 0.45)' },
	hockey:     { label: 'Hockey',     fg: '#38bdf8', glow: 'rgba(56, 189, 248, 0.22)', ring: 'rgba(56, 189, 248, 0.45)' },
	lacrosse:   { label: 'Lacrosse',   fg: '#facc15', glow: 'rgba(250, 204, 21, 0.22)', ring: 'rgba(250, 204, 21, 0.45)' },
	generic:    { label: 'Other',      fg: '#a1a1aa', glow: 'rgba(161, 161, 170, 0.18)', ring: 'rgba(161, 161, 170, 0.4)' }
};

/**
 * @param {string} [sport]
 * @returns {{ fg: string, glow: string, ring: string, label: string }}
 */
export function clubSportAccent(sport) {
	const key = normalizeClubSport(sport);
	return SPORT_ACCENT[key] || SPORT_ACCENT.generic;
}

/** Known sport keys in canonical order (for tab strips). */
export const KNOWN_SPORT_KEYS = Object.freeze(
	/** @type {const} */ ([
		'soccer',
		'basketball',
		'baseball',
		'football',
		'volleyball',
		'hockey',
		'lacrosse',
		'generic'
	])
);
