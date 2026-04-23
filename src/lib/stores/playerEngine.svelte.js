/**
 * Project Phoenix — player telemetry (Firestore `player_stats/{uid}`) + Player OS
 * workout mirror (`users/{emailKey}/workouts`).
 * COPPA: reads are UID-scoped; no PII beyond what the auth session already has.
 */
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { getCardTierFromLevel, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';

function createPlayerEngine() {
	let totalXp = $state(0);
	let streakDays = $state(0);
	/** After first `player_stats` snapshot (may be empty doc). */
	let hydrated = $state(false);

	/** @type {null | (() => void)} */
	let unsubscribe = null;
	/** @type {string | null} */
	let boundUid = null;

	function detach() {
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
		}
		boundUid = null;
		hydrated = false;
		totalXp = 0;
		streakDays = 0;
	}

	return {
		get totalXp() {
			return totalXp;
		},
		get streakDays() {
			return streakDays;
		},
		get hydrated() {
			return hydrated;
		},
		get displayLevel() {
			return getLevelProgressFromTotalXp(totalXp).level;
		},
		get cardTier() {
			return getCardTierFromLevel(getLevelProgressFromTotalXp(totalXp).level);
		},
		/**
		 * Live aggregate from `player_stats` (server-maintained by `logTrainingSession`).
		 * @param {string} uid Auth UID (same as `player_stats` document id for players).
		 */
		attach(uid) {
			if (!uid) return;
			if (boundUid === uid && unsubscribe) return;
			detach();
			boundUid = uid;
			const ref = doc(db, 'player_stats', uid);
			unsubscribe = onSnapshot(
				ref,
				(snap) => {
					hydrated = true;
					if (!snap.exists()) {
						totalXp = 0;
						streakDays = 0;
						// Caller may still fall back to `users` profile (pre-first-log or legacy)
						return;
					}
					const d = snap.data();
					const tx = d.total_xp;
					totalXp =
						typeof tx === 'number' && !Number.isNaN(tx) ? Math.max(0, Math.floor(tx)) : 0;
					const st = d.streak_days;
					streakDays =
						typeof st === 'number' && !Number.isNaN(st) ? Math.max(0, Math.floor(st)) : 0;
				},
				(e) => {
					console.error('[playerEngine] player_stats listener', e);
				},
			);
		},
		detach,
	};
}

export const playerEngine = createPlayerEngine();

/**
 * Player OS: mirror execution row under `users/{emailKey}/workouts` (defense in depth; XP is canonical via CF).
 * @param {object} p
 * @param {string} p.emailKey Lowercased `users` doc id (email key)
 * @param {string} p.userUid
 * @param {string} p.teamId
 * @param {string} p.focus
 * @param {string} p.drill
 * @param {number} p.duration
 * @param {number} p.intensityRpe
 * @param {number} p.earnedXp
 */
export async function writePlayerOsWorkout(p) {
	await addDoc(collection(db, 'users', p.emailKey, 'workouts'), {
		focus: p.focus,
		drill: p.drill,
		durationMinutes: p.duration,
		intensityRpe: p.intensityRpe,
		earnedXp: p.earnedXp,
		teamId: p.teamId,
		userUid: p.userUid,
		source: 'player_os',
		createdAt: serverTimestamp(),
	});
}
