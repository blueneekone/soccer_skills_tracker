import { auth } from '$lib/firebase.js';

export async function flushTokenCache() {
	if (auth.currentUser) {
		const token = await auth.currentUser.getIdToken(true);

		if (typeof document !== 'undefined') {
			document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; Secure; SameSite=Strict`;
		}
	}
}
