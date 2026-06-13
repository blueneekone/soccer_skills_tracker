import { db } from '$lib/firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/** Parent-facing push categories (matches `functions/dispatcher.js` keys). */
export type ParentPushPreferences = {
	push_gameReminders: boolean;
	push_messages: boolean;
	push_announcements: boolean;
	push_paymentReminders: boolean;
};

export const PARENT_PUSH_DEFAULTS: ParentPushPreferences = {
	push_gameReminders: true,
	push_messages: true,
	push_announcements: true,
	push_paymentReminders: true,
};

export async function loadParentPushPreferences(
	email: string,
): Promise<ParentPushPreferences> {
	const normalized = email.trim().toLowerCase();
	if (!normalized) return { ...PARENT_PUSH_DEFAULTS };
	try {
		const snap = await getDoc(doc(db, 'users', normalized));
		if (!snap.exists()) return { ...PARENT_PUSH_DEFAULTS };
		const raw = snap.data()?.preferences ?? {};
		return {
			push_gameReminders:
				raw.push_gameReminders ?? PARENT_PUSH_DEFAULTS.push_gameReminders,
			push_messages: raw.push_messages ?? PARENT_PUSH_DEFAULTS.push_messages,
			push_announcements:
				raw.push_announcements ?? PARENT_PUSH_DEFAULTS.push_announcements,
			push_paymentReminders:
				raw.push_paymentReminders ?? PARENT_PUSH_DEFAULTS.push_paymentReminders,
		};
	} catch {
		return { ...PARENT_PUSH_DEFAULTS };
	}
}

export async function saveParentPushPreferences(
	email: string,
	prefs: ParentPushPreferences,
): Promise<void> {
	const normalized = email.trim().toLowerCase();
	if (!normalized) return;
	const snap = await getDoc(doc(db, 'users', normalized));
	const existing = snap.exists() ? snap.data()?.preferences ?? {} : {};
	await updateDoc(doc(db, 'users', normalized), {
		preferences: { ...existing, ...prefs },
	});
}
