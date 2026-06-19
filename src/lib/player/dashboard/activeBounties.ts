/**
 * Quest log model — dailies + coach/parent bounties for Player OS dashboard.
 */

import { isTrainingToday } from './playerHudMetrics.js';
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
	/**
	 * Per-assignment cadence config when coach set one.
	 * Distinct from the global streak — do NOT reuse streak chrome/labels.
	 */
	cadence?: { sessionsPerWindow: number; windowDays: number };
	/** targetAttributeId from the intent — used to count completions per window. */
	targetAttributeId?: string;
	/** XP earned toward this coach intent (server intentXpByUid). */
	intentXpEarned?: number;
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

/** True when Complete should navigate to Train without marking quest completed yet. */
export function shouldDeferQuestCompletionUntilWorkoutLog(quest: QuestTask): boolean {
	return (
		quest.lifecycle === 'complete' &&
		quest.actionHref.includes('/player/workout') &&
		(quest.source === 'coach_intent' ||
			quest.source === 'coach_homework' ||
			quest.source === 'daily_habit')
	);
}

/** Lifecycle + route-aware CTA (Train-bound missions use Start session). */
export function questHudCtaFor(
	quest: QuestTask,
	opts: { sessionLoggedToday?: boolean } = {},
): string {
	if (
		opts.sessionLoggedToday &&
		quest.source === 'coach_intent' &&
		quest.lifecycle === 'complete'
	) {
		return 'Logged today';
	}
	if (
		quest.lifecycle === 'complete' &&
		quest.actionHref.includes('/player/workout') &&
		(quest.source === 'coach_intent' ||
			quest.source === 'coach_homework' ||
			quest.source === 'daily_habit')
	) {
		return 'Start session →';
	}
	return questHudCtaShort(quest.lifecycle);
}

/** Coach intent already logged today — grey out until next UTC day. */
export function coachIntentSessionLoggedToday(
	quest: QuestTask,
	completions: ReadonlyArray<{ attributeId: string; loggedAtMs: number; intentId?: string }>,
	now = Date.now(),
): boolean {
	if (quest.source !== 'coach_intent' || quest.lifecycle !== 'complete') return false;
	const today = utcDateFromMs(now);
	return completions.some((c) => {
		if (utcDateFromMs(c.loggedAtMs) !== today) return false;
		if (c.intentId && c.intentId === quest.id) return true;
		return !c.intentId && quest.targetAttributeId === c.attributeId;
	});
}

export function coachIntentCtaDisabled(quest: QuestTask, sessionLoggedToday: boolean): boolean {
	return sessionLoggedToday && quest.source === 'coach_intent' && quest.lifecycle === 'complete';
}

export function coachIntentRailCta(
	quest: QuestTask,
	completions: ReadonlyArray<{ attributeId: string; loggedAtMs: number; intentId?: string }>,
): { label: string; disabled: boolean; loggedToday: boolean } {
	const loggedToday = coachIntentSessionLoggedToday(quest, completions);
	return {
		loggedToday,
		disabled: coachIntentCtaDisabled(quest, loggedToday),
		label: questHudCtaFor(quest, { sessionLoggedToday: loggedToday }),
	};
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

/** Lifecycle-aware reward copy — accept state must not imply XP already earned. */
export function formatQuestRewardLabel(quest: QuestTask): string {
	if (quest.xpReward <= 0) {
		if (!quest.rewardLabel) return '';
		if (quest.lifecycle === 'accept') {
			return `Earn ${quest.rewardLabel} on completion`;
		}
		return quest.rewardLabel;
	}

	const xp = quest.xpReward.toLocaleString();
	switch (quest.lifecycle) {
		case 'accept':
			return `Earn +${xp} XP on completion`;
		case 'complete':
			if (quest.source === 'daily_habit' && quest.actionHref.includes('/player/workout')) {
				return `+${xp} XP ready — log session to finish`;
			}
			return `+${xp} XP`;
		case 'claim':
			return `+${xp} XP`;
	}
}

/** @deprecated Slice 6b-revise — embedded UI uses rail-only feed; retained for tests. */
export function splitEmbeddedMissionDeck(deck: readonly QuestTask[]) {
	return { primary: deck[0] ?? null, secondary: deck.slice(1) };
}

/** Coach/parent bounty or tier bounty — gold rail accent on HQ overview. */
export function isPromotedQuest(quest: QuestTask): boolean {
	if (quest.tier === 'bounty') return true;
	return (
		quest.source === 'coach_intent' ||
		quest.source === 'coach_homework' ||
		quest.source === 'parent_bounty'
	);
}

/** @deprecated Slice 6b — embedded primary hero is always gold; retained for non-embedded/tests. */
export function pickHeroCardAccent(
	quest: QuestTask,
	deck: readonly QuestTask[],
): 'gold' | 'teal' {
	const firstAccept = deck.find((q) => q.lifecycle === 'accept');
	return firstAccept?.id === quest.id ? 'gold' : 'teal';
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

/**
 * After a successful workout log — mark coach homework / daily habit ready to claim.
 * Coach intents use backend fulfilledByUids; do not call for those.
 */
export function markQuestCompletedAfterWorkoutLog(
	id: string,
	source: ActiveBountySource,
	store: QuestProgressStore,
): QuestProgressStore {
	// Coach intents stay active until server fulfilledByUids; keep Start session CTA.
	if (source === 'coach_intent') return markQuestAccepted(id, store);
	return markQuestCompleted(id, store);
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

/** Drop local accept/complete state for coach intents removed from Firestore. */
export function purgeCoachIntentIds(
	store: QuestProgressStore,
	removedIntentIds: readonly string[],
): QuestProgressStore {
	if (removedIntentIds.length === 0) return store;
	const remove = new Set(removedIntentIds);
	const next = {
		...store,
		acceptedIds: store.acceptedIds.filter((id) => !remove.has(id)),
		completedIds: store.completedIds.filter((id) => !remove.has(id)),
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

export function utcDateFromMs(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
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

const DAILY_TRAINING_LOG_ID = 'daily-training-log';
const DAILY_STREAK_CHECK_ID = 'daily-streak-check';

/** Hero-only training quest when daily list filtered out claimed dailies but stats say not trained today. */
function synthesizeTrainingHeroQuest(): QuestTask {
	return {
		id: DAILY_TRAINING_LOG_ID,
		tier: 'daily',
		source: 'daily_habit',
		senderLabel: 'Daily Habit',
		title: "Log today's training session",
		axisId: 'STM',
		xpReward: 35,
		lifecycle: 'accept',
		actionHref: '/player/workout',
		sortKey: 0,
	};
}

/**
 * Resolve the embedded hero mission — training log when not trained today;
 * streak protect when trained today + streak active; else primary bounty sort.
 */
export function resolveHeroQuest(
	items: readonly QuestTask[],
	opts: { lastTrainingUtc?: string | null; now?: Date } = {},
): QuestTask | null {
	const { lastTrainingUtc, now } = opts;
	const trainedToday = isTrainingToday(lastTrainingUtc, now);

	if (!trainedToday) {
		const trainingLog = items.find((q) => q.id === DAILY_TRAINING_LOG_ID);
		if (trainingLog) return trainingLog;
		return synthesizeTrainingHeroQuest();
	}

	if (items.length === 0) return null;

	if (trainedToday) {
		const streakQuest = items.find((q) => q.id === DAILY_STREAK_CHECK_ID);
		if (
			streakQuest &&
			(streakQuest.lifecycle === 'accept' || streakQuest.lifecycle === 'complete')
		) {
			return streakQuest;
		}
	}

	return selectPrimaryBounty(items);
}

/** Exclude hero mission from embedded rail feed (dedupe daily-training-log hero row). */
export function excludeHeroFromRailQuests(
	quests: readonly QuestTask[],
	hero: QuestTask | null,
): QuestTask[] {
	if (!hero) return [...quests];
	return quests.filter((q) => q.id !== hero.id);
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

/**
 * Count drill completion records for a given attribute within a rolling window.
 * Operates on a pre-fetched array — no Firestore calls.
 * Caveat: a session matching the attribute may count toward multiple active intents
 * for the same attribute (expected and acceptable for display purposes).
 */
export function countCadenceSessionsInWindow(
	completions: Array<{ attributeId: string; loggedAtMs: number }>,
	attributeId: string,
	windowDays: number,
	now = Date.now(),
): number {
	const windowStart = now - windowDays * 86_400_000;
	const days = new Set<string>();
	for (const c of completions) {
		if (c.attributeId !== attributeId || c.loggedAtMs < windowStart) continue;
		days.add(utcDateFromMs(c.loggedAtMs));
	}
	return days.size;
}

/**
 * Compact cadence progress label for the mission card.
 * Semantically distinct from global streak — no streak chrome or day-count language.
 */
export function formatCadenceProgress(
	completed: number,
	sessionsPerWindow: number,
	windowDays: number,
): string {
	const windowLabel = windowDays === 7 ? 'this week' : `in ${windowDays} days`;
	return `${completed}/${sessionsPerWindow} sessions ${windowLabel}`;
}

/** Minimal chip for mission rail / homework — full context in title/aria. */
export function formatCadenceProgressCompact(completed: number, sessionsPerWindow: number): string {
	return `${completed}/${sessionsPerWindow}`;
}

export function formatCadenceAriaLabel(
	completed: number,
	sessionsPerWindow: number,
	windowDays: number,
	opts: { loggedToday?: boolean } = {},
): string {
	const base = formatCadenceProgress(completed, sessionsPerWindow, windowDays);
	if (opts.loggedToday && completed < sessionsPerWindow) {
		return `${base}. Session logged today — resume tomorrow.`;
	}
	return base;
}

/** Hint after today's session when cadence goal not yet met. */
export function formatCadenceResumeHint(
	loggedToday: boolean,
	completed: number,
	sessionsPerWindow: number,
): string | null {
	if (!loggedToday || completed >= sessionsPerWindow) return null;
	return 'Session logged — resume tomorrow';
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
	const intentXpMap =
		data.intentXpByUid != null &&
		typeof data.intentXpByUid === 'object' &&
		!Array.isArray(data.intentXpByUid)
			? (data.intentXpByUid as Record<string, number>)
			: null;
	const intentXpEarned =
		playerUid && intentXpMap != null ? Math.max(0, Math.floor(Number(intentXpMap[playerUid]) || 0)) : undefined;
	const rx = data.prescription;
	const cadence =
		rx != null &&
		typeof rx === 'object' &&
		!Array.isArray(rx) &&
		(rx as Record<string, unknown>).cadence != null &&
		typeof (rx as Record<string, unknown>).cadence === 'object' &&
		!Array.isArray((rx as Record<string, unknown>).cadence)
			? (() => {
					const c = (rx as Record<string, unknown>).cadence as Record<string, unknown>;
					const spw =
						typeof c.sessionsPerWindow === 'number' ? Math.floor(c.sessionsPerWindow) : 0;
					const wd =
						typeof c.windowDays === 'number' ? Math.floor(c.windowDays) : 0;
					return spw >= 1 && spw <= 21 && wd >= 1 && wd <= 30
						? { sessionsPerWindow: spw, windowDays: wd }
						: undefined;
				})()
			: undefined;
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
		targetAttributeId,
		...(intentXpEarned != null ? { intentXpEarned } : {}),
		...(cadence ? { cadence } : {}),
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
	// Claim CTA must track the *server* money state: the Tremendous payout is issued
	// server-side (bountyVerification → issueBountyReward) and the bounty doc flips to
	// 'verified'. Showing "claim" merely on local progress would let a player dismiss a
	// reward that has not actually been paid. Gate strictly on verified status.
	const readyToClaim = status === 'verified';
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

/** Team-wide or UID-targeted coach intents visible on the player mission rail. */
export function intentAssignmentVisibleToPlayer(
	row: { scope?: string; targetUids?: string[] },
	playerUid: string,
): boolean {
	if (!row.scope || row.scope === 'team') return true;
	return Array.isArray(row.targetUids) && row.targetUids.includes(playerUid);
}
