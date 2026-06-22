import {
	collection,
	onSnapshot,
	query,
	Timestamp,
	where,
	type Firestore,
	type Unsubscribe,
} from 'firebase/firestore';

export type CadenceCompletionRow = {
	attributeId: string;
	loggedAtMs: number;
	intentId?: string;
};

export type CadenceQuestGate = {
	id: string;
	cadence?: { sessionsPerWindow: number; windowDays: number };
	targetAttributeId?: string;
	lifecycle: string;
};

export const CADENCE_LIMIT_ERROR = {
	title: 'Cadence limit',
	text: 'Next session tomorrow — one credited session per UTC day.',
} as const;

export function mapCadenceCompletionDoc(data: Record<string, unknown>): CadenceCompletionRow {
	const attrId = typeof data.attributeId === 'string' ? data.attributeId : '';
	const ts = data.loggedAt;
	const ms =
		ts instanceof Timestamp
			? ts.toMillis()
			: typeof (ts as { toMillis?: () => number })?.toMillis === 'function'
				? (ts as { toMillis: () => number }).toMillis()
				: typeof (ts as { seconds?: number })?.seconds === 'number'
					? (ts as { seconds: number }).seconds * 1000
					: 0;
	const intentId =
		typeof data.intentId === 'string' && data.intentId.trim() ? data.intentId.trim() : undefined;
	return { attributeId: attrId, loggedAtMs: ms, intentId };
}

/** Real-time drill_completions for cadence display + anti-cheat (30-day window). */
export function subscribePlayerCadenceCompletions(
	db: Firestore,
	playerUid: string,
	onRows: (rows: CadenceCompletionRow[]) => void,
): Unsubscribe {
	const windowStart = Timestamp.fromMillis(Date.now() - 30 * 86_400_000);
	const q = query(
		collection(db, 'drill_completions'),
		where('playerUid', '==', playerUid),
		where('loggedAt', '>=', windowStart),
	);
	return onSnapshot(
		q,
		(snap) => onRows(snap.docs.map((d) => mapCadenceCompletionDoc(d.data()))),
		() => {
			/* non-fatal */
		},
	);
}

export function utcDayFromMs(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

/** Count distinct UTC days with completions for an attribute in a rolling window. */
export function countCadenceSessionsInWindow(
	completions: CadenceCompletionRow[],
	attributeId: string,
	windowDays: number,
	now = Date.now(),
): number {
	const windowStart = now - windowDays * 86_400_000;
	const days = new Set<string>();
	for (const c of completions) {
		if (c.attributeId !== attributeId || c.loggedAtMs < windowStart) continue;
		days.add(utcDayFromMs(c.loggedAtMs));
	}
	return days.size;
}

/** True when a cadence-scoped completion already exists for today (UTC). */
export function hasCadenceCreditToday(
	completions: CadenceCompletionRow[],
	attributeId: string,
	intentId?: string,
	now = Date.now(),
): boolean {
	const today = utcDayFromMs(now);
	return completions.some((c) => {
		if (c.attributeId !== attributeId) return false;
		if (intentId && c.intentId && c.intentId !== intentId) return false;
		return utcDayFromMs(c.loggedAtMs) === today;
	});
}

export function questCadenceBlockedToday(
	quest: CadenceQuestGate,
	completions: CadenceCompletionRow[],
	now = Date.now(),
): boolean {
	if (!quest.cadence || !quest.targetAttributeId) return false;
	if (quest.lifecycle !== 'complete') return false;
	return hasCadenceCreditToday(completions, quest.targetAttributeId, quest.id, now);
}

export function questHudCtaBlockedCadence(): string {
	return 'Next session tomorrow';
}

export function armedCadenceBlockedToday(
	cadence: { sessionsPerWindow: number; windowDays: number } | undefined | null,
	targetAttributeId: string | undefined,
	intentId: string | null,
	completions: CadenceCompletionRow[],
	now = Date.now(),
): boolean {
	if (!cadence || !targetAttributeId?.trim() || !intentId) return false;
	return hasCadenceCreditToday(completions, targetAttributeId.trim(), intentId, now);
}
