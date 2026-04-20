/**
 * Phosphor icon class (without `ph ` prefix) for team branding / court type.
 * @param {string} [courtType]
 * @returns {string}
 */
export function sportPhosphorIcon(courtType) {
	const c = (courtType || 'soccer').toLowerCase();
	if (c.includes('basket')) return 'ph-basketball';
	if (c.includes('volley')) return 'ph-volleyball';
	if (c.includes('baseball')) return 'ph-baseball';
	if (c.includes('lacrosse')) return 'ph-tennis-ball';
	if (c === 'generic' || c.includes('generic')) return 'ph-barbell';
	if (c.includes('football')) return 'ph-football';
	return 'ph-soccer-ball';
}
