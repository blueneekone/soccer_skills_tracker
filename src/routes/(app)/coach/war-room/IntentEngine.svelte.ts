import { untrack } from 'svelte';
import { collection, query, where, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export interface HeartRateSample {
	bpm: number;
	timestamp: number; // in seconds
}

export interface PlayerPhysioProfile {
	uid: string;
	playerName: string;
	heartRates: HeartRateSample[];
	baseDrillVolume: number;
	targetRecovery: number; // target HR drop in bpm
}

export interface PlayerDerivedMetrics {
	uid: string;
	playerName: string;
	currentBpm: number;
	heartRateVelocityHz: number;
	actualRecovery: number;
	targetRecovery: number;
	isFatigued: boolean;
	workloadFatigueCoefficient: number;
	baseDrillVolume: number;
	adjustedDrillVolume: number;
}

export class IntentEngine {
	teamId = $state('');
	players = $state<PlayerPhysioProfile[]>([]);
	isLoading = $state(false);
	private _unsubs: Unsubscribe[] = [];

	connect(teamId: string) {
		this.teamId = teamId;
		if (!isFirestoreReady()) {
			return;
		}

		this.isLoading = true;
		const db = getActiveDb();
		if (!db) return;

		const q = query(
			collection(db, 'player_physio'),
			where('teamId', '==', teamId)
		);

		if (!db || !authStore.isAuthenticated) return () => {};
		const unsub = onSnapshot(
			q,
			(snap) => {
				untrack(() => {
					this.players = snap.docs.map((d) => {
						const data = d.data();
						return {
							uid: d.id,
							playerName: data.playerName || 'Player',
							heartRates: data.heartRates || [],
							baseDrillVolume: data.baseDrillVolume || 100,
							targetRecovery: data.targetRecovery || 30,
						};
					});
					this.isLoading = false;
				});
			},
			() => {
				untrack(() => {
					this.isLoading = false;
				});
			}
		);
		this._unsubs = [...this._unsubs, unsub];
	}

	disconnect() {
		this._unsubs.forEach((u) => u());
		this._unsubs = [];
	}

	get playerMetrics(): PlayerDerivedMetrics[] {
		return this.players.map((p) => {
			const latestBpm = p.heartRates.length > 0 ? p.heartRates[p.heartRates.length - 1].bpm : 0;
			const hz = Number((latestBpm / 60).toFixed(4));
			const actualRecovery = this.calculateRecovery(p.heartRates);
			const isFatigued = actualRecovery < p.targetRecovery;
			const coeff = this.calculateFatigueCoefficient(actualRecovery, p.targetRecovery);
			const adjustedVolume = isFatigued
				? Number((p.baseDrillVolume * 0.85).toFixed(2))
				: p.baseDrillVolume;

			return {
				uid: p.uid,
				playerName: p.playerName,
				currentBpm: latestBpm,
				heartRateVelocityHz: hz,
				actualRecovery,
				targetRecovery: p.targetRecovery,
				isFatigued,
				workloadFatigueCoefficient: coeff,
				baseDrillVolume: p.baseDrillVolume,
				adjustedDrillVolume: adjustedVolume,
			};
		});
	}

	calculateRecovery(samples: HeartRateSample[]): number {
		if (samples.length < 2) return 0;
		let peakIndex = 0;
		let peakBpm = samples[0].bpm;

		for (let i = 1; i < samples.length; i++) {
			if (samples[i].bpm > peakBpm) {
				peakBpm = samples[i].bpm;
				peakIndex = i;
			}
		}

		if (peakIndex === samples.length - 1) return 0;

		let minBpmAfterPeak = samples[peakIndex].bpm;
		for (let i = peakIndex + 1; i < samples.length; i++) {
			if (samples[i].bpm < minBpmAfterPeak) {
				minBpmAfterPeak = samples[i].bpm;
			}
		}

		return peakBpm - minBpmAfterPeak;
	}

	calculateFatigueCoefficient(actualRecovery: number, targetRecovery: number): number {
		if (actualRecovery >= targetRecovery) return 1.0;
		const deficiency = targetRecovery - actualRecovery;
		return Number((1 + deficiency / targetRecovery).toFixed(4));
	}
}
