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

export function coachIntentQuery(db: Firestore, teamId: string, tenantId = '') {
	const coll = collection(db, 'team_assignments');
	const tid = teamId.trim();
	const club = tenantId.trim();
	if (club) {
		return query(
			coll,
			where('teamId', '==', tid),
			where('tenantId', '==', club),
			where('status', '==', 'active'),
			orderBy('priority', 'asc'),
		);
	}
	return query(
		coll,
		where('teamId', '==', tid),
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
	tenantId: string,
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
		coachIntentQuery(db, teamId, tenantId),
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
	tenantId = '',
): Promise<QuerySnapshot> {
	return getDocsFromServer(coachIntentQuery(db, teamId, tenantId));
}

/** One-shot team_assignments read for post-claims-refresh mission rail sync. */
export async function fetchCoachIntentQuests(
	db: Firestore,
	teamId: string,
	playerUid: string,
	progress: QuestProgressStore,
	tenantId = '',
): Promise<CoachIntentSnapshot> {
	const snap = await fetchCoachIntentDocsFromServer(db, teamId, tenantId);
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
	opts: {
		/** Live listener scoped rows — when > 0, empty refetch must not strip coach rows. */
		listenerScopedCount?: number;
		/** Active intent ids from Firestore (may exceed mapped quests when mapping fails). */
		activeIds?: ReadonlySet<string>;
	} = {},
): QuestTask[] {
	const nonCoach = existing.filter((q) => q.source !== 'coach_intent');
	const listenerScopedCount = opts.listenerScopedCount ?? 0;
	const activeIds = opts.activeIds ?? new Set(coachIntents.map((q) => q.id));

	let coachRows: QuestTask[];
	if (coachIntents.length > 0) {
		coachRows = [...coachIntents];
	} else if (listenerScopedCount > 0 || activeIds.size > 0) {
		// Server/refetch race or mapping gap — keep listener coach rows until empty is confirmed.
		coachRows = existing.filter((q) => q.source === 'coach_intent' && activeIds.has(q.id));
	} else {
		coachRows = [];
	}

	const merged = [...coachRows, ...nonCoach];
	return sortQuestLog(
		merged.filter((q) => questVisibleInMissionRail(q, progress, activeIds)),
	);
}

export function applyCoachIntentRefetch(input: {
	snapshot: CoachIntentSnapshot;
	lastCoachIntentIds: readonly string[];
	internalQuests: readonly QuestTask[];
	questProgress: QuestProgressStore;
	intentDataById: Record<string, Record<string, unknown>>;
	/** Live listener scoped row count — authoritative until listener reports zero. */
	listenerScopedCount: number;
}): {
	lastCoachIntentIds: string[];
	intentDataById: Record<string, Record<string, unknown>>;
	internalQuests: QuestTask[];
	questProgress: QuestProgressStore;
	skippedEmptyRefetch: boolean;
} {
	const {
		snapshot,
		lastCoachIntentIds,
		internalQuests,
		questProgress,
		intentDataById,
		listenerScopedCount,
	} = input;

	const emptyServerSnapshot =
		snapshot.quests.length === 0 && snapshot.activeIds.size === 0;
	if (emptyServerSnapshot && listenerScopedCount > 0) {
		return {
			lastCoachIntentIds: [...lastCoachIntentIds],
			intentDataById,
			questProgress,
			internalQuests: [...internalQuests],
			skippedEmptyRefetch: true,
		};
	}

	const { removed, nextIds } = coachIntentRemovalDelta(lastCoachIntentIds, snapshot.activeIds);
	const orphanCoachIds = internalQuests
		.filter((q) => q.source === 'coach_intent' && !snapshot.activeIds.has(q.id))
		.map((q) => q.id);
	const purgeIds = [...new Set([...removed, ...orphanCoachIds])];
	const purgedProgress =
		purgeIds.length > 0 ? applyCoachIntentPurge(questProgress, purgeIds) : questProgress;

	const mergedIntentData =
		Object.keys(snapshot.intentDataById).length > 0 ? snapshot.intentDataById : intentDataById;

	return {
		lastCoachIntentIds: nextIds,
		intentDataById: mergedIntentData,
		questProgress: purgedProgress,
		internalQuests: mergeCoachIntentsIntoQuestLog(
			snapshot.quests,
			internalQuests,
			purgedProgress,
			{
				listenerScopedCount,
				activeIds: snapshot.activeIds,
			},
		),
		skippedEmptyRefetch: false,
	};
}

/** Post-claims / manual refresh — applies server snapshot without clobbering live listener rows. */
export async function runCoachIntentRefetch(input: {
	db: Firestore;
	teamId: string;
	playerUid: string;
	tenantId?: string;
	lastCoachIntentIds: readonly string[];
	internalQuests: readonly QuestTask[];
	questProgress: QuestProgressStore;
	intentDataById: Record<string, Record<string, unknown>>;
	listenerScopedCount: number;
	mappedIntentQuestCount: number;
}): Promise<{
	lastCoachIntentIds: string[];
	intentDataById: Record<string, Record<string, unknown>>;
	internalQuests: QuestTask[];
	questProgress: QuestProgressStore;
	mappedIntentQuestCount: number;
	serverRefetchIntentCount: number;
}> {
	const snapshot = await fetchCoachIntentQuests(
		input.db,
		input.teamId,
		input.playerUid,
		input.questProgress,
		input.tenantId ?? '',
	);
	const applied = applyCoachIntentRefetch({
		snapshot,
		lastCoachIntentIds: input.lastCoachIntentIds,
		internalQuests: input.internalQuests,
		questProgress: input.questProgress,
		intentDataById: input.intentDataById,
		listenerScopedCount: input.listenerScopedCount,
	});
	if (applied.skippedEmptyRefetch) {
		console.info(
			'[ActiveBounties] coach intent refetch empty — preserving listener coach rows',
			{ listenerScopedCount: input.listenerScopedCount, serverQuestCount: snapshot.quests.length },
		);
	}
	const coachMapped = applied.internalQuests.filter((q) => q.source === 'coach_intent').length;
	return {
		lastCoachIntentIds: applied.lastCoachIntentIds,
		intentDataById: applied.intentDataById,
		questProgress: applied.questProgress,
		internalQuests: applied.internalQuests,
		mappedIntentQuestCount: Math.max(input.mappedIntentQuestCount, coachMapped),
		serverRefetchIntentCount: snapshot.quests.length,
	};
}
