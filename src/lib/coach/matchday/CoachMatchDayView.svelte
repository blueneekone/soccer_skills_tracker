<script>
	import '$lib/styles/coach-match-day-scoreboard.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import {
		addDoc,
		collection,
		doc,
		getDoc,
		getDocs,
		limit,
		onSnapshot,
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
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * @typedef {{ id: string; shortId: string; name: string; role: string }} Operative
	 * @typedef {'emerald' | 'rose' | 'cyan'} PadTone
	 * @typedef {{ id: string; label: string; tone: PadTone }} TelemetryPadDef
	 * @typedef {{ id: string; matchTs: string; line: string; tone: PadTone }} FeedLine
	 * @typedef {'not_started' | 'running' | 'paused' | 'ended'} MatchState
	 */

	/** Strict Arc Reactor grid: 2×3 — order row-major */
	const TELEMETRY_PAD = /** @type {const} */ ([
		{ id: 'GOAL', label: 'GOAL', tone: 'emerald' },
		{ id: 'SHOT_ON_TARGET', label: 'SHOT ON TARGET', tone: 'emerald' },
		{ id: 'TACKLE_WON', label: 'TACKLE WON', tone: 'emerald' },
		{ id: 'FOUL', label: 'FOUL', tone: 'rose' },
		{ id: 'TURNOVER', label: 'TURNOVER', tone: 'rose' },
		{ id: 'PASS_COMPLETED', label: 'PASS COMPLETED', tone: 'cyan' },
	]);

	/** XP points per telemetry action — mirrors MatchLogger.svelte LIVE_ACTION table. */
	const ACTION_POINTS = /** @type {Record<string, number>} */ ({
		GOAL: 10,
		SHOT_ON_TARGET: 3,
		TACKLE_WON: 5,
		FOUL: 0,
		TURNOVER: 0,
		PASS_COMPLETED: 1,
	});

	const teamScope = new CoachTeamScope({
		preferUrlTeamId: () => page.url.searchParams.get('teamId'),
		includeDirector: false,
	});
	$effect(() => {
		teamScope.syncSelectedTeam();
	});

	const role = $derived(teamScope.role);
	const myTeams = $derived(teamScope.myTeams);

	const activeTeamLabel = $derived.by(() => {
		const n = typeof teamScope.currentTeam?.name === 'string' ? teamScope.currentTeam.name.trim() : '';
		return n ? n.toUpperCase() : 'YOUR SQUAD';
	});

	let customMatchId = $state('');

	/** Date-scoped session match ID — stable across reloads within the same calendar day. */
	const sessionMatchId = $derived.by(() => {
		if (customMatchId.trim()) return customMatchId.trim().slice(0, 128);
		const tid = teamScope.selectedTeamId?.trim();
		if (!tid) return '';
		const d = new Date();
		const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		return `md_${tid}_${ds}`.slice(0, 128);
	});

	/** Match state: 'not_started' | 'running' | 'paused' | 'ended' */
	/** @type {MatchState} */
	let matchState = $state('not_started');

	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let savedMatches = $state([]);
	let savedMatchesLoading = $state(false);

	/** @type {Operative[]} */
	let operatives = $state([]);
	let rosterLoading = $state(false);

	/** Active asset for next telemetry log */
	let activeTarget = $state(/** @type {string | null} */ (null));

	let homeScore = $state(0);
	let awayScore = $state(0);
	let scoreFlashHome = $state(false);
	let scoreFlashAway = $state(false);

	/** Match elapsed seconds (live sideline clock) */
	let elapsedSeconds = $state(0);

	/** @type {FeedLine[]} */
	let eventFeed = $state([]);

	let feedScrollRoot = $state(/** @type {HTMLDivElement | undefined} */ (undefined));

	/** @type {string | null} */
	let flashActionId = $state(null);

	let liveStreamUrl = $state('');
	let liveStreamDraft = $state('');
	let liveStreamErr = $state('');
	let liveStreamSaving = $state(false);

	let fieldLocation = $state('');
	let opponentTeam = $state('');
	/** @type {Set<string>} */
	let gameDayActiveRoster = $state(new Set());

	// Game Clock Ticker — only runs when matchState === 'running'
	$effect(() => {
		if (!browser) return;
		/** @type {number | null} */
		let id = null;
		if (matchState === 'running') {
			id = window.setInterval(() => {
				elapsedSeconds += 1;
			}, 1000);
		}
		return () => {
			if (id) window.clearInterval(id);
		};
	});

	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.isAuthenticated) return;

		const tid = teamScope.selectedTeamId?.trim();
		if (!tid) {
			operatives = [];
			activeTarget = null;
			rosterLoading = false;
			return;
		}

		let cancelled = false;
		rosterLoading = true;

		void (async () => {
			try {
				const lookupSnap = await getDocs(
					query(collection(db, 'player_lookup'), where('teamId', '==', tid)),
				);
				if (cancelled) return;

				/** @type {Operative[]} */
				let rows = [];
				lookupSnap.forEach((d) => {
					const data = d.data();
					const name =
						typeof data.playerName === 'string' && data.playerName.trim() ?
							data.playerName.trim()
						:	'';
					if (!name) return;
					const pos =
						typeof data.position === 'string' && data.position.trim() ?
							String(data.position).trim().toUpperCase().slice(0, 3)
						:	'MID';
					const sid =
						d.id.length > 14 ? d.id.slice(0, 10).toUpperCase() + 'â€¦' : d.id.toUpperCase();
					rows = [...rows, { id: d.id, shortId: sid, name, role: pos }];
				});
				rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				operatives = rows;
				// default all to active if no session data yet
				if (gameDayActiveRoster.size === 0) {
					gameDayActiveRoster = new Set(rows.map(r => r.id));
				}
			} catch (e) {
				console.error('[Match Logger] roster', e);
				if (!cancelled) operatives = [];
			} finally {
				if (!cancelled) rosterLoading = false;
			}
			if (!cancelled && operatives.length) {
				const activeOps = operatives.filter(o => gameDayActiveRoster.has(o.id));
				const still = activeOps.some((o) => o.id === activeTarget);
				if (!still && activeOps.length > 0) activeTarget = activeOps[0].id;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	async function loadSavedMatches() {
		const tid = teamScope.selectedTeamId?.trim();
		if (!tid || !db || !authStore.isAuthenticated) return;
		try {
			savedMatchesLoading = true;
			const q = query(
				collection(db, 'teams', tid, 'match_sessions'),
				orderBy('updatedAt', 'desc'),
				limit(25),
			);
			const snap = await getDocs(q);
			/** @type {Array<Record<string, unknown> & { id: string }>} */
			const list = [];
			snap.forEach((d) => {
				list.push({ id: d.id, ...d.data() });
			});
			savedMatches = list;
		} catch (e) {
			console.warn('[MatchDay] load saved matches', e);
		} finally {
			savedMatchesLoading = false;
		}
	}

	/** Hydrate scores + eventFeed from Firestore whenever the team or session match changes. */
	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.isAuthenticated) return;
		const tid = teamScope.selectedTeamId?.trim();
		const mid = sessionMatchId;
		if (!tid || !mid) return;

		let cancelled = false;
		void (async () => {
			try {
				void loadSavedMatches();
				const sessionSnap = await getDoc(doc(db, 'teams', tid, 'match_sessions', mid));
				if (cancelled) return;
				if (sessionSnap.exists()) {
					const data = sessionSnap.data();
					if (typeof data.homeScore === 'number') homeScore = Math.max(0, data.homeScore);
					if (typeof data.awayScore === 'number') awayScore = Math.max(0, data.awayScore);
					if (typeof data.elapsedSeconds === 'number') elapsedSeconds = Math.max(0, data.elapsedSeconds);
					if (typeof data.matchState === 'string' && ['not_started', 'running', 'paused', 'ended'].includes(data.matchState)) {
						matchState = /** @type {MatchState} */ (data.matchState === 'running' ? 'paused' : data.matchState);
					}
					const stream =
						typeof data.liveStreamUrl === 'string' ? data.liveStreamUrl.trim() : '';
					liveStreamUrl = stream;
					liveStreamDraft = stream;
					if (typeof data.fieldLocation === 'string') fieldLocation = data.fieldLocation;
					if (typeof data.opponentTeam === 'string') opponentTeam = data.opponentTeam;
					if (Array.isArray(data.gameDayRoster)) {
						gameDayActiveRoster = new Set(data.gameDayRoster);
					}
				} else {
					liveStreamUrl = '';
					liveStreamDraft = '';
				}

				const snap = await getDocs(
					query(
						collection(db, 'teams', tid, 'telemetry_events'),
						where('matchId', '==', mid),
						orderBy('timestamp', 'asc'),
					),
				);
				if (cancelled) return;
				/** @type {FeedLine[]} */
				const lines = [];
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
						tone: /** @type {PadTone} */ (
							data.tone === 'emerald' || data.tone === 'rose' ? data.tone : 'cyan'
						),
					});
				});
				if (!sessionSnap.exists()) {
					homeScore = goalsFromEvents;
					awayScore = oppGoalsFromEvents;
				}
				if (!cancelled && lines.length > 0) eventFeed = lines;
			} catch (e) {
				console.error('[MatchDay] session hydrate', e);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function persistMatchSession() {
		if (!db || !authStore.isAuthenticated) return;
		const tid = teamScope.selectedTeamId?.trim();
		const mid = sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;
		try {
			/** @type {Record<string, unknown>} */
			const payload = {
				teamId: tid,
				clubId: teamScope.teamClubId || '',
				matchId: mid,
				homeScore,
				awayScore,
				fieldLocation,
				opponentTeam,
				elapsedSeconds,
				matchState,
				gameDayRoster: Array.from(gameDayActiveRoster),
				updatedBy: uid,
				updatedAt: serverTimestamp(),
			};
			if (liveStreamUrl) {
				payload.liveStreamUrl = liveStreamUrl;
			}
			await setDoc(doc(db, 'teams', tid, 'match_sessions', mid), payload, { merge: true });
			void loadSavedMatches();
		} catch (e) {
			console.error('[MatchDay] persist session', e);
		}
	}

	async function startMatch() {
		matchState = 'running';
		const matchTs = formatMatchTs(elapsedSeconds);
		const line = `[${matchTs}] MATCH >> START / KICKOFF`;
		eventFeed = [
			...eventFeed,
			{
				id: `ev_${Date.now()}_start`,
				matchTs,
				line,
				tone: 'emerald',
			},
		];
		const tid = teamScope.selectedTeamId?.trim();
		const mid = sessionMatchId;
		const uid = authStore.user?.uid;
		if (tid && mid && uid && db) {
			try {
				await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
					teamId: tid,
					clubId: teamScope.teamClubId || '',
					matchId: mid,
					playerId: 'match_system',
					action: 'MATCH_START',
					points: 0,
					matchTs,
					line,
					tone: 'emerald',
					loggedBy: uid,
					timestamp: serverTimestamp(),
				});
				await persistMatchSession();
			} catch (e) {
				console.error('[MatchDay] start error', e);
			}
		}
	}

	function pauseMatch() {
		matchState = 'paused';
		const matchTs = formatMatchTs(elapsedSeconds);
		eventFeed = [
			...eventFeed,
			{
				id: `ev_${Date.now()}_pause`,
				matchTs,
				line: `[${matchTs}] MATCH >> PAUSED`,
				tone: 'cyan',
			},
		];
		void persistMatchSession();
	}

	function resumeMatch() {
		matchState = 'running';
		const matchTs = formatMatchTs(elapsedSeconds);
		eventFeed = [
			...eventFeed,
			{
				id: `ev_${Date.now()}_resume`,
				matchTs,
				line: `[${matchTs}] MATCH >> RESUMED`,
				tone: 'cyan',
			},
		];
		void persistMatchSession();
	}

	async function endMatch() {
		matchState = 'ended';
		const matchTs = formatMatchTs(elapsedSeconds);
		const line = `[${matchTs}] MATCH >> FINAL WHISTLE (${homeScore} - ${awayScore})`;
		eventFeed = [
			...eventFeed,
			{
				id: `ev_${Date.now()}_end`,
				matchTs,
				line,
				tone: 'rose',
			},
		];
		const tid = teamScope.selectedTeamId?.trim();
		const mid = sessionMatchId;
		const uid = authStore.user?.uid;
		if (tid && mid && uid && db) {
			try {
				await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
					teamId: tid,
					clubId: teamScope.teamClubId || '',
					matchId: mid,
					playerId: 'match_system',
					action: 'MATCH_END',
					points: 0,
					matchTs,
					line,
					tone: 'rose',
					loggedBy: uid,
					timestamp: serverTimestamp(),
				});
				await persistMatchSession();
			} catch (e) {
				console.error('[MatchDay] end error', e);
			}
		}
	}

	function createNewMatch() {
		const tid = teamScope.selectedTeamId?.trim() || 'team';
		const timestamp = Date.now();
		const d = new Date();
		const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		customMatchId = `md_${tid}_${ds}_${timestamp}`.slice(0, 128);
		homeScore = 0;
		awayScore = 0;
		elapsedSeconds = 0;
		matchState = 'not_started';
		eventFeed = [];
		opponentTeam = '';
		fieldLocation = '';
		liveStreamUrl = '';
		liveStreamDraft = '';
		void persistMatchSession();
	}

	function selectSavedMatch(mId) {
		customMatchId = mId;
	}

	async function saveLiveStreamUrl() {
		const tid = teamScope.selectedTeamId?.trim();
		const mid = sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;

		const raw = liveStreamDraft.trim();
		liveStreamErr = '';
		if (!raw) {
			liveStreamUrl = '';
			liveStreamSaving = true;
			try {
				await setDoc(
					doc(db, 'teams', tid, 'match_sessions', mid),
					{
						teamId: tid,
						matchId: mid,
						homeScore,
						awayScore,
						liveStreamUrl: deleteField(),
						updatedBy: uid,
						updatedAt: serverTimestamp(),
					},
					{ merge: true },
				);
			} catch (e) {
				liveStreamErr = e instanceof Error ? e.message : 'Could not clear stream URL.';
			} finally {
				liveStreamSaving = false;
			}
			return;
		}

		const normalized = normalizeLiveStreamUrl(raw);
		if (!normalized) {
			liveStreamErr = 'Use a YouTube, Vimeo, or Mux watch link.';
			return;
		}

		liveStreamSaving = true;
		try {
			liveStreamUrl = normalized;
			liveStreamDraft = normalized;
			await setDoc(
				doc(db, 'teams', tid, 'match_sessions', mid),
				{
					teamId: tid,
					clubId: teamScope.teamClubId || '',
					matchId: mid,
					homeScore,
					awayScore,
					liveStreamUrl: normalized,
					updatedBy: uid,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);
		} catch (e) {
			liveStreamErr = e instanceof Error ? e.message : 'Could not save stream URL.';
		} finally {
			liveStreamSaving = false;
		}
	}

	/** @param {'home' | 'away'} side */
	async function bumpScore(side) {
		if (side === 'home') {
			homeScore += 1;
			scoreFlashHome = true;
			window.setTimeout(() => {
				scoreFlashHome = false;
			}, 150);
		} else {
			awayScore += 1;
			scoreFlashAway = true;
			window.setTimeout(() => {
				scoreFlashAway = false;
			}, 150);
		}
		const matchTs = formatMatchTs(elapsedSeconds);
		const line =
			side === 'home' ?
				`[${matchTs}] SQUAD >> GOAL`
			:	`[${matchTs}] ENEMY >> GOAL`;
		eventFeed = [
			...eventFeed,
			{
				id:
					typeof crypto !== 'undefined' && crypto.randomUUID ?
						crypto.randomUUID()
					:	`ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
				matchTs,
				line,
				tone: side === 'home' ? 'emerald' : 'rose',
			},
		];
		const tid = teamScope.selectedTeamId?.trim();
		const mid = sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;
		try {
			await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
				teamId: tid,
				clubId: teamScope.teamClubId || '',
				matchId: mid,
				playerId: side === 'home' ? activeOperative?.id || 'squad' : 'opponent',
				action: side === 'home' ? 'GOAL' : 'OPPONENT_GOAL',
				points: side === 'home' ? 10 : 0,
				matchTs,
				line,
				tone: side === 'home' ? 'emerald' : 'rose',
				loggedBy: uid,
				timestamp: serverTimestamp(),
			});
			await persistMatchSession();
		} catch (e) {
			console.error('[MatchDay] score bump', e);
		}
	}

	const activeOperative = $derived(
		operatives.find((o) => o.id === activeTarget) ?? operatives[0] ?? null,
	);

	const matchPeriodLabel = $derived.by(() => {
		if (elapsedSeconds < 45 * 60) return '1ST HALF';
		if (elapsedSeconds < 90 * 60) return '2ND HALF';
		return 'EXTRA TIME';
	});

	const matchClockDisplay = $derived.by(() => {
		const t = Math.max(0, elapsedSeconds);
		const m = Math.floor(t / 60);
		const s = t % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	});

	$effect(() => {
		eventFeed;
		queueMicrotask(() => {
			const el = feedScrollRoot;
			if (!el) return;
			el.scrollTop = el.scrollHeight;
		});
	});

	function formatMatchTs(totalSeconds) {
		const t = Math.max(0, totalSeconds);
		const m = Math.floor(t / 60);
		const s = t % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function flashTelemetryButton(actionId) {
		flashActionId = actionId;
		window.setTimeout(() => {
			flashActionId = null;
		}, 150);
	}

	/**
	 * @param {string} actionType
	 * @param {PadTone} tone
	 */
	async function logTelemetryEvent(actionType, tone) {
		const op = activeOperative;
		if (!op) return;

		const matchTs = formatMatchTs(elapsedSeconds);
		const tag = operativeTelemetryTag(op);
		const line = `[${matchTs}] ${tag} >> ${actionType}`;

		eventFeed = [
			...eventFeed,
			{
				id:
					typeof crypto !== 'undefined' && crypto.randomUUID ?
						crypto.randomUUID()
					:	`ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
				matchTs,
				line,
				tone,
			},
		];

		if (actionType === 'GOAL') {
			homeScore += 1;
			scoreFlashHome = true;
			window.setTimeout(() => {
				scoreFlashHome = false;
			}, 150);
			void persistMatchSession();
		}

		// Persist to Firestore — only when a real team is active and user is authenticated.
		const tid = teamScope.selectedTeamId?.trim();
		const mid = sessionMatchId;
		const uid = authStore.user?.uid;
		if (!tid || !mid || !uid) return;
		try {
			await addDoc(collection(db, 'teams', tid, 'telemetry_events'), {
				teamId: tid,
				clubId: teamScope.teamClubId || '',
				matchId: mid,
				playerId: op.id,
				action: actionType,
				points: ACTION_POINTS[actionType] ?? 0,
				matchTs,
				line,
				tone,
				loggedBy: uid,
				timestamp: serverTimestamp(),
			});
		} catch (e) {
			console.error('[MatchDay] persist event', e);
		}
	}

	/**
	 * @param {TelemetryPadDef} a
	 */
	function fireAction(a) {
		void logTelemetryEvent(a.id, a.tone);
		flashTelemetryButton(a.id);
	}

	function stripAbbr(op) {
		return op.role.slice(0, 3).toUpperCase();
	}

	/** Stable OP-XX tag for feed (mock uses OP-01; long ids map by roster order). */
	function operativeTelemetryTag(op) {
		const raw = op.shortId.trim();
		if (/^OP-\d{1,2}$/i.test(raw)) {
			const n = raw.match(/^OP-(\d{1,2})$/i)?.[1] ?? '0';
			return `OP-${n.padStart(2, '0')}`;
		}
		const i = operatives.findIndex((x) => x.id === op.id);
		return i >= 0 ? `OP-${String(i + 1).padStart(2, '0')}` : 'OP-??';
	}

	function rosterGlyph(op) {
		const t = operativeTelemetryTag(op);
		const m = /^OP-(\d{2})$/i.exec(t);
		return m ? m[1] : t.replace(/^OP-?/i, '').slice(0, 2).toUpperCase();
	}

	/**
	 * @param {FeedLine} entry
	 * @param {number} idx
	 */
	function feedLineClass(entry, idx) {
		const n = eventFeed.length;
		const isLatest = n > 0 && idx === n - 1;
		if (isLatest) return 'coach-match-z1-log__line coach-match-z1-log__line--latest';
		if (entry.tone === 'rose') return 'coach-match-z1-log__line coach-match-z1-log__line--warn';
		return 'coach-match-z1-log__line';
	}

	/**
	 * @param {TelemetryPadDef} a
	 */
	function padClass(a) {
		const tone =
			a.tone === 'rose' ? 'coach-match-pad--warn'
			: a.tone === 'emerald' ? 'coach-match-pad--positive'
			: '';
		const flash = flashActionId === a.id ? 'coach-match-pad--flash' : '';
		return `coach-match-pad ${tone} ${flash}`.trim();
	}
</script>

<!-- VS-3d — Coach match-day SIEM scoreboard -->
<div class="coach-match-shell">
	<a href="/coach/dashboard" class="coach-match-exit coach-os-action-chip">HUB</a>

	<!-- Sub-header: Match Records / Session Navigation -->
	<div class="tw-bg-[#0b0f19] tw-border-b tw-border-[#334155] tw-px-4 tw-py-2.5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-z-20">
		<div class="tw-flex tw-items-center tw-gap-2.5 tw-flex-wrap">
			<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">
				GAME:
			</span>
			<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#14b8a6]">
				{opponentTeam ? `vs ${opponentTeam}` : 'Current Match'}
			</span>
			<span class="tw-text-[10px] tw-font-mono tw-px-2 tw-py-0.5 tw-border {matchState === 'running' ? 'tw-bg-emerald-950/60 tw-border-emerald-500/60 tw-text-emerald-400 tw-animate-pulse' : matchState === 'paused' ? 'tw-bg-amber-950/60 tw-border-amber-500/60 tw-text-amber-400' : matchState === 'ended' ? 'tw-bg-slate-900 tw-border-slate-700 tw-text-slate-400' : 'tw-bg-slate-900 tw-border-slate-700 tw-text-[#daff0a]'}">
				{matchState === 'running' ? '● LIVE IN PLAY' : matchState === 'paused' ? '⏸ PAUSED' : matchState === 'ended' ? '✓ FINAL' : 'PRE-MATCH'}
			</span>
		</div>

		<div class="tw-flex tw-items-center tw-gap-2.5">
			<!-- Saved Match Records Dropdown -->
			{#if savedMatches.length > 0}
				<select
					aria-label="Select match record"
					class="tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-text-slate-300 tw-font-mono tw-text-xs tw-px-2.5 tw-py-1.5 tw-outline-none hover:tw-border-[#14b8a6] tw-cursor-pointer"
					value={sessionMatchId}
					onchange={(e) => selectSavedMatch(e.currentTarget.value)}
				>
					<option value={sessionMatchId}>Current Game ({opponentTeam || 'Untitled'})</option>
					{#each savedMatches as sm (sm.id)}
						{#if sm.id !== sessionMatchId}
							<option value={sm.id}>
								{sm.opponentTeam ? `vs ${sm.opponentTeam}` : sm.id} ({sm.homeScore ?? 0}-{sm.awayScore ?? 0})
								{sm.matchState === 'ended' ? '· Final' : '· Live'}
							</option>
						{/if}
					{/each}
				</select>
			{/if}

			<button
				type="button"
				onclick={createNewMatch}
				class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6] hover:tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-px-3 tw-py-1.5 tw-transition-colors"
			>
				+ NEW MATCH
			</button>
		</div>
	</div>

	<header class="coach-match-z4-strap" aria-label="Match clock">
		<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
			<div>
				<p class="coach-match-z4-strap__label">Match clock · {activeTeamLabel} {opponentTeam ? `vs ${opponentTeam.toUpperCase()}` : ''}</p>
				<p class="coach-match-z4-strap__clock" aria-live="polite">{matchClockDisplay}</p>
				<p class="coach-match-z4-strap__period">{matchPeriodLabel}</p>
			</div>

			<!-- Live Start / Pause / End Match Action Button Deck -->
			<div class="tw-flex tw-items-center tw-gap-2.5 tw-flex-wrap">
				{#if matchState === 'not_started'}
					<button
						type="button"
						class="tw-bg-[#daff0a] tw-text-black tw-font-mono tw-font-black tw-text-xs tw-px-5 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-lime-400 tw-transition-all tw-shadow-[0_0_15px_rgba(218,255,10,0.3)]"
						onclick={startMatch}
					>
						▶ START MATCH
					</button>
				{:else if matchState === 'running'}
					<button
						type="button"
						class="tw-bg-amber-500 tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-amber-400 tw-transition-colors"
						onclick={pauseMatch}
					>
						⏸ PAUSE MATCH
					</button>
					<button
						type="button"
						class="tw-bg-red-600 tw-text-white tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-red-500 tw-transition-colors"
						onclick={endMatch}
					>
						🏁 FINAL WHISTLE
					</button>
				{:else if matchState === 'paused'}
					<button
						type="button"
						class="tw-bg-emerald-500 tw-text-black tw-font-mono tw-font-black tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-emerald-400 tw-transition-colors"
						onclick={resumeMatch}
					>
						▶ RESUME MATCH
					</button>
					<button
						type="button"
						class="tw-bg-red-600 tw-text-white tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-red-500 tw-transition-colors"
						onclick={endMatch}
					>
						🏁 FINAL WHISTLE
					</button>
				{:else if matchState === 'ended'}
					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-px-3 tw-py-2 tw-bg-red-950/60 tw-border tw-border-red-500/60 tw-text-red-300 tw-font-mono tw-text-xs tw-font-bold tw-uppercase">
							FINAL SCORE: {homeScore} - {awayScore}
						</span>
						<button
							type="button"
							class="tw-bg-[#14b8a6] tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2 tw-uppercase hover:tw-bg-teal-300 tw-transition-colors"
							onclick={createNewMatch}
						>
							+ NEW MATCH
						</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<div class="tw-flex tw-flex-col tw-gap-5 tw-bg-[#0f172a] tw-border-b tw-border-[#334155] tw-shrink-0" style="padding: clamp(12px, 3vw, 24px);">
		<div style="display: grid;" class="tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-3">
			<div class="tw-flex tw-flex-col tw-gap-1">
				<label class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest" for="field-loc">Field / Pitch</label>
				<input id="field-loc" type="text" class="coach-match-stream__input" placeholder="e.g. Field 4" bind:value={fieldLocation} onblur={() => persistMatchSession()} />
			</div>
			<div class="tw-flex tw-flex-col tw-gap-1">
				<label class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest" for="opp-team">Opponent</label>
				<input id="opp-team" type="text" class="coach-match-stream__input" placeholder="e.g. Crossfire" bind:value={opponentTeam} onblur={() => persistMatchSession()} />
			</div>
			<div class="tw-flex tw-flex-col tw-gap-1 tw-col-span-2">
				<label class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest" for="stream-url">Live Stream URL</label>
				<div class="tw-flex tw-gap-2">
					<input id="stream-url" type="url" class="coach-match-stream__input" placeholder="YouTube / Vimeo link" bind:value={liveStreamDraft} />
					<button type="button" class="coach-match-stream__save" disabled={liveStreamSaving} onclick={() => void saveLiveStreamUrl()}>{liveStreamSaving ? 'Saving…' : 'Save'}</button>
				</div>
				{#if liveStreamErr}
					<p class="coach-match-stream__err" role="alert">{liveStreamErr}</p>
				{:else if liveStreamUrl}
					<p class="coach-match-stream__ok" role="status">Stream linked — parents can watch live.</p>
				{/if}
			</div>
		</div>
		<div class="tw-flex tw-flex-col tw-gap-1">
			<span class="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">Game Day Roster</span>
			<div class="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-1" style="scrollbar-width: none;">
				{#each operatives as op (op.id)}
					<button type="button" class="tw-border tw-px-2 tw-py-1 tw-text-[10px] tw-font-mono tw-rounded-none tw-whitespace-nowrap {gameDayActiveRoster.has(op.id) ? 'tw-bg-[#14b8a6]/20 tw-text-[#14b8a6] tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-slate-500 tw-border-slate-700'}" onclick={() => {
						if (gameDayActiveRoster.has(op.id)) gameDayActiveRoster.delete(op.id);
						else gameDayActiveRoster.add(op.id);
						gameDayActiveRoster = new Set(gameDayActiveRoster);
						persistMatchSession();
					}}>
						{op.name}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="coach-match-main">
		<div class="coach-match-z2-row" aria-label="Scoreboard">
			<button
				type="button"
				class="coach-match-z2-cell"
				class:coach-match-z2-cell--flash={scoreFlashHome}
				aria-label="Add home goal"
				onclick={() => bumpScore('home')}
			>
				<p class="coach-match-z2-cell__label">Home</p>
				<p class="coach-match-z2-cell__score">{homeScore}</p>
			</button>
			<button
				type="button"
				class="coach-match-z2-cell"
				class:coach-match-z2-cell--flash={scoreFlashAway}
				aria-label="Add opponent goal"
				onclick={() => bumpScore('away')}
			>
				<p class="coach-match-z2-cell__label">Away</p>
				<p class="coach-match-z2-cell__score">{awayScore}</p>
			</button>
		</div>

		<section class="coach-match-z1-well" aria-label="Match log">
			<p class="coach-match-z1-well__label">Match log</p>
			<div class="coach-match-z1-log">
				<div
					bind:this={feedScrollRoot}
					class="coach-match-z1-log__scroll"
					role="log"
					aria-live="polite"
					aria-relevant="additions"
				>
					{#if eventFeed.length === 0}
						<p class="coach-match-z1-log__empty">Awaiting first event</p>
					{:else}
						{#each eventFeed as entry, idx (entry.id)}
							<p class={feedLineClass(entry, idx)}>{entry.line}</p>
						{/each}
					{/if}
				</div>
			</div>
		</section>
	</div>

	<div class="coach-match-telemetry" aria-label="Telemetry control pad">
		<p class="coach-match-telemetry__label">Asset selector</p>
		<div class="coach-match-roster" role="tablist" aria-label="Select active player">
			{#if rosterLoading}
				<p class="coach-match-roster__empty">Syncing roster…</p>
			{:else if operatives.length === 0}
				<p class="coach-match-roster__empty">
					{teamScope.selectedTeamId?.trim()
						? 'NO ROSTERED PLAYERS — ADD PLAYERS IN ROSTER & TEAMS'
						: 'SELECT A TEAM TO LOAD THE SQUAD'}
				</p>
			{:else}
				{#each operatives as op (op.id)}
					<button
						type="button"
						role="tab"
						class="coach-match-roster__chip"
						class:coach-match-roster__chip--active={activeTarget === op.id}
						aria-selected={activeTarget === op.id}
						aria-label="Target {op.name}"
						onclick={() => (activeTarget = op.id)}
					>
						<span class="coach-match-roster__glyph">{rosterGlyph(op)}</span>
						<span class="coach-match-roster__pos">{stripAbbr(op)}</span>
					</button>
				{/each}
			{/if}
		</div>

		<p class="coach-match-telemetry__label">Telemetry triggers</p>
		<div class="coach-match-pad-grid">
			{#each TELEMETRY_PAD as a (a.id)}
				<button type="button" class={padClass(a)} disabled={!activeOperative} onclick={() => fireAction(a)}>
					{a.label}
				</button>
			{/each}
		</div>
	</div>
</div>
