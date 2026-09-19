import { browser } from '$app/environment';
import { page } from '$app/state';
import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	serverTimestamp,
	setDoc,
	deleteField,
	where,
} from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
import { normalizeLiveStreamUrl } from '$lib/live-stream/liveStreamEmbed.js';

export interface Operative { id: string; shortId: string; name: string; role: string; }
export type PadTone = 'emerald' | 'rose' | 'cyan';
export interface TelemetryPadDef { id: string; label: string; tone: PadTone; }
export interface FeedLine { id: string; matchTs: string; line: string; tone: PadTone; }
export type MatchState = 'not_started' | 'running' | 'paused' | 'ended';

export const TELEMETRY_PAD: readonly TelemetryPadDef[] = [
	{ id: 'GOAL', label: 'GOAL', tone: 'emerald' },
	{ id: 'SHOT_ON_TARGET', label: 'SHOT ON TARGET', tone: 'emerald' },
	{ id: 'TACKLE_WON', label: 'TACKLE WON', tone: 'emerald' },
	{ id: 'FOUL', label: 'FOUL', tone: 'rose' },
	{ id: 'TURNOVER', label: 'TURNOVER', tone: 'rose' },
	{ id: 'PASS_COMPLETED', label: 'PASS COMPLETED', tone: 'cyan' },
];

export const ACTION_POINTS: Record<string, number> = {
	GOAL: 10, SHOT_ON_TARGET: 3, TACKLE_WON: 5, FOUL: 0, TURNOVER: 0, PASS_COMPLETED: 1,
};

export class CoachMatchDayViewEngine {
	teamScope = new CoachTeamScope({
		preferUrlTeamId: () => page.url.searchParams.get('teamId'),
		includeDirector: false,
	});

	customMatchId = $state('');
	matchState = $state<MatchState>('not_started');
	savedMatches = $state<Array<Record<string, unknown> & { id: string }>>([]);
	savedMatchesLoading = $state(false);
	operatives = $state<Operative[]>([]);
	rosterLoading = $state(false);
	activeTarget = $state<string | null>(null);

	homeScore = $state(0);
	awayScore = $state(0);
	scoreFlashHome = $state(false);
	scoreFlashAway = $state(false);

	elapsedSeconds = $state(0);
	eventFeed = $state<FeedLine[]>([]);
	feedScrollRoot = $state<HTMLDivElement | undefined>(undefined);
	flashActionId = $state<string | null>(null);

	liveStreamUrl = $state('');
	liveStreamDraft = $state('');
	liveStreamErr = $state('');
	liveStreamSaving = $state(false);

	fieldLocation = $state('');
	opponentTeam = $state('');
	gameDayActiveRoster = $state<Set<string>>(new Set());

	role = $derived(this.teamScope.role);
	myTeams = $derived(this.teamScope.myTeams);

	activeTeamLabel = $derived.by(() => {
		const n = typeof this.teamScope.currentTeam?.name === 'string' ? this.teamScope.currentTeam.name.trim() : '';
		return n ? n.toUpperCase() : 'YOUR SQUAD';
	});

	sessionMatchId = $derived.by(() => {
		if (this.customMatchId.trim()) return this.customMatchId.trim().slice(0, 128);
		const tid = this.teamScope.selectedTeamId?.trim();
		if (!tid) return '';
		const d = new Date();
		const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		return `md_${tid}_${ds}`.slice(0, 128);
	});

	activeOperative = $derived(
		this.operatives.find((o) => o.id === this.activeTarget) ?? this.operatives[0] ?? null,
	);

	matchPeriodLabel = $derived.by(() => {
		if (this.elapsedSeconds < 45 * 60) return '1ST HALF';
		if (this.elapsedSeconds < 90 * 60) return '2ND HALF';
		return 'EXTRA TIME';
	});

	matchClockDisplay = $derived.by(() => {
		const t = Math.max(0, this.elapsedSeconds);
		const m = Math.floor(t / 60);
		const s = t % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	});

	constructor() {
		$effect(() => { this.teamScope.syncSelectedTeam(); });

		$effect(() => {
			if (!browser) return;
			let id: number | null = null;
			if (this.matchState === 'running') id = window.setInterval(() => { this.elapsedSeconds += 1; }, 1000);
			return () => { if (id) window.clearInterval(id); };
		});

		$effect(() => {
			if (!browser || authStore.isLoading || !authStore.isAuthenticated || !db) return;
			const tid = this.teamScope.selectedTeamId?.trim();
			if (!tid) {
				this.operatives = [];
				this.activeTarget = null;
				this.rosterLoading = false;
				return;
			}
			let cancelled = false;
			this.rosterLoading = true;

			void (async () => {
				try {
					const lookupSnap = await getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', tid)));
					if (cancelled) return;
					let rows: Operative[] = [];
					lookupSnap.forEach((d) => {
						const data = d.data();
						const name = typeof data.playerName === 'string' && data.playerName.trim() ? data.playerName.trim() : '';
						if (!name) return;
						const pos = typeof data.position === 'string' && data.position.trim() ? String(data.position).trim().toUpperCase().slice(0, 3) : 'MID';
						const sid = d.id.length > 14 ? d.id.slice(0, 10).toUpperCase() + '…' : d.id.toUpperCase();
						rows = [...rows, { id: d.id, shortId: sid, name, role: pos }];
					});
					rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
					this.operatives = rows;
					if (this.gameDayActiveRoster.size === 0) this.gameDayActiveRoster = new Set(rows.map((r) => r.id));
				} catch (e) {
					console.error('[Match Logger] roster', e);
					if (!cancelled) this.operatives = [];
				} finally {
					if (!cancelled) this.rosterLoading = false;
				}
				if (!cancelled && this.operatives.length) {
					const activeOps = this.operatives.filter((o) => this.gameDayActiveRoster.has(o.id));
					const still = activeOps.some((o) => o.id === this.activeTarget);
					if (!still && activeOps.length > 0) this.activeTarget = activeOps[0].id;
				}
			})();
			return () => { cancelled = true; };
		});

		$effect(() => {
			if (!browser || authStore.isLoading || !authStore.isAuthenticated || !db) return;
			const tid = this.teamScope.selectedTeamId?.trim();
			const mid = this.sessionMatchId;
			if (!tid || !mid) return;

			let cancelled = false;
			void (async () => {
				try {
					void this.loadSavedMatches();
					const sessionSnap = await getDoc(doc(db, 'teams', tid, 'match_sessions', mid));
					if (cancelled) return;
					if (sessionSnap.exists()) {
						const data = sessionSnap.data();
						if (typeof data.homeScore === 'number') this.homeScore = Math.max(0, data.homeScore);
						if (typeof data.awayScore === 'number') this.awayScore = Math.max(0, data.awayScore);
						if (typeof data.elapsedSeconds === 'number') this.elapsedSeconds = Math.max(0, data.elapsedSeconds);
						if (typeof data.matchState === 'string' && ['not_started', 'running', 'paused', 'ended'].includes(data.matchState)) {
							this.matchState = (data.matchState === 'running' ? 'paused' : data.matchState) as MatchState;
						}
						const stream = typeof data.liveStreamUrl === 'string' ? data.liveStreamUrl.trim() : '';
						this.liveStreamUrl = stream;
						this.liveStreamDraft = stream;
						if (typeof data.fieldLocation === 'string') this.fieldLocation = data.fieldLocation;
						if (typeof data.opponentTeam === 'string') this.opponentTeam = data.opponentTeam;
						if (Array.isArray(data.gameDayRoster)) this.gameDayActiveRoster = new Set(data.gameDayRoster);
					} else {
						this.liveStreamUrl = '';
						this.liveStreamDraft = '';
					}

					const snap = await getDocs(query(collection(db, 'teams', tid, 'telemetry_events'), where('matchId', '==', mid), orderBy('timestamp', 'asc')));
					if (cancelled) return;
					const lines: FeedLine[] = [];
					let goalsFromEvents = 0;
					let oppGoalsFromEvents = 0;
					snap.forEach((docSnap) => {
						const data = docSnap.data();
						if (typeof data.line !== 'string' || !data.line) return;
						if (data.action === 'GOAL') goalsFromEvents += 1;
						if (data.action === 'OPPONENT_GOAL') oppGoalsFromEvents += 1;
						lines.push({
							id: docSnap.id,
							matchTs: typeof data.matchTs === 'string' ? data.matchTs : '',
							line: data.line,
							tone: (data.tone === 'emerald' || data.tone === 'rose' ? data.tone : 'cyan') as PadTone,
						});
					});
					if (!sessionSnap.exists()) {
						this.homeScore = goalsFromEvents;
						this.awayScore = oppGoalsFromEvents;
					}
					if (!cancelled && lines.length > 0) this.eventFeed = lines;
				} catch (e) {
					console.error('[MatchDay] session hydrate', e);
				}
			})();
			return () => { cancelled = true; };
		});

		$effect(() => {
			this.eventFeed;
			queueMicrotask(() => {
				const el = this.feedScrollRoot;
				if (el) el.scrollTop = el.scrollHeight;
			});
		});
	}

	async loadSavedMatches() {
		const tid = this.teamScope.selectedTeamId?.trim();
		if (!tid || !db || !authStore.isAuthenticated) return;
		try {
			this.savedMatchesLoading = true;
			const snap = await getDocs(query(collection(db, 'teams', tid, 'match_sessions'), orderBy('updatedAt', 'desc'), limit(25)));
			const list: Array<Record<string, unknown> & { id: string }> = [];
			snap.forEach((d) => { list.push({ id: d.id, ...d.data() }); });
			this.savedMatches = list;
		} catch (e) {
			console.warn('[MatchDay] load saved matches', e);
		} finally {
			this.savedMatchesLoading = false;
		}
	}

	async persistMatchSession() {
		if (!db || !authStore.isAuthenticated) return;
		const tid = this.teamScope.selectedTeamId?.trim();
		const mid = this.sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;
		try {
			const payload: Record<string, unknown> = {
				teamId: tid,
				clubId: this.teamScope.teamClubId || '',
				matchId: mid,
				homeScore: this.homeScore,
				awayScore: this.awayScore,
				fieldLocation: this.fieldLocation,
				opponentTeam: this.opponentTeam,
				elapsedSeconds: this.elapsedSeconds,
				matchState: this.matchState,
				gameDayRoster: Array.from(this.gameDayActiveRoster),
				updatedBy: uid,
				updatedAt: serverTimestamp(),
			};
			if (this.liveStreamUrl) payload.liveStreamUrl = this.liveStreamUrl;
			await setDoc(doc(db, 'teams', tid, 'match_sessions', mid), payload, { merge: true });
			void this.loadSavedMatches();
		} catch (e) {
			console.error('[MatchDay] persist session', e);
		}
	}

	async startMatch() {
		if (!db || !authStore.isAuthenticated) return;
		this.matchState = 'running';
		const matchTs = this.formatMatchTs(this.elapsedSeconds);
		const line = `[${matchTs}] MATCH >> START / KICKOFF`;
		this.eventFeed = [...this.eventFeed, { id: `ev_${Date.now()}_start`, matchTs, line, tone: 'emerald' }];
		const tid = this.teamScope.selectedTeamId?.trim();
		const mid = this.sessionMatchId;
		const uid = authStore.user?.uid;
		if (tid && mid && uid) {
			try {
				await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
					teamId: tid, clubId: this.teamScope.teamClubId || '', matchId: mid, playerId: 'match_system', action: 'MATCH_START', points: 0, matchTs, line, tone: 'emerald', loggedBy: uid, timestamp: serverTimestamp(),
				});
				await this.persistMatchSession();
			} catch (e) {
				console.error('[MatchDay] start error', e);
			}
		}
	}

	pauseMatch() {
		this.matchState = 'paused';
		const matchTs = this.formatMatchTs(this.elapsedSeconds);
		this.eventFeed = [...this.eventFeed, { id: `ev_${Date.now()}_pause`, matchTs, line: `[${matchTs}] MATCH >> PAUSED`, tone: 'cyan' }];
		void this.persistMatchSession();
	}

	resumeMatch() {
		this.matchState = 'running';
		const matchTs = this.formatMatchTs(this.elapsedSeconds);
		this.eventFeed = [...this.eventFeed, { id: `ev_${Date.now()}_resume`, matchTs, line: `[${matchTs}] MATCH >> RESUMED`, tone: 'cyan' }];
		void this.persistMatchSession();
	}

	async endMatch() {
		if (!db || !authStore.isAuthenticated) return;
		this.matchState = 'ended';
		const matchTs = this.formatMatchTs(this.elapsedSeconds);
		const line = `[${matchTs}] MATCH >> FINAL WHISTLE (${this.homeScore} - ${this.awayScore})`;
		this.eventFeed = [...this.eventFeed, { id: `ev_${Date.now()}_end`, matchTs, line, tone: 'rose' }];
		const tid = this.teamScope.selectedTeamId?.trim();
		const mid = this.sessionMatchId;
		const uid = authStore.user?.uid;
		if (tid && mid && uid) {
			try {
				await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
					teamId: tid, clubId: this.teamScope.teamClubId || '', matchId: mid, playerId: 'match_system', action: 'MATCH_END', points: 0, matchTs, line, tone: 'rose', loggedBy: uid, timestamp: serverTimestamp(),
				});
				await this.persistMatchSession();
			} catch (e) {
				console.error('[MatchDay] end error', e);
			}
		}
	}

	createNewMatch() {
		const tid = this.teamScope.selectedTeamId?.trim() || 'team';
		const timestamp = Date.now();
		const d = new Date();
		const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		this.customMatchId = `md_${tid}_${ds}_${timestamp}`.slice(0, 128);
		this.homeScore = 0;
		this.awayScore = 0;
		this.elapsedSeconds = 0;
		this.matchState = 'not_started';
		this.eventFeed = [];
		this.opponentTeam = '';
		this.fieldLocation = '';
		this.liveStreamUrl = '';
		this.liveStreamDraft = '';
		void this.persistMatchSession();
	}

	selectSavedMatch(mId: string) { this.customMatchId = mId; }

	async saveLiveStreamUrl() {
		if (!db || !authStore.isAuthenticated) return;
		const tid = this.teamScope.selectedTeamId?.trim();
		const mid = this.sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;

		const raw = this.liveStreamDraft.trim();
		this.liveStreamErr = '';
		if (!raw) {
			this.liveStreamUrl = '';
			this.liveStreamSaving = true;
			try {
				await setDoc(doc(db, 'teams', tid, 'match_sessions', mid), { teamId: tid, matchId: mid, homeScore: this.homeScore, awayScore: this.awayScore, liveStreamUrl: deleteField(), updatedBy: uid, updatedAt: serverTimestamp() }, { merge: true });
			} catch (e) {
				this.liveStreamErr = e instanceof Error ? e.message : 'Could not clear stream URL.';
			} finally {
				this.liveStreamSaving = false;
			}
			return;
		}

		const normalized = normalizeLiveStreamUrl(raw);
		if (!normalized) {
			this.liveStreamErr = 'Use a YouTube, Vimeo, or Mux watch link.';
			return;
		}

		this.liveStreamSaving = true;
		try {
			this.liveStreamUrl = normalized;
			this.liveStreamDraft = normalized;
			await setDoc(doc(db, 'teams', tid, 'match_sessions', mid), { teamId: tid, clubId: this.teamScope.teamClubId || '', matchId: mid, homeScore: this.homeScore, awayScore: this.awayScore, liveStreamUrl: normalized, updatedBy: uid, updatedAt: serverTimestamp() }, { merge: true });
		} catch (e) {
			this.liveStreamErr = e instanceof Error ? e.message : 'Could not save stream URL.';
		} finally {
			this.liveStreamSaving = false;
		}
	}

	async bumpScore(side: 'home' | 'away') {
		if (!db || !authStore.isAuthenticated) return;
		if (side === 'home') {
			this.homeScore += 1;
			this.scoreFlashHome = true;
			window.setTimeout(() => { this.scoreFlashHome = false; }, 150);
		} else {
			this.awayScore += 1;
			this.scoreFlashAway = true;
			window.setTimeout(() => { this.scoreFlashAway = false; }, 150);
		}
		const matchTs = this.formatMatchTs(this.elapsedSeconds);
		const line = side === 'home' ? `[${matchTs}] SQUAD >> GOAL` : `[${matchTs}] ENEMY >> GOAL`;
		this.eventFeed = [...this.eventFeed, { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, matchTs, line, tone: side === 'home' ? 'emerald' : 'rose' }];
		const tid = this.teamScope.selectedTeamId?.trim();
		const mid = this.sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;
		try {
			await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
				teamId: tid, clubId: this.teamScope.teamClubId || '', matchId: mid, playerId: side === 'home' ? this.activeOperative?.id || 'squad' : 'opponent', action: side === 'home' ? 'GOAL' : 'OPPONENT_GOAL', points: side === 'home' ? 10 : 0, matchTs, line, tone: side === 'home' ? 'emerald' : 'rose', loggedBy: uid, timestamp: serverTimestamp(),
			});
			await this.persistMatchSession();
		} catch (e) {
			console.error('[MatchDay] score bump', e);
		}
	}

	formatMatchTs(totalSeconds: number) {
		const t = Math.max(0, totalSeconds);
		const m = Math.floor(t / 60);
		const s = t % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	flashTelemetryButton(actionId: string) {
		this.flashActionId = actionId;
		window.setTimeout(() => { this.flashActionId = null; }, 150);
	}

	async logTelemetryEvent(actionType: string, tone: PadTone) {
		if (!db || !authStore.isAuthenticated) return;
		const op = this.activeOperative;
		if (!op) return;

		const matchTs = this.formatMatchTs(this.elapsedSeconds);
		const tag = this.operativeTelemetryTag(op);
		const line = `[${matchTs}] ${tag} >> ${actionType}`;

		this.eventFeed = [...this.eventFeed, { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, matchTs, line, tone }];

		if (actionType === 'GOAL') {
			this.homeScore += 1;
			this.scoreFlashHome = true;
			window.setTimeout(() => { this.scoreFlashHome = false; }, 150);
			void this.persistMatchSession();
		}

		const tid = this.teamScope.selectedTeamId?.trim();
		const mid = this.sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;
		try {
			await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
				teamId: tid, clubId: this.teamScope.teamClubId || '', matchId: mid, playerId: op.id, action: actionType, points: ACTION_POINTS[actionType] ?? 0, matchTs, line, tone, loggedBy: uid, timestamp: serverTimestamp(),
			});
		} catch (e) {
			console.error('[MatchDay] persist event', e);
		}
	}

	fireAction(a: TelemetryPadDef) {
		void this.logTelemetryEvent(a.id, a.tone);
		this.flashTelemetryButton(a.id);
	}

	stripAbbr(op: Operative) { return op.role.slice(0, 3).toUpperCase(); }

	operativeTelemetryTag(op: Operative) {
		const raw = op.shortId.trim();
		if (/^OP-\d{1,2}$/i.test(raw)) {
			const n = raw.match(/^OP-(\d{1,2})$/i)?.[1] ?? '0';
			return `OP-${n.padStart(2, '0')}`;
		}
		const i = this.operatives.findIndex((x) => x.id === op.id);
		return i >= 0 ? `OP-${String(i + 1).padStart(2, '0')}` : 'OP-??';
	}

	rosterGlyph(op: Operative) {
		const t = this.operativeTelemetryTag(op);
		const m = /^OP-(\d{2})$/i.exec(t);
		return m ? m[1] : t.replace(/^OP-?/i, '').slice(0, 2).toUpperCase();
	}

	feedLineClass(entry: FeedLine, idx: number) {
		const n = this.eventFeed.length;
		const isLatest = n > 0 && idx === n - 1;
		if (isLatest) return 'coach-match-z1-log__line coach-match-z1-log__line--latest';
		if (entry.tone === 'rose') return 'coach-match-z1-log__line coach-match-z1-log__line--warn';
		return 'coach-match-z1-log__line';
	}

	padClass(a: TelemetryPadDef) {
		const tone = a.tone === 'rose' ? 'coach-match-pad--warn' : a.tone === 'emerald' ? 'coach-match-pad--positive' : '';
		const flash = this.flashActionId === a.id ? 'coach-match-pad--flash' : '';
		return `coach-match-pad ${tone} ${flash}`.trim();
	}
}
