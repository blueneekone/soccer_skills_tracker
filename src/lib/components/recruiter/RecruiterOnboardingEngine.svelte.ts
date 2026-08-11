import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { db } from '$lib/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';
import { untrack } from 'svelte';

export class RecruiterOnboardingEngine {
	vettingStatus = $state<string>('pending');
	loading = $state<boolean>(true);
	error = $state<string>('');

	constructor() {
		this.subscribe();
	}

	subscribe() {
		// Use Svelte 5 effect.root to manage reactive subscriptions
		$effect.root(() => {
			$effect(() => {
				if (authStore.isLoading) return;
				if (!authStore.isAuthenticated) {
					this.loading = false;
					return;
				}

				const uid = authStore.user?.uid;
				if (!uid || !db) return;

				this.loading = true;
				// Real-time Firestore stream to poll Checkr background check status
				const unsub = onSnapshot(
					doc(db, 'recruiters', uid),
					(snap) => {
						untrack(() => {
							if (snap.exists()) {
								const data = snap.data();
								this.vettingStatus = data?.vettingStatus || 'pending';
							} else {
								this.vettingStatus = (authStore.userProfile?.vettingStatus as string) || 'pending';
							}
							this.loading = false;
						});
					},
					(err) => {
						untrack(() => {
							this.error = err.message || 'Failed to poll recruiter vetting status';
							this.loading = false;
						});
					}
				);

				return () => unsub();
			});
		});
	}

	isRecruiterCleared(): boolean {
		return isRecruiterCleared();
	}
}

/**
 * Returns true ONLY when Checkr status is explicitly 'cleared' or 'clear'.
 */
export function isRecruiterCleared(): boolean {
	if (!authStore.isAuthenticated) return false;
	const profile = authStore.userProfile;
	if (!profile) return false;

	const status = profile.vettingStatus || (profile.clearance?.status as string | undefined);
	return status === 'cleared' || status === 'clear';
}
