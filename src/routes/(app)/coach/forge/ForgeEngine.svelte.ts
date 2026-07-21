import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { browser } from '$app/environment';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';

export class ForgeEngine {
	activeTab = $state<'ai' | 'builder'>('builder');
	
	// Tactical Forge
	prompt = $state('');
	messages = $state<{ role: 'user' | 'ai'; content: string }[]>([]);
	isGenerating = $state(false);

	// Builder
	drillLibrary = $state([
		{ id: 'lib-1', title: 'RONDO 4v2' },
		{ id: 'lib-2', title: 'TRANSITION 7v7' },
		{ id: 'lib-3', title: 'FINISHING 1v1' },
		{ id: 'lib-4', title: 'DEFENSIVE SHIFT' },
		{ id: 'lib-5', title: 'AEROBIC FITNESS' }
	]);

	microcycles = $state([
		{ id: 'mc-1', title: 'WEEK 1: HIGH PRESS', drills: [] as {id: string, title: string}[] },
		{ id: 'mc-2', title: 'WEEK 2: BUILD UP', drills: [] as {id: string, title: string}[] },
		{ id: 'mc-3', title: 'WEEK 3: LOW BLOCK', drills: [] as {id: string, title: string}[] }
	]);

	isCommitting = $state(false);
	showAlert = $state(true);
    unsub: (() => void) | null = null;

	init() {
		if (!browser) return;
		
		$effect(() => {
			if (!isFirestoreReady()) return;
			
			const teamId = authStore.userProfile?.teamId;
			const clubId = authStore.userProfile?.clubId;
			if (!teamId || !clubId) return;

			const q = query(
				collection(db, 'macrocycles'),
				where('teamId', '==', teamId),
				where('clubId', '==', clubId)
			);

			this.unsub = onSnapshot(q, (snap) => {
				if (!snap.empty) {
					console.log(`Loaded ${snap.size} secure macrocycles for team ${teamId} in club ${clubId}`);
				}
			});

			return () => {
				if (this.unsub) this.unsub();
			};
		});
	}

	async submitPrompt() {
		if (!this.prompt.trim()) return;
		this.messages = [...this.messages, { role: 'user', content: this.prompt }];
		const currentPrompt = this.prompt;
		this.prompt = '';
		this.isGenerating = true;

		try {
			const functions = getFunctions(app, 'us-east1');
			const generateTacticalPlan = httpsCallable(functions, 'generateTacticalPlan');
			const result = await generateTacticalPlan({ prompt: currentPrompt });
			const data = result.data as { plan: string };
			this.messages = [...this.messages, { role: 'ai', content: data.plan }];
		} catch (error) {
			console.error('Failed to generate tactical plan:', error);
			this.messages = [...this.messages, { role: 'ai', content: '[ERROR]: Neural link severed. Please try again.' }];
		} finally {
			this.isGenerating = false;
		}
	}

	async commitMacrocycle() {
		this.isCommitting = true;
		try {
			const functions = getFunctions(app, 'us-east1');
			const commit = httpsCallable(functions, 'commitMacrocycle');
			await commit({ payload: { microcycles: this.microcycles } });
			
			Swal.fire({
				icon: 'success',
				title: 'MACROCYCLE COMMITTED',
				text: 'Curriculum secured to team_assignments',
				toast: true,
				position: 'bottom-end',
				showConfirmButton: false,
				timer: 1500,
				background: '#0f172a',
				color: '#14b8a6'
			});
		} catch (error) {
			console.error('Commit failed:', error);
			Swal.fire({
				icon: 'error',
				title: 'COMMIT REJECTED',
				text: 'Missing isCleared JWT claim or network error.',
				background: '#0f172a',
				color: '#ef4444'
			});
		} finally {
			this.isCommitting = false;
		}
	}
}
