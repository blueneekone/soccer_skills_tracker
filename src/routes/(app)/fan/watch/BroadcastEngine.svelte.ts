import { untrack } from 'svelte';
import { doc, onSnapshot, writeBatch, collection, query, limit, where } from 'firebase/firestore';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import type { BroadcastSession, SuperdrawCampaign, BroadcastInteraction } from '$lib/types/broadcast.js';

export class BroadcastEngine {
	sessionId = $state<string>('');
	#sessionDoc = $state<BroadcastSession | null>(null);
	#campaignDoc = $state<SuperdrawCampaign | null>(null);
	#unsubs: (() => void)[] = [];

	isVotingOpen = $derived(this.#sessionDoc?.mvpVoting?.votingActive ?? false);
	activeSuperdrawPool = $derived(this.#campaignDoc?.totalPool ?? 0);
	activeMvpStandings = $derived(
		Object.entries(this.#sessionDoc?.mvpVoting?.results ?? {})
			.map(([uid, votes]) => ({ uid, votes }))
			.sort((a, b) => b.votes - a.votes)
	);

	connect(sessionId: string) {
		this.sessionId = sessionId;
		if (!isFirestoreReady()) return;
		const db = getActiveDb();
		if (!db) return;

		this.#unsubs.push(
			onSnapshot(doc(db, 'broadcast_sessions', sessionId), (snap) => {
				if (snap.exists()) untrack(() => { this.#sessionDoc = snap.data() as BroadcastSession; });
			})
		);
		this.#unsubs.push(
			onSnapshot(query(collection(db, 'superdraw_campaigns'), where('campaignId', '==', sessionId), limit(1)), (snap) => {
				if (!snap.empty) untrack(() => { this.#campaignDoc = snap.docs[0].data() as SuperdrawCampaign; });
			})
		);
	}

	disconnect() {
		this.#unsubs.forEach(u => u());
		this.#unsubs = [];
	}

	async submitVote(candidatePlayerUid: string) {
		if (!isFirestoreReady() || !authStore.user?.uid || !this.isVotingOpen) return false;
		const db = getActiveDb();
		if (!db) return false;
		const batch = writeBatch(db);
		const interRef = doc(db, 'broadcast_sessions', this.sessionId, 'broadcast_interactions', authStore.user.uid);
		batch.set(interRef, {
			userId: authStore.user.uid, interactionType: 'vote', payload: { candidatePlayerUid }, timestamp: new Date().toISOString()
		} as BroadcastInteraction);
		await batch.commit();
		return true;
	}

	async purchaseSuperdrawEntry(quantity: number) {
		if (!isFirestoreReady() || !authStore.user?.uid) return false;
		const db = getActiveDb();
		if (!db) return false;
		const batch = writeBatch(db);
		const interRef = doc(collection(db, `broadcast_sessions/${this.sessionId}/broadcast_interactions`));
		batch.set(interRef, {
			userId: authStore.user.uid, interactionType: 'superdraw_ticket', payload: { quantity }, timestamp: new Date().toISOString()
		} as BroadcastInteraction);
		await batch.commit();
		return true;
	}
}