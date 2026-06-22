import {
	collection,
	onSnapshot,
	query,
	where,
	type Firestore,
} from 'firebase/firestore';
import {
	buildDailyQuests,
	bountyFromHomeworkAssignment,
	bountyFromParentBounty,
	questVisibleInMissionRail,
	sortQuestLog,
	type QuestProgressStore,
	type QuestTask,
} from '$lib/player/dashboard/activeBounties.js';
import {
	applyCoachIntentPurge,
	coachIntentRemovalDelta,
	mapCoachIntentRows,
	subscribeCoachIntentSnapshot,
} from '$lib/player/dashboard/missionRailCoachIntents.js';
import type { MissionSnapshotRetryGate } from '$lib/player/dashboard/missionRailAuth.js';

export type MissionQuestSubscriptionSink = {
	setInternalQuests: (quests: QuestTask[]) => void;
	setInternalLoading: (loading: boolean) => void;
	setHasQuestLogLoaded: (loaded: boolean) => void;
	setQuestProgress: (progress: QuestProgressStore) => void;
	setIntentDataById: (data: Record<string, Record<string, unknown>>) => void;
	setHomeworkDataById: (data: Record<string, Record<string, unknown>>) => void;
	setIntentSnapshotCount: (count: number) => void;
	setIntentScopedCount: (count: number) => void;
	setMappedIntentQuestCount: (count: number) => void;
	setCoachIntentListenerAttached: (attached: boolean) => void;
	setMissionSyncBlocked: (blocked: boolean) => void;
	setIsRefreshing: (refreshing: boolean) => void;
	getLastCoachIntentIds: () => readonly string[];
	setLastCoachIntentIds: (ids: string[]) => void;
	getQuestProgress: () => QuestProgressStore;
	loadQuestProgress: () => QuestProgressStore;
	missionRetryGate: MissionSnapshotRetryGate;
	refreshClaims: () => Promise<void>;
	bumpRefreshNonce: () => void;
};

export function attachMissionQuestSubscriptions(input: {
	db: Firestore;
	uid: string;
	email: string;
	tid: string;
	jwtTeam: string;
	tenantFilter: string;
	tokenClub: string;
	profileTeamId: string;
	profile: Record<string, unknown> | null;
	clubId: string;
	hasQuestLogLoaded: boolean;
	sink: MissionQuestSubscriptionSink;
}): () => void {
	const { db, uid, email, tid, jwtTeam, tenantFilter, profile, sink } = input;
	if (!input.hasQuestLogLoaded) sink.setInternalLoading(true);
	sink.setQuestProgress(sink.loadQuestProgress());

	let intents: QuestTask[] = [];
	let homework: QuestTask[] = [];
	let parentRows: QuestTask[] = [];
	let activeCoachIntentIds = new Set<string>();

	const merge = () => {
		const progress = sink.loadQuestProgress();
		const dailies = buildDailyQuests(profile, progress);
		const merged = [...intents, ...homework, ...parentRows, ...dailies].filter((q) =>
			questVisibleInMissionRail(q, progress, activeCoachIntentIds));
		sink.setInternalQuests(sortQuestLog(merged));
		sink.setInternalLoading(false);
		sink.setHasQuestLogLoaded(true);
	};

	const syncCoachIntentRemoval = (activeIds: Set<string>) => {
		activeCoachIntentIds = activeIds;
		const { removed, nextIds } = coachIntentRemovalDelta(sink.getLastCoachIntentIds(), activeIds);
		sink.setLastCoachIntentIds(nextIds);
		if (removed.length === 0) return;
		sink.setQuestProgress(applyCoachIntentPurge(sink.getQuestProgress(), removed));
	};

	const applyCoachIntents = (scopedRows: Array<{ id: string } & Record<string, unknown>>) => {
		const progress = sink.loadQuestProgress();
		const { quests, intentDataById: nextIntentData, activeIds } = mapCoachIntentRows(
			scopedRows,
			progress,
			uid,
		);
		sink.setMappedIntentQuestCount(quests.length);
		if (scopedRows.length > 0 && quests.length === 0) {
			console.warn(
				'[ActiveBounties] coach intent map failed — missing targetAttributeId?',
				scopedRows.map((r) => r.id),
			);
		}
		syncCoachIntentRemoval(activeIds);
		sink.setIntentDataById(nextIntentData);
		intents = quests;
		merge();
	};

	const unsubs: Array<() => void> = [];

	if (tid && jwtTeam && jwtTeam === tid) {
		sink.setCoachIntentListenerAttached(true);
		unsubs.push(
			subscribeCoachIntentSnapshot(db, tid, uid, tenantFilter, {
				onSuccess: () => {
					sink.setMissionSyncBlocked(false);
					sink.missionRetryGate.onSuccess();
					sink.setIsRefreshing(false);
				},
				onEmpty: () => {
					sink.setIntentSnapshotCount(0);
					sink.setIntentScopedCount(0);
					sink.setMappedIntentQuestCount(0);
					syncCoachIntentRemoval(new Set());
					sink.setIntentDataById({});
					intents = [];
					merge();
				},
				onRows: (scopedRows, rawCount, scopedCount) => {
					sink.setIntentSnapshotCount(rawCount);
					sink.setIntentScopedCount(scopedCount);
					applyCoachIntents(scopedRows);
				},
				onError: (err) => {
					console.error('[ActiveBounties] team_assignments snapshot error:', err, {
						teamId: tid,
						clubId: input.clubId,
					});
					sink.missionRetryGate.onError(
						() => {
							sink.setIsRefreshing(true);
							void sink.refreshClaims().finally(() => sink.bumpRefreshNonce());
						},
						() => {
							sink.setMissionSyncBlocked(true);
							sink.setIsRefreshing(false);
							sink.setCoachIntentListenerAttached(false);
							sink.setIntentSnapshotCount(0);
							sink.setIntentScopedCount(0);
							sink.setMappedIntentQuestCount(0);
							syncCoachIntentRemoval(new Set());
							intents = [];
							sink.setIntentDataById({});
							merge();
						},
					);
				},
			}),
		);
	} else {
		sink.setCoachIntentListenerAttached(false);
		sink.setIntentSnapshotCount(0);
		sink.setIntentScopedCount(0);
		sink.setMappedIntentQuestCount(0);
	}

	const hwQ = query(collection(db, 'assignments'), where('playerId', '==', uid), where('status', '==', 'pending'));
	unsubs.push(
		onSnapshot(
			hwQ,
			(snap) => {
				const progress = sink.loadQuestProgress();
				const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
				const rows = uniqueDocs.map((d) => ({ id: d.id, ...d.data() }));
				sink.setHomeworkDataById(
					Object.fromEntries(rows.map((row) => [row.id, row as Record<string, unknown>])),
				);
				homework = rows
					.map((row) => bountyFromHomeworkAssignment(row.id, row, progress))
					.filter((b): b is QuestTask => b != null);
				merge();
			},
			() => {
				homework = [];
				sink.setHomeworkDataById({});
				merge();
			},
		),
	);

	if (email) {
		const bountyQ = query(
			collection(db, 'bounties'),
			where('playerEmail', '==', email),
			where('status', 'in', ['active', 'verified']),
		);
		unsubs.push(
			onSnapshot(
				bountyQ,
				(snap) => {
					const progress = sink.loadQuestProgress();
					const uniqueDocs = [...new Map(snap.docs.map((d) => [d.id, d])).values()];
					parentRows = uniqueDocs
						.map((d) => bountyFromParentBounty(d.id, d.data(), progress))
						.filter((b): b is QuestTask => b != null);
					merge();
				},
				() => {
					parentRows = [];
					merge();
				},
			),
		);
	}

	return () => {
		for (const u of unsubs) u();
	};
}
