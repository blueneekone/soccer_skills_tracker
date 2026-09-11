import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { getActiveDb } from '$lib/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';
import type { RecruiterCheckStatus } from '$lib/types/backgroundCheck.js';
import { pollRecruiterCheckrStatus, normalizeRecruiterStatus, isRecruiterCleared } from '$lib/compliance/checkrRecruiterClearance.js';

export class RecruiterOnboardingEngine {
	loading = $state(true);
	error = $state('');
	status = $state<RecruiterCheckStatus | 'not_found'>('pending');
	candidateId = $state<string | undefined>(undefined);
	unsubscribe: (() => void) | null = null;

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (authStore.isLoading) return;
				if (!authStore.isAuthenticated || !authStore.user?.uid) {
					this.loading = false;
					this.error = 'Authentication required.';
					return;
				}

				const db = getActiveDb();
				if (!db) {
					this.loading = false;
					this.error = 'Database connection unavailable.';
					return;
				}

				const uid = authStore.user.uid;
				this.unsubscribe = onSnapshot(
					doc(db, 'recruiters', uid),
					(snap) => {
						this.loading = false;
						if (!snap.exists()) {
							this.status = 'not_found';
							return;
						}
						const data = snap.data();
						this.status = normalizeRecruiterStatus(data?.checkrStatus || data?.vettingStatus);
						this.candidateId = data?.checkrCandidateId;
					},
					(err) => {
						console.error('[RecruiterOnboardingEngine] onSnapshot error:', err);
						this.error = 'Failed to load vetting profile.';
						this.loading = false;
					}
				);
			});

			return () => {
				if (this.unsubscribe) {
					this.unsubscribe();
					this.unsubscribe = null;
				}
			};
		});
	}

	async forcePoll() {
		const uid = authStore.user?.uid;
		if (!uid) return;
		try {
			const s = await pollRecruiterCheckrStatus(uid);
			this.status = s;
		} catch (e) {
			console.error('[RecruiterOnboardingEngine] Failed to poll checkr status:', e);
		}
	}

	isCleared(): boolean {
		return isRecruiterCleared(this.status === 'not_found' ? null : this.status);
	}
}
