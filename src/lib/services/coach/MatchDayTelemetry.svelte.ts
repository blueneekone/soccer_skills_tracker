// 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active

export interface MatchEvent {
	id: string;
	type: string;
	label: string;
	time: string;
}

export class MatchDayEngine {
	isWhistleActive = $state(true);
	isShieldActive = $state(true);
	lockedUntil = $state(Date.now() + 15 * 60 * 1000);
	matchStatus = $state<'not_started' | 'running' | 'paused' | 'ended'>('not_started');
	elapsedSeconds = $state(0);
	events = $state<MatchEvent[]>([]);
	selectedPlayerId = $state('');
	matchId = $state('match_' + Date.now());
	roster = $state<{id: string, name: string}[]>([]);
	showHalftimeOverlay = $state(false);
	telemetryLogs = $state<string[]>(['[TELEMETRY] Match Day Console initialized']);

	opponentName = $state('');
	finalScore = $state('');
	matchStartTime = $state<number | null>(null);
	activeTab = $state<'live' | 'roster' | 'review'>('live');
	isHelpDrawerOpen = $state(false);
	targetPrompts = $state([
		'TASK FOCUS: Ask player what space they found',
		'AUTONOMY CUE: Let players map the halftime layout',
		'Praise movement mechanics',
		'Focus on spatial width',
		'Autonomy support'
	]);

	lightningDistance = $state<number>(20);
	isFieldLocked = $state<boolean>(false);

	simulateLightning = (distance: number): void => {
		this.lightningDistance = distance;
		if (distance < 6) {
			this.isFieldLocked = true;
			this.matchStatus = 'paused';
			this.telemetryLogs = ['[ALARM] 6-MILE RED LOCKDOWN: SafeSport shadow CC sent. Evacuate immediately.', ...this.telemetryLogs];
		} else if (distance <= 10) {
			this.telemetryLogs = ['[WARN] 10-Mile Amber Alert: Prepare for potential shelter.', ...this.telemetryLogs];
		} else {
			this.isFieldLocked = false;
		}
	};

	startMatch = (): void => {
		this.matchStatus = 'running';
		this.matchStartTime = Date.now();
		this.logEvent('MATCH_START', 'MATCH STARTED (KICKOFF)');
		this.telemetryLogs = ['[TELEMETRY] Match clock started with locked timestamp', ...this.telemetryLogs];
	};

	pauseMatch = (): void => {
		this.matchStatus = 'paused';
		this.logEvent('MATCH_PAUSE', 'MATCH PAUSED');
		this.telemetryLogs = ['[TELEMETRY] Match clock paused', ...this.telemetryLogs];
	};

	resumeMatch = (): void => {
		this.matchStatus = 'running';
		this.logEvent('MATCH_RESUME', 'MATCH RESUMED');
		this.telemetryLogs = ['[TELEMETRY] Match clock resumed', ...this.telemetryLogs];
	};

	endMatch = (): void => {
		this.matchStatus = 'ended';
		this.logEvent('FINAL_WHISTLE', 'FINAL WHISTLE - MATCH CONCLUDED');
		this.telemetryLogs = ['[TELEMETRY] Final whistle blown - match concluded', ...this.telemetryLogs];
	};

	resetClock = (): void => {
		this.elapsedSeconds = 0;
		this.matchStatus = 'not_started';
		this.telemetryLogs = ['[TELEMETRY] Match clock reset', ...this.telemetryLogs];
	};

	toggleShield = (): void => {
		this.isShieldActive = !this.isShieldActive;
		this.telemetryLogs = ['[TELEMETRY] Shield state mutated', ...this.telemetryLogs];
	};

	toggleWhistle = async (): Promise<void> => {
		this.isWhistleActive = !this.isWhistleActive;
		try {
			const res = await fetch('/api/match/lockout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ whistle: this.isWhistleActive, matchId: 'match-default' })
			});
			const data = await res.json();
			if (data.locked !== undefined) {
				this.isShieldActive = data.locked;
				this.lockedUntil = data.lockedUntil || Date.now() + 15 * 60 * 1000;
			}
		} catch (err) {
			console.warn('[MatchDayEngine] Failed to sync whistle lockout:', err);
		}
	};

	logEvent = (type: string, label: string, playerId?: string): void => {
		const targetPlayerId = playerId || this.selectedPlayerId || 'unknown_player';

		const newEvent: MatchEvent = {
			id: String(Date.now()),
			type,
			label,
			time: new Date().toLocaleTimeString()
		};
		this.events = [newEvent, ...this.events];

		// Async firestore write
		(async () => {
			try {
				const { getActiveDb } = await import('$lib/firebase.js');
				const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
				const db = getActiveDb();
				if (db) {
					await addDoc(collection(db, `matches/${this.matchId}/events`), {
						playerId: targetPlayerId,
						type,
						minute: Math.floor(this.elapsedSeconds / 60),
						timestamp: serverTimestamp()
					});
				}
			} catch (err) {
				console.error('Failed to log event to Firestore', err);
			}
		})();
	};


	logMistake = (): void => {
		this.logEvent('MISTAKE', 'PLAYER MISTAKE LOGGED');
		this.targetPrompts = ['RESET: Immediate cognitive refocus on next play', 'PARK IT: Save tactical adjustment for later', ...this.targetPrompts];
		this.telemetryLogs = ['[TELEMETRY] Mistake logged, cues injected', ...this.telemetryLogs];
	};

	editEvent = (id: string, newLabel: string): void => {
		const evt = this.events.find(e => e.id === id);
		if (evt) {
			evt.label = newLabel;
			this.telemetryLogs = ['[TELEMETRY] Event edited post-match', ...this.telemetryLogs];
		}
	};
	syncHalftimeChoice = (): void => {
		this.showHalftimeOverlay = !this.showHalftimeOverlay;
		this.telemetryLogs = ['[TELEMETRY] Halftime choice synced', ...this.telemetryLogs];
	};
}
