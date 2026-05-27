/** Canonical emblem rank line — uppercase rank, integer level, no zero-pad. */
export function formatEmblemRankLabel(rankName: string, level: number): string {
	return `${rankName.trim().toUpperCase()} · LVL ${level}`;
}
