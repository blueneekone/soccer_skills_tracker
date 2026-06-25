import {
	formatAttributeLabel,
	loadQuestProgress,
	resolveCoachIntentLifecycle,
	type QuestProgressStore,
} from '$lib/player/dashboard/activeBounties.js';
import {
	readCachedPolicyHints,
	stashCoachIntentHandoffFromAssignmentRow,
	type MissionHandoff,
} from './coachMissionFlow.js';

export type TrainMissionStripItem = {
	id: string;
	title: string;
	source: 'coach_intent';
};

/** Active coach intents on roster (lifecycle complete) — no session Accept required. */
export function listTrainMissionStripItems(
	incomingMissions: Array<Record<string, unknown> & { id: string }>,
	progress: QuestProgressStore = loadQuestProgress(),
	playerUid = '',
): TrainMissionStripItem[] {
	const items: TrainMissionStripItem[] = [];
	for (const row of incomingMissions) {
		const fulfilledBy = Array.isArray(row.fulfilledByUids) ? row.fulfilledByUids : [];
		const playerFulfilled = Boolean(playerUid && fulfilledBy.includes(playerUid));
		const lifecycle = resolveCoachIntentLifecycle(row.id, progress, {
			readyToClaim: playerFulfilled,
		});
		if (lifecycle !== 'complete') continue;
		const attr =
			typeof row.targetAttributeId === 'string' ? row.targetAttributeId.trim() : '';
		const requiredXp = Math.max(0, Math.floor(Number(row.requiredXp) || 0));
		const title =
			attr ?
				`${formatAttributeLabel(attr)}${requiredXp > 0 ? ` · ${requiredXp.toLocaleString()} XP goal` : ''}`
			:	'Coach mission';
		items.push({ id: row.id, title, source: 'coach_intent' });
	}
	return items;
}

/** Train mission strip Continue — explicit arm + apply. */
export async function continueCoachIntentOnTrain(
	incomingMissions: Array<Record<string, unknown> & { id: string }>,
	missionId: string,
	apply: (handoff: MissionHandoff) => Promise<void>,
): Promise<void> {
	const row = incomingMissions.find((m) => m.id === missionId);
	if (!row) return;
	const handoff = stashCoachIntentHandoffFromAssignmentRow(row, readCachedPolicyHints());
	await apply(handoff);
}
