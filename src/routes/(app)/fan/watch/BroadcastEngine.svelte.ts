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

	// Subscriptions for candidate profile documents
	#candidateProfiles = $state<Record<string, any>>({});
	#candidateUnsubs: Record<string, () => void> = {};

	// Batching queues for rapid sequential votes
	#pendingVotes: { candidatePlayerUid: string; resolve: (val: boolean) => void; reject: (err: any) => void }[] = [];
	#batchTimeout: any = null;

	// Manage voting states (votingActive, candidates, results) as Svelte 5 reactive states/derived fields
	votingActive = $derived(this.#sessionDoc?.mvpVoting?.votingActive ?? false);
	results = $derived<Record<string, number>>(this.#sessionDoc?.mvpVoting?.results ?? {});

	// Protect minor player PII. When rendering candidates, map and display only pseudonymized metrics or vetted player-card profiles
	candidates = $derived(
		(this.#sessionDoc?.mvpVoting?.candidates ?? []).map((cand) => {
			const id = typeof cand === 'string' ? cand : cand.id;
			const profile = this.#candidateProfiles[id] || (typeof cand === 'object' ? cand : null);

			if (profile) {
				const isMinor = profile.isMinor === true;
				const coppaOk = profile.coppaStatus === 'granted';
				const vpcOk = profile.vpcStatus === 'verified' || profile.vpcStatus === 'not_required';
				const isConsented = coppaOk && vpcOk;

				if (isMinor) {
					// COPPA 2.0 Broadcast Shield: Broadcast metrics and live streams must strictly render
					// pseudonymized telemetry and verified player-card profiles; never expose PII of minor athletes.
					return {
						id,
						name: isConsented && profile.playerName
							? this._maskName(profile.playerName)
							: `Athlete #${id.substring(0, 4) || 'Anon'}`,
						isMinor: true,
						isConsented,
						stats: isConsented && profile.vettedStats
							? profile.vettedStats
							: this._pseudonymizeStats(profile.stats),
						telemetry: isConsented && profile.vettedTelemetry
							? profile.vettedTelemetry
							: this._pseudonymizeTelemetry(profile.telemetry)
					};
				} else {
					// Adult player
					return {
						id,
						name: profile.name || profile.playerName || `Candidate ${id}`,
						isMinor: false,
						isConsented: true,
						stats: profile.stats,
						telemetry: profile.telemetry
					};
				}
			}

			// Fallback placeholder before profile is loaded, treated as safe default to protect potential minor PII
			return {
				id,
				name: `Athlete #${id.substring(0, 4) || 'Anon'}`,
				isMinor: true,
				isConsented: false
			};
		})
	);

	isVotingOpen = $derived(this.votingActive);
	activeSuperdrawPool = $derived(this.#campaignDoc?.totalPool ?? 0);
	activeMvpStandings = $derived(
		Object.entries(this.results)
			.map(([uid, votes]) => ({ uid, votes }))
			.sort((a, b) => b.votes - a.votes)
	);

	_maskName(fullName: string): string {
		if (!fullName) return 'Athlete';
		const parts = fullName.trim().split(/\s+/);
		if (parts.length === 0) return 'Athlete';
		if (parts.length === 1) return parts[0][0] + '.';
		return `${parts[0]} ${parts[parts.length - 1][0]}.`;
	}

	_pseudonymizeStats(stats: any): any {
		if (!stats) return undefined;
		// Display only pseudonymized/safe aggregate metrics
		return {
			performanceTier: 'Verified',
			matchesCount: stats.matchesCount || 0,
			avgRating: stats.avgRating || '—'
		};
	}

	_pseudonymizeTelemetry(telemetry: any): any {
		if (!telemetry) return undefined;
		// Strip absolute positioning/identifiable coordinates, keep aggregate activity density
		return {
			activityLevel: 'Active',
			vettedDistanceMeters: telemetry.vettedDistanceMeters || 0
		};
	}

	connect(sessionId: string) {
		this.sessionId = sessionId;
		if (!isFirestoreReady()) return;
		const db = getActiveDb();
		if (!db) return;

		this.#unsubs.push(
			onSnapshot(doc(db, 'broadcast_sessions', sessionId), (snap) => {
				if (snap.exists()) {
					untrack(() => {
						const data = snap.data() as BroadcastSession;
						this.#sessionDoc = data;
						this._syncCandidateProfiles(data.mvpVoting?.candidates ?? []);
					});
				}
			})
		);
		this.#unsubs.push(
			onSnapshot(query(collection(db, 'superdraw_campaigns'), where('campaignId', '==', sessionId), limit(1)), (snap) => {
				if (!snap.empty) {
					untrack(() => {
						this.#campaignDoc = snap.docs[0].data() as SuperdrawCampaign;
					});
				}
			})
		);
	}

	_syncCandidateProfiles(candidateIds: string[]) {
		if (!isFirestoreReady()) return;
		const db = getActiveDb();
		if (!db) return;

		// Clean up subscriptions for candidates no longer active
		Object.keys(this.#candidateUnsubs).forEach((uid) => {
			if (!candidateIds.includes(uid)) {
				this.#candidateUnsubs[uid]();
				delete this.#candidateUnsubs[uid];
			}
		});

		// Subscribe to new candidates' user profiles to dynamically load PII-safety metadata
		candidateIds.forEach((uid) => {
			if (!this.#candidateUnsubs[uid]) {
				const userRef = doc(db, 'users', uid);
				this.#candidateUnsubs[uid] = onSnapshot(userRef, (snap) => {
					if (snap.exists()) {
						untrack(() => {
							this.#candidateProfiles[uid] = snap.data();
						});
					}
				});
			}
		});
	}

	disconnect() {
		this.#unsubs.forEach(u => u());
		this.#unsubs = [];
		Object.values(this.#candidateUnsubs).forEach(u => u());
		this.#candidateUnsubs = {};
		if (this.#batchTimeout) {
			clearTimeout(this.#batchTimeout);
			this.#batchTimeout = null;
		}
	}

	// Commit votes to Firestore via server-side 'writeBatch' transactions capped at 500 writes
	// Consolidate rapid sequential votes into atomic batches to avoid reactivity loops.
	async submitVote(candidatePlayerUid: string): Promise<boolean> {
		if (!isFirestoreReady() || !authStore.user?.uid || !this.isVotingOpen) {
			return false;
		}
		const db = getActiveDb();
		if (!db) return false;

		return new Promise<boolean>((resolve, reject) => {
			this.#pendingVotes.push({ candidatePlayerUid, resolve, reject });
			this._scheduleBatchCommit();
		});
	}

	_scheduleBatchCommit() {
		if (this.#batchTimeout) return;
		this.#batchTimeout = setTimeout(async () => {
			this.#batchTimeout = null;
			const votesToCommit = [...this.#pendingVotes];
			this.#pendingVotes = [];

			if (votesToCommit.length === 0) return;

			try {
				const db = getActiveDb();
				if (!db) {
					votesToCommit.forEach(v => v.resolve(false));
					return;
				}

				const batchSize = 500;
				for (let i = 0; i < votesToCommit.length; i += batchSize) {
					const chunk = votesToCommit.slice(i, i + batchSize);
					const batch = writeBatch(db);

					chunk.forEach((vote) => {
						const interRef = doc(collection(db, `broadcast_sessions/${this.sessionId}/broadcast_interactions`));
						batch.set(interRef, {
							userId: authStore.user?.uid || 'anonymous',
							interactionType: 'vote',
							payload: { candidatePlayerUid: vote.candidatePlayerUid },
							timestamp: new Date().toISOString()
						} as BroadcastInteraction);
					});

					await batch.commit();
				}

				votesToCommit.forEach(v => v.resolve(true));
			} catch (err) {
				console.error('Failed to commit batched votes:', err);
				votesToCommit.forEach(v => v.resolve(false));
			}
		}, 10);
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
