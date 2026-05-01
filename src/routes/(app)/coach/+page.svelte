<script>
	import { browser } from '$app/environment';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import { db } from '$lib/firebase.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

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

	/** Scouting deck — opposition tokens for War Room */
	const MOCK_OPPOSITION = /** @type {Pick<LoadoutOperative, 'id' | 'name' | 'role'>[]} */ ([
		{ id: 'OPP-A', name: 'Striker 7', role: 'FWD' },
		{ id: 'OPP-B', name: 'Anchor 6', role: 'DEF' },
		{ id: 'OPP-C', name: 'Box 8', role: 'MID' },
		{ id: 'OPP-D', name: 'Winger 11', role: 'FWD' },
		{ id: 'OPP-E', name: 'Sweeper 4', role: 'DEF' },
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

	/** War Room simulator — drag tokens vs straight vector strokes */
	let warRoomTool = $state(/** @type {'nodes' | 'vector'} */ ('nodes'));

	/** Vector stroke preset — DRAW_ARROW (tactical movement) vs DASHED_LINE */
	let warRoomLineStyle = $state(/** @type {'draw_arrow' | 'dashed_line'} */ ('draw_arrow'));

	/** Razor pitch grid — viewBox 0…100 */
	const WAR_ROOM_GRID_STEPS = Array.from({ length: 21 }, (_, i) => i * 5);

	/**
	 * Sideline routes + optional kinetic SVG path (`movementVector`) sampled via getPointAtLength on scrub.
	 * @typedef {{
	 *   id: string;
	 *   name: string;
	 *   role: string;
	 *   xPct: number;
	 *   yPct: number;
	 *   side: 'friendly' | 'opp';
	 *   routePts: { x: number; y: number }[];
	 *   movementVector?: string | null;
	 * }} MagneticPiece
	 */

	/** @type {MagneticPiece[]} */
	let magneticPieces = $state([]);

	let warRoomRosterModalOpen = $state(false);

	/** Friendly roster ids — Starting XI (max practical 11) */
	let wrBucketXi = $state(/** @type {string[]} */ ([]));
	/** Friendly roster ids — bench */
	let wrBucketBench = $state(/** @type {string[]} */ ([]));
	/** Friendly roster ids — tokens allowed on pitch */
	let wrBucketPitch = $state(/** @type {string[]} */ ([]));
	/** Opposition scout ids deployed as pitch tokens */
	let wrOppPitch = $state(/** @type {string[]} */ ([]));

	/** Hidden path for SVGGeometryElement.getPointAtLength (viewBox 0–100) */
	/** @type {SVGPathElement | undefined} */
	let warRoomPathMeasureEl = $state();

	/** SIEM telemetry scrub 0–100 */
	let telemetryProgress = $state(0);
	let telemetryPlaying = $state(false);
	let warRoomPlayRaf = 0;

	const warRoomTelemetryU = $derived(telemetryProgress / 100);

	const WR_INK_PALETTE = /** @type {const} */ ([
		{
			id: 'cyan',
			hex: '#00f0ff',
			label: 'CY',
			chipBorder:
				'tw-border-[#00f0ff] tw-shadow-[inset_0_0_10px_rgba(0,240,255,0.45)]',
			chipRing: 'tw-ring-[#00f0ff]/65',
		},
		{
			id: 'ares',
			hex: '#ff0033',
			label: 'TH',
			chipBorder:
				'tw-border-[#ff0033] tw-shadow-[inset_0_0_10px_rgba(255,0,51,0.38)]',
			chipRing: 'tw-ring-[#ff0033]/60',
		},
		{
			id: 'magenta',
			hex: '#d946ef',
			label: 'MG',
			chipBorder:
				'tw-border-fuchsia-400 tw-shadow-[inset_0_0_10px_rgba(217,70,239,0.38)]',
			chipRing: 'tw-ring-fuchsia-400/60',
		},
		{
			id: 'amber',
			hex: '#f59e0b',
			label: 'AM',
			chipBorder:
				'tw-border-amber-400 tw-shadow-[inset_0_0_10px_rgba(245,158,11,0.38)]',
			chipRing: 'tw-ring-amber-400/60',
		},
		{
			id: 'emerald',
			hex: '#10b981',
			label: 'EM',
			chipBorder:
				'tw-border-emerald-400 tw-shadow-[inset_0_0_10px_rgba(16,185,129,0.38)]',
			chipRing: 'tw-ring-emerald-400/60',
		},
	]);

	/** Active ink / vector stroke — Tron Legacy cyan default */
	let warRoomInkColor = $state('#00f0ff');

	/** @type {HTMLElement | undefined} */
	let pitchBoardEl = $state();

	/** Pitch grid SVG — shared viewBox/CTM with ink layer (fluid token coords). */
	/** @type {SVGSVGElement | undefined} */
	let pitchCoordSvgEl = $state();

	/** @type {string | null} */
	let boardDragId = $state(null);

	/** Drawable ink layer (War Room), SVG viewBox 0–100 — neon ink for dark pitch */
	/** @type {SVGSVGElement | undefined} */
	let inkSvgEl = $state();
	let inkDrawing = $state(false);

	/**
	 * Tactical routes (SVG viewBox 0–100). Segments are editable via endpoint handles.
	 * @typedef {{
	 *   id: number;
	 *   startX: number;
	 *   startY: number;
	 *   endX: number;
	 *   endY: number;
	 *   stroke: string;
	 *   glowColor: string;
	 *   dashPattern: string;
	 *   lineStyle: 'draw_arrow' | 'dashed_line';
	 *   linkedPieceId: string | null;
	 * }} WarRoomRoute
	 */
	/** @type {WarRoomRoute[]} */
	let warRoomRoutes = $state([]);
	let warRoomRouteIdSeq = $state(1);

	/** Vector preview segment (SVG user coords, viewBox space) */
	let inkVectorDraft = $state(/** @type {null | { x1: number; y1: number; x2: number; y2: number }} */ (null));

	/** @type {null | { routeId: number; which: 'start' | 'end' }} */
	let routeEndpointDrag = $state(null);

	/**
	 * Screen pixels → SVG viewBox coords (inverse screen CTM only — no client rect math).
	 * @param {{ clientX: number; clientY: number }} event
	 * @param {SVGSVGElement} svgElement
	 */
	function getSvgPoint(event, svgElement) {
		const pt = svgElement.createSVGPoint();
		pt.x = event.clientX;
		pt.y = event.clientY;
		return pt.matrixTransform(svgElement.getScreenCTM().inverse());
	}

	/** @param {WarRoomRoute} r */
	function warRoomRoutePathD(r) {
		return `M ${r.startX.toFixed(2)} ${r.startY.toFixed(2)} L ${r.endX.toFixed(2)} ${r.endY.toFixed(2)}`;
	}

	/** Neon bloom hue for light-cycle trails (cyan ops vs red threat). */
	function trailGlowHexFromInk(hex) {
		const h = typeof hex === 'string' ? hex.trim().toLowerCase() : '';
		if (
			h.includes('ff0033') ||
			h.includes('f43f5e') ||
			h.includes('fb7185') ||
			h.includes('e11d48')
		) {
			return '#ff0033';
		}
		return '#00f0ff';
	}

	/** Titan tactical ink — single dot raster for every War Room stroke. */
	const WR_TACTICAL_DOT_ARRAY = /** @type {const} */ ('2 6');

	/**
	 * @param {'draw_arrow' | 'dashed_line'} ls
	 */
	function strokeAttrsFromLineStyle(ls) {
		if (ls === 'draw_arrow')
			return {
				dashed: true,
				arrow: true,
				dashPattern: WR_TACTICAL_DOT_ARRAY,
			};
		return {
			dashed: true,
			arrow: true,
			dashPattern: WR_TACTICAL_DOT_ARRAY,
		};
	}

	/**
	 * @param {string} pathD
	 * @returns {{ x: number; y: number } | null}
	 */
	function pathDEndpoint(pathD) {
		const nums = pathD.match(/-?\d+\.?\d*/g);
		if (!nums || nums.length < 4) return null;
		return { x: parseFloat(nums[nums.length - 2]), y: parseFloat(nums[nums.length - 1]) };
	}

	/**
	 * @param {string} d
	 * @param {number} u 0–1
	 */
	function pointOnMovementPath(d, u) {
		if (!browser || !d?.trim() || !warRoomPathMeasureEl) return null;
		warRoomPathMeasureEl.setAttribute('d', d);
		const len = warRoomPathMeasureEl.getTotalLength();
		if (len < 1e-6) return null;
		const pt = warRoomPathMeasureEl.getPointAtLength(len * clampPct(u, 0, 1));
		return { x: pt.x, y: pt.y };
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} thresh viewBox units
	 */
	function nearestPieceIdAtBoardXY(x, y, thresh) {
		let bestId = /** @type {string | null} */ (null);
		let best = thresh;
		const u = warRoomTelemetryU;
		for (const p of magneticPieces) {
			const pos = pieceXYAtTelemetry(p, u);
			const d = Math.hypot(pos.x - x, pos.y - y);
			if (d < best) {
				best = d;
				bestId = p.id;
			}
		}
		return bestId;
	}

	/**
	 * @param {string} pathD
	 * @returns {{ x: number; y: number } | null}
	 */
	function pathDStart(pathD) {
		const nums = pathD.match(/-?\d+\.?\d*/g);
		if (!nums || nums.length < 2) return null;
		return { x: parseFloat(nums[0]), y: parseFloat(nums[1]) };
	}

	/**
	 * @param {string} pathD
	 * @param {string | null} linkedPieceId
	 */
	function assignKineticArrow(pathD, linkedPieceId) {
		if (!linkedPieceId) return;
		const start = pathDStart(pathD);
		const end = pathDEndpoint(pathD);
		magneticPieces = magneticPieces.map((p) => {
			if (p.id !== linkedPieceId) return p;
			const pts =
				start && end ?
					[{ x: start.x, y: start.y }, { x: end.x, y: end.y }]
				:	p.routePts?.length ?
					p.routePts
				:	[{ x: p.xPct, y: p.yPct }];
			return {
				...p,
				movementVector: pathD,
				routePts: pts,
				xPct: pts[0]?.x ?? p.xPct,
				yPct: pts[0]?.y ?? p.yPct,
			};
		});
	}

	function initWarRoomRosterBuckets() {
		const ids = activeRoster.map((r) => r.id);
		if (ids.length === 0) {
			wrBucketXi = [];
			wrBucketBench = [];
			wrBucketPitch = [];
			return;
		}
		const xi = ids.slice(0, 11);
		const bench = ids.slice(11);
		wrBucketXi = xi;
		wrBucketBench = bench;
		wrBucketPitch = [];
		wrOppPitch = [];
		syncMagneticPiecesFromBuckets();
	}

	function syncMagneticPiecesFromBuckets() {
		const prevById = Object.fromEntries(magneticPieces.map((p) => [p.id, p]));
		/** @type {MagneticPiece[]} */
		const next = [];
		let fi = 0;
		for (const id of wrBucketPitch) {
			const op = activeRoster.find((r) => r.id === id);
			if (!op) continue;
			const boardId = op.id;
			const prev = prevById[boardId];
			if (prev) {
				next.push(prev);
				continue;
			}
			const xPct = clampPct(28 + (fi % 4) * 10, 0.5, 99.5);
			const yPct = clampPct(38 + Math.floor(fi / 4) * 8, 0.5, 99.5);
			fi++;
			next.push({
				id: boardId,
				name: op.name,
				role: op.role,
				xPct,
				yPct,
				side: 'friendly',
				routePts: [{ x: xPct, y: yPct }],
				movementVector: null,
			});
		}
		let oi = 0;
		for (const oid of wrOppPitch) {
			const op = MOCK_OPPOSITION.find((r) => r.id === oid);
			if (!op) continue;
			const boardId = `opp::${op.id}`;
			const prev = prevById[boardId];
			if (prev) {
				next.push(prev);
				continue;
			}
			const xPct = clampPct(62 + (oi % 3) * 8, 0.5, 99.5);
			const yPct = clampPct(36 + Math.floor(oi / 3) * 10, 0.5, 99.5);
			oi++;
			next.push({
				id: boardId,
				name: op.name,
				role: op.role,
				xPct,
				yPct,
				side: 'opp',
				routePts: [{ x: xPct, y: yPct }],
				movementVector: null,
			});
		}
		magneticPieces = next;
	}

	/**
	 * @param {DragEvent} e
	 * @param {'xi' | 'bench' | 'pitch'} zone
	 */
	function rosterZoneDragOver(e, zone) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	/**
	 * @param {DragEvent} e
	 * @param {'xi' | 'bench' | 'pitch'} zone
	 */
	function rosterZoneDrop(e, zone) {
		e.preventDefault();
		let raw;
		try {
			raw = e.dataTransfer?.getData('application/json');
			if (!raw) return;
		} catch {
			return;
		}
		/** @type {{ scope?: string; id?: string }} */
		let data;
		try {
			data = JSON.parse(raw);
		} catch {
			return;
		}
		const id = typeof data.id === 'string' ? data.id : '';
		if (!id) return;
		const scope = data.scope === 'opp' ? 'opp' : 'friendly';

		if (scope === 'opp') {
			if (zone !== 'pitch') return;
			if (!wrOppPitch.includes(id)) wrOppPitch = [...wrOppPitch, id];
			syncMagneticPiecesFromBuckets();
			return;
		}

		wrBucketXi = wrBucketXi.filter((x) => x !== id);
		wrBucketBench = wrBucketBench.filter((x) => x !== id);
		wrBucketPitch = wrBucketPitch.filter((x) => x !== id);

		if (zone === 'xi') {
			const next = [...wrBucketXi, id];
			wrBucketXi = next.length > 11 ? next.slice(0, 11) : next;
			wrBucketBench = [...wrBucketBench];
			wrBucketPitch = [...wrBucketPitch];
		} else if (zone === 'bench') {
			wrBucketBench = [...wrBucketBench, id];
			wrBucketXi = [...wrBucketXi];
			wrBucketPitch = [...wrBucketPitch];
		} else {
			wrBucketPitch = [...wrBucketPitch, id];
			wrBucketXi = [...wrBucketXi];
			wrBucketBench = [...wrBucketBench];
		}
		syncMagneticPiecesFromBuckets();
	}

	/**
	 * @param {DragEvent} e
	 * @param {'friendly' | 'opp'} scope
	 * @param {{ id: string; name: string; role: string }} payload
	 */
	function rosterModalChipDragStart(e, scope, payload) {
		try {
			e.dataTransfer?.setData(
				'application/json',
				JSON.stringify({ scope, id: payload.id, name: payload.name, role: payload.role }),
			);
			if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
		} catch {
			/* ignore */
		}
	}

	function removeOppFromPitch(oppId) {
		wrOppPitch = wrOppPitch.filter((x) => x !== oppId);
		syncMagneticPiecesFromBuckets();
	}

	const warRoomDraftStrokeAttrs = $derived(strokeAttrsFromLineStyle(warRoomLineStyle));

	/**
	 * @param {PointerEvent} e
	 */
	function inkPointerDown(e) {
		if (!inkSvgEl || e.button !== 0 || warRoomTool !== 'vector') return;
		e.preventDefault();
		e.stopPropagation();
		inkDrawing = true;
		const { x, y } = getSvgPoint(e, inkSvgEl);
		inkVectorDraft = { x1: x, y1: y, x2: x, y2: y };
		try {
			inkSvgEl.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	/**
	 * @param {PointerEvent} e
	 */
	function inkPointerMove(e) {
		if (!inkDrawing || !inkSvgEl || warRoomTool !== 'vector') return;
		e.preventDefault();
		e.stopPropagation();
		const { x, y } = getSvgPoint(e, inkSvgEl);
		if (inkVectorDraft) inkVectorDraft = { ...inkVectorDraft, x2: x, y2: y };
	}

	/**
	 * @param {PointerEvent} e
	 */
	function inkPointerUp(e) {
		if (!inkDrawing) return;
		e.stopPropagation();
		inkDrawing = false;
		try {
			inkSvgEl?.releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		if (warRoomTool === 'vector' && inkVectorDraft) {
			const { x1, y1, x2, y2 } = inkVectorDraft;
			const dx = x2 - x1;
			const dy = y2 - y1;
			if (Math.hypot(dx, dy) > 0.35) {
				const attrs = strokeAttrsFromLineStyle(warRoomLineStyle);
				const linkId =
					warRoomLineStyle === 'draw_arrow' ? nearestPieceIdAtBoardXY(x1, y1, 12) : null;
				const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
				const id = warRoomRouteIdSeq;
				warRoomRouteIdSeq = warRoomRouteIdSeq + 1;
				warRoomRoutes = [
					...warRoomRoutes,
					{
						id,
						startX: x1,
						startY: y1,
						endX: x2,
						endY: y2,
						stroke: warRoomInkColor,
						glowColor: trailGlowHexFromInk(warRoomInkColor),
						dashPattern: attrs.dashPattern ?? WR_TACTICAL_DOT_ARRAY,
						lineStyle: warRoomLineStyle,
						linkedPieceId: linkId,
					},
				];
				if (warRoomLineStyle === 'draw_arrow' && linkId) {
					assignKineticArrow(path, linkId);
				} else if (warRoomLineStyle === 'dashed_line') {
					attachTelemetryRoute(x1, y1, x2, y2);
				}
			}
			inkVectorDraft = null;
		}
	}

	/**
	 * @param {PointerEvent} e
	 * @param {number} routeId
	 * @param {'start' | 'end'} which
	 */
	function routeHandlePointerDown(e, routeId, which) {
		if (!inkSvgEl || e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		if (routeEndpointDrag) routeHandlePointerUp();
		routeEndpointDrag = { routeId, which };
		window.addEventListener('pointermove', routeHandlePointerMove);
		window.addEventListener('pointerup', routeHandlePointerUp);
		window.addEventListener('pointercancel', routeHandlePointerUp);
		try {
			e.currentTarget?.setPointerCapture?.(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function routeHandlePointerMove(e) {
		const drag = routeEndpointDrag;
		if (!drag || !inkSvgEl) return;
		const { x, y } = getSvgPoint(e, inkSvgEl);
		warRoomRoutes = warRoomRoutes.map((r) => {
			if (r.id !== drag.routeId) return r;
			return drag.which === 'start' ?
					{ ...r, startX: x, startY: y }
				:	{ ...r, endX: x, endY: y };
		});
		const r = warRoomRoutes.find((rr) => rr.id === drag.routeId);
		if (r?.lineStyle === 'draw_arrow' && r.linkedPieceId) {
			assignKineticArrow(warRoomRoutePathD(r), r.linkedPieceId);
		}
	}

	function routeHandlePointerUp() {
		routeEndpointDrag = null;
		window.removeEventListener('pointermove', routeHandlePointerMove);
		window.removeEventListener('pointerup', routeHandlePointerUp);
		window.removeEventListener('pointercancel', routeHandlePointerUp);
	}

	function clearInk() {
		warRoomRoutes = [];
		inkVectorDraft = null;
		routeEndpointDrag = null;
	}

	/**
	 * @param {number} v
	 * @param {number} lo
	 * @param {number} hi
	 */
	function clampPct(v, lo, hi) {
		return Math.min(hi, Math.max(lo, v));
	}

	const TELEMETRY_ATTACH_THRESH = 11;

	/**
	 * Pitch-normalized coords from pointer — fluid sub-pixel mapping via layout bounds.
	 * @param {number} clientX
	 * @param {number} clientY
	 */
	function boardPctFromClient(clientX, clientY) {
		const svg = inkSvgEl ?? pitchCoordSvgEl;
		if (!svg) return null;
		const { x, y } = getSvgPoint({ clientX, clientY }, svg);
		return {
			x: clampPct(x, 0.05, 99.95),
			y: clampPct(y, 0.05, 99.95),
		};
	}

	/**
	 * @param {{ x: number; y: number }[]} pts
	 * @param {number} u 0–1 along cumulative polyline length
	 */
	function interpolateAlongPolyline(pts, u) {
		if (!pts.length) return null;
		const clamped = clampPct(u, 0, 1);
		if (pts.length === 1) return { ...pts[0] };
		let total = 0;
		const segLens = /** @type {number[]} */ ([]);
		for (let i = 1; i < pts.length; i++) {
			const sl = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
			segLens.push(sl);
			total += sl;
		}
		if (total < 1e-4) return { ...pts[pts.length - 1] };
		let d = clamped * total;
		for (let i = 1; i < pts.length; i++) {
			const sl = segLens[i - 1];
			if (d <= sl) {
				const t = sl > 0 ? d / sl : 0;
				return {
					x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
					y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
				};
			}
			d -= sl;
		}
		return { ...pts[pts.length - 1] };
	}

	/**
	 * @param {MagneticPiece} piece
	 * @param {number} u 0–1 timeline playhead
	 */
	function pieceXYAtTelemetry(piece, u) {
		const mv = piece.movementVector?.trim();
		if (mv) {
			const kin = pointOnMovementPath(mv, u);
			if (kin) return kin;
		}
		const pts = piece.routePts?.length ? piece.routePts : [{ x: piece.xPct, y: piece.yPct }];
		const pt = interpolateAlongPolyline(pts, u);
		return pt ?? { x: piece.xPct, y: piece.yPct };
	}

	/**
	 * Extend nearest token route toward vector / scribble endpoint (SIM playback path).
	 */
	function attachTelemetryRoute(x1, y1, x2, y2) {
		magneticPieces = magneticPieces.map((p) => {
			const pts = p.routePts?.length ? p.routePts : [{ x: p.xPct, y: p.yPct }];
			const tail = pts[pts.length - 1];
			const d = Math.hypot(tail.x - x1, tail.y - y1);
			if (d <= TELEMETRY_ATTACH_THRESH) {
				const du = Math.hypot(x2 - x1, y2 - y1);
				if (du < 0.25) return p;
				const routePts = [...pts, { x: x2, y: y2 }];
				return { ...p, routePts, xPct: routePts[0].x, yPct: routePts[0].y };
			}
			return p;
		});
	}

	function stopWarRoomTelemetryPlayback() {
		telemetryPlaying = false;
		if (browser && warRoomPlayRaf) {
			cancelAnimationFrame(warRoomPlayRaf);
			warRoomPlayRaf = 0;
		}
	}

	function toggleWarRoomTelemetryPlay() {
		if (telemetryPlaying) {
			stopWarRoomTelemetryPlayback();
			return;
		}
		stopWarRoomTelemetryPlayback();
		if (telemetryProgress >= 99.5) telemetryProgress = 0;
		telemetryPlaying = true;
		const startProg = telemetryProgress;
		const t0 = performance.now();
		const dur = 6500;
		function frame(now) {
			if (!telemetryPlaying) return;
			const next = startProg + ((now - t0) / dur) * (100 - startProg);
			telemetryProgress = Math.min(100, next);
			if (telemetryProgress >= 99.99) {
				stopWarRoomTelemetryPlayback();
				return;
			}
			warRoomPlayRaf = requestAnimationFrame(frame);
		}
		warRoomPlayRaf = requestAnimationFrame(frame);
	}

	function clearWarRoomBoard() {
		stopWarRoomTelemetryPlayback();
		telemetryProgress = 0;
		clearInk();
		wrBucketPitch = [];
		wrOppPitch = [];
		boardDragId = null;
		syncMagneticPiecesFromBuckets();
	}

	/**
	 * @param {PointerEvent} e
	 * @param {string} pieceId
	 */
	function boardChipPointerDown(e, pieceId) {
		if (warRoomTool !== 'nodes' || e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		boardDragId = pieceId;
		window.addEventListener('pointermove', boardChipPointerMove);
		window.addEventListener('pointerup', boardChipPointerUp);
	}

	function boardChipPointerMove(e) {
		if (!boardDragId) return;
		const pos = boardPctFromClient(e.clientX, e.clientY);
		if (!pos) return;
		const { x: xPct, y: yPct } = pos;
		const id = boardDragId;
		magneticPieces = magneticPieces.map((p) => {
			if (p.id !== id) return p;
			const pts = p.routePts?.length ? p.routePts : [{ x: p.xPct, y: p.yPct }];
			const dx = xPct - pts[0].x;
			const dy = yPct - pts[0].y;
			const routePts = pts.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
			return {
				...p,
				xPct: routePts[0].x,
				yPct: routePts[0].y,
				routePts,
				movementVector: null,
			};
		});
	}

	function boardChipPointerUp() {
		boardDragId = null;
		window.removeEventListener('pointermove', boardChipPointerMove);
		window.removeEventListener('pointerup', boardChipPointerUp);
	}

	/**
	 * @param {string} name
	 */
	function warRoomChipInitials(name) {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			const a = parts[0]?.[0] ?? '?';
			const b = parts[parts.length - 1]?.[0] ?? '?';
			return (a + b).toUpperCase();
		}
		const t = parts[0] ?? name;
		return t.slice(0, 2).toUpperCase();
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

	function commandConsoleToggleWarRoom() {
		if (showTacticalOverlay) closeWarRoom();
		else openWarRoom();
	}

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
	function openWarRoom() {
		showTacticalOverlay = true;
	}

	function closeWarRoom() {
		stopWarRoomTelemetryPlayback();
		telemetryProgress = 0;
		showTacticalOverlay = false;
		warRoomRosterModalOpen = false;
		warRoomTool = 'nodes';
		wrBucketPitch = [];
		wrOppPitch = [];
		magneticPieces = [];
		boardDragId = null;
		clearInk();
	}

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
			if (e.key === 'Escape') closeWarRoom();
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
				<button type="button" class="{CMD_BRIDGE_IDLE_SECOND}" onclick={commandConsoleToggleWarRoom}>
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
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		transition:fade={{ duration: 150 }}
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-h-screen tw-w-screen tw-bg-black/90 tw-backdrop-blur-3xl tw-backdrop-saturate-[1.45]"
		role="presentation"
		onclick={closeWarRoom}
	>
		<button
			type="button"
			class="btn-ares tw-fixed tw-right-[max(1rem,calc((100vw-98vw)/2))] tw-top-[max(1rem,5vh)] tw-z-[10060] tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-backdrop-blur-md focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-rose-400"
			onclick={(e) => {
				e.stopPropagation();
				closeWarRoom();
			}}
			aria-label="Close tactical war room"
		>
			<svg class="tw-h-5 tw-w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
				<path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
			</svg>
		</button>

		<div
			transition:fly={{ y: 18, duration: 280, easing: cubicOut }}
			class="vanguard-panel tw-relative tw-z-[10000] tw-mx-auto tw-mt-[2.5vh] tw-flex tw-h-[95vh] tw-w-[98vw] tw-flex-col tw-overflow-hidden tw-rounded-3xl tw-shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_32px_120px_rgba(0,0,0,0.78)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="war-room-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<div
				class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-rounded-3xl tw-bg-[radial-gradient(ellipse_at_50%_-14%,rgba(0,240,255,0.18)_0%,transparent_54%),linear-gradient(122deg,rgba(255,255,255,0.062)_0%,transparent_40%),linear-gradient(208deg,transparent_54%,rgba(0,240,255,0.09)_100%)]"
				aria-hidden="true"
			></div>

			<div class="tw-relative tw-z-[2] tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden">
			<svg
				class="war-room-path-measure tw-pointer-events-none tw-fixed tw-left-0 tw-top-0 tw-h-px tw-w-px tw-overflow-hidden tw-opacity-0"
				viewBox="0 0 100 100"
				aria-hidden="true"
			>
				<path bind:this={warRoomPathMeasureEl} d="" />
			</svg>

			{#if warRoomRosterModalOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="tw-fixed tw-inset-0 tw-z-[10040] tw-flex tw-items-center tw-justify-center tw-bg-black/75 tw-p-4 tw-backdrop-blur-3xl tw-backdrop-saturate-[1.45]"
					role="presentation"
					onclick={(e) => {
						if (e.target === e.currentTarget) warRoomRosterModalOpen = false;
					}}
				>
					<div
						class="vanguard-panel tw-scrollbar-hide tw-relative tw-max-h-[88vh] tw-w-full tw-max-w-5xl tw-overflow-y-auto tw-rounded-2xl tw-p-6 tw-shadow-[0_32px_100px_rgba(0,0,0,0.72)]"
						role="dialog"
						aria-modal="true"
						aria-labelledby="war-room-roster-modal-title"
						onclick={(e) => e.stopPropagation()}
					>
						<div class="tw-mb-4 tw-flex tw-items-start tw-justify-between tw-gap-3">
							<div>
								<h3 id="war-room-roster-modal-title" class="tw-vanguard-section-header tw-font-mono tw-text-white">
									Roster & assignments
								</h3>
								<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-slate-500 tw-uppercase">
									Drag athletes into XI · Bench · Pitch deployment
								</p>
							</div>
							<button
								type="button"
								class="btn-director tw-shrink-0 tw-rounded-full tw-px-4 tw-py-2 tw-text-[10px]"
								onclick={() => (warRoomRosterModalOpen = false)}
							>
								CLOSE
							</button>
						</div>

						<p class="tw-mb-2 tw-font-mono tw-text-[9px] tw-tracking-[0.22em] tw-text-rose-400/90 tw-uppercase">
							Opposition — drag into Deploy to pitch only
						</p>
						<div
							class="tw-scrollbar-hide tw-mb-6 tw-grid tw-min-h-[5rem] tw-grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] tw-gap-3 tw-rounded-xl tw-border tw-border-rose-500/28 tw-bg-slate-950/45 tw-p-4"
						>
							{#each MOCK_OPPOSITION as op (op.id)}
								{#if !wrOppPitch.includes(op.id)}
									<div
										draggable="true"
										class="tw-flex tw-h-14 tw-w-14 tw-cursor-grab tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-[1.5px] tw-border-rose-400 tw-bg-slate-950 tw-font-mono tw-text-[9px] tw-font-bold tw-text-rose-100 tw-shadow-[inset_0_0_12px_rgba(251,113,133,0.28)]"
										ondragstart={(e) => rosterModalChipDragStart(e, 'opp', op)}
									>
										{warRoomChipInitials(op.name)}
									</div>
								{/if}
							{/each}
							{#if MOCK_OPPOSITION.every((o) => wrOppPitch.includes(o.id))}
								<span class="tw-font-mono tw-text-[10px] tw-text-slate-500">All scout tokens on pitch — remove from deploy column to recall.</span>
							{/if}
						</div>

						<div class="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-3">
							<div
								class="tw-flex tw-min-h-[11rem] tw-flex-col tw-rounded-xl tw-border tw-border-[#00f0ff]/18 tw-bg-slate-950/40 tw-p-3"
								role="region"
								aria-label="Starting XI"
								ondragover={(e) => rosterZoneDragOver(e, 'xi')}
								ondrop={(e) => rosterZoneDrop(e, 'xi')}
							>
								<p class="tw-mb-2 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-[#00f0ff] tw-uppercase">
									Starting XI
								</p>
								<p class="tw-mb-3 tw-font-mono tw-text-[9px] tw-tracking-[0.18em] tw-text-slate-500 tw-uppercase">
									Grid of operatives · max 11
								</p>
								<div
									class="tw-scrollbar-hide tw-grid tw-min-h-[10rem] tw-auto-rows-min tw-grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] tw-gap-3"
								>
									{#each wrBucketXi as pid (pid)}
										{@const op = activeRoster.find((r) => r.id === pid)}
										{#if op}
											<div
												draggable="true"
												class="tw-flex tw-h-14 tw-w-14 tw-cursor-grab tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-[1.5px] tw-border-[#00f0ff] tw-bg-slate-950 tw-font-mono tw-text-[9px] tw-font-bold tw-text-[#dffcff] tw-shadow-[inset_0_0_12px_rgba(0,240,255,0.35)]"
												ondragstart={(e) => rosterModalChipDragStart(e, 'friendly', op)}
											>
												{warRoomChipInitials(op.name)}
											</div>
										{/if}
									{/each}
								</div>
							</div>
							<div
								class="tw-flex tw-min-h-[11rem] tw-flex-col tw-rounded-xl tw-border tw-border-[#00f0ff]/18 tw-bg-slate-950/40 tw-p-3"
								role="region"
								aria-label="Bench"
								ondragover={(e) => rosterZoneDragOver(e, 'bench')}
								ondrop={(e) => rosterZoneDrop(e, 'bench')}
							>
								<p class="tw-mb-2 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-[#00f0ff] tw-uppercase">Bench</p>
								<p class="tw-mb-3 tw-font-mono tw-text-[9px] tw-tracking-[0.18em] tw-text-slate-500 tw-uppercase">
									Grid of operatives
								</p>
								<div
									class="tw-scrollbar-hide tw-grid tw-min-h-[10rem] tw-auto-rows-min tw-grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] tw-gap-3"
								>
									{#each wrBucketBench as pid (pid)}
										{@const op = activeRoster.find((r) => r.id === pid)}
										{#if op}
											<div
												draggable="true"
												class="tw-flex tw-h-14 tw-w-14 tw-cursor-grab tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-[1.5px] tw-border-[#00f0ff] tw-bg-slate-950 tw-font-mono tw-text-[9px] tw-font-bold tw-text-[#dffcff] tw-shadow-[inset_0_0_12px_rgba(0,240,255,0.35)]"
												ondragstart={(e) => rosterModalChipDragStart(e, 'friendly', op)}
											>
												{warRoomChipInitials(op.name)}
											</div>
										{/if}
									{/each}
								</div>
							</div>
							<div
								class="tw-flex tw-min-h-[11rem] tw-flex-col tw-rounded-xl tw-border tw-border-[#00f0ff]/18 tw-bg-slate-950/40 tw-p-3"
								role="region"
								aria-label="Deploy to pitch"
								ondragover={(e) => rosterZoneDragOver(e, 'pitch')}
								ondrop={(e) => rosterZoneDrop(e, 'pitch')}
							>
								<p class="tw-mb-2 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-[#00f0ff] tw-uppercase">
									Deploy to pitch
								</p>
								<p class="tw-mb-3 tw-font-mono tw-text-[9px] tw-tracking-[0.18em] tw-text-slate-500 tw-uppercase">
									Grid of operatives · board tokens
								</p>
								<div
									class="tw-scrollbar-hide tw-grid tw-min-h-[10rem] tw-auto-rows-min tw-grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] tw-gap-3"
								>
									{#each wrBucketPitch as pid (pid)}
										{@const op = activeRoster.find((r) => r.id === pid)}
										{#if op}
											<div
												draggable="true"
												class="tw-flex tw-h-14 tw-w-14 tw-cursor-grab tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-[1.5px] tw-border-[#00f0ff] tw-bg-slate-950 tw-font-mono tw-text-[9px] tw-font-bold tw-text-[#dffcff] tw-shadow-[inset_0_0_12px_rgba(0,240,255,0.35)]"
												ondragstart={(e) => rosterModalChipDragStart(e, 'friendly', op)}
											>
												{warRoomChipInitials(op.name)}
											</div>
										{/if}
									{/each}
									{#each wrOppPitch as oid (oid)}
										{@const op = MOCK_OPPOSITION.find((r) => r.id === oid)}
										{#if op}
											<div class="tw-relative tw-inline-flex">
												<div
													draggable="true"
													class="tw-flex tw-h-14 tw-w-14 tw-cursor-grab tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-[1.5px] tw-border-rose-400 tw-bg-slate-950 tw-font-mono tw-text-[9px] tw-font-bold tw-text-rose-100 tw-shadow-[inset_0_0_12px_rgba(251,113,133,0.28)]"
													ondragstart={(e) => rosterModalChipDragStart(e, 'opp', op)}
												>
													{warRoomChipInitials(op.name)}
												</div>
												<button
													type="button"
													class="tw-absolute tw--right-1 tw--top-1 tw-flex tw-h-5 tw-w-5 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-rose-500/40 tw-bg-slate-950 tw-font-mono tw-text-[9px] tw-leading-none tw-text-rose-300 hover:tw-bg-rose-950/80"
													aria-label="Remove {op.name} from pitch list"
													onclick={() => removeOppFromPitch(op.id)}
												>
													×
												</button>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div class="tw-relative tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden">
				<h2 id="war-room-title" class="tw-sr-only">War Room tactical board</h2>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={pitchBoardEl}
					class="war-room-pitch-host tw-relative tw-z-[10] tw-flex tw-min-h-0 tw-flex-1 tw-h-full tw-w-full tw-overflow-hidden tw-bg-transparent tw-shadow-[inset_0_0_120px_rgba(0,240,255,0.06)]"
					role="application"
					aria-label="Tactical pitch magnetic board"
				>
					<div class="tw-pointer-events-none tw-absolute tw-left-0 tw-right-0 tw-top-5 tw-z-[55] tw-flex tw-justify-center md:tw-top-6">
						<button
							type="button"
							class="btn-director tw-pointer-events-auto tw-inline-flex tw-items-center tw-justify-center tw-rounded-full tw-px-8 tw-py-2.5 tw-text-[10px] tw-tracking-[0.28em] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff]/70"
							onclick={(e) => {
								e.stopPropagation();
								warRoomRosterModalOpen = true;
							}}
						>
							[ MANAGE ROSTER ]
						</button>
					</div>
						<div
							class="tw-pointer-events-none tw-absolute tw-left-3 tw-top-3 tw-z-[60] tw-h-8 tw-w-8 tw-border-t-2 tw-border-l-2 tw-border-[#00f0ff]/40"
							aria-hidden="true"
						></div>
						<div
							class="tw-pointer-events-none tw-absolute tw-right-3 tw-top-3 tw-z-[60] tw-h-8 tw-w-8 tw-border-t-2 tw-border-r-2 tw-border-[#00f0ff]/40"
							aria-hidden="true"
						></div>
						<div
							class="tw-pointer-events-none tw-absolute tw-bottom-3 tw-left-3 tw-z-[60] tw-h-8 tw-w-8 tw-border-b-2 tw-border-l-2 tw-border-[#00f0ff]/40"
							aria-hidden="true"
						></div>
						<div
							class="tw-pointer-events-none tw-absolute tw-bottom-3 tw-right-3 tw-z-[60] tw-h-8 tw-w-8 tw-border-b-2 tw-border-r-2 tw-border-[#00f0ff]/40"
							aria-hidden="true"
						></div>

						<div
							class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[1] tw-bg-[radial-gradient(ellipse_at_50%_42%,rgba(0,240,255,0.06)_0%,transparent_55%),linear-gradient(168deg,#010806_0%,#051812_42%,#020807_100%)] tw-opacity-[0.92]"
							aria-hidden="true"
						></div>

						<svg
							bind:this={pitchCoordSvgEl}
							class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[2] tw-h-full tw-w-full"
							width="100%"
							height="100%"
							viewBox="0 0 100 100"
							preserveAspectRatio="xMidYMid slice"
							aria-hidden="true"
						>
							<defs>
								<filter id="neonBloom" x="-20%" y="-20%" width="140%" height="140%">
									<feGaussianBlur stdDeviation="3" result="blur" />
									<feMerge>
										<feMergeNode in="blur" />
										<feMergeNode in="blur" />
										<feMergeNode in="SourceGraphic" />
									</feMerge>
								</filter>
								<marker
									id="arrowheadTrail"
									markerWidth="7"
									markerHeight="7"
									refX="5.5"
									refY="3.5"
									orient="auto-start-reverse"
								>
									<polygon points="0 0, 7 3.5, 0 7" fill="#ffffff" />
								</marker>
							</defs>
							{#each WAR_ROOM_GRID_STEPS as gx (`wg-v-${gx}`)}
								<line
									x1={gx}
									y1="0"
									x2={gx}
									y2="100"
									stroke="rgba(255,255,255,0.06)"
									stroke-width="1"
									stroke-dasharray="2 6"
									vector-effect="non-scaling-stroke"
								/>
							{/each}
							{#each WAR_ROOM_GRID_STEPS as gy (`wg-h-${gy}`)}
								<line
									x1="0"
									y1={gy}
									x2="100"
									y2={gy}
									stroke="rgba(255,255,255,0.06)"
									stroke-width="1"
									stroke-dasharray="2 6"
									vector-effect="non-scaling-stroke"
								/>
							{/each}
						</svg>

						<svg
							class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[3] tw-h-full tw-w-full"
							width="100%"
							height="100%"
							viewBox="0 0 100 100"
							preserveAspectRatio="xMidYMid slice"
							aria-hidden="true"
						>
							<defs>
								<filter id="neonBloomPitch" x="-50%" y="-50%" width="200%" height="200%">
									<feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur" />
									<feMerge>
										<feMergeNode in="blur" />
										<feMergeNode in="blur" />
										<feMergeNode in="blur" />
										<feMergeNode in="SourceGraphic" />
									</feMerge>
								</filter>
							</defs>
							<rect
								x="6"
								y="30"
								width="88"
								height="40"
								fill="none"
								stroke="#00f0ff"
								stroke-width="1.35"
								stroke-dasharray="2 6"
								filter="url(#neonBloomPitch)"
								vector-effect="non-scaling-stroke"
							/>
							<line
								x1="50"
								y1="30"
								x2="50"
								y2="70"
								stroke="#00f0ff"
								stroke-width="1.35"
								stroke-dasharray="2 6"
								filter="url(#neonBloomPitch)"
								vector-effect="non-scaling-stroke"
							/>
							<circle
								cx="50"
								cy="50"
								r="9.5"
								fill="none"
								stroke="#00f0ff"
								stroke-width="1.35"
								stroke-dasharray="2 6"
								filter="url(#neonBloomPitch)"
								vector-effect="non-scaling-stroke"
							/>
							<rect
								x="6"
								y="38"
								width="16"
								height="24"
								fill="none"
								stroke="#00f0ff"
								stroke-width="1.35"
								stroke-dasharray="2 6"
								filter="url(#neonBloomPitch)"
								vector-effect="non-scaling-stroke"
							/>
							<rect
								x="6"
								y="43"
								width="6.5"
								height="14"
								fill="none"
								stroke="#00f0ff"
								stroke-width="1.35"
								stroke-dasharray="2 6"
								filter="url(#neonBloomPitch)"
								vector-effect="non-scaling-stroke"
							/>
							<rect
								x="78"
								y="38"
								width="16"
								height="24"
								fill="none"
								stroke="#00f0ff"
								stroke-width="1.35"
								stroke-dasharray="2 6"
								filter="url(#neonBloomPitch)"
								vector-effect="non-scaling-stroke"
							/>
							<rect
								x="87.5"
								y="43"
								width="6.5"
								height="14"
								fill="none"
								stroke="#00f0ff"
								stroke-width="1.35"
								stroke-dasharray="2 6"
								filter="url(#neonBloomPitch)"
								vector-effect="non-scaling-stroke"
							/>
						</svg>

						<div class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[18] tw-touch-none">
							{#each magneticPieces as piece (piece.id)}
								{@const xy = pieceXYAtTelemetry(piece, warRoomTelemetryU)}
								{@const motionRail =
									boardDragId === piece.id ? 'tw-transition-none' : (
										'tw-transition-all tw-duration-300 tw-ease-out'
									)}
								<button
									type="button"
									class="tw-pointer-events-auto tw-absolute tw-z-[19] tw-flex tw-h-11 tw-w-11 tw--translate-x-1/2 tw--translate-y-1/2 tw-cursor-grab tw-touch-none tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-text-center tw-font-mono tw-backdrop-blur-md tw-bg-black/50 {motionRail} active:tw-cursor-grabbing {piece.side ===
									'opp' ?
										'tw-border-2 tw-border-[#ff0033] tw-shadow-[var(--ares-glow)]'
									:	'tw-border-2 tw-border-[#00f0ff] tw-shadow-[var(--legacy-glow)]'} {warRoomTool === 'nodes' ?
										piece.side === 'opp' ?
											'tw-ring-2 tw-ring-[#ff0033]/55'
										:	'tw-ring-2 tw-ring-[#00f0ff]/50'
									:	'tw-opacity-[0.88]'}"
									style:left="{xy.x}%"
									style:top="{xy.y}%"
									aria-label="Move {piece.name} on pitch"
									disabled={warRoomTool !== 'nodes'}
									onpointerdown={(e) => boardChipPointerDown(e, piece.id)}
								>
									<span
										class="tw-text-[10px] tw-font-black tw-leading-none tw-tracking-wide {piece.side === 'opp' ?
											'tw-text-[#ff0033]'
										:	'tw-text-[#00f0ff]'}"
									>
										{warRoomChipInitials(piece.name)}
									</span>
									<span
										class="tw-mt-0.5 tw-max-w-[2.75rem] tw-truncate tw-text-[6px] tw-tracking-wider tw-uppercase tw-text-slate-500"
									>
										{piece.role}
									</span>
								</button>
							{/each}
						</div>

						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<svg
							id="war-room-svg"
							bind:this={inkSvgEl}
							class="war-room-ink-layer tw-absolute tw-inset-0 tw-z-[22] tw-h-full tw-w-full tw-touch-none {warRoomTool === 'nodes' ?
								'tw-pointer-events-none'
							:	'tw-pointer-events-auto'} {warRoomTool === 'vector' ? 'tw-cursor-crosshair' : ''}"
							width="100%"
							height="100%"
							viewBox="0 0 100 100"
							preserveAspectRatio="xMidYMid slice"
							aria-label="Tactical ink layer"
							onpointerdown={inkPointerDown}
							onpointermove={inkPointerMove}
							onpointerup={inkPointerUp}
							onpointerleave={inkPointerUp}
							onpointercancel={inkPointerUp}
						>
							{#each warRoomRoutes as route (route.id)}
								{@const trailStroke =
									trailGlowHexFromInk(route.stroke) === '#ff0033' ?
										'#ff0033'
									:	'var(--legacy-cyan, #00f0ff)'}
								<path
									d={warRoomRoutePathD(route)}
									fill="none"
									stroke={trailStroke}
									stroke-width="11"
									stroke-linecap="round"
									stroke-dasharray="2 6"
									stroke-opacity="0.48"
									vector-effect="non-scaling-stroke"
									filter="url(#neonBloom)"
									pointer-events="none"
								/>
								<path
									d={warRoomRoutePathD(route)}
									fill="none"
									stroke="#ffffff"
									stroke-width="1.35"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-dasharray="2 6"
									marker-end="url(#arrowheadTrail)"
									vector-effect="non-scaling-stroke"
									filter="url(#neonBloom)"
									pointer-events="none"
								/>
								<circle
									cx={route.startX}
									cy={route.startY}
									r={15}
									fill="transparent"
									opacity="0"
									class="tw-pointer-events-auto tw-cursor-move"
									aria-hidden="true"
									onpointerdown={(e) => routeHandlePointerDown(e, route.id, 'start')}
								/>
								<circle
									cx={route.endX}
									cy={route.endY}
									r={15}
									fill="transparent"
									opacity="0"
									class="tw-pointer-events-auto tw-cursor-move"
									aria-hidden="true"
									onpointerdown={(e) => routeHandlePointerDown(e, route.id, 'end')}
								/>
							{/each}
							{#if inkVectorDraft}
								{@const draftGlow =
									trailGlowHexFromInk(warRoomInkColor) === '#ff0033' ?
										'#ff0033'
									:	'var(--legacy-cyan, #00f0ff)'}
								<line
									x1={inkVectorDraft.x1}
									y1={inkVectorDraft.y1}
									x2={inkVectorDraft.x2}
									y2={inkVectorDraft.y2}
									stroke={draftGlow}
									stroke-width="11"
									stroke-linecap="round"
									stroke-dasharray="2 6"
									stroke-opacity="0.48"
									vector-effect="non-scaling-stroke"
									filter="url(#neonBloom)"
									pointer-events="none"
								/>
								<line
									x1={inkVectorDraft.x1}
									y1={inkVectorDraft.y1}
									x2={inkVectorDraft.x2}
									y2={inkVectorDraft.y2}
									stroke="#ffffff"
									stroke-width="1.35"
									stroke-linecap="round"
									stroke-dasharray={warRoomDraftStrokeAttrs.dashPattern}
									marker-end="url(#arrowheadTrail)"
									vector-effect="non-scaling-stroke"
									filter="url(#neonBloom)"
									pointer-events="none"
								/>
							{/if}
						</svg>

						<div
							class="tw-pointer-events-none tw-absolute tw-right-4 tw-top-16 tw-z-[56] tw-flex tw-max-w-[min(100%-2rem,calc(98vw-3rem))] tw-justify-end md:tw-top-14"
						>
							<div
								class="tw-pointer-events-auto tw-flex tw-max-w-full tw-flex-nowrap tw-items-center tw-justify-end tw-gap-1.5 tw-rounded-full tw-border tw-border-white/12 tw-bg-slate-950/82 tw-py-1.5 tw-pl-2 tw-pr-2 tw-backdrop-blur-3xl tw-shadow-[0_16px_48px_rgba(0,0,0,0.55),0_0_32px_rgba(0,240,255,0.12)]"
								role="toolbar"
								aria-label="War room tactical dock"
							>
								<button
									type="button"
									class="btn-director !tw-h-8 !tw-min-h-8 !tw-rounded-full !tw-px-2 !tw-py-0 !tw-text-[8px] !tw-tracking-[0.12em] {CMD_TOOL_HOVER} {warRoomTool === 'nodes' ?
										'!tw-border-[#00f0ff] !tw-bg-[#00f0ff]/15 !tw-text-white tw-shadow-[var(--legacy-glow)]'
									:	''}"
									aria-pressed={warRoomTool === 'nodes'}
									onclick={(e) => {
										e.stopPropagation();
										warRoomTool = 'nodes';
									}}
								>
									DRAG
								</button>
								<button
									type="button"
									class="btn-director !tw-h-8 !tw-min-h-8 !tw-rounded-full !tw-px-2 !tw-py-0 !tw-text-[8px] !tw-tracking-[0.12em] {CMD_TOOL_HOVER} {warRoomTool === 'vector' && warRoomLineStyle === 'draw_arrow' ?
										'!tw-border-[#00f0ff] !tw-bg-[#00f0ff]/15 !tw-text-white tw-shadow-[var(--legacy-glow)]'
									:	''}"
									aria-pressed={warRoomTool === 'vector' && warRoomLineStyle === 'draw_arrow'}
									onclick={(e) => {
										e.stopPropagation();
										warRoomTool = 'vector';
										warRoomLineStyle = 'draw_arrow';
									}}
								>
									DOTTED_ARROW
								</button>
								<button
									type="button"
									class="btn-director !tw-h-8 !tw-min-h-8 !tw-rounded-full !tw-px-2 !tw-py-0 !tw-text-[8px] !tw-tracking-[0.12em] {CMD_TOOL_HOVER} {warRoomTool === 'vector' && warRoomLineStyle === 'dashed_line' ?
										'!tw-border-[#00f0ff] !tw-bg-[#00f0ff]/15 !tw-text-white tw-shadow-[var(--legacy-glow)]'
									:	''}"
									aria-pressed={warRoomTool === 'vector' && warRoomLineStyle === 'dashed_line'}
									onclick={(e) => {
										e.stopPropagation();
										warRoomTool = 'vector';
										warRoomLineStyle = 'dashed_line';
									}}
								>
									ROUTE
								</button>
								<button
									type="button"
									class="btn-director !tw-h-8 !tw-min-h-8 !tw-rounded-full !tw-px-2 !tw-py-0 !tw-text-[8px] !tw-tracking-[0.12em] !tw-border-rose-500/45 !tw-text-rose-200 hover:!tw-border-rose-400 hover:!tw-bg-rose-950/40"
									onclick={(e) => {
										e.stopPropagation();
										clearWarRoomBoard();
									}}
								>
									CLEAR
								</button>
								{#each WR_INK_PALETTE as chip (chip.id)}
									<button
										type="button"
										class="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-bg-slate-950/80 tw-font-mono tw-text-[7px] tw-font-bold tw-tracking-wide tw-backdrop-blur-md tw-transition-all focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff]/70 {CMD_TOOL_HOVER} {chip.chipBorder} {warRoomInkColor === chip.hex ?
											chip.chipRing + ' tw-ring-2 tw-ring-offset-0'
										:	'tw-border-white/10'}"
										aria-label="Ink color {chip.label}"
										aria-pressed={warRoomInkColor === chip.hex}
										onclick={(e) => {
											e.stopPropagation();
											warRoomInkColor = chip.hex;
										}}
									>
										{chip.label}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<div
					class="tw-shrink-0 tw-w-full tw-border-t tw-border-[#00f0ff]/30 tw-bg-[#020617]/94 tw-px-4 tw-py-3 tw-backdrop-blur-3xl tw-backdrop-saturate-[1.35]"
					aria-label="Telemetry timeline"
				>
					<p class="tw-mb-2 tw-font-mono tw-text-[8px] tw-tracking-[0.28em] tw-text-slate-500 tw-uppercase">
						SIEM playback
					</p>
					<div class="tw-flex tw-w-full tw-min-h-0 tw-max-w-none tw-items-center tw-gap-4">
						<button
							type="button"
							class="btn-director tw-shrink-0 tw-rounded-full tw-tracking-widest"
							onclick={(e) => {
								e.stopPropagation();
								toggleWarRoomTelemetryPlay();
							}}
						>
							{telemetryPlaying ? 'PAUSE' : 'PLAY'}
						</button>
						<span
							class="tw-shrink-0 tw-font-mono tw-text-xs tw-tabular-nums tw-tracking-[0.14em] tw-text-[#00f0ff]/90 tw-drop-shadow-[0_0_10px_rgba(0,240,255,0.65)]"
							aria-live="polite"
						>
							[T+ {telemetryProgress.toFixed(1)}%]
						</span>
						<input
							type="range"
							class="war-room-scrubber-range tw-min-h-[2.75rem] tw-min-w-0 tw-flex-1 tw-cursor-pointer"
							min="0"
							max="100"
							step="0.25"
							bind:value={telemetryProgress}
							oninput={() => stopWarRoomTelemetryPlayback()}
							aria-label="Scrub tactical telemetry timeline"
						/>
					</div>
				</div>
			</div>
		</div>
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

	.war-room-scrubber-range {
		-webkit-appearance: none;
		appearance: none;
		height: 2.75rem;
		background: transparent;
	}

	.war-room-scrubber-range::-webkit-slider-runnable-track {
		height: 0.25rem;
		border-radius: 9999px;
		background: rgb(8 51 68 / 0.35);
		box-shadow: inset 0 0 8px rgba(0, 240, 255, 0.15);
		border: 1px solid rgb(8 51 68 / 0.5);
	}

	.war-room-scrubber-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 4px;
		height: 16px;
		border-radius: 1px;
		background: #00f0ff;
		box-shadow: 0 0 10px #00f0ff;
		margin-top: -6px;
		border: none;
	}

	.war-room-scrubber-range::-moz-range-track {
		height: 0.25rem;
		border-radius: 9999px;
		background: rgb(8 51 68 / 0.35);
		box-shadow: inset 0 0 8px rgba(0, 240, 255, 0.15);
		border: 1px solid rgb(8 51 68 / 0.5);
	}

	.war-room-scrubber-range::-moz-range-thumb {
		width: 4px;
		height: 16px;
		border-radius: 1px;
		background: #00f0ff;
		box-shadow: 0 0 10px #00f0ff;
		border: none;
	}

	.war-room-asset-palette {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.war-room-asset-palette::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
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
