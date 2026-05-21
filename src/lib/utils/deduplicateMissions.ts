/**
 * deduplicateMissions.ts — Sprint 1.5 mission queue deduplication utility.
 * Filters an array of items to unique entries by `id` field, preserving
 * first-seen order. Safe for any collection that carries an `id: string`.
 */

export function deduplicateById<T extends { id?: string }>(items: T[]): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = item.id;
		if (!key) return true;
		if (seen.has(key)) {
			console.warn('[dedup] duplicate mission id dropped — upstream source may be indexing the same record in multiple collections:', key);
			return false;
		}
		seen.add(key);
		return true;
	});
}
