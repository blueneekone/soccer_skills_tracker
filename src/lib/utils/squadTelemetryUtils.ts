import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export function linkedDocIdForPlayerName(em: Record<string, string>, name: string) {
	if (!db || !authStore.isAuthenticated) return;
	if (em[name] != null) return em[name];
	if (typeof name === 'string') {
		const t = name.trim();
		if (t !== name && em[t] != null) return em[t];
	}
	return undefined;
}

export function usersCollectionKey(id: string) {
	const s = String(id).trim();
	if (!s) return s;
	return s.includes('@') ? s.toLowerCase() : s;
}

export function isFirestorePermissionError(e: unknown) {
	if (!e || typeof e !== 'object') return false;
	const o = e as Record<string, unknown>;
	if (String(o.code || '') === 'permission-denied') return true;
	const msg = String(o.message || '');
	return /insufficient|missing or insufficient permissions/i.test(msg);
}

export function restrictedUserSnapshotPlaceholder(emailKey: string) {
	return {
		exists: () => true,
		id: emailKey,
		data: () => ({
			email: emailKey,
			playerName: 'Restricted Operative',
			isRestricted: true,
			coppaCompliance: 'exempt',
			lastActive: 'redacted',
			playerLevel: 1,
			playerXp: 0,
		}),
	};
}
