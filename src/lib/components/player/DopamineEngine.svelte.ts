import { browser } from '$app/environment';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface DecayResult {
	applied: boolean;
	xpLost?: number;
	newXp?: number;
	daysInactive?: number;
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

	// Visual Feedback Queue
	public feedbackQueue = $state<Array<{ type: string; payload: any }>>([]);

	constructor() {}

	/**
	 * Bootstraps the engine with user data from Firestore
	 */
	public hydrate(userData: any) {
		if (!userData) return;
		this.currentStreak = userData.currentStreak || 0;
		this.bestStreak = userData.bestStreak || 0;
		this.lastActiveDate = userData.lastActiveDate || null;
		
		void this.syncDecayFromServer();
	}

	private async syncDecayFromServer(): Promise<void> {
		try {
			const functions = getFunctions();
			const applyDecay = httpsCallable<void, DecayResult>(functions, 'applySkillDecay');
			const result = await applyDecay();
			const data = result.data;
			if (data.applied) {
				this.decayPenaltyApplied = true;
				this.xpLost = data.xpLost ?? 0;
				this.queueFeedback('DECAY_WARNING', { days: data.daysInactive, lost: data.xpLost });
			}
		} catch (e) {
			// Graceful degradation — decay display skipped, no hard error shown
			console.warn('[DopamineEngine] decay sync skipped:', e);
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
