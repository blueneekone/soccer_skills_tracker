<script>
	import TacticalGrid from '$lib/components/coach/TacticalGrid.svelte';
	import { portal } from '$lib/actions/portal.js';
	import { browser } from '$app/environment';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import { db } from '$lib/firebase.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import SquadTelemetryView from '$lib/components/coach/SquadTelemetryView.svelte';

	/**
	 * @typedef {{
	 *   id: string;
	 *   name: string;
	 *   role: string;
	 *   lvl: number;
	 *   hp: number;
	 *   status: 'READY' | 'CRITICAL';
	 *   totalXp: number;
	 * }} LoadoutOperative
	 */

	const MOCK_ROSTER = /** @type {LoadoutOperative[]} */ ([
		{ id: 'OP-01', name: 'Jimmy T.', role: 'MID', lvl: 42, hp: 95, status: 'READY', totalXp: 8420 },
		{ id: 'OP-02', name: 'Sarah W.', role: 'DEF', lvl: 45, hp: 20, status: 'CRITICAL', totalXp: 9100 },
		{ id: 'OP-03', name: 'Marcus R.', role: 'FWD', lvl: 39, hp: 88, status: 'READY', totalXp: 7750 },
		{ id: 'OP-04', name: 'Leo M.', role: 'MID', lvl: 41, hp: 75, status: 'READY', totalXp: 8010 },
		{ id: 'OP-05', name: 'David K.', role: 'GK', lvl: 48, hp: 100, status: 'READY', totalXp: 9880 },
	]);

	const HYRUM_COORDS = 'LAT: 41.633° N // LON: 111.851° W · HYRUM, UT';
	const HYRUM_LOCATION_SHORT = 'Hyrum, UT';

	const TEN_DAY_FORECAST = /** @type {const} */ ([
		{ day: 'Today', hi: 72, lo: 54, precipPct: 12 },
		{ day: 'Tue', hi: 71, lo: 52, precipPct: 18 },
		{ day: 'Wed', hi: 69, lo: 51, precipPct: 28 },
		{ day: 'Thu', hi: 70, lo: 49, precipPct: 15 },
		{ day: 'Fri', hi: 73, lo: 53, precipPct: 8 },
		{ day: 'Sat', hi: 75, lo: 55, precipPct: 5 },
		{ day: 'Sun', hi: 74, lo: 54, precipPct: 22 },
		{ day: 'Mon', hi: 71, lo: 50, precipPct: 35 },
		{ day: 'Tue', hi: 68, lo: 48, precipPct: 42 },
		{ day: 'Wed', hi: 67, lo: 46, precipPct: 38 },
	]);

	/** NEXUS VANGUARD — nav & chrome (faded + glow) */
	const BTN_NAV_AMBER =
		'tw-relative tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-amber-500/50 tw-bg-amber-950/30 tw-px-4 tw-py-2.5 tw-font-mono tw-font-bold tw-text-xs tw-tracking-widest tw-text-amber-300 tw-uppercase tw-transition-all hover:tw-bg-amber-900/50 hover:tw-shadow-[0_0_20px_rgba(245,158,11,0.6)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-amber-400';

	const BTN_NAV_CYAN =
		'tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-[#00f0ff]/50 tw-bg-[rgba(0,24,32,0.88)] tw-px-4 tw-py-2.5 tw-font-mono tw-font-bold tw-text-xs tw-tracking-widest tw-text-[#00f0ff]/92 tw-uppercase tw-transition-all hover:tw-bg-[rgba(0,40,48,0.92)] hover:tw-shadow-[0_0_20px_rgba(0,240,255,0.55)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff]/70';

	const BTN_NAV_ROSE =
		'tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-rose-500/50 tw-bg-rose-950/30 tw-px-4 tw-py-2.5 tw-font-mono tw-font-bold tw-text-xs tw-tracking-widest tw-text-rose-300 tw-uppercase tw-transition-all hover:tw-bg-rose-900/50 hover:tw-shadow-[0_0_20px_rgba(244,63,94,0.6)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-rose-400';

	/** Global Vanguard glass — src/app.css `.vanguard-panel` */
	const GLASS_PANEL = 'vanguard-panel tw-rounded-2xl';

	/** Glow gutter + scroll split — outer overflow-visible so panel box-shadow is not squared off */
	const CMD_CARD_GLOW_GUTTER =
		'tw-group tw-flex tw-h-full tw-min-h-[17rem] tw-min-w-0 tw-w-full tw-flex-col tw-overflow-visible tw-p-3 md:tw-min-h-[18rem]';
	const CMD_CARD_PANEL = `${GLASS_PANEL} tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-visible`;
	const CMD_CARD_SCROLL =
		'tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-3 tw-overflow-y-auto tw-scrollbar-hide tw-p-4 md:tw-p-5';

	/** Cyan hover ribbon — dock chips + compositors */
	const CMD_TOOL_HOVER =
		'tw-transition-all tw-duration-300 hover:tw-shadow-[0_0_15px_rgba(0,240,255,0.55)] hover:tw-border-[#00f0ff]/55 hover:tw-bg-[rgba(0,24,32,0.45)]';

	/** Matrix-footprint bridge CTAs — primary Director controls */
	const CMD_BRIDGE_IDLE_SECOND =
		`btn-director tw-vanguard-btn-matrix-secondary tw-inline-flex tw-items-center tw-justify-center tw-text-center ${CMD_TOOL_HOVER} focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff]/70`;

	/** Showcase carousel arrows — exact kinetic lift stack */
	const SHOWCASE_KINETIC_ARROW =
		'tw-transition-all tw-duration-300 hover:tw--translate-y-1 hover:tw-shadow-[0_5px_15px_var(--legacy-cyan)] hover:tw-bg-[var(--legacy-cyan)]/20 active:tw-translate-y-0 tw-cursor-pointer';

	const WEATHER_HOURLY = /** @type {const} */ ([
		{ label: 'NOW', tempF: 72, precipPct: 12 },
		{ label: '+1H', tempF: 71, precipPct: 22 },
		{ label: '+2H', tempF: 70, precipPct: 35 },
		{ label: '+3H', tempF: 69, precipPct: 48 },
		{ label: '+4H', tempF: 68, precipPct: 55 },
		{ label: '+5H', tempF: 67, precipPct: 58 },
	]);

	const role = $derived(authStore.role);
	const userEmail = $derived((authStore.user?.email || '').trim());

	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	const effectiveTeamId = $derived.by(() => {
		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && myTeams.some((t) => t.id === pivot)) return pivot;
		return myTeams[0]?.id ?? '';
	});

	const activeTeamRow = $derived(myTeams.find((t) => t.id === effectiveTeamId) ?? null);

	const activeClubId = $derived(
		typeof activeTeamRow?.clubId === 'string' ? activeTeamRow.clubId : '',
	);

	const clubNameDisplay = $derived.by(() => {
		if (!activeClubId) return 'AGGIES FC';
		const n = teamsStore.clubs.find((c) => c.id === activeClubId)?.name;
		return typeof n === 'string' && n.trim() ? n.trim().toUpperCase() : 'AGGIES FC';
	});

	const teamNameDisplay = $derived(
		typeof activeTeamRow?.name === 'string' && activeTeamRow.name.trim() ?
			activeTeamRow.name.trim().toUpperCase()
		:	'U14 VARSITY',
	);

	const nexusBadgeLetter = $derived((clubNameDisplay.slice(0, 1) || 'A').toUpperCase());

	/** @type {LoadoutOperative[]} */
	let rosterRows = $state([]);
	let rosterLoading = $state(false);

	let showTacticalOverlay = $state(false);
	let showCommsOverlay = $state(false);

	// #region agent log
	$effect(() => {
		const v = showTacticalOverlay;
		fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
			body: JSON.stringify({
				sessionId: 'dd2828',
				runId: 'pre-fix',
				hypothesisId: 'B_D',
				location: 'coach/+page.svelte:effect-showTacticalOverlay',
				message: 'showTacticalOverlay reactive read',
				data: { showTacticalOverlay: v, browser: typeof window !== 'undefined' },
				timestamp: Date.now(),
			}),
		}).catch(() => {});
	});
	// #endregion

	/** FACILITY_OPS Director Override — unread drives SIEM-style scan line */
	let directorOverrideUnread = $state(true);

	/** Ares protocol — breach chrome when override unread or modeled precip risk */
	/**
	 * Severe weather (mock hourly precip) — Weather Hub breach chrome ONLY when true.
	 * Defaults false with current demo data (max precip &lt; threshold).
	 */
	const isSevereWeatherThreat = $derived(WEATHER_HOURLY.some((h) => h.precipPct >= 65));

	/** Threat matrix SVG accents — keyed to `isSevereWeatherThreat` */
	const wxThreatMatrixPalette = $derived.by(() => ({
		ringSoft: isSevereWeatherThreat ? 'rgba(255,0,51,0.16)' : 'rgba(0,240,255,0.14)',
		ringSweep: isSevereWeatherThreat ? 'rgba(255,0,51,0.45)' : 'rgba(0,240,255,0.38)',
		strikeStroke: isSevereWeatherThreat ? '#fb7185' : '#38bdf8',
		strikeFill: isSevereWeatherThreat ? 'rgba(251,113,133,0.16)' : 'rgba(56,189,248,0.14)',
	}));

	let activeOperativeIndex = $state(0);
	let showWeatherModal = $state(false);
	/** Active hourly pill index inside SIEM forecast modal */
	let weatherModalHourIdx = $state(0);

	/** Mock lightning locks — Player OS radar aesthetic (rose hex targets + coords) */
	const LIGHTNING_STRIKES = /** @type {const} */ ([
		{ x: 24, y: 58, lat: '41.628° N', lon: '111.842° W' },
		{ x: 71, y: 34, lat: '41.641° N', lon: '111.859° W' },
		{ x: 48, y: 72, lat: '41.617° N', lon: '111.836° W' },
		{ x: 82, y: 61, lat: '41.633° N', lon: '111.871° W' },
	]);

	/**
	 * War Room tactical tokens — pitch tokens must define `x` / `y` (SVG space).
	 * @typedef {{ id: string; name?: string; number?: string; color?: string; x?: number; y?: number; side?: 'friendly' | 'opponent' }} WarRoomPitchToken
	 */

	/**
	 * Quadratic Bézier tactical route (editable anchors + optional start bind to a disc).
	 * @typedef {{
	 *   id: string;
	 *   x1: number; y1: number;
	 *   cx: number; cy: number;
	 *   x2: number; y2: number;
	 *   color: string;
	 *   bindPlayerId?: string | null;
	 * }} WarRoomTacticalRoute
	 */

	/** Tactical grid tool mode (War Room parent state). */
	let warRoomTool = $state(/** @type {'DRAG' | 'ROUTE'} */ ('DRAG'));

	/** Vector routes (quadratic paths + neon ink). */
	let drawnRoutes = $state(/** @type {WarRoomTacticalRoute[]} */ ([]));

	/** Friendly roster slots — Starting XI (not yet on pitch). */
	let wrBucketXi = $state(/** @type {WarRoomPitchToken[]} */ ([]));
	/** Friendly bench (not yet on pitch). */
	let wrBucketBench = $state(/** @type {WarRoomPitchToken[]} */ ([]));
	/** Friendly tokens on the tactical pitch. */
	let wrBucketPitch = $state(/** @type {WarRoomPitchToken[]} */ ([]));
	/** Opposition tokens on the tactical pitch. */
	let wrOppPitch = $state(/** @type {WarRoomPitchToken[]} */ ([]));

	function initWarRoomRosterBuckets() {
		const ids = activeRoster.map((r) => r.id);
		if (ids.length === 0) {
			wrBucketXi = [];
			wrBucketBench = [];
			wrBucketPitch = [];
			return;
		}
		const xiIds = ids.slice(0, 11);
		const benchIds = ids.slice(11);
		wrBucketXi = xiIds.map((id, idx) => {
			const op = activeRoster.find((r) => r.id === id);
			return {
				id,
				name: op?.name ?? '',
				number: operativeDisplayNumber(idx),
				color: '#00f0ff',
				side: /** @type {const} */ ('friendly'),
			};
		});
		wrBucketBench = benchIds.map((id, j) => {
			const op = activeRoster.find((r) => r.id === id);
			return {
				id,
				name: op?.name ?? '',
				number: operativeDisplayNumber(11 + j),
				color: '#00f0ff',
				side: /** @type {const} */ ('friendly'),
			};
		});
		wrBucketPitch = [];
		wrOppPitch = [];
	}

	function dismissWarRoomOverlay() {
		showTacticalOverlay = false;
		warRoomTool = 'DRAG';
		wrBucketPitch = [];
		wrOppPitch = [];
		drawnRoutes = [];
	}

	const RADAR_N = 6;
	const RADAR_CX = 50;
	const RADAR_CY = 50;
	const RADAR_R = 36;
	const RADAR_WEB_SCALES = /** @type {const} */ ([0.22, 0.42, 0.62, 0.82, 1]);
	const RADAR_AXIS_LABELS = /** @type {const} */ ([
		'Pace',
		'Shooting',
		'Passing',
		'Dribbling',
		'Defending',
		'Physical',
	]);

	/**
	 * Regular hexagon radar geometry — `mult` scales spoke length from center (1 = skill envelope).
	 * @param {number} i
	 * @param {number} mult
	 */
	function radarPolarXY(i, mult) {
		const angleRad = (i * 2 * Math.PI) / RADAR_N - Math.PI / 2;
		const cos = Math.cos(angleRad);
		const sin = Math.sin(angleRad);
		return {
			x: RADAR_CX + RADAR_R * mult * cos,
			y: RADAR_CY + RADAR_R * mult * sin,
		};
	}

	function radarSkillVals(attrs) {
		return [attrs.pace, attrs.shot, attrs.pass, attrs.dribble, attrs.def, attrs.phy].map((v) => {
			const t = (v - 42) / 49;
			return Math.min(1, Math.max(0.08, t));
		});
	}

	/** Skill envelope as six radii 0–100 for hex polygon mapping */
	function radarSkillPctArray(attrs) {
		return radarSkillVals(attrs).map((t) => Math.min(100, Math.max(0, t * 100)));
	}

	/**
	 * Perfect 6-axis polygon vertex string (viewBox space).
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} radius
	 * @param {number[]} dataValues six values 0–100
	 */
	function getHexagonPoints(cx, cy, radius, dataValues) {
		return dataValues
			.map((val, i) => {
				const angle = (Math.PI / 3) * i - (Math.PI / 2);
				const r = radius * (val / 100);
				return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
			})
			.join(' ');
	}

	/**
	 * Vertex coords for node markers (same geometry as `getHexagonPoints`).
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} radius
	 * @param {number[]} dataValues
	 */
	function getHexagonVertices(cx, cy, radius, dataValues) {
		return dataValues.map((val, i) => {
			const angle = (Math.PI / 3) * i - (Math.PI / 2);
			const r = radius * (val / 100);
			return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
		});
	}

	/**
	 * @param {LoadoutOperative} op
	 */
	function operativeCoreAttrs(op) {
		let h = 0;
		for (let i = 0; i < op.id.length; i++) h = (h + op.id.charCodeAt(i) * (i + 1)) % 997;
		for (let i = 0; i < op.name.length; i++) h = (h + op.name.charCodeAt(i) * (i + 3)) % 997;
		/** @param {number} salt */
		const pick = (salt) => 42 + ((h + salt * 17) % 49);
		return {
			pace: pick(1),
			shot: pick(2),
			pass: pick(3),
			dribble: pick(6),
			def: pick(4),
			phy: pick(5),
		};
	}

	/**
	 * @param {unknown} raw
	 */
	function normLookupStatus(raw) {
		const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
		if (!s || s === 'active' || s === 'pending') return 'active';
		if (s.includes('fatigue') || s.includes('fatigued')) return 'fatigued';
		if (
			s.includes('injur') ||
			s.includes('inactive') ||
			s.includes('absent') ||
			s.includes('medical')
		) {
			return 'injured';
		}
		return 'active';
	}

	/**
	 * @param {string} posRaw
	 */
	function abbrevRole(posRaw) {
		const p = typeof posRaw === 'string' ? posRaw.trim().toUpperCase() : '';
		if (!p) return 'UNK';
		if (p.length <= 4) return p;
		return p.slice(0, 3);
	}

	/**
	 * @param {string} docId
	 * @param {string} name
	 * @param {'active' | 'fatigued' | 'injured'} st
	 * @param {number} xp
	 * @param {string} roleAbbr
	 * @returns {LoadoutOperative}
	 */
	function toLoadout(docId, name, st, xp, roleAbbr) {
		const prog = getLevelProgressFromTotalXp(Math.max(0, Math.floor(xp)));
		const lvl = Math.min(99, Math.max(1, prog.level));

		let hp = 88;
		let status = /** @type {'READY' | 'CRITICAL'} */ ('READY');

		if (st === 'injured') {
			hp = 18 + (docId.charCodeAt(0) % 8);
			status = 'CRITICAL';
		} else if (st === 'fatigued') {
			hp = 58 + (docId.charCodeAt(0) % 15);
		} else {
			hp = Math.min(100, 76 + ((docId + name).length % 24));
		}

		const shortId =
			docId.length > 14 ? docId.slice(0, 10).toUpperCase() + '…' : docId.toUpperCase();

		return {
			id: shortId,
			name,
			role: roleAbbr,
			lvl,
			hp,
			status,
			totalXp: xp,
		};
	}

	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.isAuthenticated) return;

		const tid = effectiveTeamId;
		if (!tid) {
			rosterRows = [];
			rosterLoading = false;
			return;
		}

		let cancelled = false;
		rosterLoading = true;

		void (async () => {
			try {
				const [lookupSnap, statsSnap] = await Promise.all([
					getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', tid))),
					getDocs(query(collection(db, 'player_stats'), where('teamId', '==', tid))),
				]);
				if (cancelled) return;

				/** @type {Record<string, { pos: string; xp: number }>} */
				const byName = {};
				statsSnap.forEach((d) => {
					const data = d.data();
					const nm =
						typeof data.playerName === 'string' && data.playerName.trim() ?
							data.playerName.trim()
						:	'';
					if (!nm) return;
					const pos =
						typeof data.position === 'string' && data.position.trim() ?
							abbrevRole(data.position)
						:	'MID';
					byName[nm] = {
						pos,
						xp: Math.max(0, Math.floor(Number(data.total_xp) || 0)),
					};
				});

				/** @type {LoadoutOperative[]} */
				const rows = [];
				lookupSnap.forEach((d) => {
					const data = d.data();
					const name =
						typeof data.playerName === 'string' && data.playerName.trim() ?
							data.playerName.trim()
						:	'';
					if (!name) return;
					const st = normLookupStatus(data.status);
					const meta = byName[name];
					const roleAbbr = meta?.pos ?? 'MID';
					const xp = meta?.xp ?? 0;
					rows.push(toLoadout(d.id, name, st, xp, roleAbbr));
				});
				rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				rosterRows = rows;
			} catch (e) {
				console.error('[Vanguard Command] roster ingest', e);
				if (!cancelled) rosterRows = [];
			} finally {
				if (!cancelled) rosterLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const activeRoster = $derived.by(() => {
		if (rosterRows.length > 0) return rosterRows;
		if (!effectiveTeamId) return MOCK_ROSTER;
		return [];
	});

	const gameDayRoster = $derived(activeRoster.slice(0, 11));

	const heroFocusOperative = $derived(activeRoster[activeOperativeIndex] ?? null);

	$effect(() => {
		if (!showTacticalOverlay || !browser) return;
		const ar = activeRoster;
		if (wrBucketXi.length === 0 && wrBucketBench.length === 0 && ar.length > 0) {
			initWarRoomRosterBuckets();
		}
	});

	const hourlyBars = $derived.by(() => {
		const rows = WEATHER_HOURLY.map((r) => ({ ...r }));
		let tMin = rows[0].tempF;
		let tMax = rows[0].tempF;
		let pMax = rows[0].precipPct;
		for (const r of rows) {
			tMin = Math.min(tMin, r.tempF);
			tMax = Math.max(tMax, r.tempF);
			pMax = Math.max(pMax, r.precipPct);
		}
		const tSpan = Math.max(tMax - tMin, 1);
		const pSpan = Math.max(pMax, 1);
		return rows.map((r) => ({
			...r,
			tempH: Math.round(((r.tempF - tMin) / tSpan) * 100),
			precipH: Math.round((r.precipPct / pSpan) * 100),
		}));
	});

	/** Cumulative precip spark paths per hour slot (viewBox 0 0 100 100) for SIEM pills */
	const hourlyPrecipMiniPaths = $derived.by(() => {
		const rows = WEATHER_HOURLY;
		let pMax = 1;
		for (const r of rows) pMax = Math.max(pMax, r.precipPct);
		return rows.map((_, i) => {
			const slice = rows.slice(0, i + 1);
			const m = slice.length;
			return slice
				.map((cell, j) => {
					const x = (j / Math.max(m - 1, 1)) * 100;
					const y = 100 - (cell.precipPct / pMax) * 72 - 14;
					return `${j === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
				})
				.join(' ');
		});
	});

	const weatherHubTempF = $derived(WEATHER_HOURLY[0]?.tempF ?? 72);

	/** Next three hourly slots for hub pills (wall-clock + °F). */
	const weatherHubHourlyPills = $derived.by(() => {
		const slice = WEATHER_HOURLY.slice(0, 3);
		const aligned = new Date();
		if (browser) {
			aligned.setMinutes(0, 0, 0);
		} else {
			aligned.setUTCHours(14, 0, 0, 0);
		}
		return slice.map((row, i) => {
			const d = new Date(aligned.getTime() + i * 3600000);
			const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
			return { clock, tempF: row.tempF };
		});
	});

	function commandConsoleToggleComms() {
		if (showCommsOverlay) closeComms();
		else openComms();
	}

	function heroCarouselPrev() {
		const n = activeRoster.length;
		if (n <= 0) return;
		activeOperativeIndex = (activeOperativeIndex - 1 + n) % n;
	}

	function heroCarouselNext() {
		const n = activeRoster.length;
		if (n <= 0) return;
		activeOperativeIndex = (activeOperativeIndex + 1) % n;
	}

	$effect(() => {
		const n = activeRoster.length;
		if (n === 0) {
			if (activeOperativeIndex !== 0) activeOperativeIndex = 0;
			return;
		}
		if (activeOperativeIndex >= n) activeOperativeIndex = n - 1;
	});

	function operativeDisplayNumber(index) {
		return String(index + 1).padStart(2, '0');
	}

	/**
	 * @param {LoadoutOperative} op
	 */
	function operativeStripAbbr(op) {
		const first = op.name.trim().split(/\s+/)[0] ?? '';
		const letters = first.replace(/[^a-zA-Z]/g, '').toUpperCase();
		const pad = letters.slice(-1) || '-';
		return letters.slice(0, 3).padEnd(3, pad);
	}

	const missionSquadXpSum = $derived.by(() => {
		const r = activeRoster;
		if (!r.length) return 0;
		return r.reduce((s, o) => s + (o.totalXp ?? 0), 0);
	});

	const missionXpVelocity = $derived.by(() => {
		const r = activeRoster;
		if (r.length === 0) return null;
		return Math.max(8, Math.round(Math.sqrt(missionSquadXpSum / Math.max(r.length, 1)) * 4.2));
	});

	const weatherSparklinePath = $derived.by(() => {
		const pts = WEATHER_HOURLY;
		if (!pts.length) return '';
		let tMin = pts[0].tempF;
		let tMax = pts[0].tempF;
		for (const p of pts) {
			tMin = Math.min(tMin, p.tempF);
			tMax = Math.max(tMax, p.tempF);
		}
		const span = Math.max(tMax - tMin, 1);
		const n = pts.length;
		return pts
			.map((p, i) => {
				const x = (i / Math.max(n - 1, 1)) * 100;
				const y = 100 - ((p.tempF - tMin) / span) * 72 - 14;
				return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
			})
			.join(' ');
	});
	function openComms() {
		showCommsOverlay = true;
	}

	function closeComms() {
		showCommsOverlay = false;
	}

	function closeWeatherModal() {
		showWeatherModal = false;
		weatherModalHourIdx = 0;
	}

	$effect(() => {
		if (!browser || !showTacticalOverlay) return;
		const onKey = /** @param {KeyboardEvent} e */ (e) => {
			if (e.key === 'Escape') dismissWarRoomOverlay();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!browser || !showCommsOverlay) return;
		const onKey = /** @param {KeyboardEvent} e */ (e) => {
			if (e.key === 'Escape') closeComms();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!browser || !showWeatherModal) return;
		const onKey = /** @param {KeyboardEvent} e */ (e) => {
			if (e.key === 'Escape') closeWeatherModal();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div
	class="tw-relative tw-isolate tw-z-0 tw-flex tw-h-[calc(100vh-theme(spacing.header))] tw-w-full tw-flex-col tw-overflow-hidden tw-bg-[var(--void-black)] tw-font-sans tw-text-slate-300 tw-selection:bg-[#00f0ff]/30"
>
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-opacity-[0.12]"
		style="background-image: linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px); background-size: 44px 44px;"
		aria-hidden="true"
	></div>

	<!-- Command bridge — crest + title only -->
	<header
		class="vanguard-panel tw-relative tw-z-10 tw-flex tw-shrink-0 tw-w-full tw-flex-wrap tw-items-center tw-gap-4 tw-overflow-visible tw-rounded-b-2xl tw-p-3 md:tw-flex-nowrap md:tw-gap-4 md:tw-px-4"
	>
		<div class="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-3 md:tw-gap-4">
			<div
				class="tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-[#00f0ff]/40 tw-bg-[rgba(0,24,32,0.55)] tw-shadow-[0_0_18px_rgba(0,240,255,0.25)] md:tw-h-14 md:tw-w-14"
				aria-hidden="true"
			>
				<span class="tw-text-xl tw-font-black tw-tracking-widest tw-text-[#00f0ff]/90 md:tw-text-2xl">{nexusBadgeLetter}</span>
			</div>
			<div class="tw-min-w-0">
				<h1 class="tw-font-black tw-tracking-[0.12em] tw-text-white tw-uppercase tw-text-base md:tw-text-lg">
					Nexus Command
				</h1>
				<p class="tw-mt-0.5 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/90 tw-uppercase">
					{clubNameDisplay}
					<span class="tw-text-slate-600"> // </span>
					{teamNameDisplay}
				</p>
			</div>
		</div>
	</header>

	<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-px-2 md:tw-px-4">
		<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-6 tw-overflow-y-auto tw-scrollbar-hide tw-py-3 tw-pb-4 md:tw-gap-6">
		<SquadTelemetryView />
		<div class="tw-grid tw-grid-cols-1 tw-gap-6 tw-w-full tw-items-stretch tw-overflow-visible tw-p-2 lg:tw-grid-cols-3">
		<section id="coach-pillar-mission" class="{CMD_CARD_GLOW_GUTTER}" aria-label="Mission control">
			<div class="{CMD_CARD_PANEL}">
				<div class="{CMD_CARD_SCROLL}">
			<div class="tw-min-w-0">
				<h2 class="tw-vanguard-section-header">
					Mission Control
				</h2>
				<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/80 tw-uppercase">
					Squad XP velocity · bounty rail
				</p>
			</div>
			<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-wrap tw-content-start tw-items-stretch tw-gap-3">
				<div class="tw-min-w-[12rem] tw-flex-1 tw-rounded-xl tw-px-4 tw-py-3 tw-font-mono vanguard-panel">
					<p class="tw-text-[9px] tw-tracking-widest tw-text-slate-500 tw-uppercase">XP Velocity</p>
					<p class="tw-text-2xl tw-font-black tw-tabular-nums tw-text-[#00f0ff]/90 tw-vanguard-data">
						{missionXpVelocity ?? '—'}<span class="tw-text-sm tw-text-[#00f0ff]/55"> U/HR</span>
					</p>
					<p class="tw-mt-1 tw-text-[9px] tw-tracking-wide tw-text-slate-600 tw-uppercase">
						SQD Σ XP · {missionSquadXpSum.toLocaleString()}
					</p>
				</div>
				<span
					class="tw-inline-flex tw-h-fit tw-items-center tw-rounded-lg tw-border tw-border-amber-500/35 tw-bg-amber-950/15 tw-px-3 tw-py-2 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-amber-300 tw-uppercase"
				>
					2 Active Bounties
				</span>
			</div>
			<div class="tw-mt-auto tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2 tw-pt-2">
				<button
					type="button"
					class="{CMD_BRIDGE_IDLE_SECOND}"
					onclick={() => {
						// #region agent log
						const before = showTacticalOverlay;
						fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
							body: JSON.stringify({
								sessionId: 'dd2828',
								runId: 'pre-fix',
								hypothesisId: 'A',
								location: 'coach/+page.svelte:warRoom-click',
								message: 'War Room button click',
								data: { before },
								timestamp: Date.now(),
							}),
						}).catch(() => {});
						// #endregion
						showTacticalOverlay = true;
						// #region agent log
						fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
							body: JSON.stringify({
								sessionId: 'dd2828',
								runId: 'pre-fix',
								hypothesisId: 'B',
								location: 'coach/+page.svelte:warRoom-after-assign',
								message: 'after showTacticalOverlay = true',
								data: { afterImmediateRead: showTacticalOverlay },
								timestamp: Date.now(),
							}),
						}).catch(() => {});
						// #endregion
					}}
				>
					[ WAR ROOM ]
				</button>
				<a href="/coach/match-day" class="{CMD_BRIDGE_IDLE_SECOND} tw-inline-flex tw-no-underline">
					[ MATCH LOGGER ]
				</a>
			</div>
				</div>
			</div>
		</section>

		<section id="coach-pillar-facility" class="{CMD_CARD_GLOW_GUTTER}" aria-label="Facility ops and staging">
			<div class="{CMD_CARD_PANEL}">
				<div class="{CMD_CARD_SCROLL}">
			<div class="tw-min-w-0">
				<h2 class="tw-vanguard-section-header tw-font-mono">Facility Ops & Staging</h2>
				<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-wider tw-text-slate-600 tw-uppercase">
					Director overrides · Comm-links · arsenal egress
				</p>
			</div>
			<button
				type="button"
				class="facility-ops-override-card btn-ares tw-relative tw-w-full tw-overflow-hidden tw-rounded-xl tw-text-left tw-animate-[pulse_4s_ease-in-out_infinite] tw-p-3 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-rose-400"
				onclick={() => {
					directorOverrideUnread = false;
				}}
				aria-label="Director override: acknowledge alert"
			>
				{#if directorOverrideUnread}
					<span
						class="facility-ops-scan-line tw-pointer-events-none tw-absolute tw-left-0 tw-right-0 tw-z-10 tw-h-px tw-bg-[#00f0ff] tw-shadow-[0_0_10px_rgba(0,240,255,0.95)]"
						aria-hidden="true"
					></span>
				{/if}
				<p class="tw-relative tw-z-[11] tw-mb-1 tw-font-mono tw-text-[10px] tw-font-black tw-tracking-widest tw-text-rose-400 tw-uppercase">
					!! DIR_OVERRIDE
				</p>
				<p class="tw-relative tw-z-[11] tw-font-mono tw-text-[10px] tw-leading-snug tw-text-slate-400">
					Match relocated to Turf 2 · ACK REQUIRED
				</p>
			</button>
			<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-slate-600 tw-uppercase">
				COMM-LINK · Encrypted coaching relay MOCK · ACK persists fleet-wide
			</p>
			<div
				class="tw-mt-auto tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2"
				aria-label="Facility command triggers"
			>
				<button type="button" class="{CMD_BRIDGE_IDLE_SECOND} tw-whitespace-normal" onclick={commandConsoleToggleComms}>
					<span class="tw-line-clamp-2 tw-max-h-[2.25rem] tw-leading-tight tw-break-words tw-text-center"
						>OPEN SECURE COMMS HUD</span
					>
				</button>
				<a
					href="/coach/forge"
					class="{CMD_BRIDGE_IDLE_SECOND} tw-inline-flex tw-flex-row tw-items-center tw-justify-center tw-gap-0 tw-no-underline"
					title="ACCESS_TOOLCHAIN · OPEN_THE_FORGE · /coach/forge"
				>
					<svg
						class="tw-mr-2 tw-h-4 tw-w-4 tw-shrink-0 tw-text-[#00f0ff]"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M5 14 14 5l2 2-9 9-4 1 1-4z" />
						<path d="m13 7 4-4 3 3-4 4" />
						<path d="M4 20h16v2H4z" />
						<path d="M8 20v-3h8v3" />
					</svg>
					<span class="tw-line-clamp-2 tw-max-h-[2.25rem] tw-leading-tight tw-break-words tw-text-center"
						>ACCESS FORGE</span
					>
				</a>
			</div>
				</div>
			</div>
		</section>

		<section
			id="coach-pillar-weather"
			class="{CMD_CARD_GLOW_GUTTER}"
			aria-label="Weather hub"
		>
			<div class={isSevereWeatherThreat ? 'vanguard-panel-breach' : 'vanguard-panel'}>
				<div
					class="tw-flex tw-min-h-0 tw-h-full tw-flex-1 tw-flex-col tw-gap-3 tw-overflow-y-auto tw-scrollbar-hide tw-p-4 md:tw-p-5"
				>
			<div
				class="tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-white/10 tw-bg-black/25 tw-px-4 tw-py-2.5 tw-backdrop-blur-md"
			>
				<div
					class="tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-black/50 tw-ring-1 {isSevereWeatherThreat ?
						'tw-ring-[#ff0033]/55 tw-shadow-[var(--ares-glow)]'
					:	'tw-ring-[#00f0ff]/45 tw-shadow-[var(--legacy-glow)]'}"
					aria-hidden="true"
				>
					<svg class="tw-h-8 tw-w-8" viewBox="0 0 48 48" fill="none" aria-hidden="true">
						<defs>
							<filter id="coachWxLightningBloom" x="-100%" y="-100%" width="300%" height="300%">
								<feGaussianBlur stdDeviation="3.5" result="lb" />
								<feMerge>
									<feMergeNode in="lb" />
									<feMergeNode in="lb" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						<path
							d="M28 4 L18 22h8l-10 26"
							stroke="#ffffff"
							stroke-width="2.4"
							stroke-linecap="round"
							stroke-linejoin="round"
							filter="url(#coachWxLightningBloom)"
						/>
					</svg>
				</div>
				<div class="tw-min-w-0 tw-flex-1 tw-font-mono">
					<p class="tw-vanguard-section-header tw-mb-0.5">{HYRUM_LOCATION_SHORT}</p>
					<p class="tw-tabular-nums tw-text-3xl tw-font-black tw-tracking-tight tw-text-white tw-vanguard-data md:tw-text-4xl">
						{weatherHubTempF}<span class="tw-text-xl tw-font-bold tw-text-[#00f0ff]/90 md:tw-text-2xl">°</span>
					</p>
				</div>
			</div>
			<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-slate-500">Storm-low · mock feed · capsule HUD</p>
			<!-- Weather hub radar rings — SVG circles only (no CSS rectangular faux radar) -->
			<div class="tw-flex tw-w-full tw-items-center tw-justify-center tw-py-1" aria-hidden="true">
				<svg class="tw-block tw-h-24 tw-w-full tw-max-w-[11rem]" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
					{#each [46, 36, 26, 16] as ringR (ringR)}
						<circle
							cx="50"
							cy="50"
							r={ringR}
							fill="none"
							stroke={isSevereWeatherThreat ? 'rgba(255,0,51,0.35)' : 'rgba(0,240,255,0.28)'}
							stroke-width="0.45"
							vector-effect="non-scaling-stroke"
						/>
					{/each}
				</svg>
			</div>
			<div class="tw-vanguard-dock-pill !tw-flex tw-flex-row tw-flex-wrap tw-gap-2 !tw-py-2 md:tw-flex-nowrap">
				{#each weatherHubHourlyPills as pill, pi (`${pill.clock}-${pi}`)}
					<span
						class="tw-inline-flex tw-min-h-[2.25rem] tw-min-w-0 tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-full tw-border tw-px-3 tw-py-1 tw-font-mono tw-text-[10px] tw-tabular-nums tw-tracking-wide tw-text-slate-200 tw-shadow-inner tw-shadow-black/35 {pi ===
						0 ?
							'tw-border-[#00f0ff]/55 tw-bg-[#00f0ff]/12 tw-text-[#ecfeff] tw-shadow-[0_0_16px_rgba(0,240,255,0.35)]'
						:	'tw-border-white/8 tw-bg-slate-950/35 tw-text-slate-300'}"
					>
						<span class="tw-text-slate-500">{pill.clock}</span>
						<span class="tw-text-[#00f0ff]/95">{pill.tempF}°</span>
					</span>
				{/each}
			</div>
			<div class="tw-mt-auto tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2">
				<button type="button" class="{CMD_BRIDGE_IDLE_SECOND}" onclick={() => { showWeatherModal = true; }}>
					<span class="tw-shrink-0">[ EXPAND ]</span>
				</button>
			</div>
				</div>
			</div>
		</section>
		</div>

		<!-- Operative hero + quick-select roster strip -->
		<section
			class="tw-relative tw-z-10 tw-flex tw-min-h-[min(72vh,840px)] tw-min-w-0 tw-w-full tw-flex-col tw-overflow-visible"
			aria-label="Operative focus carousel"
		>
			<div
				class="tw-relative tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-visible tw-px-0 tw-py-1 md:tw-px-2 md:tw-py-2"
			>
				<div class="tw-mb-2 tw-flex tw-items-baseline tw-justify-between tw-gap-2 tw-border-b tw-border-white/10 tw-pb-1">
					<h2 class="tw-vanguard-section-header">
						Holographic Showcase
					</h2>
					<span class="tw-font-mono tw-text-[10px] tw-tabular-nums tw-tracking-widest tw-text-slate-500 tw-uppercase">
						{activeRoster.length ?
							`${operativeDisplayNumber(activeOperativeIndex)} / ${String(activeRoster.length).padStart(2, '0')}`
						:	'—'}
					</span>
				</div>

				{#if rosterLoading && effectiveTeamId}
					<p class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-py-16 tw-text-center tw-font-mono tw-text-sm tw-text-slate-500">
						INGESTING ROSTER…
					</p>
				{:else if activeRoster.length === 0}
					<p class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-py-16 tw-text-center tw-font-mono tw-text-sm tw-text-slate-500">
						NO OPERATIVES IN RANGE · BIND TEAM CONTEXT
					</p>
				{:else}
					{#if heroFocusOperative}
						{@const op = heroFocusOperative}
						{@const attrs = operativeCoreAttrs(op)}
						{@const radarPct = radarSkillPctArray(attrs)}
						<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-2 !tw-overflow-visible">
						<!-- Holographic showcase — hex Combat Stats radar (Player OS parity) -->
						<div class="tw-flex tw-min-h-0 tw-flex-[7] tw-flex-col !tw-overflow-visible">
							<div class="tw-relative tw-min-h-0 tw-flex-1 !tw-overflow-visible tw-px-1 md:tw-px-10 lg:tw-px-12">
								<button
									type="button"
									class="tw-absolute tw-left-0 tw-top-1/2 tw-z-20 tw-flex tw-h-11 tw-w-11 tw--translate-y-1/2 tw-items-center tw-justify-center tw-rounded-md tw-border-0 tw-bg-transparent tw-text-[#00f0ff] tw-opacity-90 hover:tw-opacity-100 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff]/70 disabled:tw-pointer-events-none disabled:tw-opacity-20 md:tw-h-12 md:tw-w-12 {SHOWCASE_KINETIC_ARROW}"
									aria-label="Previous operative"
									disabled={activeRoster.length <= 1}
									onclick={heroCarouselPrev}
								>
									<svg class="tw-h-7 tw-w-7 md:tw-h-8 md:tw-w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path
											d="M15 6l-6 6 6 6"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
								<button
									type="button"
									class="tw-absolute tw-right-0 tw-top-1/2 tw-z-20 tw-flex tw-h-11 tw-w-11 tw--translate-y-1/2 tw-items-center tw-justify-center tw-rounded-md tw-border-0 tw-bg-transparent tw-text-[#00f0ff] tw-opacity-90 hover:tw-opacity-100 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff]/70 disabled:tw-pointer-events-none disabled:tw-opacity-20 md:tw-h-12 md:tw-w-12 {SHOWCASE_KINETIC_ARROW}"
									aria-label="Next operative"
									disabled={activeRoster.length <= 1}
									onclick={heroCarouselNext}
								>
									<svg class="tw-h-7 tw-w-7 md:tw-h-8 md:tw-w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path
											d="M9 6l6 6-6 6"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
								<div
									class="tw-grid tw-min-h-0 tw-flex-1 tw-grid-cols-1 tw-items-start tw-gap-12 !tw-overflow-visible lg:tw-grid-cols-[minmax(0,1.15fr)_minmax(0,20rem)] lg:tw-gap-14 lg:tw-pl-2 lg:tw-pr-2"
								>
								<div
									class="tw-relative tw-mx-auto tw-flex tw-aspect-square tw-w-full tw-max-w-[400px] tw-items-center tw-justify-center tw-bg-transparent"
								>
									<svg
										class="coach-showcase-radar-svg tw-block tw-h-full tw-w-full tw-opacity-100 tw-drop-shadow-[0_0_24px_rgba(0,240,255,0.35)]"
										viewBox="0 0 100 100"
										preserveAspectRatio="xMidYMid meet"
										aria-hidden="true"
									>
										<defs>
											<filter id="coachRadarNodeGlow" x="-130%" y="-130%" width="360%" height="360%">
												<feGaussianBlur in="SourceGraphic" stdDeviation="1.25" result="ngBlur" />
												<feMerge>
													<feMergeNode in="ngBlur" />
													<feMergeNode in="SourceGraphic" />
												</feMerge>
											</filter>
										</defs>
										{#each RADAR_WEB_SCALES as tier (tier)}
											<circle
												cx={RADAR_CX}
												cy={RADAR_CY}
												r={RADAR_R * tier}
												fill="none"
												stroke="rgba(255,255,255,0.1)"
												stroke-width="0.55"
												vector-effect="non-scaling-stroke"
											/>
										{/each}
										{#each RADAR_AXIS_LABELS as _, ai (`axis-${ai}`)}
											{@const hub = radarPolarXY(ai, 0)}
											{@const spoke = radarPolarXY(ai, 1.06)}
											<line
												x1={hub.x}
												y1={hub.y}
												x2={spoke.x}
												y2={spoke.y}
												stroke="rgba(255,255,255,0.1)"
												stroke-width="0.45"
												vector-effect="non-scaling-stroke"
											/>
										{/each}
										<polygon
											points={getHexagonPoints(RADAR_CX, RADAR_CY, RADAR_R, radarPct)}
											fill="rgba(0,240,255,0.15)"
											stroke="#a855f7"
											stroke-width="2"
											stroke-linejoin="round"
											vector-effect="non-scaling-stroke"
										/>
										{#each getHexagonVertices(RADAR_CX, RADAR_CY, RADAR_R, radarPct) as vtx, vi (`vertex-${vi}`)}
											<circle
												cx={vtx.x}
												cy={vtx.y}
												r="2"
												fill="#00f0ff"
												filter="url(#coachRadarNodeGlow)"
											/>
										{/each}
										{#each RADAR_AXIS_LABELS as lbl, li (`lbl-${lbl}`)}
											{@const tp = radarPolarXY(li, 1.42)}
											<text
												class="tw-pointer-events-none tw-text-[9px] tw-font-mono tw-tracking-[0.3em] tw-fill-white"
												x={tp.x}
												y={tp.y}
												text-anchor="middle"
												dominant-baseline="middle"
											>
												{lbl}
											</text>
										{/each}
									</svg>
								</div>

								<div class="tw-relative tw-z-10 tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-5 lg:tw-max-w-md">
									<div class="tw-space-y-3 tw-font-mono">
										<p class="tw-vanguard-section-header">Operative telemetry</p>
										<p class="tw-text-[10px] tw-tracking-[0.24em] tw-text-slate-600 tw-uppercase">
											ID · {operativeDisplayNumber(activeOperativeIndex)}
										</p>
										<p class="tw-truncate tw-text-xl tw-font-black tw-tracking-tight tw-text-white md:tw-text-2xl">
											{op.name}
										</p>
										<dl class="tw-grid tw-gap-2 tw-text-[10px] tw-font-bold tw-tracking-wide tw-uppercase">
											<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/[0.06] tw-pb-1.5">
												<dt class="tw-text-slate-500">Level</dt>
												<dd class="tw-vanguard-data tw-tabular-nums tw-text-lg tw-text-[#00f0ff]/88">{op.lvl}</dd>
											</div>
											<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/[0.06] tw-pb-1.5">
												<dt class="tw-text-slate-500">Role</dt>
												<dd class="tw-text-[#00f0ff]/90">{op.role}</dd>
											</div>
											<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/[0.06] tw-pb-1.5">
												<dt class="tw-text-slate-500">Status</dt>
												<dd
													class={op.status === 'CRITICAL' ?
														'tw-text-rose-400 tw-drop-shadow-[0_0_12px_rgba(251,113,133,0.55)]'
													:	'tw-text-emerald-400'}
												>
													{op.status}
												</dd>
											</div>
											<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3">
												<dt class="tw-text-slate-500">HP band</dt>
												<dd class="tw-vanguard-data tw-tabular-nums tw-text-slate-300">{op.hp}%</dd>
											</div>
										</dl>
									</div>
									<div class="tw-flex tw-flex-col tw-gap-2">
										<p class="tw-vanguard-section-header">Core vectors</p>
									{#each [
										['Pace', attrs.pace],
										['Shooting', attrs.shot],
										['Passing', attrs.pass],
										['Dribbling', attrs.dribble],
										['Defending', attrs.def],
										['Physical', attrs.phy],
									] as [label, val] (label)}
										<div class="tw-border-b tw-border-white/10 tw-pb-1">
											<div
												class="tw-mb-1 tw-flex tw-items-baseline tw-justify-between tw-gap-2 tw-font-mono tw-text-[9px] tw-tracking-[0.18em] tw-uppercase"
											>
												<span class="tw-text-slate-400">{label}</span>
												<span class="tw-tabular-nums tw-text-[#00f0ff]/88">{val}</span>
											</div>
											<div
												class="tw-h-[3px] tw-w-full tw-overflow-hidden tw-bg-black/70 tw-[clip-path:polygon(0_0,100%_0,100%_100%,2px_100%,0_calc(100%-2px))]"
											>
												<div
													class="tw-h-full tw-bg-[#00f0ff]/80 tw-[clip-path:polygon(0_0,100%_0,calc(100%-2px)_100%,0_100%)] tw-shadow-[0_0_12px_rgba(0,240,255,0.55)] tw-transition-[width] tw-duration-300"
													style="width: {val}%"
												></div>
											</div>
										</div>
									{/each}
									</div>
								</div>
							</div>
						</div>
						</div>

						<!-- Vanguard quick-select -->
						<div
							class="vanguard-quick-select tw-relative tw-z-30 tw-isolate !tw-overflow-visible tw-mt-8 tw-flex tw-min-h-0 tw-flex-[3] tw-flex-col tw-justify-end tw-border-t tw-border-white/10 tw-px-6 tw-pt-10 tw-pb-14"
						>
							<p class="tw-mb-3 tw-font-mono tw-text-[9px] tw-tracking-[0.2em] tw-text-slate-500 tw-uppercase">
								Vanguard quick-select
							</p>
							<div
								class="coach-quick-strip tw-scrollbar-hide tw-relative tw-z-30 tw-flex tw-min-h-0 tw-flex-row tw-flex-wrap tw-items-center tw-gap-4 !tw-overflow-visible tw-py-4 tw-pl-2 tw-pr-2 tw-pb-10"
								role="tablist"
								aria-label="Quick-select roster strip"
							>
								{#each activeRoster as player, rosterIdx (`${rosterIdx}-${player.id}`)}
									<button
										type="button"
										role="tab"
										class="tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-2 tw-bg-black/50 tw-backdrop-blur-md tw-transition-[box-shadow,border-color] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff]/70 {activeOperativeIndex ===
										rosterIdx ?
											'tw-border-[#00f0ff] tw-shadow-[var(--legacy-glow)]'
										:	'tw-border-white/15 tw-shadow-none hover:tw-border-[#00f0ff]/40'}"
										aria-selected={activeOperativeIndex === rosterIdx}
										aria-label="Select {player.name}"
										onclick={() => {
											activeOperativeIndex = rosterIdx;
										}}
									>
										<span
											class="tw-font-mono tw-text-sm tw-font-black tw-tabular-nums tw-leading-none tw-text-white"
										>
											{operativeDisplayNumber(rosterIdx)}
										</span>
										<span class="tw-mt-px tw-font-mono tw-text-[8px] tw-tabular-nums tw-tracking-wide tw-text-slate-400 tw-leading-none">
											{operativeStripAbbr(player)}
										</span>
									</button>
								{/each}
							</div>
						</div>
					</div>
					{/if}
				{/if}
			</div>
		</section>
	</div>
</div>
</div>

{#if showCommsOverlay}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		transition:fade={{ duration: 150 }}
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-start tw-justify-end tw-bg-black/80 tw-p-3 tw-backdrop-blur-md sm:tw-items-center sm:tw-justify-center sm:tw-p-6"
		role="presentation"
		onclick={closeComms}
	>
		<div
			transition:fly={{ y: 20, duration: 250, easing: cubicOut }}
			class="vanguard-panel tw-mt-14 tw-w-full tw-max-w-md tw-rounded-2xl tw-p-5 sm:tw-mt-0 tw-[clip-path:polygon(3%_0,100%_0,100%_96%,97%_100%,0_100%,0_8%)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="comms-hud-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="tw-mb-4 tw-flex tw-items-start tw-justify-between tw-gap-3">
				<h2 id="comms-hud-title" class="tw-vanguard-section-header tw-font-mono tw-text-[#00f0ff]/88">
					Secure Comms
				</h2>
				<button type="button" class="btn-director" onclick={closeComms} aria-label="Close secure comms">
					CLOSE
				</button>
			</div>
			<p class="tw-font-mono tw-text-[10px] tw-leading-relaxed tw-text-slate-500">
				Director override + asset pings mirror FACILITY_OPS. Encrypted channel MOCK.
			</p>
		</div>
	</div>
{/if}

{#if showWeatherModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		transition:fade={{ duration: 150 }}
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center tw-bg-black/85 tw-p-4 tw-backdrop-blur-2xl"
		role="presentation"
		onclick={closeWeatherModal}
	>
		<div
			transition:fly={{ y: 20, duration: 250, easing: cubicOut }}
			class="vanguard-panel tw-relative tw-max-h-[min(92vh,900px)] tw-w-full tw-max-w-3xl tw-overflow-visible tw-rounded-2xl tw-p-6 tw-font-mono md:tw-p-8"
			role="dialog"
			aria-modal="true"
			aria-labelledby="weather-modal-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="tw-max-h-[min(calc(92vh-4rem),840px)] tw-overflow-y-auto tw-overflow-x-visible tw-scrollbar-hide tw-pr-1">
			<div class="tw-mb-6 tw-flex tw-items-start tw-justify-between tw-gap-3">
				<div class="tw-min-w-0">
					<h2 id="weather-modal-title" class="tw-vanguard-section-header tw-font-mono">
						Environmental Forecast
					</h2>
					<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-slate-500 tw-uppercase">
						{HYRUM_LOCATION_SHORT}
						<span class="tw-text-slate-600"> · </span>
						{HYRUM_COORDS}
					</p>
				</div>
				<button type="button" class="btn-ares" onclick={closeWeatherModal} aria-label="Close forecast">
					CLOSE
				</button>
			</div>

			<section
				class="weather-siem-stack tw-relative tw-mb-8 tw-overflow-visible tw-rounded-xl tw-p-4 vanguard-panel"
				aria-labelledby="weather-modal-spark"
			>
				<div class="weather-siem-scan tw-pointer-events-none tw-absolute tw-inset-0 tw-opacity-[0.08]" aria-hidden="true"></div>
				<h3
					id="weather-modal-spark"
					class="tw-relative tw-mb-3 tw-vanguard-section-header tw-font-mono tw-text-emerald-400/90"
				>
					6-Hour trajectory · Temp °F
				</h3>
				<svg
					class="tw-relative tw-block tw-h-28 tw-w-full"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<defs>
						<linearGradient id="wxSparkFill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#00f0ff" stop-opacity="0.38" />
							<stop offset="100%" stop-color="rgb(2, 6, 23)" stop-opacity="0" />
						</linearGradient>
					</defs>
					{#if weatherSparklinePath}
						<path
							d="{weatherSparklinePath} L 100 100 L 0 100 Z"
							fill="url(#wxSparkFill)"
							opacity="0.95"
						/>
						<path
							d={weatherSparklinePath}
							fill="none"
							stroke="#00f0ff"
							stroke-width="1.35"
							vector-effect="non-scaling-stroke"
							stroke-linejoin="round"
							stroke-linecap="round"
						/>
					{/if}
					<line
						x1="0"
						y1="86"
						x2="100"
						y2="86"
						stroke="rgba(148, 163, 184, 0.28)"
						stroke-width="0.5"
						vector-effect="non-scaling-stroke"
					/>
				</svg>
				<div
					class="tw-relative tw-mt-2 tw-flex tw-justify-between tw-gap-1 tw-overflow-x-auto tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-slate-500 tw-uppercase"
				>
					{#each WEATHER_HOURLY as h (h.label)}
						<span class="tw-shrink-0">{h.label}</span>
					{/each}
				</div>
			</section>

			<section class="tw-mb-8" aria-labelledby="weather-modal-threat-matrix">
				<h3 id="weather-modal-threat-matrix" class="tw-mb-3 tw-vanguard-section-header tw-font-mono {isSevereWeatherThreat ? 'tw-text-fuchsia-400/90' : 'tw-text-[#00f0ff]/92'}">
					Threat Matrix · strike locks &amp; precip zones
				</h3>
				<p class="tw-mb-3 tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-slate-600 tw-uppercase">
					Geometric overlay · rose hex target locks · concentric sweep (sim)
				</p>
				<div class="wx-threat-matrix-host tw-relative tw-aspect-square tw-w-full tw-overflow-visible tw-p-4" aria-label="Environmental threat matrix">
					<div class={isSevereWeatherThreat ? 'vanguard-panel-breach' : 'vanguard-panel'}>
						<div class="tw-relative tw-h-full tw-w-full tw-min-h-0 tw-overflow-hidden tw-rounded-full">
					<svg class="wx-threat-matrix-svg tw-block tw-h-full tw-w-full" viewBox="0 0 100 100" aria-hidden="true">
						<defs>
							<radialGradient id="wxThreatBackdropCalm" cx="50%" cy="48%" r="68%">
								<stop offset="0%" stop-color="rgba(0,240,255,0.09)" />
								<stop offset="55%" stop-color="rgba(2,6,23,0)" />
								<stop offset="100%" stop-color="rgba(2,12,18,0.62)" />
							</radialGradient>
							<radialGradient id="wxThreatBackdropBreach" cx="50%" cy="48%" r="68%">
								<stop offset="0%" stop-color="rgba(255,0,51,0.09)" />
								<stop offset="55%" stop-color="rgba(2,6,23,0)" />
								<stop offset="100%" stop-color="rgba(12,2,6,0.62)" />
							</radialGradient>
							<filter id="wxThreatRingGlow" x="-80%" y="-80%" width="260%" height="260%">
								<feGaussianBlur stdDeviation="0.85" result="b" />
								<feMerge>
									<feMergeNode in="b" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
							<filter id="wxThreatHexGlow" x="-120%" y="-120%" width="340%" height="340%">
								<feGaussianBlur stdDeviation="1.1" result="g" />
								<feMerge>
									<feMergeNode in="g" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						<circle
							cx="50"
							cy="50"
							r="50"
							fill={isSevereWeatherThreat ? 'url(#wxThreatBackdropBreach)' : 'url(#wxThreatBackdropCalm)'}
						/>
						{#each [48, 40, 32, 24] as r (r)}
							<circle
								cx="50"
								cy="50"
								{r}
								fill="none"
								stroke={wxThreatMatrixPalette.ringSoft}
								stroke-width="0.28"
								opacity="0.95"
								filter="url(#wxThreatRingGlow)"
							/>
						{/each}
						{#each [46, 38] as echo (echo)}
							<circle
								cx="50"
								cy="50"
								r={echo}
								fill="none"
								stroke={wxThreatMatrixPalette.ringSoft}
								stroke-width="0.2"
								stroke-dasharray="2 8"
								stroke-opacity="0.35"
								vector-effect="non-scaling-stroke"
								filter="url(#wxThreatRingGlow)"
							/>
						{/each}
						<circle
							class="wx-threat-sonar-sweep"
							cx="50"
							cy="50"
							r="49"
							fill="none"
							stroke={wxThreatMatrixPalette.ringSweep}
							stroke-width="0.55"
							stroke-dasharray="6 18"
							stroke-linecap="round"
							filter="url(#wxThreatRingGlow)"
						/>
						{#each LIGHTNING_STRIKES as strike, si (`lock-${si}`)}
							<g transform="translate({strike.x} {strike.y})" class="wx-threat-lock" style="--wx-lock-i: {si}">
								<polygon
									points="2.85,0 1.42,-2.47 -1.42,-2.47 -2.85,0 -1.42,2.47 1.42,2.47"
									fill={wxThreatMatrixPalette.strikeFill}
									stroke={wxThreatMatrixPalette.strikeStroke}
									stroke-width="0.55"
									stroke-linejoin="round"
									filter="url(#wxThreatHexGlow)"
									class="wx-threat-hex"
								/>
								<text
									class="wx-threat-coords tw-pointer-events-none tw-text-[9px] tw-font-mono tw-tracking-[0.3em] tw-fill-white"
									x="5.5"
									y="-4"
								>
									{strike.lat}
								</text>
								<text
									class="wx-threat-coords tw-pointer-events-none tw-text-[9px] tw-font-mono tw-tracking-[0.3em] tw-fill-white"
									x="5.5"
									y="-0.5"
								>
									{strike.lon}
								</text>
							</g>
						{/each}
					</svg>
					<div
						class="tw-pointer-events-none tw-absolute tw-inset-x-0 tw-bottom-0 tw-z-[2] tw-border-t tw-border-white/10 tw-bg-[#020617]/78 tw-px-3 tw-py-2 tw-backdrop-blur-md"
					>
						<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase">
							Target locks (sim) · <span class="tw-tabular-nums {isSevereWeatherThreat ? 'tw-text-fuchsia-300' : 'tw-text-[#00f0ff]/90'}">{LIGHTNING_STRIKES.length}</span> origins · concentric bands =
							precip echo
						</p>
					</div>
						</div>
					</div>
				</div>
			</section>

			<section class="tw-mb-8" aria-labelledby="weather-modal-hourly">
				<h3 id="weather-modal-hourly" class="tw-mb-3 tw-vanguard-section-header tw-font-mono tw-text-[#00f0ff]/92">
					Hourly · Google-density capsules
				</h3>
				<p class="tw-mb-3 tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-slate-600 tw-uppercase">
					Tap slot · cyan = active · spark = precip trend
				</p>
				<div class="tw-flex tw-w-full tw-gap-2 tw-overflow-x-auto tw-pb-1 tw-font-mono" aria-label="Hourly forecast pills">
					{#each hourlyBars as cell, hi (`${cell.label}-${hi}`)}
						<button
							type="button"
							class="tw-flex tw-min-w-[6.25rem] tw-max-w-[8rem] tw-flex-[1_0_auto] tw-flex-col tw-gap-2 tw-rounded-2xl tw-border tw-px-3 tw-py-2.5 tw-text-left tw-transition-all focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-[#00f0ff]/70 {weatherModalHourIdx ===
							hi ?
								'tw-border-[#00f0ff]/85 tw-bg-[#00f0ff]/12 tw-shadow-[0_0_22px_rgba(0,240,255,0.42)]'
							:	'tw-border-white/10 tw-bg-slate-950/35 hover:tw-border-white/25'}"
							aria-pressed={weatherModalHourIdx === hi}
							onclick={() => {
								weatherModalHourIdx = hi;
							}}
						>
							<span class="tw-text-[10px] tw-tracking-[0.14em] tw-text-slate-500 tw-uppercase">{cell.label}</span>
							<span class="tw-text-lg tw-font-black tw-tabular-nums tw-text-white tw-vanguard-data">{cell.tempF}°</span>
							<svg class="tw-h-10 tw-w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
								<line x1="0" y1="88" x2="100" y2="88" stroke="rgba(148,163,184,0.2)" stroke-width="1" />
								{#if hourlyPrecipMiniPaths[hi]}
									<path
										d={hourlyPrecipMiniPaths[hi]}
										fill="none"
										stroke={weatherModalHourIdx === hi ? '#00f0ff' : 'rgba(148,163,184,0.55)'}
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										vector-effect="non-scaling-stroke"
									/>
								{/if}
							</svg>
							<span class="tw-text-[9px] tw-tabular-nums tw-text-slate-500">{cell.precipPct}% precip</span>
							<div class="tw-h-1 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-black/70">
								<div
									class="tw-h-full tw-rounded-full tw-transition-all {weatherModalHourIdx === hi ?
										'tw-bg-[#00f0ff] tw-shadow-[0_0_12px_rgba(0,240,255,0.65)]'
									:	'tw-bg-[#00f0ff]/35'}"
									style="width: {cell.precipH}%"
								></div>
							</div>
						</button>
					{/each}
				</div>
			</section>

			<section aria-labelledby="weather-modal-tenday">
				<h3
					id="weather-modal-tenday"
					class="tw-mb-3 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-[#00f0ff] tw-uppercase"
				>
					10-day outlook
				</h3>
				<ul class="tw-m-0 tw-list-none tw-divide-y tw-divide-white/10 tw-rounded-xl tw-border tw-border-white/10 tw-bg-black/30 tw-p-0">
					{#each TEN_DAY_FORECAST as row, ri (`${ri}-${row.day}`)}
						<li class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-px-4 tw-py-2.5 tw-font-mono tw-text-[11px]">
							<span class="tw-tracking-wide tw-text-slate-300">{row.day}</span>
							<span class="tw-tabular-nums tw-text-[#00f0ff]/90">
								{row.hi}° / {row.lo}°
							</span>
							<span class="tw-tabular-nums tw-text-slate-500">{row.precipPct}% precip</span>
						</li>
					{/each}
				</ul>
				<p class="tw-mt-3 tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-600 tw-uppercase">
					Calibration deck · mock trajectory
				</p>
			</section>
			</div>
		</div>
	</div>
{/if}

{#if showTacticalOverlay}
	<div use:portal>
		<TacticalGrid
			bind:showTacticalOverlay
			bind:wrBucketPitch
			bind:wrBucketXi
			bind:drawnRoutes
			bind:warRoomTool
			bind:wrBucketBench
			bind:wrOppPitch
		/>
	</div>
{/if}

<style>
	@keyframes coachHudFade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.coach-quick-strip {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.coach-quick-strip::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}

	/* Equal-height weather pillar: panel chrome fills CMD_CARD_GLOW_GUTTER */
	#coach-pillar-weather > .vanguard-panel,
	#coach-pillar-weather > .vanguard-panel-breach {
		display: flex;
		flex: 1 1 0%;
		flex-direction: column;
		min-height: 0;
		width: 100%;
		overflow: visible;
	}

	.wx-threat-matrix-host {
		max-height: min(72vw, 28rem);
		margin-inline: auto;
	}

	@media (min-width: 768px) {
		.wx-threat-matrix-host {
			max-height: min(52vh, 32rem);
			max-width: min(52vh, 32rem);
		}
	}

	.wx-threat-matrix-svg {
		filter: drop-shadow(0 0 22px rgba(0, 240, 255, 0.18));
	}

	.wx-threat-matrix-host:has(.vanguard-panel-breach) .wx-threat-matrix-svg {
		filter: drop-shadow(0 0 22px rgba(255, 0, 51, 0.22));
	}

	@keyframes wxThreatSonar {
		to {
			stroke-dashoffset: -48;
		}
	}

	.wx-threat-sonar-sweep {
		animation: wxThreatSonar 5s linear infinite;
		transform-origin: 50px 50px;
		transform: rotate(-90deg);
	}

	@keyframes wxThreatHexPulse {
		0%,
		100% {
			opacity: 0.72;
			stroke-width: 0.48;
		}
		45% {
			opacity: 1;
			stroke-width: 0.72;
		}
	}

	@keyframes wxThreatCoordPulse {
		0%,
		100% {
			opacity: 0.55;
			filter: drop-shadow(0 0 2px rgba(251, 113, 133, 0.35));
		}
		50% {
			opacity: 1;
			filter: drop-shadow(0 0 6px rgba(251, 113, 133, 0.85));
		}
	}

	.wx-threat-hex {
		animation: wxThreatHexPulse 2.4s ease-in-out infinite;
		animation-delay: calc(var(--wx-lock-i, 0) * 0.35s);
	}

	.wx-threat-coords {
		animation: none;
	}

	.wx-threat-matrix-host:has(.vanguard-panel-breach) .wx-threat-coords {
		animation: wxThreatCoordPulse 2.4s ease-in-out infinite;
		animation-delay: calc(var(--wx-lock-i, 0) * 0.35s + 0.15s);
	}

	@keyframes facilityOpsScan {
		0% {
			top: 0%;
			opacity: 0.45;
		}
		12% {
			opacity: 1;
		}
		88% {
			opacity: 1;
		}
		100% {
			top: 100%;
			opacity: 0.45;
		}
	}

	.facility-ops-override-card {
		min-height: 4.5rem;
	}

	.facility-ops-scan-line {
		top: 0%;
		animation: facilityOpsScan 2.4s linear infinite;
	}

	.weather-siem-scan {
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 10px,
			rgba(0, 240, 255, 0.06) 10px,
			rgba(0, 240, 255, 0.06) 11px
		);
		animation: weatherSiemDrift 10s linear infinite;
	}

	@keyframes weatherSiemDrift {
		from {
			background-position: 0 0;
		}
		to {
			background-position: 0 220px;
		}
	}
</style>
