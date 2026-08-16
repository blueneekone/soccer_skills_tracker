export function syncAuthCookie(token) {
	if (typeof document !== 'undefined') {
		const cookies = document.cookie.split(';').map(c => c.trim());
		const existingCookie = cookies.find(c => c.startsWith('token='));
		const existingToken = existingCookie ? existingCookie.split('=')[1] : null;

		document.cookie = `token=${token || ''}; path=/; max-age=${token ? 3600 : 0}; SameSite=Strict; Secure`;

		if (!existingToken) {
			window.location.reload();
			return true;
		}
	}
	return false;
}