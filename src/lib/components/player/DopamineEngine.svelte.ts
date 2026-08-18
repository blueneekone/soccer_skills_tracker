import { browser } from '$app/environment';
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js'; // Secure callable resolver

export interface DecayResult {
	applied: boolean;
	xpLost: number;
	newXp: number;
	daysInactive: number;
	reason?: string;
}

export class DopamineEngine {
	// Habit Streak System
	public currentStreak = $state(0);
	public bestStreak = $state(0);
	public lastActiveDate = $state<string | null>(null);

	// Skill Decay System
	public decayPenaltyApplied = $state(false);
	public xpLost = $state(0);
	public isSyncing = $state(false);

	// Visual Feedback Queue
	public feedbackQueue = $state<Array<{ type: string; payload: any }>>([]);

	constructor() {}

	/**
	 * Bootstraps the engine with user data from Firestore
	 */
	public async hydrate(userData: any) {
		if (!userData) return;
		this.currentStreak = userData.currentStreak || 0;
		this.bestStreak = userData.bestStreak || 0;
		this.lastActiveDate = userData.lastActiveDate || null;
		
		this.decayPenaltyApplied = false;

		await this.syncDecayFromServer();
	}

	/**
	 * Serverless evaluation gate for Core Drive 8 loss avoidance
	 * Gated strictly under our 80-line function limits
	 */
	public async syncDecayFromServer(): Promise<void> {
		this.isSyncing = true;
		
		try {
			if (!functions) return;
			// Resolve the atomic, serverless skill-decay callable
			const applySkillDecayFn = httpsCallable<void, DecayResult>(functions, 'applySkillDecay');

			const { data } = await applySkillDecayFn();
			
			if (data && data.applied) {
				// State updates locked strictly to verified database response
				this.decayPenaltyApplied = true;
				this.xpLost = data.xpLost;

				// Push presentation trigger to queue safely
				this.queueFeedback('DECAY_WARNING', { penalty: data.xpLost });
			}
		} catch (error) {
			// Graceful degradation: prevent compiler crashes if offline
			console.warn('[DopamineEngine] Failed to sync decay from server:', error);
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Core Drive 2: Visual behavioral reinforcement
	 * Triggers a tactile pulse/micro-animation asynchronously
	 */
	public queueFeedback(type: string, payload: any) {
		if (!browser) return;
		this.feedbackQueue.push({ type, payload });
		
		// Consume feedback queue
		setTimeout(() => {
			this.feedbackQueue.shift();
		}, 3000); // feedback displays for 3 seconds
	}
	
	public triggerPulse() {
		if (!browser) return;
		if (navigator.vibrate) {
			navigator.vibrate(150); // Visceral 150ms tactile pulse
		}
		this.queueFeedback('TACTILE_PULSE', { timestamp: Date.now() });
	}
}
