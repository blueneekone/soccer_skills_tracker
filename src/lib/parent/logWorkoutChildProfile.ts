import { doc, getDoc, type Firestore } from 'firebase/firestore';

/** XP from `users/{email}` legacy/profile fields. */
export function deriveProfileXp(profile: Record<string, unknown> | null | undefined): number {
	return Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0));
}

/** Canonical Player OS aggregate fields from `player_stats/{uid}`. */
export function parsePlayerStatsHud(data: Record<string, unknown> | null | undefined): {
	totalXp: number;
	streakDays: number;
} {
	if (!data) return { totalXp: 0, streakDays: 0 };
	const tx = data.total_xp;
	const st = data.streak_days;
	return {
		totalXp:
			typeof tx === 'number' && !Number.isNaN(tx) ? Math.max(0, Math.floor(tx)) : 0,
		streakDays:
			typeof st === 'number' && !Number.isNaN(st) ? Math.max(0, Math.floor(st)) : 0,
	};
}

/** Mirror player dashboard HUD: prefer the higher of profile vs `player_stats` XP. */
export function deriveHudXp(profileXp: number, statsXp: number): number {
	return Math.max(profileXp, statsXp);
}

export function deriveHudStreak(profileStreak: number, statsStreak: number): number {
	return Math.max(profileStreak, statsStreak);
}

export function resolveChildAthleteUid(
	profile: Record<string, unknown> | null | undefined,
): string {
	const uid = profile?.uid ?? profile?.athleteUid;
	return typeof uid === 'string' && uid.trim() ? uid.trim() : '';
}

export function childProfileLoadErrorMessage(err: unknown, missingDoc: boolean): string {
	if (missingDoc) {
		return 'No player profile on file for this operative.';
	}
	const code =
		err && typeof err === 'object' && 'code' in err ?
			String((err as { code: string }).code)
		:	'';
	if (code === 'permission-denied') {
		return 'Cannot load operative profile — household clearance may still be syncing. Try signing out and back in.';
	}
	if (err instanceof Error && err.message) return err.message;
	return 'Could not load operative profile.';
}

export type LogWorkoutChildSnapshot = {
	profile: (Record<string, unknown> & { email: string }) | null;
	statsXp: number;
	statsStreak: number;
	error: string;
};

/** Loads `users/{email}` plus `player_stats/{uid}` for parent log-workout HUD. */
export async function loadLogWorkoutChildSnapshot(
	db: Firestore,
	emailKey: string,
): Promise<LogWorkoutChildSnapshot> {
	const em = emailKey.trim().toLowerCase();
	if (!em) {
		return { profile: null, statsXp: 0, statsStreak: 0, error: '' };
	}

	let userData: Record<string, unknown> | null = null;
	let userErr = '';

	try {
		const snap = await getDoc(doc(db, 'users', em));
		if (snap.exists()) {
			userData = snap.data();
		} else {
			userErr = childProfileLoadErrorMessage(null, true);
		}
	} catch (e) {
		userErr = childProfileLoadErrorMessage(e, false);
	}

	let statsXp = 0;
	let statsStreak = 0;
	const uid = resolveChildAthleteUid(userData);

	if (uid) {
		try {
			const statsSnap = await getDoc(doc(db, 'player_stats', uid));
			if (statsSnap.exists()) {
				const parsed = parsePlayerStatsHud(statsSnap.data());
				statsXp = parsed.totalXp;
				statsStreak = parsed.streakDays;
			}
		} catch (e) {
			console.error('[parent log-workout] player_stats', e);
			if (!userData && !userErr) {
				userErr = childProfileLoadErrorMessage(e, false);
			}
		}
	}

	const profile = userData ? { email: em, ...userData } : null;

	if (!profile && statsXp === 0 && statsStreak === 0 && !userErr) {
		userErr = childProfileLoadErrorMessage(null, true);
	}

	return { profile, statsXp, statsStreak, error: userErr };
}
