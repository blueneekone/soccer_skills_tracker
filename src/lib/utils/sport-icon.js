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
