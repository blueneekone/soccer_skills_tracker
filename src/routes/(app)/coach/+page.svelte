<script>
	import { browser } from '$app/environment';
	import { collection, getDocs, query, where } from 'firebase/firestore';
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
	 * }} LoadoutOperative
	 */

	const MOCK_ROSTER = /** @type {LoadoutOperative[]} */ ([
		{ id: 'OP-01', name: 'Jimmy T.', role: 'MID', lvl: 42, hp: 95, status: 'READY' },
		{ id: 'OP-02', name: 'Sarah W.', role: 'DEF', lvl: 45, hp: 20, status: 'CRITICAL' },
		{ id: 'OP-03', name: 'Marcus R.', role: 'FWD', lvl: 39, hp: 88, status: 'READY' },
		{ id: 'OP-04', name: 'Leo M.', role: 'MID', lvl: 41, hp: 75, status: 'READY' },
		{ id: 'OP-05', name: 'David K.', role: 'GK', lvl: 48, hp: 100, status: 'READY' },
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
		'tw-relative tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-amber-500/50 tw-bg-amber-950/30 tw-px-4 tw-py-2.5 tw-font-bold tw-text-xs tw-tracking-widest tw-text-amber-300 tw-uppercase tw-transition-all hover:tw-bg-amber-900/50 hover:tw-shadow-[0_0_20px_rgba(245,158,11,0.6)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-amber-400';

	const BTN_NAV_CYAN =
		'tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-cyan-500/50 tw-bg-cyan-950/30 tw-px-4 tw-py-2.5 tw-font-bold tw-text-xs tw-tracking-widest tw-text-cyan-300 tw-uppercase tw-transition-all hover:tw-bg-cyan-900/50 hover:tw-shadow-[0_0_20px_rgba(6,182,212,0.6)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400';

	const BTN_NAV_ROSE =
		'tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-rose-500/50 tw-bg-rose-950/30 tw-px-4 tw-py-2.5 tw-font-bold tw-text-xs tw-tracking-widest tw-text-rose-300 tw-uppercase tw-transition-all hover:tw-bg-rose-900/50 hover:tw-shadow-[0_0_20px_rgba(244,63,94,0.6)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-rose-400';

	/** Compact Forge entry — crafting-station affordance */
	const BTN_FORGE_CRAFT =
		'tw-group tw-relative tw-inline-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-cyan-400/55 tw-bg-[#020617]/95 tw-text-cyan-200 tw-shadow-[0_0_20px_rgba(34,211,238,0.38),inset_0_1px_0_rgba(255,255,255,0.06)] tw-transition-all hover:tw-border-cyan-300/85 hover:tw-bg-cyan-950/55 hover:tw-text-cyan-50 hover:tw-shadow-[0_0_32px_rgba(34,211,238,0.72)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 active:tw-scale-[0.96]';

	const BTN_SECONDARY_EXPAND =
		'tw-inline-flex tw-w-full tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-600/85 tw-bg-transparent tw-py-2.5 tw-font-bold tw-text-[10px] tw-tracking-[0.18em] tw-text-slate-400 tw-uppercase tw-transition-colors hover:tw-border-slate-500 hover:tw-bg-white/[0.04] hover:tw-text-slate-200 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-slate-500';

	const GLASS_PANEL =
		'tw-bg-[#020617]/60 tw-backdrop-blur-md tw-border tw-border-slate-800 tw-rounded-2xl';

	/** .cursorrules PRIMARY (Action) */
	const BTN_PRIMARY =
		'tw-group tw-relative tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-overflow-hidden tw-bg-cyan-500 tw-px-6 tw-py-2 tw-font-black tw-text-xs tw-tracking-widest tw-text-black tw-uppercase tw-transition-all tw-[clip-path:polygon(10%_0,100%_0,100%_70%,90%_100%,0_100%,0_30%)] hover:tw-scale-105 hover:tw-shadow-[0_0_30px_rgba(6,182,212,0.6)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-300';

	const BTN_CLOSE_WAR_ROOM =
		'tw-fixed tw-right-4 tw-top-4 tw-z-[10060] tw-inline-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border-2 tw-border-rose-400/75 tw-bg-rose-950/45 tw-py-5 tw-px-10 tw-font-black tw-text-sm tw-tracking-[0.22em] tw-text-rose-50 tw-uppercase tw-backdrop-blur-md tw-shadow-[0_0_42px_rgba(244,63,94,0.72),0_0_110px_rgba(244,63,94,0.38),inset_0_1px_0_rgba(255,255,255,0.06)] tw-transition-all hover:tw-bg-rose-900/55 hover:tw-shadow-[0_0_56px_rgba(244,63,94,0.88),0_0_140px_rgba(244,63,94,0.42)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-rose-400 md:tw-right-7 md:tw-top-7 md:tw-py-6 md:tw-px-14 md:tw-text-base';

	/** War Room magnetic board — toolbar */
	const BTN_WAR_TOOL_ACTIVE =
		'tw-inline-flex tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border-2 tw-border-cyan-400/75 tw-bg-cyan-950/40 tw-px-4 tw-py-3 tw-font-black tw-text-[10px] tw-tracking-[0.14em] tw-text-cyan-100 tw-uppercase tw-shadow-[0_0_26px_rgba(34,211,238,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] tw-ring-2 tw-ring-cyan-400/50';

	const BTN_WAR_TOOL_IDLE =
		'tw-inline-flex tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-cyan-500/45 tw-bg-slate-950/50 tw-px-4 tw-py-3 tw-font-black tw-text-[10px] tw-tracking-[0.14em] tw-text-cyan-300 tw-uppercase tw-shadow-[0_0_14px_rgba(34,211,238,0.18)] tw-transition-all hover:tw-border-cyan-400/65 hover:tw-bg-cyan-950/35 hover:tw-shadow-[0_0_22px_rgba(34,211,238,0.35)]';

	const WEATHER_HOURLY = /** @type {const} */ ([
		{ label: 'NOW', tempF: 72, precipPct: 12 },
		{ label: '+1H', tempF: 71, precipPct: 22 },
		{ label: '+2H', tempF: 70, precipPct: 35 },
		{ label: '+3H', tempF: 69, precipPct: 48 },
		{ label: '+4H', tempF: 68, precipPct: 55 },
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

	let activeOperativeIndex = $state(0);
	let showWeatherModal = $state(false);

	/** War Room magnetic board */
	let warRoomTool = $state(/** @type {'nodes' | 'ink'} */ ('nodes'));

	/** @type {{ id: string; name: string; role: string; xPct: number; yPct: number }[]} */
	let magneticPieces = $state([]);

	/** @type {HTMLElement | undefined} */
	let pitchBoardEl = $state();

	/** @type {string | null} */
	let boardDragId = $state(null);

	/** Drawable ink layer (War Room), SVG viewBox 0–100 — neon ink for dark pitch */
	/** @type {SVGSVGElement | undefined} */
	let inkSvgEl = $state();
	let inkDrawing = $state(false);
	/** @type {{ path: string; stroke: string }[]} */
	let inkStrokes = $state([]);
	let inkDraftPath = $state('');

	const INK_STROKE_MAGENTA = '#ff00ff';
	const INK_STROKE_CYAN = '#22d3ee';

	const HERO_RING_R = 54;
	const HERO_RING_C = 2 * Math.PI * HERO_RING_R;

	/**
	 * @param {number} clientX
	 * @param {number} clientY
	 * @param {SVGSVGElement} svg
	 */
	function clientToSvgNorm(clientX, clientY, svg) {
		const rect = svg.getBoundingClientRect();
		const w = Math.max(rect.width, 1);
		const h = Math.max(rect.height, 1);
		return {
			x: ((clientX - rect.left) / w) * 100,
			y: ((clientY - rect.top) / h) * 100,
		};
	}

	/**
	 * @param {PointerEvent} e
	 */
	function inkPointerDown(e) {
		if (!inkSvgEl || warRoomTool !== 'ink' || e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		inkDrawing = true;
		const { x, y } = clientToSvgNorm(e.clientX, e.clientY, inkSvgEl);
		inkDraftPath = `M ${x.toFixed(2)} ${y.toFixed(2)}`;
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
		if (!inkDrawing || !inkSvgEl) return;
		e.preventDefault();
		e.stopPropagation();
		const { x, y } = clientToSvgNorm(e.clientX, e.clientY, inkSvgEl);
		inkDraftPath += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
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
		if (inkDraftPath.length > 12) {
			const inkStroke =
				inkStrokes.length % 2 === 0 ? INK_STROKE_MAGENTA : INK_STROKE_CYAN;
			inkStrokes = [...inkStrokes, { path: inkDraftPath, stroke: inkStroke }];
		}
		inkDraftPath = '';
	}

	function clearInk() {
		inkStrokes = [];
		inkDraftPath = '';
	}

	/**
	 * @param {number} v
	 * @param {number} lo
	 * @param {number} hi
	 */
	function clampPct(v, lo, hi) {
		return Math.min(hi, Math.max(lo, v));
	}

	function clearWarRoomBoard() {
		clearInk();
		magneticPieces = [];
		boardDragId = null;
	}

	/**
	 * @param {DragEvent} e
	 * @param {LoadoutOperative} op
	 */
	function rosterChipDragStart(e, op) {
		try {
			e.dataTransfer?.setData(
				'application/json',
				JSON.stringify({ id: op.id, name: op.name, role: op.role }),
			);
			if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
		} catch {
			/* ignore */
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	function pitchDragOver(e) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
	}

	/**
	 * @param {DragEvent} e
	 */
	function pitchDrop(e) {
		e.preventDefault();
		if (!pitchBoardEl) return;
		let data;
		try {
			const raw = e.dataTransfer?.getData('application/json');
			if (!raw) return;
			data = JSON.parse(raw);
		} catch {
			return;
		}
		if (!data || typeof data.id !== 'string' || typeof data.name !== 'string') return;
		const roleAbbr = typeof data.role === 'string' ? data.role : 'MID';
		const rect = pitchBoardEl.getBoundingClientRect();
		const w = Math.max(rect.width, 1);
		const h = Math.max(rect.height, 1);
		const xPct = clampPct(((e.clientX - rect.left) / w) * 100, 4, 96);
		const yPct = clampPct(((e.clientY - rect.top) / h) * 100, 4, 96);
		const next = { id: data.id, name: data.name, role: roleAbbr, xPct, yPct };
		const idx = magneticPieces.findIndex((p) => p.id === data.id);
		if (idx >= 0) {
			magneticPieces = magneticPieces.map((p, i) => (i === idx ? next : p));
		} else {
			magneticPieces = [...magneticPieces, next];
		}
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
		if (!boardDragId || !pitchBoardEl) return;
		const rect = pitchBoardEl.getBoundingClientRect();
		const w = Math.max(rect.width, 1);
		const h = Math.max(rect.height, 1);
		const xPct = clampPct(((e.clientX - rect.left) / w) * 100, 4, 96);
		const yPct = clampPct(((e.clientY - rect.top) / h) * 100, 4, 96);
		const id = boardDragId;
		magneticPieces = magneticPieces.map((p) =>
			p.id === id ? { ...p, xPct, yPct } : p,
		);
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

	/** Draft ink preview alternates stroke color like committed strokes */
	const inkDraftStroke = $derived(
		inkStrokes.length % 2 === 0 ? INK_STROKE_MAGENTA : INK_STROKE_CYAN,
	);

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

	const weatherHubTempF = $derived(WEATHER_HOURLY[0]?.tempF ?? 72);

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
		const parts = op.name.trim().split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			const a = parts[0]?.[0] ?? '?';
			const b = parts[parts.length - 1]?.[0] ?? '?';
			return `${a}.${b}`;
		}
		return op.role.length ? op.role.slice(0, 4).toUpperCase() : '—';
	}

	/**
	 * 2px bottom status bar for mini-portraits (matches HP tiers).
	 * @param {number} hp
	 */
	function hpStripBarGlow(hp) {
		if (hp >= 70) {
			return 'tw-bg-emerald-400 tw-shadow-[0_0_14px_rgba(52,211,153,0.8)]';
		}
		if (hp >= 40) {
			return 'tw-bg-amber-400 tw-shadow-[0_0_14px_rgba(251,191,36,0.7)]';
		}
		return 'tw-bg-rose-400 tw-shadow-[0_0_14px_rgba(251,113,133,0.75)]';
	}


	/**
	 * @param {number} hp
	 */
	function hpRingAccent(hp) {
		if (hp >= 70)
			return {
				stroke: '#34d399',
				glow: 'tw-shadow-[0_0_28px_rgba(16,185,129,0.55)]',
				filter: 'url(#heroRingGlowEmerald)',
			};
		if (hp >= 40)
			return {
				stroke: '#fbbf24',
				glow: 'tw-shadow-[0_0_28px_rgba(245,158,11,0.5)]',
				filter: 'url(#heroRingGlowAmber)',
			};
		return {
			stroke: '#fb7185',
			glow: 'tw-shadow-[0_0_28px_rgba(244,63,94,0.55)]',
			filter: 'url(#heroRingGlowRose)',
		};
	}

	const teamHpPct = $derived.by(() => {
		const r = activeRoster;
		if (r.length === 0) return 84;
		return Math.round(r.reduce((s, o) => s + o.hp, 0) / r.length);
	});

	function openWarRoom() {
		showTacticalOverlay = true;
	}

	function closeWarRoom() {
		showTacticalOverlay = false;
		warRoomTool = 'nodes';
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
	class="tw-relative tw-flex tw-min-h-screen tw-w-full tw-flex-col tw-gap-3 tw-overflow-hidden tw-bg-black tw-p-2 tw-font-sans tw-text-slate-300 tw-selection:bg-cyan-500/30 md:tw-gap-4 md:tw-p-4"
>
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-opacity-[0.12]"
		style="background-image: linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px); background-size: 44px 44px;"
		aria-hidden="true"
	></div>

	<!-- Command bridge nav -->
	<header
		class="tw-relative tw-z-20 tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-rounded-b-2xl tw-border-b tw-border-slate-800 tw-bg-[#020617]/50 tw-p-3 tw-shadow-[0_0_24px_rgba(6,182,212,0.06)] tw-backdrop-blur-md md:tw-flex-nowrap md:tw-px-4"
	>
		<div class="tw-flex tw-min-w-0 tw-shrink-0 tw-items-center tw-gap-3 md:tw-gap-4">
			<div
				class="tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-cyan-500/40 tw-bg-cyan-950/20 tw-shadow-[0_0_18px_rgba(6,182,212,0.25)] md:tw-h-14 md:tw-w-14"
				aria-hidden="true"
			>
				<span class="tw-text-xl tw-font-black tw-tracking-widest tw-text-cyan-300 md:tw-text-2xl">{nexusBadgeLetter}</span>
			</div>
			<div class="tw-min-w-0">
				<h1 class="tw-font-black tw-tracking-widest tw-text-white tw-uppercase tw-text-base md:tw-text-lg">
					Nexus Vanguard
				</h1>
				<p class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-cyan-400/90 tw-uppercase">
					{clubNameDisplay}
					<span class="tw-text-slate-600"> // </span>
					{teamNameDisplay}
				</p>
			</div>
		</div>

		<div class="tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-end tw-gap-2 md:tw-w-auto md:tw-gap-3">
			<button type="button" class="{BTN_NAV_AMBER} tw-relative" onclick={openComms} aria-label="Secure comms">
				<span
					class="tw-absolute tw--right-1 tw--top-1 tw-h-2 tw-w-2 tw-animate-pulse tw-rounded-full tw-bg-amber-400 tw-shadow-[0_0_10px_rgba(245,158,11,0.9)]"
					aria-hidden="true"
				></span>
				<svg class="tw-h-4 tw-w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					/>
				</svg>
				SECURE COMMS
			</button>

			<button type="button" class={BTN_NAV_CYAN} onclick={openWarRoom}>
				<svg class="tw-h-4 tw-w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
					/>
				</svg>
				WAR ROOM
			</button>

			<a href="/coach/match-day" class={`${BTN_NAV_ROSE} tw-relative tw-z-20 tw-inline-flex tw-items-center tw-gap-2`}>
				<div
					class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-white tw-animate-pulse tw-shadow-[0_0_8px_white]"
					aria-hidden="true"
				></div>
				LOG MATCH
			</a>
		</div>
	</header>

	<!-- Command bridge: Mission + Weather (top), Facility, holographic carousel -->
	<div
		class="tw-relative tw-z-10 tw-grid tw-min-h-0 tw-flex-1 tw-grid-cols-1 tw-gap-4 tw-pb-2 xl:tw-grid-cols-12 xl:tw-items-start xl:tw-gap-5"
	>
		<section
			class="{GLASS_PANEL} tw-flex tw-flex-col tw-gap-4 tw-p-4 tw-shadow-[0_0_20px_rgba(6,182,212,0.06)] md:tw-p-5 xl:tw-col-span-8"
		>
			<div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
				<div class="tw-min-w-0">
					<h2 class="tw-font-black tw-tracking-widest tw-text-white tw-uppercase tw-text-lg md:tw-text-xl">
						Mission Control
					</h2>
					<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-cyan-400/80 tw-uppercase">
						XP · bounty routing
					</p>
				</div>
				<a
					href="/coach/forge"
					class={BTN_FORGE_CRAFT}
					aria-label="Enter Forge — drills and crafting"
				>
					<svg
						class="tw-h-5 tw-w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0-.83-.83-.83-2.17 0-3L12 9" />
						<path d="M17.64 15 22 10.64" />
						<path
							d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.24V7.35c0-.53-.21-1.04-.59-1.41L18 4.5"
						/>
					</svg>
				</a>
			</div>
			<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
				<div
					class="tw-rounded-xl tw-border tw-border-cyan-500/25 tw-bg-black/40 tw-px-4 tw-py-3 tw-font-mono tw-shadow-[inset_0_0_12px_rgba(6,182,212,0.06)]"
				>
					<p class="tw-text-[9px] tw-tracking-widest tw-text-slate-500 tw-uppercase">XP Velocity</p>
					<p class="tw-text-2xl tw-font-black tw-tabular-nums tw-text-cyan-300">
						{teamHpPct}<span class="tw-text-sm tw-text-cyan-500/80">%</span>
					</p>
				</div>
				<span
					class="tw-rounded-lg tw-border tw-border-amber-500/35 tw-bg-amber-950/15 tw-px-3 tw-py-2 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-amber-300 tw-uppercase"
				>
					2 Active Bounties
				</span>
			</div>
		</section>

		<section
			class="{GLASS_PANEL} tw-flex tw-flex-col tw-gap-4 tw-p-4 tw-shadow-[0_0_22px_rgba(245,158,11,0.06)] xl:tw-col-span-4"
			aria-label="Compact weather hub"
		>
			<div>
				<h2 class="tw-font-black tw-tracking-widest tw-text-white tw-uppercase tw-text-sm">
					Weather Hub
				</h2>
				<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-slate-500 tw-uppercase">
					Live strike proxy
				</p>
			</div>
			<div class="tw-flex tw-items-center tw-gap-3">
				<div
					class="wb-radar-hub tw-relative tw-h-16 tw-w-16 tw-shrink-0 tw-overflow-hidden tw-rounded-full tw-border tw-border-cyan-500/35 tw-bg-black/55 tw-shadow-[0_0_18px_rgba(34,211,238,0.28)]"
					aria-hidden="true"
				>
					<div class="wb-radar-grid tw-pointer-events-none tw-absolute tw-inset-0 tw-opacity-[0.35]"></div>
					<div
						class="wb-lightning wb-lightning-a tw-pointer-events-none tw-absolute tw-w-[2px] tw-rounded-full tw-bg-gradient-to-b tw-from-transparent tw-via-amber-100 tw-to-cyan-300 tw-opacity-90 tw-shadow-[0_0_14px_rgba(250,204,21,0.9)]"
					></div>
					<div
						class="wb-lightning wb-lightning-b tw-pointer-events-none tw-absolute tw-w-[2px] tw-rounded-full tw-bg-gradient-to-b tw-from-transparent tw-via-cyan-100 tw-to-violet-400 tw-opacity-80 tw-shadow-[0_0_12px_rgba(34,211,238,0.85)]"
					></div>
					<div
						class="wb-lightning wb-lightning-c tw-pointer-events-none tw-absolute tw-w-[2px] tw-rounded-full tw-bg-gradient-to-b tw-from-transparent tw-via-white tw-to-amber-300 tw-opacity-90 tw-shadow-[0_0_16px_rgba(255,255,255,0.55)]"
					></div>
				</div>
				<div class="tw-min-w-0">
					<p class="tw-font-black tw-tabular-nums tw-text-2xl tw-tracking-tight tw-text-white md:tw-text-3xl">
						{weatherHubTempF}<span class="tw-text-lg tw-text-cyan-400/90 md:tw-text-xl">°F</span>
					</p>
					<p class="tw-mt-0.5 tw-font-mono tw-text-[10px] tw-tracking-wide tw-text-slate-400">
						{HYRUM_LOCATION_SHORT}
					</p>
				</div>
			</div>
			<button
				type="button"
				class={BTN_SECONDARY_EXPAND}
				onclick={() => {
					showWeatherModal = true;
				}}
			>
				EXPAND FORECAST
			</button>
		</section>

		<section
			class="{GLASS_PANEL} tw-flex tw-flex-col tw-gap-3 tw-p-4 tw-shadow-[0_0_18px_rgba(244,63,94,0.05)] xl:tw-col-span-12"
		>
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-slate-500 tw-uppercase">
					{'>'}_ Facility Ops
				</span>
				<button
					type="button"
					class="facility-ops-override-card tw-relative tw-w-full tw-overflow-hidden tw-rounded-xl tw-text-left tw-animate-[pulse_4s_ease-in-out_infinite] tw-border tw-border-rose-500/35 tw-bg-rose-950/15 tw-p-3 tw-transition-colors hover:tw-bg-rose-950/25 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400"
					onclick={() => {
						directorOverrideUnread = false;
					}}
					aria-label="Director override: acknowledge alert"
				>
					{#if directorOverrideUnread}
						<span
							class="facility-ops-scan-line tw-pointer-events-none tw-absolute tw-left-0 tw-right-0 tw-z-10 tw-h-px tw-bg-cyan-400 tw-shadow-[0_0_10px_rgba(34,211,238,0.95)]"
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
			</section>

		<!-- Operative hero + quick-select roster strip -->
		<section
			class="tw-flex tw-min-h-[min(72vh,840px)] tw-flex-col xl:tw-col-span-10 xl:tw-col-start-2"
			aria-label="Operative focus carousel"
		>
			<div
				class="tw-relative tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-visible tw-px-0 tw-py-1 md:tw-px-2 md:tw-py-2"
			>
				<div class="tw-mb-2 tw-flex tw-items-baseline tw-justify-between tw-gap-2 tw-border-b tw-border-white/10 tw-pb-1">
					<h2 class="tw-font-black tw-tracking-widest tw-text-white tw-uppercase tw-text-sm md:tw-text-base">
						Operative Focus
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
				{:else if heroFocusOperative}
					{@const op = heroFocusOperative}
					{@const attrs = operativeCoreAttrs(op)}
					{@const ring = hpRingAccent(op.hp)}
					<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-2">
						<!-- Hero card ~70% vertical weight -->
						<div class="tw-flex tw-min-h-0 tw-flex-[7] tw-flex-col">
							<div
								class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-items-stretch tw-gap-5 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between lg:tw-gap-10 lg:tw-pl-1 lg:tw-pr-2"
							>
								<div class="tw-relative tw-flex tw-shrink-0 tw-items-center tw-justify-center {ring.glow}">
									<svg
										class="tw-h-[260px] tw-w-[260px] md:tw-h-[300px] md:tw-w-[300px]"
										viewBox="0 0 120 120"
										aria-hidden="true"
									>
										<defs>
											<filter id="heroRingGlowEmerald" x="-40%" y="-40%" width="180%" height="180%">
												<feGaussianBlur stdDeviation="3.5" result="b" />
												<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
											</filter>
											<filter id="heroRingGlowAmber" x="-40%" y="-40%" width="180%" height="180%">
												<feGaussianBlur stdDeviation="3.5" result="b" />
												<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
											</filter>
											<filter id="heroRingGlowRose" x="-40%" y="-40%" width="180%" height="180%">
												<feGaussianBlur stdDeviation="3.5" result="b" />
												<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
											</filter>
										</defs>
										<circle
											cx="60"
											cy="60"
											r={HERO_RING_R}
											fill="none"
											stroke="rgba(51,65,85,0.5)"
											stroke-width="6"
										/>
										<circle
											cx="60"
											cy="60"
											r={HERO_RING_R}
											fill="none"
											stroke={ring.stroke}
											stroke-width="6"
											stroke-linecap="round"
											stroke-dasharray="{`${(HERO_RING_C * op.hp) / 100} ${HERO_RING_C}`}"
											transform="rotate(-90 60 60)"
											filter={ring.filter}
										/>
									</svg>
									<div
										class="tw-pointer-events-none tw-absolute tw-inset-0 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-0 tw-px-8 tw-text-center md:tw-px-10"
									>
										<p
											class="tw-font-mono tw-text-5xl tw-font-black tw-tabular-nums tw-leading-none tw-tracking-tight tw-text-white md:tw-text-6xl"
										>
											{operativeDisplayNumber(activeOperativeIndex)}
										</p>
										<p
											class="tw-mt-2 tw-max-w-[11rem] tw-truncate tw-text-sm tw-font-black tw-tracking-wide tw-text-white md:tw-text-base"
										>
											{op.name}
										</p>
										<p class="tw-mt-1 tw-font-mono tw-text-[11px] tw-tracking-[0.22em] tw-text-cyan-300 tw-uppercase">
											{op.role}
										</p>
									</div>
								</div>

								<div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-2 lg:tw-max-w-md">
									{#each [['Pace', attrs.pace], ['Shot', attrs.shot], ['Pass', attrs.pass], ['Def', attrs.def], ['Phy', attrs.phy]] as [label, val] (label)}
										<div class="tw-border-b tw-border-white/10 tw-pb-1">
											<div
												class="tw-mb-1 tw-flex tw-items-baseline tw-justify-between tw-gap-2 tw-font-mono tw-text-[9px] tw-tracking-[0.18em] tw-uppercase"
											>
												<span class="tw-text-slate-400">{label}</span>
												<span class="tw-tabular-nums tw-text-cyan-200">{val}</span>
											</div>
											<div
												class="tw-h-[3px] tw-w-full tw-overflow-hidden tw-bg-black/70 tw-[clip-path:polygon(0_0,100%_0,100%_100%,2px_100%,0_calc(100%-2px))]"
											>
												<div
													class="tw-h-full tw-bg-cyan-400/80 tw-[clip-path:polygon(0_0,100%_0,calc(100%-2px)_100%,0_100%)] tw-shadow-[0_0_12px_rgba(34,211,238,0.55)] tw-transition-[width] tw-duration-300"
													style="width: {val}%"
												></div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>

						<!-- Quick-select roster strip -->
						<div class="tw-flex tw-min-h-0 tw-flex-[3] tw-flex-col tw-justify-end tw-border-t tw-border-white/10 tw-pt-1">
							<div
								class="coach-roster-strip tw-flex tw-gap-3 tw-overflow-x-auto tw-pb-2"
								role="tablist"
								aria-label="Quick-select roster"
							>
								{#each activeRoster as player, rosterIdx (`${rosterIdx}-${player.id}`)}
									<button
										type="button"
										role="tab"
										class="tw-relative tw-flex tw-min-h-[3.5rem] tw-min-w-[3.75rem] tw-shrink-0 tw-flex-col tw-items-center tw-justify-center tw-gap-0 tw-overflow-hidden tw-px-1 tw-py-1 tw-[clip-path:polygon(14%_0,100%_0,100%_74%,86%_100%,0_100%,0_14%)] tw-transition-[box-shadow,background-color,border-color] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-1 focus-visible:tw-outline-cyan-400 {activeOperativeIndex ===
										rosterIdx ?
											'tw-border tw-border-cyan-400/90 tw-bg-cyan-500/[0.14] tw-shadow-[0_0_22px_rgba(34,211,238,0.42)]'
										:	'tw-border tw-border-slate-700/95 tw-bg-black/55'}"
										aria-selected={activeOperativeIndex === rosterIdx}
										aria-label="Select {player.name}"
										onclick={() => {
											activeOperativeIndex = rosterIdx;
										}}
									>
										<span
											class="tw-font-mono tw-text-xl tw-font-black tw-tabular-nums tw-leading-none tw-text-white md:tw-text-2xl"
										>
											{operativeDisplayNumber(rosterIdx)}
										</span>
										<span class="tw-mt-0.5 tw-font-mono tw-text-[9px] tw-tabular-nums tw-tracking-wide tw-text-slate-400">
											{operativeStripAbbr(player)}
										</span>
										<span
											class="tw-pointer-events-none tw-absolute tw-inset-x-0 tw-bottom-0 tw-z-[1] tw-h-[2px] {hpStripBarGlow(
												player.hp,
											)}"
											aria-hidden="true"
										></span>
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>

{#if showCommsOverlay}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="tw-fixed tw-inset-0 tw-z-[9998] tw-flex tw-animate-[coachHudFade_0.18s_ease-out_forwards] tw-items-start tw-justify-end tw-bg-black/80 tw-p-3 tw-backdrop-blur-md sm:tw-items-center sm:tw-justify-center sm:tw-p-6"
		role="presentation"
		onclick={closeComms}
	>
		<div
			class="tw-mt-14 tw-w-full tw-max-w-md tw-border tw-border-cyan-500/40 tw-bg-black/90 tw-p-5 tw-shadow-[0_0_40px_rgba(6,182,212,0.18)] tw-backdrop-blur-xl sm:tw-mt-0 tw-[clip-path:polygon(3%_0,100%_0,100%_96%,97%_100%,0_100%,0_8%)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="comms-hud-title"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="tw-mb-4 tw-flex tw-items-start tw-justify-between tw-gap-3">
				<h2 id="comms-hud-title" class="tw-text-lg tw-font-black tw-tracking-widest tw-text-white tw-uppercase">
					Secure Comms
				</h2>
				<button type="button" class="{BTN_NAV_CYAN}" onclick={closeComms} aria-label="Close secure comms">
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
		class="tw-fixed tw-inset-0 tw-z-[9990] tw-flex tw-animate-[coachHudFade_0.18s_ease-out_forwards] tw-items-center tw-justify-center tw-bg-black/85 tw-p-4 tw-backdrop-blur-2xl"
		role="presentation"
		onclick={closeWeatherModal}
	>
		<div
			class="tw-relative tw-max-h-[min(90vh,880px)] tw-w-full tw-max-w-3xl tw-overflow-y-auto tw-rounded-2xl tw-border tw-border-cyan-500/35 tw-bg-[#020617]/88 tw-p-5 tw-shadow-[0_0_56px_rgba(6,182,212,0.18)] tw-backdrop-blur-xl md:tw-p-7"
			role="dialog"
			aria-modal="true"
			aria-labelledby="weather-modal-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="tw-mb-6 tw-flex tw-items-start tw-justify-between tw-gap-3">
				<div class="tw-min-w-0">
					<h2
						id="weather-modal-title"
						class="tw-text-lg tw-font-black tw-tracking-widest tw-text-white tw-uppercase md:tw-text-xl"
					>
						Environmental Forecast
					</h2>
					<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-slate-500 tw-uppercase">
						{HYRUM_LOCATION_SHORT}
						<span class="tw-text-slate-600"> · </span>
						{HYRUM_COORDS}
					</p>
				</div>
				<button type="button" class={BTN_NAV_ROSE} onclick={closeWeatherModal} aria-label="Close forecast">
					CLOSE
				</button>
			</div>

			<section class="tw-mb-8" aria-labelledby="weather-modal-lightning">
				<h3
					id="weather-modal-lightning"
					class="tw-mb-3 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-cyan-400 tw-uppercase"
				>
					Lightning strike map
				</h3>
				<div
					class="wb-radar-host tw-relative tw-aspect-square tw-w-full tw-max-w-md tw-overflow-hidden tw-rounded-xl tw-border tw-border-cyan-500/25 tw-bg-black/50 tw-shadow-[0_0_28px_rgba(34,211,238,0.12)]"
					aria-label="Lightning proximity radar"
				>
					<div class="wb-radar-grid tw-pointer-events-none tw-absolute tw-inset-0 tw-opacity-[0.35]" aria-hidden="true"></div>
					<div
						class="wb-lightning wb-lightning-a tw-pointer-events-none tw-absolute tw-w-[2px] tw-rounded-full tw-bg-gradient-to-b tw-from-transparent tw-via-amber-100 tw-to-cyan-300 tw-opacity-90 tw-shadow-[0_0_14px_rgba(250,204,21,0.9)]"
						aria-hidden="true"
					></div>
					<div
						class="wb-lightning wb-lightning-b tw-pointer-events-none tw-absolute tw-w-[2px] tw-rounded-full tw-bg-gradient-to-b tw-from-transparent tw-via-cyan-100 tw-to-violet-400 tw-opacity-80 tw-shadow-[0_0_12px_rgba(34,211,238,0.85)]"
						aria-hidden="true"
					></div>
					<div
						class="wb-lightning wb-lightning-c tw-pointer-events-none tw-absolute tw-w-[2px] tw-rounded-full tw-bg-gradient-to-b tw-from-transparent tw-via-white tw-to-amber-300 tw-opacity-90 tw-shadow-[0_0_16px_rgba(255,255,255,0.55)]"
						aria-hidden="true"
					></div>
					<div
						class="tw-pointer-events-none tw-absolute tw-inset-x-0 tw-bottom-0 tw-border-t tw-border-white/10 tw-bg-black/55 tw-px-3 tw-py-2"
					>
						<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-slate-400 tw-uppercase">
							Lightning prox · 14.2 MI
						</p>
						<div class="tw-mt-2 tw-flex tw-h-1 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-black/80">
							<div class="tw-h-full tw-bg-rose-500/80" style="width: 18%"></div>
							<div class="tw-h-full tw-bg-amber-500/80" style="width: 12%"></div>
							<div class="tw-relative tw-h-full tw-bg-emerald-500/70" style="width: 70%"></div>
						</div>
					</div>
				</div>
			</section>

			<section class="tw-mb-8" aria-labelledby="weather-modal-hourly">
				<h3
					id="weather-modal-hourly"
					class="tw-mb-3 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-cyan-400 tw-uppercase"
				>
					Hourly forecast
				</h3>
				<div class="tw-flex tw-flex-col tw-gap-3" aria-label="Five hour temperature and precipitation outlook">
					<div
						class="tw-flex tw-items-end tw-justify-between tw-gap-1 tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-slate-500 tw-uppercase"
					>
						<span>Temp °F</span>
						<span>Precip %</span>
					</div>
					<div
						class="tw-flex tw-h-36 tw-items-end tw-gap-2 tw-rounded-xl tw-border tw-border-white/10 tw-bg-black/40 tw-p-3"
					>
						{#each hourlyBars as cell (cell.label)}
							<div class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-end tw-gap-1.5">
								<div class="tw-flex tw-h-28 tw-w-full tw-items-end tw-justify-center tw-gap-0.5">
									<div
										class="tw-w-[42%] tw-rounded-sm tw-bg-cyan-500/50 tw-shadow-[0_0_10px_rgba(34,211,238,0.35)]"
										style="height: {Math.max(8, cell.tempH)}%"
										title="{cell.tempF}°F"
									></div>
									<div
										class="tw-w-[42%] tw-rounded-sm tw-bg-sky-600/45 tw-shadow-[0_0_8px_rgba(56,189,248,0.3)]"
										style="height: {Math.max(6, cell.precipH)}%"
										title="{cell.precipPct}% precip"
									></div>
								</div>
								<span class="tw-font-mono tw-text-[9px] tw-tabular-nums tw-tracking-wide tw-text-slate-400"
									>{cell.label}</span
								>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<section aria-labelledby="weather-modal-tenday">
				<h3
					id="weather-modal-tenday"
					class="tw-mb-3 tw-font-mono tw-text-[10px] tw-tracking-[0.2em] tw-text-cyan-400 tw-uppercase"
				>
					10-day outlook
				</h3>
				<ul class="tw-m-0 tw-list-none tw-divide-y tw-divide-white/10 tw-rounded-xl tw-border tw-border-white/10 tw-bg-black/30 tw-p-0">
					{#each TEN_DAY_FORECAST as row, ri (`${ri}-${row.day}`)}
						<li class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-px-4 tw-py-2.5 tw-font-mono tw-text-[11px]">
							<span class="tw-tracking-wide tw-text-slate-300">{row.day}</span>
							<span class="tw-tabular-nums tw-text-cyan-200/90">
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
{/if}

{#if showTacticalOverlay}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-min-h-0 tw-flex-col tw-animate-[coachHudFade_0.2s_ease-out_forwards] tw-bg-black/88 tw-backdrop-blur-2xl tw-backdrop-saturate-150"
		role="presentation"
		onclick={closeWarRoom}
	>
		<button
			type="button"
			class={BTN_CLOSE_WAR_ROOM}
			onclick={(e) => {
				e.stopPropagation();
				closeWarRoom();
			}}
			aria-label="Close tactical war room"
		>
			CLOSE WAR ROOM
		</button>

		<div
			class="tw-relative tw-z-[10000] tw-flex tw-min-h-0 tw-w-full tw-flex-1 tw-flex-row tw-gap-3 tw-overflow-hidden tw-px-2 tw-pb-3 tw-pt-[5.25rem] md:tw-gap-4 md:tw-px-4 md:tw-pt-[5.75rem]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="war-room-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Game day roster — magnetic chips (drag onto pitch) -->
			<aside
				class="tw-flex tw-h-full tw-min-h-0 tw-w-[min(100%,15rem)] tw-shrink-0 tw-flex-col tw-gap-3 tw-overflow-hidden tw-rounded-xl tw-border tw-border-cyan-500/35 tw-bg-[#020617]/72 tw-p-3 tw-shadow-[inset_0_0_48px_rgba(6,182,212,0.08),0_0_40px_rgba(34,211,238,0.06)] tw-backdrop-blur-xl md:tw-w-60 md:tw-p-4"
				aria-label="Game day roster"
			>
				<div class="tw-shrink-0">
					<p class="tw-font-mono tw-text-[9px] tw-tracking-[0.22em] tw-text-cyan-400 tw-uppercase">
						{'>'}_ roster
					</p>
					<h2 id="war-room-title" class="tw-mt-1 tw-text-sm tw-font-black tw-tracking-widest tw-text-white tw-uppercase md:tw-text-base">
						Game day · XI
					</h2>
					<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-leading-snug tw-text-slate-500">
						Drag chips onto the pitch · {gameDayRoster.length} active
					</p>
				</div>

				{#if gameDayRoster.length === 0}
					<p class="tw-mt-4 tw-font-mono tw-text-[10px] tw-leading-relaxed tw-text-slate-500">
						No roster in context — bind a team or open War Room with mock data.
					</p>
				{:else}
					<ul
						class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-3 tw-overflow-y-auto tw-pr-1 tw-pb-2"
						role="list"
					>
						{#each gameDayRoster as op (op.id)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<li>
								<div
									draggable="true"
									class="war-room-roster-chip tw-flex tw-cursor-grab tw-select-none tw-items-center tw-gap-3 tw-rounded-full tw-border-2 tw-border-cyan-400/55 tw-bg-[#020617]/90 tw-py-2 tw-pl-2 tw-pr-4 tw-shadow-[0_0_22px_rgba(34,211,238,0.35)] tw-transition-transform active:tw-scale-[0.98] hover:tw-border-cyan-300/80 hover:tw-shadow-[0_0_32px_rgba(34,211,238,0.5)]"
									ondragstart={(e) => rosterChipDragStart(e, op)}
								>
									<span
										class="tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-cyan-500/40 tw-bg-black/60 tw-font-black tw-text-[11px] tw-tracking-wide tw-text-cyan-100 tw-shadow-[inset_0_0_12px_rgba(34,211,238,0.15)]"
										aria-hidden="true"
									>
										{warRoomChipInitials(op.name)}
									</span>
									<span class="tw-min-w-0 tw-flex-1">
										<span class="tw-block tw-truncate tw-font-bold tw-text-[11px] tw-tracking-wide tw-text-white md:tw-text-xs">
											{op.name}
										</span>
										<span class="tw-mt-0.5 tw-block tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-cyan-400/90 tw-uppercase">
											{op.role}
										</span>
									</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</aside>

			<!-- Pitch dropzone + ink + floating toolbar -->
			<div class="tw-relative tw-flex tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={pitchBoardEl}
					class="war-room-canvas-host tw-relative tw-z-[10000] tw-min-h-0 tw-w-full tw-flex-1 tw-overflow-hidden tw-rounded-xl tw-border-2 tw-border-emerald-400/40 tw-bg-[radial-gradient(ellipse_at_50%_40%,rgba(6,182,212,0.18)_0%,transparent_58%),linear-gradient(168deg,#010806_0%,#051812_42%,#020807_100%)] tw-shadow-[0_0_80px_rgba(16,185,129,0.35),0_0_120px_rgba(6,182,212,0.12),inset_0_0_100px_rgba(6,182,212,0.1)]"
					role="application"
					aria-label="Tactical pitch magnetic board"
					ondragover={pitchDragOver}
					ondrop={pitchDrop}
				>
					<div
						class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[1] tw-opacity-45 tw-[box-shadow:inset_0_0_140px_rgba(6,182,212,0.28)]"
					></div>

					<!-- Field markings -->
					<svg
						class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[2] tw-h-full tw-w-full tw-opacity-95"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id="warRoomPitchGlow" x1="0%" y1="0%" x2="0%" y2="100%">
								<stop offset="0%" style="stop-color: rgb(16 185 129); stop-opacity: 0.42" />
								<stop offset="50%" style="stop-color: rgb(6 182 212); stop-opacity: 0.18" />
								<stop offset="100%" style="stop-color: rgb(16 185 129); stop-opacity: 0.42" />
							</linearGradient>
						</defs>
						<rect x="4" y="3" width="92" height="94" fill="none" stroke="url(#warRoomPitchGlow)" stroke-width="0.65" />
						<line x1="4" y1="50" x2="96" y2="50" stroke="rgba(52,211,153,0.5)" stroke-width="0.4" stroke-dasharray="2 2" />
						<circle cx="50" cy="50" r="12" fill="none" stroke="rgba(52,211,153,0.45)" stroke-width="0.4" stroke-dasharray="2 2" />
						<rect x="22" y="3" width="56" height="16" fill="none" stroke="rgba(34,211,238,0.42)" stroke-width="0.4" stroke-dasharray="2 2" />
						<rect x="30" y="3" width="40" height="7" fill="none" stroke="rgba(34,211,238,0.32)" stroke-width="0.32" stroke-dasharray="2 2" />
						<rect x="22" y="81" width="56" height="16" fill="none" stroke="rgba(34,211,238,0.42)" stroke-width="0.4" stroke-dasharray="2 2" />
						<rect x="30" y="90" width="40" height="7" fill="none" stroke="rgba(34,211,238,0.32)" stroke-width="0.32" stroke-dasharray="2 2" />
					</svg>

					<!-- Placed magnetic chips (under ink for pointer-through when drawing) -->
					<div class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[18] tw-touch-none">
						{#each magneticPieces as piece (piece.id)}
							<button
								type="button"
								class="war-room-board-chip tw-pointer-events-auto tw-absolute tw-z-[19] tw-flex tw-h-14 tw-w-14 tw--translate-x-1/2 tw--translate-y-1/2 tw-cursor-grab tw-touch-none tw-flex-col tw-items-center tw-justify-center tw-rounded-full tw-border-2 tw-border-cyan-400/65 tw-bg-[#020617]/95 tw-text-center tw-shadow-[0_0_26px_rgba(34,211,238,0.55)] tw-transition-[box-shadow,transform] active:tw-cursor-grabbing md:tw-h-16 md:tw-w-16 {warRoomTool ===
								'nodes' ?
									'tw-ring-2 tw-ring-cyan-400/30'
								:	'tw-opacity-90'}"
								style:left="{piece.xPct}%"
								style:top="{piece.yPct}%"
								aria-label="Move {piece.name} on pitch"
								disabled={warRoomTool !== 'nodes'}
								onpointerdown={(e) => boardChipPointerDown(e, piece.id)}
							>
								<span class="tw-font-black tw-text-[10px] tw-leading-none tw-tracking-wide tw-text-cyan-50 md:tw-text-[11px]">
									{warRoomChipInitials(piece.name)}
								</span>
								<span class="tw-mt-0.5 tw-max-w-[3.25rem] tw-truncate tw-font-mono tw-text-[7px] tw-tracking-wider tw-text-cyan-400/90 tw-uppercase">
									{piece.role}
								</span>
							</button>
						{/each}
					</div>

					<!-- High-visibility ink layer -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<svg
						bind:this={inkSvgEl}
						class="war-room-ink-layer tw-absolute tw-inset-0 tw-z-[22] tw-h-full tw-w-full tw-touch-none {warRoomTool === 'ink' ?
							'tw-cursor-crosshair tw-pointer-events-auto'
						:	'tw-pointer-events-none'}"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						aria-label="Tactical ink layer"
						onpointerdown={inkPointerDown}
						onpointermove={inkPointerMove}
						onpointerup={inkPointerUp}
						onpointerleave={inkPointerUp}
						onpointercancel={inkPointerUp}
					>
						<defs>
							<filter id="warRoomInkNeon" x="-20%" y="-20%" width="140%" height="140%">
								<feGaussianBlur stdDeviation="0.8" result="b" />
								<feMerge>
									<feMergeNode in="b" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						{#each inkStrokes as stroke, si (si)}
							<path
								d={stroke.path}
								fill="none"
								stroke={stroke.stroke}
								stroke-width="5"
								stroke-linecap="round"
								stroke-linejoin="round"
								vector-effect="non-scaling-stroke"
								filter="url(#warRoomInkNeon)"
							/>
						{/each}
						{#if inkDraftPath}
							<path
								d={inkDraftPath}
								fill="none"
								stroke={inkDraftStroke}
								stroke-width="5"
								stroke-linecap="round"
								stroke-linejoin="round"
								vector-effect="non-scaling-stroke"
								filter="url(#warRoomInkNeon)"
							/>
						{/if}
					</svg>

					<!-- Floating glass toolbar -->
					<div
						class="tw-pointer-events-none tw-absolute tw-inset-x-0 tw-bottom-0 tw-z-[40] tw-flex tw-justify-center tw-pb-4 tw-pt-12"
					>
						<div
							class="tw-pointer-events-auto tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2 tw-rounded-2xl tw-border tw-border-cyan-500/35 tw-bg-[#020617]/72 tw-px-4 tw-py-3 tw-shadow-[0_12px_48px_rgba(0,0,0,0.65),0_0_36px_rgba(34,211,238,0.18)] tw-backdrop-blur-xl md:tw-gap-3 md:tw-px-6"
							role="toolbar"
							aria-label="War room tools"
						>
							<button
								type="button"
								class={warRoomTool === 'nodes' ? BTN_WAR_TOOL_ACTIVE : BTN_WAR_TOOL_IDLE}
								aria-pressed={warRoomTool === 'nodes'}
								onclick={(e) => {
									e.stopPropagation();
									warRoomTool = 'nodes';
								}}
							>
								DRAG NODES
							</button>
							<button
								type="button"
								class={warRoomTool === 'ink' ? BTN_WAR_TOOL_ACTIVE : BTN_WAR_TOOL_IDLE}
								aria-pressed={warRoomTool === 'ink'}
								onclick={(e) => {
									e.stopPropagation();
									warRoomTool = 'ink';
								}}
							>
								DRAW INK
							</button>
							<button
								type="button"
								class={BTN_WAR_TOOL_IDLE}
								onclick={(e) => {
									e.stopPropagation();
									clearWarRoomBoard();
								}}
							>
								CLEAR BOARD
							</button>
						</div>
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

	.coach-roster-strip {
		scrollbar-width: thin;
		scrollbar-color: rgba(34, 211, 238, 0.42) transparent;
	}

	.coach-roster-strip::-webkit-scrollbar {
		height: 5px;
	}

	.coach-roster-strip::-webkit-scrollbar-track {
		background: transparent;
	}

	.coach-roster-strip::-webkit-scrollbar-thumb {
		background: rgba(34, 211, 238, 0.38);
		border-radius: 0;
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

	.wb-radar-grid {
		background-image:
			linear-gradient(rgba(34, 211, 238, 0.11) 1px, transparent 1px),
			linear-gradient(90deg, rgba(34, 211, 238, 0.11) 1px, transparent 1px);
		background-size: 16px 16px;
	}

	@keyframes wbStrike {
		0%,
		100% {
			opacity: 0.2;
			filter: brightness(0.85);
		}
		35% {
			opacity: 1;
			filter: brightness(1.35);
		}
		50% {
			opacity: 0.65;
		}
	}

	.wb-lightning-a {
		top: 10%;
		bottom: 42%;
		left: 26%;
		animation: wbStrike 2.1s ease-in-out infinite;
	}

	.wb-lightning-b {
		top: 22%;
		bottom: 28%;
		right: 22%;
		animation: wbStrike 2.6s ease-in-out infinite 0.4s;
	}

	.wb-lightning-c {
		top: 38%;
		bottom: 18%;
		left: 52%;
		animation: wbStrike 1.9s ease-in-out infinite 0.9s;
	}
</style>
