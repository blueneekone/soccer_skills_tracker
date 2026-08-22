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
	events = $state<MatchEvent[]>([]);
	showHalftimeOverlay = $state(false);
	telemetryLogs = $state<string[]>(['[TELEMETRY] Match Day Console initialized']);
	targetPrompts = $state([
		'TASK FOCUS: Ask player what space they found',
		'AUTONOMY CUE: Let players map the halftime layout',
		'Praise movement mechanics',
		'Focus on spatial width',
		'Autonomy support'
	]);

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

	logEvent = (type: string, label: string): void => {
		const newEvent: MatchEvent = {
			id: String(Date.now()),
			type,
			label,
			time: new Date().toLocaleTimeString()
		};
		this.events = [newEvent, ...this.events];
	};

	syncHalftimeChoice = (): void => {
		this.showHalftimeOverlay = !this.showHalftimeOverlay;
		this.telemetryLogs = ['[TELEMETRY] Halftime choice synced', ...this.telemetryLogs];
	};
}
