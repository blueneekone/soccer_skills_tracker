/** Defensive sessionStorage access (private mode / SSR / denied). */
export function getSessionItemSafe(key: string): string | null {
	try {
		if (typeof sessionStorage === 'undefined' || !sessionStorage) return null;
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

export const ACCESS_REVOKED_KEY = 'sstrack_access_revoked';

export function markAccessRevokedInSession(): void {
	try {
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem(ACCESS_REVOKED_KEY, '1');
		}
	} catch {
		/* ignore */
	}
}
