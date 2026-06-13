import { db } from '$lib/firebase.js';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

export type HouseholdScheduleEvent = {
	id: string;
	teamId: string;
	name: string;
	kind: string;
	startMs: number;
	endMs: number | null;
};

/**
 * Resolve team ids for household child emails via users + player_lookup.
 */
export async function resolveTeamIdsForChildEmails(childEmails: string[]): Promise<string[]> {
	const teamIds = new Set<string>();
	for (const em of childEmails) {
		const normalized = em.trim().toLowerCase();
		if (!normalized) continue;

		const userSnap = await getDoc(doc(db, 'users', normalized));
		const userTeam =
			userSnap.exists() && typeof userSnap.data()?.teamId === 'string'
				? userSnap.data()!.teamId!.trim()
				: '';
		if (userTeam) teamIds.add(userTeam);

		const lookupSnap = await getDoc(doc(db, 'player_lookup', normalized));
		const lookupTeam =
			lookupSnap.exists() && typeof lookupSnap.data()?.teamId === 'string'
				? lookupSnap.data()!.teamId!.trim()
				: '';
		if (lookupTeam) teamIds.add(lookupTeam);
	}
	return [...teamIds];
}

function parseScheduledEvent(
	docId: string,
	data: Record<string, unknown>,
	teamId: string,
): HouseholdScheduleEvent | null {
	if (data.recordType !== 'scheduled_event' && data.type !== 'scheduled') return null;

	const startMs = Number(data.startTimestamp) || 0;
	if (startMs <= 0) return null;

	const endMsRaw = Number(data.endTimestamp);
	const endMs = Number.isFinite(endMsRaw) && endMsRaw > startMs ? endMsRaw : null;

	return {
		id: docId,
		teamId,
		name: String(data.name || data.title || 'Team event').slice(0, 200),
		kind: String(data.eventKind || 'practice'),
		startMs,
		endMs,
	};
}

/**
 * Load upcoming scheduled team events for all teams linked to household children.
 */
export async function loadHouseholdScheduleEvents(
	childEmails: string[],
	opts: { horizonDays?: number; maxEvents?: number; perTeamLimit?: number } = {},
): Promise<HouseholdScheduleEvent[]> {
	const emails = childEmails.map((e) => e.trim().toLowerCase()).filter(Boolean);
	if (emails.length === 0) return [];

	const horizonDays = opts.horizonDays ?? 90;
	const maxEvents = opts.maxEvents ?? 48;
	const perTeamLimit = opts.perTeamLimit ?? 32;
	const cutoffMs = Date.now() - 86_400_000;
	const horizonEndMs = Date.now() + horizonDays * 86_400_000;

	const teamIds = await resolveTeamIdsForChildEmails(emails);
	if (teamIds.length === 0) return [];

	/** @type {HouseholdScheduleEvent[]} */
	const found: HouseholdScheduleEvent[] = [];

	for (const teamId of teamIds) {
		const q = query(
			collection(db, 'team_workouts'),
			where('teamId', '==', teamId),
			limit(perTeamLimit),
		);
		const snap = await getDocs(q);
		for (const d of snap.docs) {
			const parsed = parseScheduledEvent(d.id, d.data() as Record<string, unknown>, teamId);
			if (!parsed) continue;
			if (parsed.startMs < cutoffMs || parsed.startMs > horizonEndMs) continue;
			found.push(parsed);
		}
	}

	found.sort((a, b) => a.startMs - b.startMs);
	return found.slice(0, maxEvents);
}

/** Events starting within the next 7 calendar days (local time). */
export function filterEventsThisWeek(
	events: HouseholdScheduleEvent[],
	nowMs: number = Date.now(),
): HouseholdScheduleEvent[] {
	const start = new Date(nowMs);
	start.setHours(0, 0, 0, 0);
	const weekEnd = start.getTime() + 7 * 86_400_000;
	return events.filter((ev) => ev.startMs >= start.getTime() && ev.startMs < weekEnd);
}
