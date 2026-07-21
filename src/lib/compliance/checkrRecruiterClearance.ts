import { db } from '$lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import type { RecruiterProfile } from '$lib/types/backgroundCheck.js';

export let recruiterClearanceCache: Record<string, boolean> = {};

export async function pollRecruiterCheckrStatus(uid: string): Promise<boolean> {
	if (!uid) return false;
	try {
		const snap = await getDoc(doc(db, 'recruiters', uid));
		if (!snap.exists()) {
			recruiterClearanceCache[uid] = false;
			return false;
		}
		const data = snap.data() as Partial<RecruiterProfile>;
		const isClear = data.checkrStatus === 'clear';
		recruiterClearanceCache[uid] = isClear;
		return isClear;
	} catch (err) {
		console.error('[checkrRecruiterClearance] Error polling recruiter status:', err);
		return false;
	}
}

export function isRecruiterCleared(uid: string | undefined | null): boolean {
	if (!uid) return false;
	return recruiterClearanceCache[uid] === true;
}
