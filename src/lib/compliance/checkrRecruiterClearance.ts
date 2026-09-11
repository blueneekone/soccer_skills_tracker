/**
 * checkrRecruiterClearance.ts
 * ────────────────────────────
 * External Recruiter Checkr Verification & Clearance Gate.
 * Enforces National Criminal Database clearance before scouts gain access to prospect data.
 */

import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { getActiveDb } from '$lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import type { RecruiterCheckStatus } from '$lib/types/backgroundCheck.js';

/**
 * Normalizes raw Checkr or Firestore clearance status to RecruiterCheckStatus.
 */
export function normalizeRecruiterStatus(raw?: string | null): RecruiterCheckStatus {
	const val = String(raw || '').toLowerCase().trim();
	if (val === 'clear' || val === 'cleared') return 'clear';
	if (val === 'invited') return 'invited';
	if (val === 'consider') return 'consider';
	if (val === 'suspended') return 'suspended';
	return 'pending';
}

/**
 * Access gate function: synchronous check evaluating whether a recruiter is cleared.
 * Can evaluate a status string directly or read from the active authStore profile.
 */
export function isRecruiterCleared(statusOrUid?: string | null): boolean {
	if (!authStore.isAuthenticated) return false;

	if (statusOrUid && ['clear', 'cleared'].includes(statusOrUid.toLowerCase().trim())) {
		return true;
	}

	const profile = authStore.userProfile;
	if (!profile) return false;

	const status = normalizeRecruiterStatus(
		profile.vettingStatus || (profile.clearance?.status as string | undefined) || profile.checkrStatus
	);

	return status === 'clear';
}

/**
 * Polls the current Checkr status for a recruiter from the recruiters collection.
 */
export async function pollRecruiterCheckrStatus(uid: string): Promise<RecruiterCheckStatus> {
	if (!dbCheck()) return 'pending';
	const db = getActiveDb();
	if (!db) return 'pending';

	try {
		const snap = await getDoc(doc(db, 'recruiters', uid));
		if (!snap.exists()) return 'pending';
		const data = snap.data();
		return normalizeRecruiterStatus(data?.checkrStatus || data?.vettingStatus);
	} catch (err) {
		console.error('[checkrRecruiterClearance] pollRecruiterCheckrStatus error:', err);
		return 'pending';
	}
}

function dbCheck(): boolean {
	return Boolean(authStore.isAuthenticated);
}
