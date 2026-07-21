import { authStore } from '$lib/stores/auth.svelte.js';
import { pollRecruiterCheckrStatus } from '$lib/compliance/checkrRecruiterClearance.js';
import type { RecruiterCheckStatus } from '$lib/types/backgroundCheck.js';
import { db } from '$lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import type { RecruiterProfile } from '$lib/types/backgroundCheck.js';

export class RecruiterOnboardingEngine {
	status = $state<RecruiterCheckStatus | 'not_started'>('not_started');
	loading = $state(true);

	constructor() {
		$effect(() => {
			if (authStore.isLoading) return;
			if (authStore.isAuthenticated && authStore.uid) {
				this.loadStatus(authStore.uid);
			} else {
				this.loading = false;
			}
		});
	}

	async loadStatus(uid: string) {
		this.loading = true;
		try {
			const snap = await getDoc(doc(db, 'recruiters', uid));
			if (snap.exists()) {
				const data = snap.data() as Partial<RecruiterProfile>;
				this.status = data.checkrStatus || 'pending';
			} else {
				this.status = 'not_started';
			}
			await pollRecruiterCheckrStatus(uid);
		} catch (e) {
			console.error('Failed to load recruiter status', e);
		} finally {
			this.loading = false;
		}
	}
}
