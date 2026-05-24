import { auth, db } from '$lib/firebase.js';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';

export interface UserPreferences {
	push_weatherAlerts: boolean;
	push_gameReminders: boolean;
	push_messages: boolean;
	email_weeklyReport: boolean;
}

export type ProfileDoc = {
	playerName?: string;
	privacyProfile?: string;
	telemetryOptIn?: boolean;
	isMinor?: boolean;
	dateOfBirth?: { toDate?: () => Date };
	preferences?: Partial<UserPreferences>;
};

/** COPPA / minor account guard — mirrors settings terminal logic. */
export function computeIsMinorAccount(profile: ProfileDoc | null | undefined): boolean {
	if (!profile) return false;
	if (profile.isMinor === true) return true;
	if (profile.isMinor === false) return false;
	const dob = profile.dateOfBirth;
	if (dob && typeof dob.toDate === 'function') {
		const d = dob.toDate();
		const now = new Date();
		let age = now.getFullYear() - d.getFullYear();
		const m = now.getMonth() - d.getMonth();
		if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
		return age < 13;
	}
	return false;
}

export function computeIsOperativeProxy(email: string, role: string): boolean {
	return email.endsWith('@operative.local') && role === 'player';
}

export function getPrefsDefaults(role: string): UserPreferences {
	const isCoach = role === 'coach';
	const isDirector =
		role === 'director' || role === 'super_admin' || role === 'global_admin';
	return {
		push_weatherAlerts: isCoach || isDirector,
		push_gameReminders: true,
		push_messages: true,
		email_weeklyReport: false,
	};
}

export async function loadUserPreferences(
	email: string,
	defaults: UserPreferences,
): Promise<UserPreferences> {
	if (!email) return { ...defaults };
	try {
		const snap = await getDoc(doc(db, 'users', email));
		if (snap.exists()) {
			const data = snap.data();
			if (data.preferences) {
				return { ...defaults, ...data.preferences };
			}
		}
	} catch {
		/* silent — use defaults */
	}
	return { ...defaults };
}

export async function saveUserPreferences(
	email: string,
	prefs: UserPreferences,
): Promise<void> {
	if (!email) return;
	await updateDoc(doc(db, 'users', email), { preferences: prefs });
}

export interface SaveProfileInput {
	playerName: string;
	privacyProfile: string;
	telemetryOptIn: boolean;
	isMinorAccount: boolean;
	profile: ProfileDoc | null | undefined;
	email: string;
	role: string;
}

export async function saveProfile(
	input: SaveProfileInput,
): Promise<{ error?: string; message?: string }> {
	const { playerName, privacyProfile, telemetryOptIn, isMinorAccount, profile, email, role } =
		input;
	const trimmed = playerName.trim();
	const isDirector =
		role === 'director' || role === 'super_admin' || role === 'global_admin';

	if (!trimmed && !isDirector) {
		return { error: 'Display name is required.' };
	}
	if (!auth.currentUser?.email) {
		return { error: 'Not signed in.' };
	}
	if (computeIsOperativeProxy(email, role)) {
		return { error: 'Use the Operative Call Sign screen.' };
	}

	try {
		const userRef = doc(db, 'users', auth.currentUser.email.toLowerCase());
		await updateDoc(userRef, {
			playerName: trimmed || profile?.playerName || email.split('@')[0],
			privacyProfile: isMinorAccount ? 'strict_minor_defaults' : privacyProfile,
			telemetryOptIn: isMinorAccount ? false : telemetryOptIn,
			settingsUpdatedAt: new Date(),
		});
		return { message: 'Profile updated' };
	} catch (err: unknown) {
		return { error: err instanceof Error ? err.message : 'Save failed.' };
	}
}

export async function sendPasswordReset(
	email: string,
): Promise<{ error?: string; sent?: boolean }> {
	if (!email) return { error: 'No email on file.' };
	try {
		await sendPasswordResetEmail(auth, email);
		return { sent: true };
	} catch (err: unknown) {
		return { error: err instanceof Error ? err.message : 'Reset failed.' };
	}
}
