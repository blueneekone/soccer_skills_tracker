import { authStore } from '$lib/stores/auth.svelte.js';

export class LiabilityWaiversEngine {
	signature = $state('');
	optInFanOsLivestream = $state(false);
	optInPlayerOsTrials = $state(false);
	isSubmitting = $state(false);
	error = $state('');

	get isValid() {
		return this.signature.trim().length > 0;
	}

	async submit() {
		if (!this.isValid) {
			this.error = 'Please provide an electronic signature.';
			return;
		}

		const { db } = await import('$lib/firebase.js');
		if (!db || !authStore.isAuthenticated) {
			this.error = 'Database or auth unavailable.';
			return;
		}

		this.isSubmitting = true;
		this.error = '';

		try {
			const { functions } = await import('$lib/firebase.js');
			const { httpsCallable } = await import('firebase/functions');
			const saveWaiver = httpsCallable(functions, 'submitLiabilityWaivers');
			await saveWaiver({
				signature: this.signature,
				optInFanOsLivestream: this.optInFanOsLivestream,
				optInPlayerOsTrials: this.optInPlayerOsTrials,
			});
			if (authStore.userProfile) {
				authStore.userProfile.liabilityWaiverVerified = true;
			}
		} catch (err: any) {
			this.error = err?.message || 'Submission failed.';
		} finally {
			this.isSubmitting = false;
		}
	}
}
