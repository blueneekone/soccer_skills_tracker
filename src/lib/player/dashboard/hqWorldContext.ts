/**
 * HQ world context — pure helpers for presence strip (Sprint 2.10).
 * COPPA-safe: schedule labels use event metadata only — no PII.
 */

import { isTrainingToday } from './playerHudMetrics.js';

export type HqStatusBadge = {
	id: string;
	label: string;
};

/** Defensive schedule doc shape — legacy `schedules` + newer `startAt` fields. */
export type HqScheduleEventLike = {
	id?: string;
	type?: string;
	eventKind?: string;
	title?: string;
	name?: string;
	opponent?: string;
	location?: string;
	date?: string;
	time?: string;
	startAt?: unknown;
	startTimestamp?: number;
	startTime?: { toDate?: () => Date; seconds?: number };
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function timestampToMs(ts: unknown): number | null {
	if (ts == null) return null;
	if (typeof ts === 'number' && Number.isFinite(ts)) {
		return ts > 1e12 ? ts : ts * 1000;
	}
	if (typeof ts === 'string') {
		const parsed = Date.parse(ts);
		return Number.isNaN(parsed) ? null : parsed;
	}
	if (typeof ts === 'object') {
		const t = ts as { toDate?: () => Date; seconds?: number; _seconds?: number };
		if (typeof t.toDate === 'function') {
			try {
				const d = t.toDate();
				return Number.isNaN(d.getTime()) ? null : d.getTime();
			} catch {
				return null;
			}
		}
		if (typeof t.seconds === 'number') return t.seconds * 1000;
		if (typeof t._seconds === 'number') return t._seconds * 1000;
	}
	return null;
}

/** Parse event start time from legacy date/time or modern timestamp fields. */
export function parseScheduleEventStartMs(
	event: HqScheduleEventLike | null | undefined,
): number | null {
	if (!event || typeof event !== 'object') return null;

	const fromStartAt = timestampToMs(event.startAt);
	if (fromStartAt != null) return fromStartAt;

	if (typeof event.startTimestamp === 'number' && event.startTimestamp > 0) {
		return event.startTimestamp;
	}

	const fromStartTime = timestampToMs(event.startTime);
	if (fromStartTime != null) return fromStartTime;

	const dateStr = typeof event.date === 'string' ? event.date.trim() : '';
	if (!dateStr) return null;

	const timeStr = typeof event.time === 'string' ? event.time.trim() : '00:00';
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
	if (!dateMatch) return null;

	const year = Number(dateMatch[1]);
	const month = Number(dateMatch[2]) - 1;
	const day = Number(dateMatch[3]);
	const timeMatch = /^(\d{1,2}):(\d{2})/.exec(timeStr);
	const hour = timeMatch ? Number(timeMatch[1]) : 0;
	const minute = timeMatch ? Number(timeMatch[2]) : 0;
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

	const local = new Date(year, month, day, hour, minute, 0, 0);
	return Number.isNaN(local.getTime()) ? null : local.getTime();
}

export function mapScheduleDoc(id: string, data: Record<string, unknown>): HqScheduleEventLike {
	return { id, ...data };
}

/** Pick the earliest upcoming event from a team schedule list. */
export function pickNextScheduleEvent(
	events: readonly HqScheduleEventLike[],
	now: Date = new Date(),
): HqScheduleEventLike | null {
	const nowMs = now.getTime();
	let best: HqScheduleEventLike | null = null;
	let bestMs = Number.POSITIVE_INFINITY;

	for (const event of events) {
		const startMs = parseScheduleEventStartMs(event);
		if (startMs == null || startMs < nowMs) continue;
		if (startMs < bestMs) {
			bestMs = startMs;
			best = event;
		}
	}

	return best;
}

function formatEventDayTime(startMs: number): string {
	const d = new Date(startMs);
	const day = WEEKDAY_SHORT[d.getDay()] ?? '—';
	const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	return `${day} ${time}`;
}

function normalizeEventKind(event: HqScheduleEventLike): string {
	const raw =
		(typeof event.eventKind === 'string' && event.eventKind.trim()) ||
		(typeof event.type === 'string' && event.type.trim()) ||
		'';
	return raw.toLowerCase();
}

function opponentOrTitle(event: HqScheduleEventLike): string {
	const opponent = typeof event.opponent === 'string' ? event.opponent.trim() : '';
	if (opponent) return opponent;
	const title = typeof event.title === 'string' ? event.title.trim() : '';
	if (title) return title;
	const name = typeof event.name === 'string' ? event.name.trim() : '';
	if (name) return name;
	const location = typeof event.location === 'string' ? event.location.trim() : '';
	if (location) return location;
	return 'TBD';
}

/** Human label for the next team event — e.g. "Practice · Tue 6:30 PM" or "Match vs …". */
export function resolveNextEventLabel(
	event: HqScheduleEventLike | null | undefined,
	now: Date = new Date(),
): string | null {
	if (!event) return null;

	const startMs = parseScheduleEventStartMs(event);
	if (startMs == null || startMs < now.getTime()) return null;

	const when = formatEventDayTime(startMs);
	const kind = normalizeEventKind(event);

	if (kind === 'game' || kind === 'match') {
		return `Match vs ${opponentOrTitle(event)} · ${when}`;
	}

	const typeLabel =
		kind === 'practice' ? 'Practice'
		: kind === 'tournament' ? 'Tournament'
		: kind === 'meeting' ? 'Meeting'
		: typeof event.type === 'string' && event.type.trim() ? event.type.trim()
		: 'Session';

	return `${typeLabel} · ${when}`;
}

export function resolveHqStatusBadges(params: {
	profileIncomplete: boolean;
	streak: number;
	lastTrainingUtc: string | null | undefined;
	coachBountyCount: number;
	/** When hero mission is daily training, omit redundant TRAIN TODAY chip. */
	heroQuestId?: string | null;
	suppressTrainTodayBadge?: boolean;
	/** When profile setup banner is visible in the hub, omit PROFILE INCOMPLETE chip. */
	suppressProfileIncompleteBadge?: boolean;
	now?: Date;
}): HqStatusBadge[] {
	const {
		profileIncomplete,
		streak,
		lastTrainingUtc,
		coachBountyCount,
		heroQuestId,
		suppressTrainTodayBadge = false,
		suppressProfileIncompleteBadge = false,
		now = new Date(),
	} = params;
	const badges: HqStatusBadge[] = [];
	const trainedToday = isTrainingToday(lastTrainingUtc, now);

	if (coachBountyCount > 0) {
		badges.push({
			id: 'coach-missions',
			label: `${coachBountyCount} COACH MISSION${coachBountyCount === 1 ? '' : 'S'}`,
		});
	}

	if (profileIncomplete && !suppressProfileIncompleteBadge) {
		badges.push({ id: 'profile-incomplete', label: 'PROFILE INCOMPLETE' });
	}

	if (streak > 0 && trainedToday) {
		badges.push({ id: 'streak-live', label: 'STREAK LIVE' });
	}

	const suppressTrainToday =
		suppressTrainTodayBadge || heroQuestId === 'daily-training-log';

	if (!trainedToday && !suppressTrainToday) {
		badges.push({ id: 'train-today', label: 'TRAIN TODAY' });
	}

	return badges;
}
