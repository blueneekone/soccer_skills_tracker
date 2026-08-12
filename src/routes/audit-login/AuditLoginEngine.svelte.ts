import { auth } from '$lib/firebase.js';
import { signInWithCustomToken } from 'firebase/auth';

export class AuditLoginEngine {
	token = $state('');
	errorMsg = $state('');
	loading = $state(false);

	async handleLogin() {
		if (!this.token.trim()) {
			this.errorMsg = 'Please enter a valid token.';
			return;
		}

		this.errorMsg = '';
		this.loading = true;
		try {
			await signInWithCustomToken(auth, this.token.trim());
			window.location.href = '/';
		} catch (err: unknown) {
			if (err instanceof Error) {
				this.errorMsg = err.message;
			} else {
				this.errorMsg = String(err);
			}
			this.loading = false;
		}
	}
}
