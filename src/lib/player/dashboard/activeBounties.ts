/**
 * Quest log model — dailies + coach/parent bounties for Player OS dashboard.
 */

import type { VanguardAxisId } from './vanguardProtocol.js';

export type QuestTier = 'daily' | 'bounty';
export type QuestLifecycle = 'accept' | 'complete' | 'claim';
export type ActiveBountySource = 'coach_intent' | 'coach_homework' | 'parent_bounty' | 'daily_habit';

/** @deprecated Use QuestTask — kept as alias for imports */
export type ActiveBounty = QuestTask;

export type QuestTask = {
	id: string;
	tier: QuestTier;
	source: ActiveBountySource;
	senderLabel: string;
	title: string;
	axisId: VanguardAxisId;
	xpReward: number;
	rewardLabel?: string;
	lifecycle: QuestLifecycle;
	actionHref: string;
	/** Lower = surfaced earlier within the same tier. */
	sortKey: number;
};

export type QuestProgressStore = {
	acceptedIds: string[];
	completedIds: string[];
	claimedIds: string[];
	claimedDateUtc: string;
};

const QUEST_PROGRESS_KEY = 'player_quest_progress_v1';
const MAX_QUEST_LOG_VISIBLE = 3;

const AXIS_ALIASES: Record<string, VanguardAxisId> = {
	pac: 'PAC',
	pace: 'PAC',
	speed: 'PAC',
	acc: 'ACC',
	accel: 'ACC',
	acceleration: 'ACC',
	pow: 'POW',
	power: 'POW',
	strength: 'POW',
	striking: 'POW',
	comp: 'COMP',
	composure: 'COMP',
	mental: 'COMP',
	scanning: 'COMP',
	vision: 'COMP',
	stm: 'STM',
	stamina: 'STM',
	endurance: 'STM',
	grit: 'STM',
	agi: 'AGI',
	agility: 'AGI',
	ball_mastery: 'ACC',
};

const SOURCE_RANK: Record<ActiveBountySource, number> = {
	coach_intent: 0,
	coach_homework: 1,
	parent_bounty: 2,
	daily_habit: 3,
};

const LIFECYCLE_RANK: Record<QuestLifecycle, number> = {
	claim: 0,
	complete: 1,
	accept: 2,
};

export function questCtaLabel(lifecycle: QuestLifecycle): string {
	switch (lifecycle) {
		case 'accept':
			return 'Accept';
		case 'complete':
			return 'Complete';
		case 'claim':
			return 'Claim Reward';
	}
}

/** Compact HUD CTA for embedded mission deck (no brackets). */
export function questHudCtaShort(lifecycle: QuestLifecycle): string {
	switch (lifecycle) {
		case 'accept':
			return 'Accept →';
		case 'complete':
			return 'Complete →';
		case 'claim':
			return 'Claim →';
	}
}

/** Bracketed terminal command label for Player OS SIEM HUD. */
export function questTerminalCmd(lifecycle: QuestLifecycle): string {
	switch (lifecycle) {
		case 'accept':
			return '[ ACCEPT MISSION ]';
		case 'complete':
			return '[ COMPLETE MISSION ]';
		case 'claim':
			return '[ CLAIM REWARD ]';
	}
}

export function maxVisibleQuests(): number {
	return MAX_QUEST_LOG_VISIBLE;
}

export function loadQuestProgress(): QuestProgressStore {
	if (typeof sessionStorage === 'undefined') {
		return emptyProgress();
	}
	try {
		const raw = sessionStorage.getItem(QUEST_PROGRESS_KEY);
		if (!raw) return emptyProgress();
		const parsed = JSON.parse(raw) as Partial<QuestProgressStore>;
		const today = utcDateString();
		if (parsed.claimedDateUtc !== today) {
			return {
				acceptedIds: Array.isArray(parsed.acceptedIds) ? parsed.acceptedIds : [],
				completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
				claimedIds: [],
				claimedDateUtc: today,
			};
		}
		return {
			acceptedIds: Array.isArray(parsed.acceptedIds) ? parsed.acceptedIds : [],
			completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
			claimedIds: Array.isArray(parsed.claimedIds) ? parsed.claimedIds : [],
			claimedDateUtc: today,
		};
	} catch {
		return emptyProgress();
	}
}

export function saveQuestProgress(store: QuestProgressStore): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(QUEST_PROGRESS_KEY, JSON.stringify(store));
}

export function markQuestAccepted(id: string, store: QuestProgressStore): QuestProgressStore {
	const next = {
		...store,
		acceptedIds: store.acceptedIds.includes(id) ? store.acceptedIds : [...store.acceptedIds, id],
	};
	saveQuestProgress(next);
	return next;
}

export function markQuestCompleted(id: string, store: QuestProgressStore): QuestProgressStore {
	const next = {
		...store,
		acceptedIds: store.acceptedIds.includes(id) ? store.acceptedIds : [...store.acceptedIds, id],
		completedIds: store.completedIds.includes(id) ? store.completedIds : [...store.completedIds, id],
	};
	saveQuestProgress(next);
	return next;
}

export function markQuestClaimed(id: string, store: QuestProgressStore): QuestProgressStore {
	const next = {
		...store,
		claimedIds: store.claimedIds.includes(id) ? store.claimedIds : [...store.claimedIds, id],
		completedIds: store.completedIds.filter((x) => x !== id),
		acceptedIds: store.acceptedIds.filter((x) => x !== id),
	};
	saveQuestProgress(next);
	return next;
}

function emptyProgress(): QuestProgressStore {
	return {
		acceptedIds: [],
		completedIds: [],
		claimedIds: [],
		claimedDateUtc: utcDateString(),
	};
}

function utcDateString(): string {
	return new Date().toISOString().slice(0, 10);
}

export function mapAttributeToVanguardAxis(raw: string): VanguardAxisId {
	const key = String(raw || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '');
	if (AXIS_ALIASES[key]) return AXIS_ALIASES[key];
	const upper = key.toUpperCase();
	if (['PAC', 'ACC', 'POW', 'COMP', 'STM', 'AGI'].includes(upper)) {
		return upper as VanguardAxisId;
	}
	return 'PAC';
}

export function formatAttributeLabel(raw: string): string {
	const id = String(raw || '').trim();
	if (!id) return 'Training';
	return id
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve Accept → Complete → Claim from local progress + remote status hints.
 */
export function resolveQuestLifecycle(
	questId: string,
	progress: QuestProgressStore,
	opts: { remoteStatus?: string; readyToClaim?: boolean; trainedToday?: boolean } = {},
): QuestLifecycle {
	if (progress.claimedIds.includes(questId)) {
		return 'accept';
	}
	if (opts.readyToClaim || progress.completedIds.includes(questId)) {
		return 'claim';
	}
	if (opts.remoteStatus === 'verified') {
		return 'claim';
	}
	if (progress.acceptedIds.includes(questId) || opts.trainedToday) {
		return 'complete';
	}
	return 'accept';
}

/**
 * Sort for quest log: bounties before dailies; claim-ready first.
 */
export function sortQuestLog(items: readonly QuestTask[]): QuestTask[] {
	return [...items].sort((a, b) => {
		if (a.tier !== b.tier) return a.tier === 'bounty' ? -1 : 1;
		const lc = LIFECYCLE_RANK[a.lifecycle] - LIFECYCLE_RANK[b.lifecycle];
		if (lc !== 0) return lc;
		const sr = SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
		if (sr !== 0) return sr;
		return a.sortKey - b.sortKey;
	});
}

/** @deprecated Use sortQuestLog */
export function selectPrimaryBounty(items: readonly QuestTask[]): QuestTask | null {
	const sorted = sortQuestLog(items);
	return sorted[0] ?? null;
}

export function buildDailyQuests(
	profile: Record<string, unknown> | null,
	progress: QuestProgressStore,
): QuestTask[] {
	const streak = Math.max(0, Math.floor(Number(profile?.currentStreak) || 0));
	const trainedToday = progress.completedIds.includes('daily-training-log');

	const trainingLog: QuestTask = {
		id: 'daily-training-log',
		tier: 'daily',
		source: 'daily_habit',
		senderLabel: 'Daily Habit',
		title: 'Log today\'s training session',
		axisId: 'STM',
		xpReward: 35,
		lifecycle: resolveQuestLifecycle('daily-training-log', progress, { trainedToday }),
		actionHref: '/player/workout',
		sortKey: 0,
	};

	const streakCheck: QuestTask = {
		id: 'daily-streak-check',
		tier: 'daily',
		source: 'daily_habit',
		senderLabel: 'Daily Habit',
		title: streak > 0 ? `Protect your ${streak}-day streak` : 'Start a new streak today',
		axisId: 'PAC',
		xpReward: 20,
		lifecycle: resolveQuestLifecycle('daily-streak-check', progress, {
			trainedToday: progress.acceptedIds.includes('daily-streak-check'),
		}),
		actionHref: '/player/workout',
		sortKey: 1,
	};

	return [trainingLog, streakCheck].filter((q) => !progress.claimedIds.includes(q.id));
}

export function bountyFromCoachIntent(
	id: string,
	data: Record<string, unknown>,
	progress: QuestProgressStore,
	playerUid = '',
): QuestTask | null {
	const targetAttributeId =
		typeof data.targetAttributeId === 'string' ? data.targetAttributeId.trim() : '';
	if (!targetAttributeId) return null;
	const requiredXp = Math.max(0, Math.floor(Number(data.requiredXp) || 0));
	const priority = Number.isFinite(Number(data.priority)) ? Number(data.priority) : 100;
	const axisId = mapAttributeToVanguardAxis(targetAttributeId);
	const attrLabel = formatAttributeLabel(targetAttributeId);
	const fulfilledBy = Array.isArray(data.fulfilledByUids) ? data.fulfilledByUids : [];
	const playerFulfilled = Boolean(playerUid && fulfilledBy.includes(playerUid));
	return {
		id,
		tier: 'bounty',
		source: 'coach_intent',
		senderLabel: 'Coach Challenge',
		title: `${attrLabel} · ${requiredXp > 0 ? `${requiredXp.toLocaleString()} XP goal` : 'Complete your objective'}`,
		axisId,
		xpReward: Math.max(requiredXp, 150),
		lifecycle: resolveQuestLifecycle(id, progress, { readyToClaim: playerFulfilled }),
		actionHref: '/player/workout',
		sortKey: priority,
	};
}

export function bountyFromHomeworkAssignment(
	id: string,
	data: Record<string, unknown>,
	progress: QuestProgressStore,
): QuestTask | null {
	const drillTitle =
		typeof data.drillTitle === 'string' && data.drillTitle.trim() ?
			data.drillTitle.trim()
		: typeof data.title === 'string' && data.title.trim() ?
			data.title.trim()
		: 'Assigned drill';
	const dueMs = timestampToMillis(data.dueDate);
	const axisId = mapAttributeToVanguardAxis(
		typeof data.targetAttributeId === 'string' ? data.targetAttributeId : 'technical',
	);
	const xp = Math.max(80, Math.floor(Number(data.xpReward) || 120));
	return {
		id,
		tier: 'bounty',
		source: 'coach_homework',
		senderLabel: 'Coach Assignment',
		title: drillTitle,
		axisId,
		xpReward: xp,
		lifecycle: resolveQuestLifecycle(id, progress),
		actionHref: '/player/workout',
		sortKey: dueMs > 0 ? dueMs : Number.MAX_SAFE_INTEGER,
	};
}

export function bountyFromParentBounty(
	id: string,
	data: Record<string, unknown>,
	progress: QuestProgressStore,
): QuestTask | null {
	const title =
		typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Family bounty';
	const rewardCents = Math.max(0, Math.floor(Number(data.rewardCents) || 0));
	const expiresMs = timestampToMillis(data.expiresAt);
	const axisId = axisFromParentCriterion(data.criterion);
	const status = typeof data.status === 'string' ? data.status : 'active';
	const progressCurrent = Math.floor(Number(data.progressCurrent) || 0);
	const progressTarget = Math.floor(Number(data.progressTarget) || 1);
	const readyToClaim = status === 'verified' || progressCurrent >= progressTarget;
	return {
		id,
		tier: 'bounty',
		source: 'parent_bounty',
		senderLabel: 'Parent Bounty',
		title,
		axisId,
		xpReward: 0,
		rewardLabel: rewardCents > 0 ? `$${(rewardCents / 100).toFixed(0)} reward` : 'Reward pending',
		lifecycle: resolveQuestLifecycle(id, progress, {
			remoteStatus: status,
			readyToClaim,
		}),
		actionHref: '/player/workout',
		sortKey: expiresMs > 0 ? expiresMs : Number.MAX_SAFE_INTEGER,
	};
}

function axisFromParentCriterion(criterion: unknown): VanguardAxisId {
	if (!criterion || typeof criterion !== 'object') return 'COMP';
	const type = String((criterion as { type?: string }).type || '').toLowerCase();
	if (type.includes('streak')) return 'STM';
	if (type.includes('reps') || type.includes('volume')) return 'POW';
	if (type.includes('gpa') || type.includes('mastery')) return 'COMP';
	return 'AGI';
}

function timestampToMillis(ts: unknown): number {
	if (!ts || typeof ts !== 'object') return 0;
	const t = ts as { toDate?: () => Date; seconds?: number };
	if (typeof t.toDate === 'function') {
		const d = t.toDate();
		return Number.isNaN(d.getTime()) ? 0 : d.getTime();
	}
	if (typeof t.seconds === 'number') return t.seconds * 1000;
	return 0;
}
