import {
	collection,
	getDocsFromServer,
	onSnapshot,
	orderBy,
	query,
	where,
	type Firestore,
	type QuerySnapshot,
} from 'firebase/firestore';
import {
	bountyFromCoachIntent,
	intentAssignmentVisibleToPlayer,
	purgeCoachIntentIds,
	questVisibleInMissionRail,
	sortQuestLog,
	type QuestProgressStore,
	type QuestTask,
} from '$lib/player/dashboard/activeBounties.js';
import {
	clearMissionHandoff,
	readMissionHandoff,
} from '$lib/player/workout/coachMissionFlow.js';

export type CoachIntentSnapshot = {
	quests: QuestTask[];
	intentDataById: Record<string, Record<string, unknown>>;
	activeIds: Set<string>;
};

export function mapCoachIntentRows(
	scopedRows: Array<{ id: string } & Record<string, unknown>>,
	progress: QuestProgressStore,
	playerUid: string,
): CoachIntentSnapshot {
	const activeIds = new Set(scopedRows.map((row) => row.id));
	const intentDataById = Object.fromEntries(
		scopedRows.map((row) => [row.id, row as Record<string, unknown>]),
	);
	const quests = scopedRows
		.map((row) => bountyFromCoachIntent(row.id, row, progress, playerUid))
		.filter((b): b is QuestTask => b != null);
	return { quests, intentDataById, activeIds };
}

export function coachIntentRemovalDelta(
	lastIds: readonly string[],
	activeIds: Set<string>,
): { removed: string[]; nextIds: string[] } {
	const removed = lastIds.filter((id) => !activeIds.has(id));
	return { removed, nextIds: [...activeIds] };
}

export function applyCoachIntentPurge(
	progress: QuestProgressStore,
	removed: readonly string[],
): QuestProgressStore {
	if (removed.length === 0) return progress;
	const next = purgeCoachIntentIds(progress, removed);
	const handoff = readMissionHandoff();
	if (handoff?.source === 'coach_intent' && removed.includes(handoff.missionId)) {
		clearMissionHandoff();
	}
	return next;
}

export function coachIntentQuery(db: Firestore, teamId: string) {
	return query(
		collection(db, 'team_assignments'),
		where('teamId', '==', teamId),
		where('status', '==', 'active'),
		orderBy('priority', 'asc'),
	);
}

type IntentDocRow = { id: string } & Record<string, unknown>;

/** Live team_assignments listener for player mission rail (scoped to operative visibility). */
export function subscribeCoachIntentSnapshot(
	db: Firestore,
	teamId: string,
	playerUid: string,
	handlers: {
		onRows: (scopedRows: IntentDocRow[], rawCount: number, scopedCount: number) => void;
		onEmpty: () => void;
		onError: (err: unknown) => void;
		onSuccess: () => void;
	},
): () => void {
	const mapIntentRows = (docs: { id: string; data: () => Record<string, unknown> }[]) =>
		docs
			.map((d) => ({ id: d.id, ...d.data() }))
			.filter((row) => intentAssignmentVisibleToPlayer(row, playerUid));
	return onSnapshot(
		coachIntentQuery(db, teamId),
		(snap) => {
			handlers.onSuccess();
			const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
			const rawCount = uniqueDocs.length;
			if (rawCount === 0) {
				handlers.onEmpty();
				return;
			}
			const scopedRows = mapIntentRows(uniqueDocs);
			handlers.onRows(scopedRows, rawCount, scopedRows.length);
		},
		handlers.onError,
	);
}

/** Prefer server read on refresh so cancelled intents drop off after coach Forge cancel. */
export async function fetchCoachIntentDocsFromServer(
	db: Firestore,
	teamId: string,
): Promise<QuerySnapshot> {
	return getDocsFromServer(coachIntentQuery(db, teamId));
}

/** One-shot team_assignments read for post-claims-refresh mission rail sync. */
export async function fetchCoachIntentQuests(
	db: Firestore,
	teamId: string,
	playerUid: string,
	progress: QuestProgressStore,
): Promise<CoachIntentSnapshot> {
	const snap = await fetchCoachIntentDocsFromServer(db, teamId);
	const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
	const scopedRows = uniqueDocs
		.map((d) => ({ id: d.id, ...d.data() }))
		.filter((row) => intentAssignmentVisibleToPlayer(row, playerUid));
	return mapCoachIntentRows(scopedRows, progress, playerUid);
}

export function mergeCoachIntentsIntoQuestLog(
	coachIntents: readonly QuestTask[],
	existing: readonly QuestTask[],
	progress: QuestProgressStore,
): QuestTask[] {
	// Empty snapshot must drop all prior coach_intent rows (cancel / expire).
	const nonCoach = existing.filter((q) => q.source !== 'coach_intent');
	const merged = coachIntents.length === 0 ? nonCoach : [...coachIntents, ...nonCoach];
	const activeCoachIntentIds = new Set(coachIntents.map((q) => q.id));
	return sortQuestLog(
		merged.filter((q) => questVisibleInMissionRail(q, progress, activeCoachIntentIds)),
	);
}

export function applyCoachIntentRefetch(input: {
	snapshot: CoachIntentSnapshot;
	lastCoachIntentIds: readonly string[];
	internalQuests: readonly QuestTask[];
	questProgress: QuestProgressStore;
}): {
	lastCoachIntentIds: string[];
	intentDataById: Record<string, Record<string, unknown>>;
	internalQuests: QuestTask[];
	questProgress: QuestProgressStore;
} {
	const { snapshot, lastCoachIntentIds, internalQuests, questProgress } = input;
	const { removed, nextIds } = coachIntentRemovalDelta(lastCoachIntentIds, snapshot.activeIds);
	const orphanCoachIds = internalQuests
		.filter((q) => q.source === 'coach_intent' && !snapshot.activeIds.has(q.id))
		.map((q) => q.id);
	const purgeIds = [...new Set([...removed, ...orphanCoachIds])];
	const purgedProgress =
		purgeIds.length > 0 ? applyCoachIntentPurge(questProgress, purgeIds) : questProgress;
	return {
		lastCoachIntentIds: nextIds,
		intentDataById: snapshot.intentDataById,
		questProgress: purgedProgress,
		internalQuests: mergeCoachIntentsIntoQuestLog(snapshot.quests, internalQuests, purgedProgress),
	};
}
