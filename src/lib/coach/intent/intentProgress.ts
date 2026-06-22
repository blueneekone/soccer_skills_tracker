/**
 * intentProgress.ts
 * ─────────────────
 * Pure helpers for intent XP progress since deploy baseline.
 * Shared formula used by IntentEngine (coach UI) and mirrored server-side.
 */

/** XP earned toward intent since deploy: max(0, current − baseline). */
export function computeIntentEarnedXp(currentXp: number, baselineXp: number): number {
	return Math.max(0, Number(currentXp) - Number(baselineXp ?? 0));
}

/** Progress percentage 0–100 from earned XP vs required. */
export function computeIntentProgressPct(earned: number, requiredXp: number): number {
	if (!requiredXp || requiredXp <= 0) return 0;
	return Math.min(100, Math.round((earned / requiredXp) * 100));
}

/** Whether earned XP meets or exceeds the intent requirement. */
export function intentXpFulfilled(earned: number, requiredXp: number): boolean {
	return requiredXp > 0 && earned >= requiredXp;
}

/** Resolve baseline XP for a roster row — tries uid, email, rosterKey (Forge roster keys vary). */
export function resolveIntentBaselineXp(
	xpBaselineByUid: Record<string, number> | undefined,
	row: { uid: string; email: string; rosterKey: string },
): number {
	if (!xpBaselineByUid) return 0;
	for (const key of [row.uid, row.email, row.rosterKey]) {
		if (key && xpBaselineByUid[key] !== undefined) {
			return Number(xpBaselineByUid[key]);
		}
	}
	return 0;
}

/** Build deploy-time baseline map from roster rows for one attribute. */
export function buildXpBaselineSnapshot(
	rows: Array<{ uid: string; email: string; rosterKey: string; xpByAttribute: Record<string, number> }>,
	attributeId: string,
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const row of rows) {
		const xp = Number(row.xpByAttribute?.[attributeId] ?? 0);
		if (row.uid) out[row.uid] = xp;
		if (row.email) out[row.email] = xp;
		if (row.rosterKey) out[row.rosterKey] = xp;
	}
	return out;
}

/** Merge deploy baselines — server snapshot wins over client deploy cache. */
export function mergeIntentBaselines(
	clientBaseline: Record<string, number> | undefined,
	serverBaseline: Record<string, number> | undefined,
): Record<string, number> {
	return { ...(clientBaseline ?? {}), ...(serverBaseline ?? {}) };
}
