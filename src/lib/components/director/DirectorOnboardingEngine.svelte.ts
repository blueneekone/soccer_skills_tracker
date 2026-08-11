import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { db } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { doc, setDoc } from 'firebase/firestore';
import { untrack } from 'svelte';

export class DirectorOnboardingEngine {
	// State properties
	currentStep = $state<number>(1);
	uploadProgress = $state<number>(0);
	stripeOnboardingUrl = $state<string>('');
	error = $state<string>('');
	loading = $state<boolean>(false);

	// Derived properties declared strictly below state properties
	isStepCompleted = $derived(this.currentStep > 1);
	isUploadDone = $derived(this.uploadProgress === 100);

	constructor() {}

	async initializeDirectorOnboarding() {
		if (!db || !authStore.isAuthenticated) return;
		if (!isFirestoreReady()) return;

		this.loading = true;
		this.error = '';

		try {
			await untrack(() => {
				this.stripeOnboardingUrl = 'https://stripe.com/connect/onboarding';
				return Promise.resolve();
			});
		} catch (err: any) {
			this.error = err.message || 'Initialization failed';
		} finally {
			this.loading = false;
		}
	}

	async updateStep(step: number) {
		this.currentStep = step;
	}

	async setUploadProgress(progress: number) {
		this.uploadProgress = progress;
	}

	async updateVerificationStatus(status: string) {
		if (!db || !authStore.isAuthenticated) return;
		if (!isFirestoreReady()) return;

		const uid = authStore.user?.uid;
		if (!uid) return;

		try {
			await untrack(async () => {
				const docRef = doc(db, 'account_verifications', uid);
				await setDoc(docRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
			});
		} catch (err: any) {
			this.error = err.message || 'Failed to update verification status';
		}
	}
}
