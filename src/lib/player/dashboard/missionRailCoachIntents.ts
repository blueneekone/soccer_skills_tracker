import {
	collection,
	getDocs,
	orderBy,
	query,
	where,
	type Firestore,
} from 'firebase/firestore';
import {
	bountyFromCoachIntent,
	intentAssignmentVisibleToPlayer,
	purgeCoachIntentIds,
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

/** One-shot team_assignments read for post-claims-refresh mission rail sync. */
export async function fetchCoachIntentQuests(
	db: Firestore,
	teamId: string,
	playerUid: string,
	progress: QuestProgressStore,
): Promise<CoachIntentSnapshot> {
	const intentQ = query(
		collection(db, 'team_assignments'),
		where('teamId', '==', teamId),
		where('status', '==', 'active'),
		orderBy('priority', 'asc'),
	);
	const snap = await getDocs(intentQ);
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
	const nonCoach = existing.filter((q) => q.source !== 'coach_intent');
	return sortQuestLog(
		[...coachIntents, ...nonCoach].filter((q) => !progress.claimedIds.includes(q.id)),
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
	return {
		lastCoachIntentIds: nextIds,
		intentDataById: snapshot.intentDataById,
		questProgress: removed.length > 0 ? applyCoachIntentPurge(questProgress, removed) : questProgress,
		internalQuests: mergeCoachIntentsIntoQuestLog(snapshot.quests, internalQuests, questProgress),
	};
}
