import { db, functions } from '$lib/firebase.js';
import { addDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

/**
 * UI / API keys → stored in `reminderOffsets` as numbers (minutes) or the sentinel `'morning'`.
 * Checkbox keys from forms: h1, m30, morning.
 */
export const REMINDER_OPTIONS = /** @type {const} */ [
	{ key: 'h1', label: '1 Hour Before', value: /** @type {const} */ (60) },
	{ key: 'm30', label: '30 Minutes Before', value: /** @type {const} */ (30) },
	{ key: 'morning', label: 'Morning Of', value: /** @type {const} */ ('morning') },
];

/**
 * Builds `reminderOffsets` per spec: e.g. `[60, 30]`, or `[60, 30, 'morning']`.
 * @param {string[]} keys - `h1` | `m30` | `morning` from checkbox groups
 * @returns {{ reminderOffsets: Array<number | 'morning'> }}
 */
export function computeReminderFields(keys) {
	const s = new Set(keys);
	const nums = /** @type {number[]} */ ([]);
	if (s.has('h1')) {
		nums.push(60);
	}
	if (s.has('m30')) {
		nums.push(30);
	}
	nums.sort((a, b) => a - b);
	/** @type {Array<number | 'morning'>} */
	const reminderOffsets = [...nums];
	if (s.has('morning')) {
		reminderOffsets.push('morning');
	}
	return { reminderOffsets };
}

/**
 * Persists a coach-scheduled team event to `team_workouts` (same collection as custom drills, discriminated by `recordType`).
 *
 * @param {object} o
 * @param {string} o.teamId
 * @param {'game' | 'practice' | 'Game' | 'Practice'} o.eventKind
 * @param {string} [o.title] Display name
 * @param {Date} o.startAt
 * @param {Date} [o.endAt]
 * @param {string[]} o.reminderKeys UI keys: h1, m30, morning → `reminderOffsets` [60, 30, 'morning']
 * @param {'coach_form' | 'field_booking'} [o.source]
 * @param {string} [o.fieldId]
 * @param {string} [o.scheduleDate] YYYY-MM-DD when linked to a field day
 * @param {boolean} [o.announceToTeam] When true, fires a team_broadcasts entry via safeSportBroadcast after save. Default false. Broadcast failure is non-fatal.
 * @returns {Promise<void>}
 */
export async function saveTeamScheduledEvent({
	teamId,
	eventKind,
	title = '',
	startAt,
	endAt = null,
	reminderKeys = [],
	source = 'coach_form',
	fieldId = null,
	scheduleDate = null,
	announceToTeam = false,
}) {
	if (!teamId) {
		throw new Error('teamId is required');
	}
	const start = startAt instanceof Date ? startAt : new Date(startAt);
	if (Number.isNaN(start.getTime())) {
		throw new Error('Invalid start time');
	}
	const kindRaw = typeof eventKind === 'string' ? eventKind.toLowerCase() : 'practice';
	const kind = kindRaw === 'game' ? 'game' : 'practice';
	const { reminderOffsets } = computeReminderFields(reminderKeys);
	const name =
		typeof title === 'string' && title.trim() ?
			title.trim().slice(0, 200) :
			kind === 'game' ?
				'Game' :
				'Practice';

	const startTimestamp = start.getTime();

	/** @type {Record<string, unknown>} */
	const payload = {
		teamId,
		recordType: 'scheduled_event',
		eventKind: kind,
		name,
		type: 'scheduled',
		startTime: Timestamp.fromDate(start),
		/** Unix epoch milliseconds — canonical for server reminder dispatch */
		startTimestamp,
		reminderOffsets,
		source,
		createdAt: serverTimestamp(),
	};

	if (endAt != null) {
		const en = endAt instanceof Date ? endAt : new Date(endAt);
		if (!Number.isNaN(en.getTime())) {
			payload.endTime = Timestamp.fromDate(en);
			payload.endTimestamp = en.getTime();
		}
	}
	if (fieldId) {
		payload.fieldId = String(fieldId).slice(0, 128);
	}
	if (scheduleDate) {
		payload.scheduleDate = String(scheduleDate).slice(0, 12);
	}

	await addDoc(collection(db, 'team_workouts'), payload);

	if (announceToTeam) {
		try {
			const broadcastFn = httpsCallable(functions, 'safeSportBroadcast');
			const kindLabel = kind === 'game' ? 'Game' : 'Practice';
			const subject = `New ${kindLabel}: ${name}`;
			const body = `${name} has been added to the team schedule.`;
			await broadcastFn({ teamId, subject, body });
		} catch (broadcastErr) {
			console.error('[workouts] announce broadcast failed (non-fatal):', broadcastErr);
		}
	}
}

function createWorkoutsStore() {
	let workouts = $state([]);

	return {
		get workouts() {
			return workouts;
		},
		get byType() {
			return (type) => workouts.filter((w) => w.type === type);
		},

		/** Drills and templates only — excludes `recordType: 'scheduled_event'` rows. */
		get drillTemplates() {
			return workouts.filter(
				(w) => w.recordType !== 'scheduled_event' && w.type !== 'scheduled',
			);
		},

		/** Upcoming/scheduled event rows (Game / Practice) with reminder metadata. */
		get scheduledEvents() {
			return workouts
				.filter(
					(w) =>
						w.recordType === 'scheduled_event' || w.type === 'scheduled',
				)
				.slice()
				.sort((a, b) => {
					const ta =
						Number(a.startTimestamp) ||
						(typeof a.startTimeUnix === 'number' ? a.startTimeUnix * 1000 : 0);
					const tb =
						Number(b.startTimestamp) ||
						(typeof b.startTimeUnix === 'number' ? b.startTimeUnix * 1000 : 0);
					return ta - tb;
				});
		},

		async loadForTeam(teamId) {
			if (!teamId) {
				workouts = [];
				return;
			}
			try {
				const q = query(collection(db, 'team_workouts'), where('teamId', '==', teamId));
				const snap = await getDocs(q);
				workouts = [];
				snap.forEach((d) => workouts.push({ id: d.id, ...d.data() }));
			} catch (err) {
				console.error('[workouts store] load error:', err);
				workouts = [];
			}
		},
	};
}

export const workoutsStore = createWorkoutsStore();
