/**
 * Passkey enrollment gate — phased transition away from legacy email link / password.
 *
 * Users who authenticate with Firebase "password" (email+password OR magic links) must
 * register at least one WebAuthn passkey once `users/{uid}/passkeys` is non-empty.
 */

import type { User } from 'firebase/auth';
import { getIdTokenResult } from 'firebase/auth';
import { db } from '$lib/firebase.js';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export const PASSKEY_ENROLL_ROUTE = '/auth/enroll-passkey';

/** Firebase email/password provider id — includes magic-link sign-in after completion. */
const PASSWORD_PROVIDER = 'password';

export function userHasLegacyEmailProvider(user: User | null): boolean {
	if (!user) return false;
	return user.providerData.some((p) => p.providerId === PASSWORD_PROVIDER);
}

async function isPlatformOperatorExempt(user: User | null): Promise<boolean> {
	if (!user) return false;
	try {
		const tr = await getIdTokenResult(user, false);
		const c = tr.claims as Record<string, unknown>;
		if (c?.isSuperAdmin === true || c?.isGlobalAdmin === true) return true;
		const role = c?.role;
		if (role === 'super_admin' || role === 'global_admin') return true;
	} catch {
		/* ignore */
	}
	return false;
}

/** True when the user's passkeys subcollection has at least one credential doc. */
export async function userHasRegisteredPasskey(uid: string): Promise<boolean> {
	const q = query(collection(db, 'users', uid, 'passkeys'), limit(1));
	const snap = await getDocs(q);
	return !snap.empty;
}

/**
 * Mandatory passkey setup for legacy email/password and magic-link users without credentials.
 */
export async function requiresPasskeyEnrollmentBeforeApp(user: User | null): Promise<boolean> {
	if (!user?.uid) return false;
	if (!userHasLegacyEmailProvider(user)) return false;
	if (await isPlatformOperatorExempt(user)) return false;
	const hasPasskey = await userHasRegisteredPasskey(user.uid);
	return !hasPasskey;
}
