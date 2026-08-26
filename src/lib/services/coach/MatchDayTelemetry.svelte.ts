import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { untrack } from 'svelte';

export interface MatchEvent {
	id: string;
	type: string;
	label: string;
	time: string;
}

export interface MatchDayPlayer {
	id: string;
	name: string;
	jersey?: string;
	position?: string;
	initials?: string;
	status?: 'starter' | 'bench';
}

function getTwoLetterInitials(name: string): string {
	if (!name) return 'PL';
	const parts = String(name).trim().split(/\s+/);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
	return String(name).slice(0, 2).toUpperCase() || 'PL';
}

export class MatchDayEngine {
	teamScope = new CoachTeamScope();
	isWhistleActive = $state(true);
	isShieldActive = $state(true);
	lockedUntil = $state(Date.now() + 15 * 60 * 1000);
	matchStatus = $state<'not_started' | 'running' | 'paused' | 'ended'>('not_started');
	elapsedSeconds = $state(0);
	events = $state<MatchEvent[]>([]);
	selectedPlayerId = $state('');
	matchId = $state('match_' + Date.now());
	roster = $state<MatchDayPlayer[]>([]);
	starters = $state<MatchDayPlayer[]>([]);
	bench = $state<MatchDayPlayer[]>([]);
	loadingRoster = $state<boolean>(false);
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

	async loadRoster(tid?: string): Promise<void> {
		const effectiveTeamId = tid || this.teamScope.selectedTeamId || authStore.teamId || authStore.userProfile?.teamId || authStore.user?.teamId || '';
		if (!effectiveTeamId) return;

		this.loadingRoster = true;
		try {
			const { getActiveDb } = await import('$lib/firebase.js');
			const { collection, getDocs, getDoc, doc, query, where } = await import('firebase/firestore');
			const db = getActiveDb();
			if (!db) return;

			const playerMap = new Map<string, MatchDayPlayer>();

			// 1. Fetch from player_lookup
			const lookupSnap = await getDocs(
				query(collection(db, 'player_lookup'), where('teamId', '==', effectiveTeamId))
			).catch(() => null);

			if (lookupSnap && lookupSnap.size > 0) {
				lookupSnap.forEach((d) => {
					const data = d.data() || {};
					const name = (typeof data.playerName === 'string' && data.playerName.trim()) ||
						(typeof data.displayName === 'string' && data.displayName.trim()) || d.id;
					const nameKey = name.toLowerCase();
					if (!playerMap.has(nameKey)) {
						playerMap.set(nameKey, {
							id: d.id,
							name,
							jersey: typeof data.jerseyNumber === 'string' ? data.jerseyNumber : (typeof data.jersey === 'string' ? data.jersey : ''),
							position: typeof data.position === 'string' ? data.position : '',
							initials: getTwoLetterInitials(name),
							status: 'starter',
						});
					}
				});
			}

			// 2. Fetch from rosters collection
			const rosterSnap = await getDoc(doc(db, 'rosters', effectiveTeamId)).catch(() => null);
			if (rosterSnap && rosterSnap.exists()) {
				const rData = rosterSnap.data() || {};
				const players = Array.isArray(rData.players) ? rData.players : [];
				const jerseys = (rData.jerseys && typeof rData.jerseys === 'object') ? rData.jerseys : {};

				players.forEach((pName: any) => {
					const name = String(pName).trim();
					if (!name) return;
					const nameKey = name.toLowerCase();
					const jersey = jerseys[name] || '';
					if (playerMap.has(nameKey)) {
						if (jersey && !playerMap.get(nameKey)!.jersey) {
							playerMap.get(nameKey)!.jersey = String(jersey);
						}
					} else {
						playerMap.set(nameKey, {
							id: name.replace(/\s+/g, '_').toLowerCase(),
							name,
							jersey: jersey ? String(jersey) : '',
							position: '',
							initials: getTwoLetterInitials(name),
							status: 'starter',
						});
					}
				});
			}

			const loaded = Array.from(playerMap.values());
			loaded.sort((a, b) => a.name.localeCompare(b.name));
			this.roster = loaded;

			if (loaded.length > 0) {
				const starterCount = Math.min(11, loaded.length);
				this.starters = loaded.slice(0, starterCount).map(p => ({ ...p, status: 'starter' }));
				this.bench = loaded.slice(starterCount).map(p => ({ ...p, status: 'bench' }));
			} else {
				this.starters = [];
				this.bench = [];
			}
		} catch (err) {
			console.warn('[MatchDayEngine] Error loading roster:', err);
		} finally {
			this.loadingRoster = false;
		}
	}

	subscribe(): void {
		$effect.root(() => {
			$effect(() => {
				this.teamScope.syncSelectedTeam();
			});

			$effect(() => {
				const tid = this.teamScope.selectedTeamId || authStore.teamId || authStore.userProfile?.teamId || '';
				if (!tid) return;
				untrack(() => {
					void this.loadRoster(tid);
				});
			});
		});
	}

	makeSubstitution = (starterId: string, benchPlayerId: string): void => {
		const outPlayer = this.starters.find(p => p.id === starterId);
		const inPlayer = this.bench.find(p => p.id === benchPlayerId);
		if (!outPlayer || !inPlayer) return;

		this.starters = this.starters.map(p => p.id === starterId ? { ...inPlayer, status: 'starter' } : p);
		this.bench = this.bench.map(p => p.id === benchPlayerId ? { ...outPlayer, status: 'bench' } : p);

		this.logEvent('SUB', `SUB: ${inPlayer.name} IN ↗ for ${outPlayer.name} OUT ↘`, inPlayer.id);
		this.telemetryLogs = [`[SUB] ${inPlayer.name} entered replacing ${outPlayer.name}`, ...this.telemetryLogs];
	};

	moveToBench = (playerId: string): void => {
		const p = this.starters.find(x => x.id === playerId);
		if (!p) return;
		this.starters = this.starters.filter(x => x.id !== playerId);
		this.bench = [...this.bench, { ...p, status: 'bench' }];
		this.logEvent('SUB', `${p.name} moved to bench`, p.id);
	};

	moveToStarters = (playerId: string): void => {
		const p = this.bench.find(x => x.id === playerId);
		if (!p) return;
		this.bench = this.bench.filter(x => x.id !== playerId);
		this.starters = [...this.starters, { ...p, status: 'starter' }];
		this.logEvent('SUB', `${p.name} promoted to starting lineup`, p.id);
	};

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
