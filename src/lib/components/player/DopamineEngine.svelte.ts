import { browser } from '$app/environment';

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
		
		this.evaluateSkillDecay();
	}

	/**
	 * Core Drive 8: Loss Avoidance
	 * Calculates if the player missed 5+ consecutive days and applies decay.
	 */
	private evaluateSkillDecay() {
		if (!this.lastActiveDate) return;
		
		const today = new Date();
		const lastActive = new Date(this.lastActiveDate);
		const diffTime = Math.abs(today.getTime() - lastActive.getTime());
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays >= 5) {
			this.decayPenaltyApplied = true;
			// Drain fractions of inactive XP (mocked as static for now, would sync to DB)
			this.xpLost = Math.floor(diffDays * 15);
			
			// Visual behavioral reinforcement queue
			this.queueFeedback('DECAY_WARNING', { days: diffDays, lost: this.xpLost });
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
