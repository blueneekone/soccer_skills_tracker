<script>
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Spring } from 'svelte/motion';
	import GridHUD from './grid/GridHUD.svelte';
	import GridRadialHub from './grid/GridRadialHub.svelte';
	import GridPitch from './grid/GridPitch.svelte';
	import GridEntity from './grid/GridEntity.svelte';
	import GridRoute from './grid/GridRoute.svelte';
	import { SimulatorEngine } from '$lib/states/SimulatorEngine.svelte';

	const simulator = new SimulatorEngine();

	/**
	 * Pitch / roster token (parent-controlled via bind).
	 * @typedef {{ id: string; name?: string; number?: string; position?: string; color?: string; x?: number; y?: number; side?: 'friendly' | 'opponent' }} TacticalToken
	 */

	/**
	 * Route with quadratic curve or sharp polyline + optional start bind to a disc id.
	 * @typedef {{
	 *   id: string;
	 *   x1: number; y1: number; cx: number; cy: number; x2: number; y2: number;
	 *   color: string;
	 *   bindPlayerId?: string | null;
	 *   pathKind?: 'curve' | 'cut';
	 *   delay?: number;
	 * }} TacticalRoute
	 */

	let {
		showTacticalOverlay = $bindable(),
		wrBucketPitch = $bindable(),
		wrBucketXi = $bindable(),
		wrBucketBench = $bindable(),
		wrOppPitch = $bindable(),
		drawnRoutes = $bindable(),
		warRoomTool = $bindable(),
	} = $props();

	/** @type {SVGSVGElement | undefined} */
	let pitchSvgEl = $state();

	let activeRouteColor = $state('#00f0ff');
	/** ROUTE sub-mode: smooth Bézier vs sharp elbow cut. */
	let routeDrawKind = $state(/** @type {'curve' | 'cut'} */ ('curve'));
	/** Pitch zone callouts (SVG labels). */
	let showLabels = $state(false);
	/** Manual Target Lock — orbital HUD follows this token id. */
	let focusedPlayerId = $state(/** @type {string | null} */ (null));
	/** 3D holotable tilt + perspective (Protocol Olympus). */
	let isHolotableMode = $state(false);
	const SIM_ROUTE_DURATION_MS = 2000;

	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff00ff', '#ffff00', '#ffffff']);

	const FRIENDLY_RING = '#00f0ff';
	const OPP_RING = '#fb7185';

	const OPP_FORMATION_LABELS = /** @type {const} */ ([
		'GK',
		'CB',
		'CB',
		'LB',
		'RB',
		'CM',
		'CM',
		'LW',
		'RW',
		'ST',
		'CF',
	]);

	/** Synthetic opposition roster for the command modal (deploy onto `wrOppPitch`). */
	const MOCK_OPPOSITION = Array.from({ length: 11 }, (_, i) => ({
		id: `OPP-${String(i + 1).padStart(2, '0')}`,
		name: `HOSTILE ${String(i + 1).padStart(2, '0')}`,
		number: String(i + 1).padStart(2, '0'),
		position: OPP_FORMATION_LABELS[i] ?? 'X',
		color: OPP_RING,
		side: /** @type {const} */ ('opponent'),
	}));

	const VIEW_W = 1600;
	const VIEW_H = 900;
	const DISC_HIT_R = 32;

	const allPitchTokens = $derived.by(() => {
		const f = wrBucketPitch.map((t) => ({ ...t, side: /** @type {const} */ ('friendly') }));
		const o = wrOppPitch.map((t) => ({ ...t, side: /** @type {const} */ ('opponent') }));
		return [...f, ...o];
	});

	const oppositionInModal = $derived(
		MOCK_OPPOSITION.filter((m) => !wrOppPitch.some((p) => p.id === m.id)),
	);

	/** @type {TacticalToken | null} */
	let draggingPlayer = $state(null);

	/** Light-cycle ribbon samples (pitch SVG space). Optional `c` tints playback segments. */
	/** @type {{ x: number; y: number; t: number; c?: string }[]} */
	let activeDragTrail = $state([]);
	const TRAIL_MAX_POINTS = 140;
	/** Drag-only ribbon length (playback keeps TRAIL_MAX_POINTS). */
	const DRAG_TRAIL_MAX_POINTS = 20;

	/** Neon stroke color for playback / sim ribbon samples. */
	let trailRibbonColor = '#00f0ff';

	const trailString = $derived(activeDragTrail.map((pt) => `${pt.x},${pt.y}`).join(' '));

	const dragTrailBloomColor = $derived(
		draggingPlayer
			? typeof draggingPlayer.color === 'string' && draggingPlayer.color
				? draggingPlayer.color
				: ringColor(draggingPlayer)
			: trailRibbonColor,
	);

	let routingActive = $state(false);
	/** @type {TacticalRoute | null} */
	let routeDraft = $state(null);

	/** @type {string | null} */
	let hoveredDiscId = $state(null);
	/** @type {string | null} */
	let hoveredRouteId = $state(null);
	/** @type {string | null} */
	let selectedRouteId = $state(null);

	/** @type {{ routeId: string; kind: 'start' | 'ctrl' | 'end' } | null} */
	let anchorDrag = $state(null);

	/** Drag entire route geometry by grabbing the stroke (not anchors). */
	/** @type {{ routeId: string; ox: number; oy: number; snap: TacticalRoute } | null} */
	let routeBodyDrag = $state(null);
	/** @type {Element | null} */
	let routeBodyCaptureEl = null;
	/** @type {number | null} */
	let routeBodyCaptureId = null;

	/** Player ids in Hold phase during live playback (for charge animation). */
	let simChargePlayerIds = $state(/** @type {string[]} */ ([]));
	/** Per-route hold phase last frame (playback ribbon edge detect). */
	let simRouteHoldPrev = new Map();

	const DELAY_STEP_MS = 500;
	const DELAY_MAX_MS = 60000;

	const HUB_ORBIT = 118;
	const HUB_HOVER_PX = 52;

	/** Radial command hub (SVG space). */
	let radialOpen = $state(false);
	let radialCx = $state(800);
	let radialCy = $state(450);
	/** @type {number | null} opener pointer id; null = opened via context menu */
	let radialOpenerPointerId = $state(null);
	let radialViaContext = $state(false);
	/** @type {string | null} */
	let hubHoveredKey = $state(null);
	const hubPop = new Spring(0, { stiffness: 0.42, damping: 0.78 });

	let radialLongPressTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
	let radialLongPressOrigin = /** @type {{ x: number; y: number; ev: PointerEvent } | null} */ (null);

	const radialFriendly = $derived.by(() => {
		const xi = wrBucketXi.map((t) => ({
			token: t,
			source: /** @type {const} */ ('xi'),
			key: `xi:${t.id}`,
		}));
		const bn = wrBucketBench.map((t) => ({
			token: t,
			source: /** @type {const} */ ('bench'),
			key: `bench:${t.id}`,
		}));
		const items = [...xi, ...bn];
		const n = items.length;
		return items.map((item, i) => ({
			...item,
			angle: Math.PI * (0.5 + (0.42 * (n <= 1 ? 0.5 : i / (n - 1)))),
			ring: FRIENDLY_RING,
			wing: /** @type {const} */ ('L'),
		}));
	});

	const radialOppSlots = $derived.by(() => {
		const items = oppositionInModal.map((t) => ({
			token: t,
			source: /** @type {const} */ ('opp'),
			key: `opp:${t.id}`,
		}));
		const n = items.length;
		return items.map((item, i) => ({
			...item,
			angle: -0.62 + 1.24 * (n <= 1 ? 0.5 : i / (n - 1)),
			ring: OPP_RING,
			wing: /** @type {const} */ ('R'),
		}));
	});

	const radialAllSlots = $derived([...radialFriendly, ...radialOppSlots]);

	const hubCenterLabel = $derived.by(() => {
		if (!hubHoveredKey) return 'DEPLOY';
		const slot = radialAllSlots.find((s) => s.key === hubHoveredKey);
		if (!slot) return 'DEPLOY';
		const p = slot.token;
		const n = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : '';
		if (n) return n.toUpperCase();
		return p.number ? `#${p.number}` : p.id;
	});

	function cancelRadialLongPress() {
		if (radialLongPressTimer != null) {
			clearTimeout(radialLongPressTimer);
			radialLongPressTimer = null;
		}
		radialLongPressOrigin = null;
	}

	function openRadialHub(
		/** @type {MouseEvent | TouchEvent | PointerEvent} */ ev,
		/** @type {number | null} */ openerPointerId,
		viaContext = false,
	) {
		if (!pitchSvgEl) return;
		const raw = clientToSvg(ev);
		const p = clampToPitch(raw.x, raw.y);
		radialCx = p.x;
		radialCy = p.y;
		radialOpen = true;
		radialOpenerPointerId = openerPointerId;
		radialViaContext = viaContext;
		hubHoveredKey = null;
		hubPop.target = 1;
		cancelRadialLongPress();
	}

	function closeRadialHub() {
		radialOpen = false;
		radialViaContext = false;
		radialOpenerPointerId = null;
		hubHoveredKey = null;
		hubPop.target = 0;
		cancelRadialLongPress();
	}

	function updateRadialHover(ev) {
		if (!pitchSvgEl) return;
		if (!radialOpen && hubPop.current < 0.04) return;
		const { x, y } = clientToSvg(ev);
		const lx = x - radialCx;
		const ly = y - radialCy;
		let bestKey = null;
		let bestD = HUB_HOVER_PX;
		for (const s of radialAllSlots) {
			const nx = Math.cos(s.angle) * HUB_ORBIT;
			const ny = Math.sin(s.angle) * HUB_ORBIT;
			const d = Math.hypot(lx - nx, ly - ny);
			if (d < bestD) {
				bestD = d;
				bestKey = s.key;
			}
		}
		hubHoveredKey = bestKey;
	}

	function tryConsumeRadialPointerUp(/** @type {PointerEvent} */ ev) {
		const hubActive = radialOpen || hubPop.current > 0.06;
		if (!hubActive) return false;
		if (ev.pointerType === 'mouse' && ev.button === 2) return true;
		if (radialOpenerPointerId != null && ev.pointerId !== radialOpenerPointerId) return false;
		if (hubHoveredKey) {
			const slot = radialAllSlots.find((s) => s.key === hubHoveredKey);
			if (slot) deployTokenAt(slot.token, slot.source, clampToPitch(radialCx, radialCy));
		}
		closeRadialHub();
		return true;
	}

	/** @type {Element | null} */
	let pitchDragCaptureEl = null;
	/** @type {number | null} */
	let pitchDragCaptureId = null;

	function releasePitchDragCapture() {
		if (pitchDragCaptureEl && pitchDragCaptureId != null) {
			try {
				pitchDragCaptureEl.releasePointerCapture(pitchDragCaptureId);
			} catch {
				/* ignore */
			}
		}
		pitchDragCaptureEl = null;
		pitchDragCaptureId = null;
	}

	function releaseRouteBodyCapture() {
		if (routeBodyCaptureEl && routeBodyCaptureId != null) {
			try {
				routeBodyCaptureEl.releasePointerCapture(routeBodyCaptureId);
			} catch {
				/* ignore */
			}
		}
		routeBodyCaptureEl = null;
		routeBodyCaptureId = null;
	}

	/**
	 * Begin translating a route by dragging its stroke (ROUTE tool).
	 * @param {PointerEvent} ev
	 * @param {TacticalRoute} route
	 */
	function onRouteStrokePointerDown(ev, route) {
		ev.stopPropagation();
		if (warRoomTool !== 'ROUTE') return;
		const r = normalizeRoute(route);
		const p = clientToSvg(ev);
		routeBodyDrag = { routeId: r.id, ox: p.x, oy: p.y, snap: { ...r } };
		selectedRouteId = r.id;
		const el = /** @type {Element | null} */ (ev.currentTarget);
		if (el && typeof el.setPointerCapture === 'function' && ev.pointerId != null) {
			try {
				el.setPointerCapture(ev.pointerId);
				routeBodyCaptureEl = el;
				routeBodyCaptureId = ev.pointerId;
			} catch {
				/* ignore */
			}
		}
	}

	/**
	 * @param {unknown} r
	 * @returns {TacticalRoute}
	 */
	function normalizeRoute(r) {
		const o = /** @type {Record<string, number | string | null | undefined>} */ (r);
		const x1 = Number(o.x1);
		const y1 = Number(o.y1);
		const x2 = Number(o.x2);
		const y2 = Number(o.y2);
		let cx = Number(o.cx);
		let cy = Number(o.cy);
		if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
			cx = (x1 + x2) / 2;
			cy = (y1 + y2) / 2;
		}
		return {
			id: String(o.id ?? ''),
			x1,
			y1,
			cx,
			cy,
			x2,
			y2,
			color: String(o.color ?? '#00f0ff'),
			bindPlayerId: o.bindPlayerId != null ? String(o.bindPlayerId) : null,
			pathKind: o.pathKind === 'cut' ? /** @type {const} */ ('cut') : /** @type {const} */ ('curve'),
			delay: Number.isFinite(Number(o.delay)) ? Math.max(0, Math.min(DELAY_MAX_MS, Number(o.delay))) : 0,
		};
	}

	const routesLive = $derived(drawnRoutes.map(normalizeRoute));

	/** Distinct ink colors for marker defs (palette ∪ live routes). */
	const allRouteMarkerColors = $derived.by(() => {
		const s = new Set(/** @type {string[]} */ ([...INK_PALETTE]));
		for (const raw of drawnRoutes) {
			s.add(normalizeRoute(raw).color);
		}
		return [...s];
	});

	/**
	 * @param {MouseEvent | TouchEvent} ev
	 */
	function clientToSvg(ev) {
		if (!pitchSvgEl) return { x: 0, y: 0 };
		const pt = pitchSvgEl.createSVGPoint();
		const x = 'touches' in ev ? (ev.touches[0]?.clientX ?? 0) : ev.clientX;
		const y = 'touches' in ev ? (ev.touches[0]?.clientY ?? 0) : ev.clientY;
		pt.x = x;
		pt.y = y;
		const ctm = pitchSvgEl.getScreenCTM();
		if (!ctm) return { x: 0, y: 0 };
		return pt.matrixTransform(ctm.inverse());
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	function clampToPitch(x, y) {
		const pad = DISC_HIT_R + 6;
		return {
			x: Math.min(VIEW_W - pad, Math.max(pad, x)),
			y: Math.min(VIEW_H - pad, Math.max(pad, y)),
		};
	}

	/** Snap route start to a token center when the draft began on open pitch but landed on a disc. */
	function bindPlayerIdAtRouteStart(x1, y1) {
		const rHit = DISC_HIT_R + 2;
		for (const t of allPitchTokens) {
			if (typeof t.x !== 'number' || typeof t.y !== 'number') continue;
			if (Math.hypot(t.x - x1, t.y - y1) <= rHit) return t.id;
		}
		return null;
	}

	/**
	 * Append point to the neon ribbon trail (pitch SVG coords).
	 * @param {number} x
	 * @param {number} y
	 * @param {string} [color]
	 */
	function appendTrailPoint(x, y, color) {
		const now = performance.now();
		const pt = /** @type {{ x: number; y: number; t: number; c?: string }} */ ({ x, y, t: now });
		if (color) pt.c = color;
		let next = [...activeDragTrail, pt];
		const cap = draggingPlayer ? DRAG_TRAIL_MAX_POINTS : TRAIL_MAX_POINTS;
		while (next.length > cap) next.shift();
		activeDragTrail = next;
	}

	onDestroy(() => {
		simulator.pause();
	});

	/**
	 * @param {TacticalRoute} r
	 * @param {number} u 0–1 along path
	 */
	function sampleRoutePointAt(r, u) {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', routePathD(r));
		const len = path.getTotalLength();
		if (!Number.isFinite(len) || len <= 0) return { x: r.x1, y: r.y1 };
		const t = Math.min(1, Math.max(0, u));
		return path.getPointAtLength(len * t);
	}

	function orchestrationCycleMs() {
		let maxEnd = SIM_ROUTE_DURATION_MS;
		let anyBound = false;
		for (const raw of drawnRoutes) {
			const r = normalizeRoute(raw);
			if (!r.bindPlayerId) continue;
			anyBound = true;
			maxEnd = Math.max(maxEnd, r.delay + SIM_ROUTE_DURATION_MS);
		}
		return anyBound ? maxEnd : SIM_ROUTE_DURATION_MS;
	}

	/**
	 * Staggered orchestration: elapsed ms from cycle start (loops while playing).
	 * @param {number} elapsedLoop
	 * @param {{ playing: boolean }} opts
	 */
	function applyStaggeredPlayback(elapsedLoop, opts) {
		const charge = new Set();
		let pitchChanged = false;
		let oppChanged = false;
		const nextPitch = [...wrBucketPitch];
		const nextOpp = [...wrOppPitch];
		const eps = 0.25;

		for (const raw of drawnRoutes) {
			const r = normalizeRoute(raw);
			const bid = r.bindPlayerId;
			if (!bid) continue;

			const playerActiveTime = elapsedLoop - r.delay;
			/** @type {{ x: number; y: number }} */
			let pt;
			let prog = 0;
			if (playerActiveTime < 0) {
				charge.add(bid);
				pt = sampleRoutePointAt(r, 0);
			} else {
				prog = Math.min(1, playerActiveTime / SIM_ROUTE_DURATION_MS);
				pt = sampleRoutePointAt(r, prog);
			}

			if (opts.playing) {
				const isHolding = playerActiveTime < 0;
				const wasHolding = simRouteHoldPrev.has(r.id) ? /** @type {boolean} */ (simRouteHoldPrev.get(r.id)) : isHolding;
				if (wasHolding && !isHolding) {
					activeDragTrail = [];
					trailRibbonColor = r.color;
				}
				simRouteHoldPrev.set(r.id, isHolding);
				if (!isHolding && prog < 1 - 1e-6) {
					appendTrailPoint(pt.x, pt.y, r.color);
				}
			}

			const pi = nextPitch.findIndex((t) => t.id === bid);
			if (pi !== -1) {
				const t0 = nextPitch[pi];
				if (Math.abs((t0.x ?? 0) - pt.x) > eps || Math.abs((t0.y ?? 0) - pt.y) > eps) {
					nextPitch[pi] = { ...t0, x: pt.x, y: pt.y };
					pitchChanged = true;
				}
				continue;
			}
			const oi = nextOpp.findIndex((t) => t.id === bid);
			if (oi !== -1) {
				const t0 = nextOpp[oi];
				if (Math.abs((t0.x ?? 0) - pt.x) > eps || Math.abs((t0.y ?? 0) - pt.y) > eps) {
					nextOpp[oi] = { ...t0, x: pt.x, y: pt.y };
					oppChanged = true;
				}
			}
		}

		if (opts.playing) simChargePlayerIds = [...charge];
		else simChargePlayerIds = [];

		if (pitchChanged) wrBucketPitch = nextPitch;
		if (oppChanged) wrOppPitch = nextOpp;
	}

	/**
	 * @param {string} routeId
	 * @param {number} deltaMs
	 */
	function bumpRouteDelay(routeId, deltaMs) {
		drawnRoutes = drawnRoutes.map((raw) => {
			const r = normalizeRoute(raw);
			if (r.id !== routeId) return raw;
			const next = Math.max(0, Math.min(DELAY_MAX_MS, r.delay + deltaMs));
			return { ...r, delay: next };
		});
	}

	$effect(() => {
		const md = Math.max(1, orchestrationCycleMs());
		simulator.maxDuration = md;
		if (simulator.currentTime > md) simulator.scrub(md);
	});

	$effect(() => {
		if (simulator.isPlaying) simRouteHoldPrev.clear();
	});

	$effect(() => {
		drawnRoutes;
		simulator.currentTime;
		simulator.isPlaying;
		applyStaggeredPlayback(simulator.currentTime, { playing: simulator.isPlaying });
	});

	/** @param {TacticalRoute} r */
	function routePathD(r) {
		const kind = r.pathKind ?? 'curve';
		if (kind === 'cut') return `M ${r.x1} ${r.y1} L ${r.cx} ${r.cy} L ${r.x2} ${r.y2}`;
		return `M ${r.x1} ${r.y1} Q ${r.cx} ${r.cy} ${r.x2} ${r.y2}`;
	}

	/**
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 */
	function midCtrl(x1, y1, x2, y2) {
		return { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
	}

	function closeOverlay() {
		showTacticalOverlay = false;
		warRoomTool = 'DRAG';
		routingActive = false;
		routeDraft = null;
		teardownAnchorDrag();
		routeBodyDrag = null;
		releaseRouteBodyCapture();
		draggingPlayer = null;
		activeDragTrail = [];
		selectedRouteId = null;
		focusedPlayerId = null;
		releasePitchDragCapture();
		simulator.pause();
		closeRadialHub();
	}

	/**
	 * Clear Target Lock on bare pitch chrome (not tokens / routes).
	 * @param {MouseEvent & { currentTarget: SVGSVGElement }} e
	 */
	function handleSvgClick(e) {
		const el = e.target;
		const tag = el instanceof Element ? el.tagName.toLowerCase() : '';
		if (tag === 'svg' || tag === 'rect') {
			focusedPlayerId = null;
		}
	}

	function teardownAnchorDrag() {
		anchorDrag = null;
	}

	/**
	 * @param {MouseEvent | TouchEvent | PointerEvent} ev
	 */
	function applyAnchorDragFromEvent(ev) {
		if (!anchorDrag || warRoomTool !== 'ROUTE') return;
		const raw = clientToSvg(ev);
		const p = clampToPitch(raw.x, raw.y);
		const { routeId, kind } = anchorDrag;
		drawnRoutes = drawnRoutes.map((rawR) => {
			const r = normalizeRoute(rawR);
			if (r.id !== routeId) return rawR;
			if (kind === 'start') return { ...r, x1: p.x, y1: p.y, bindPlayerId: null };
			if (kind === 'ctrl') return { ...r, cx: p.x, cy: p.y };
			return { ...r, x2: p.x, y2: p.y };
		});
	}

	function recallBench() {
		teardownAnchorDrag();
		routeBodyDrag = null;
		releaseRouteBodyCapture();
		if (wrBucketPitch.length > 0) {
			const recalled = wrBucketPitch.map(({ x: _x, y: _y, ...rest }) => rest);
			wrBucketXi = [...wrBucketXi, ...recalled];
			wrBucketPitch = [];
		}
		drawnRoutes = [];
		wrOppPitch = [];
		activeDragTrail = [];
		selectedRouteId = null;
	}

	function clearRoutesOnly() {
		drawnRoutes = [];
		routeDraft = null;
		routingActive = false;
		teardownAnchorDrag();
		routeBodyDrag = null;
		releaseRouteBodyCapture();
		selectedRouteId = null;
	}

	/**
	 * @param {TacticalToken} t
	 * @param {'xi' | 'bench' | 'opp'} source
	 * @param {{ x: number; y: number }} p
	 */
	function deployTokenAt(t, source, p) {
		const isOpp = t.side === 'opponent' || source === 'opp';
		const placed = {
			...t,
			x: p.x,
			y: p.y,
			side: isOpp ? /** @type {const} */ ('opponent') : /** @type {const} */ ('friendly'),
			color: isOpp ? OPP_RING : t.color || FRIENDLY_RING,
		};
		if (isOpp) {
			wrOppPitch = [...wrOppPitch, placed];
		} else {
			wrBucketPitch = [...wrBucketPitch, placed];
			if (source === 'xi') wrBucketXi = wrBucketXi.filter((x) => x.id !== t.id);
			else wrBucketBench = wrBucketBench.filter((x) => x.id !== t.id);
		}
	}

	function onPitchContextMenu(/** @type {MouseEvent} */ ev) {
		ev.preventDefault();
		if (warRoomTool !== 'DRAG' || anchorDrag) return;
		openRadialHub(ev, null, true);
	}

	function onPitchPointerUpClearLongPress() {
		cancelRadialLongPress();
	}

	/**
	 * @param {MouseEvent | TouchEvent | PointerEvent} ev
	 */
	function onPitchPointerDown(ev) {
		if (anchorDrag) return;
		const tgt = /** @type {EventTarget | null} */ (ev.target);
		const hitRoute = tgt && /** @type {Element} */ (tgt).closest?.('[data-route-hit]');
		if (hitRoute) return;

		const onDisc = tgt && /** @type {Element} */ (tgt).closest?.('[data-light-disc]');

		if (warRoomTool === 'DRAG') {
			selectedRouteId = null;
			const pe = /** @type {PointerEvent | undefined} */ ('pointerId' in ev ? ev : undefined);
			const primary = !pe || pe.pointerType !== 'mouse' || pe.button === 0;

			if (primary && !onDisc && pe) {
				radialLongPressOrigin = { x: pe.clientX, y: pe.clientY, ev: pe };
				cancelRadialLongPress();
				radialLongPressTimer = setTimeout(() => {
					radialLongPressTimer = null;
					const o = radialLongPressOrigin;
					radialLongPressOrigin = null;
					if (o) openRadialHub(o.ev, o.ev.pointerId, false);
				}, 500);
				return;
			}

			if (!onDisc) return;
		}

		if (warRoomTool !== 'ROUTE') return;

		if (onDisc) return;

		const raw = clientToSvg(ev);
		const p = clampToPitch(raw.x, raw.y);
		const mc = midCtrl(p.x, p.y, p.x, p.y);
		routingActive = true;
		selectedRouteId = null;
		routeDraft = {
			id: '',
			x1: p.x,
			y1: p.y,
			cx: mc.cx,
			cy: mc.cy,
			x2: p.x,
			y2: p.y,
			color: activeRouteColor,
			bindPlayerId: null,
			pathKind: routeDrawKind,
			delay: 0,
		};
	}

	/**
	 * @param {PointerEvent} ev
	 */
	function handlePointerMove(ev) {
		updateRadialHover(ev);
		if (radialLongPressOrigin && radialLongPressTimer != null) {
			const dx = ev.clientX - radialLongPressOrigin.x;
			const dy = ev.clientY - radialLongPressOrigin.y;
			if (Math.hypot(dx, dy) > 14) cancelRadialLongPress();
		}
		if (anchorDrag && warRoomTool === 'ROUTE') {
			applyAnchorDragFromEvent(ev);
			return;
		}
		if (routeBodyDrag && warRoomTool === 'ROUTE') {
			const raw = clientToSvg(ev);
			const p = clampToPitch(raw.x, raw.y);
			const dx = p.x - routeBodyDrag.ox;
			const dy = p.y - routeBodyDrag.oy;
			const s = routeBodyDrag.snap;
			drawnRoutes = drawnRoutes.map((rawR) => {
				const r = normalizeRoute(rawR);
				if (r.id !== routeBodyDrag.routeId) return rawR;
				let next = {
					...r,
					x1: s.x1 + dx,
					y1: s.y1 + dy,
					cx: s.cx + dx,
					cy: s.cy + dy,
					x2: s.x2 + dx,
					y2: s.y2 + dy,
				};
				const q1 = clampToPitch(next.x1, next.y1);
				const qc = clampToPitch(next.cx, next.cy);
				const q2 = clampToPitch(next.x2, next.y2);
				next = { ...next, x1: q1.x, y1: q1.y, cx: qc.x, cy: qc.y, x2: q2.x, y2: q2.y };
				return next;
			});
			return;
		}
		if (draggingPlayer && warRoomTool === 'DRAG') {
			const raw = clientToSvg(ev);
			const p = clampToPitch(raw.x, raw.y);
			draggingPlayer.x = p.x;
			draggingPlayer.y = p.y;
			appendTrailPoint(p.x, p.y);
			if (wrBucketPitch.some((t) => t === draggingPlayer)) wrBucketPitch = [...wrBucketPitch];
			else wrOppPitch = [...wrOppPitch];
			const pid = draggingPlayer.id;
			if (pid) {
				drawnRoutes = drawnRoutes.map((rawR) => {
					const r = normalizeRoute(rawR);
					if (r.bindPlayerId !== pid) return rawR;
					return { ...r, x1: p.x, y1: p.y };
				});
			}
			return;
		}
		if (routingActive && routeDraft && warRoomTool === 'ROUTE') {
			const raw = clientToSvg(ev);
			const p = clampToPitch(raw.x, raw.y);
			const mc = midCtrl(routeDraft.x1, routeDraft.y1, p.x, p.y);
			routeDraft = { ...routeDraft, x2: p.x, y2: p.y, cx: mc.cx, cy: mc.cy };
		}
	}

	/**
	 * @param {PointerEvent} ev
	 */
	function handlePointerUp(ev) {
		cancelRadialLongPress();
		if (tryConsumeRadialPointerUp(ev)) return;
		if (routeBodyDrag) {
			releaseRouteBodyCapture();
			routeBodyDrag = null;
			return;
		}
		if (anchorDrag) {
			teardownAnchorDrag();
			return;
		}
		if (draggingPlayer) {
			releasePitchDragCapture();
			activeDragTrail = [];
			draggingPlayer = null;
			return;
		}
		if (routingActive && routeDraft && warRoomTool === 'ROUTE') {
			const raw = clientToSvg(ev);
			const p = clampToPitch(raw.x, raw.y);
			const dx = p.x - routeDraft.x1;
			const dy = p.y - routeDraft.y1;
			if (Math.hypot(dx, dy) > 14) {
				const id =
					typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
						? crypto.randomUUID()
						: `r-${Date.now()}`;
				const mc = midCtrl(routeDraft.x1, routeDraft.y1, p.x, p.y);
				let bindId = routeDraft.bindPlayerId ?? null;
				if (!bindId) bindId = bindPlayerIdAtRouteStart(routeDraft.x1, routeDraft.y1);
				drawnRoutes = [
					...drawnRoutes,
					{
						id,
						x1: routeDraft.x1,
						y1: routeDraft.y1,
						cx: mc.cx,
						cy: mc.cy,
						x2: p.x,
						y2: p.y,
						color: activeRouteColor,
						bindPlayerId: bindId,
						pathKind: routeDraft.pathKind ?? routeDrawKind,
						delay: routeDraft.delay ?? 0,
					},
				];
			}
		}
		routingActive = false;
		routeDraft = null;
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	function handleKeyDown(e) {
		if (e.key !== 'Escape') return;
		e.preventDefault();
		if (radialOpen || hubPop.current > 0.06) {
			closeRadialHub();
			return;
		}
		closeOverlay();
	}

	/**
	 * @param {PointerEvent} ev
	 * @param {TacticalToken} player
	 */
	function startDrag(ev, player) {
		if (warRoomTool === 'DRAG') {
			ev.preventDefault();
			ev.stopPropagation();
			const resolved = resolvePitchToken(player);
			draggingPlayer = resolved;
			activeDragTrail = [];
			trailRibbonColor = ringColor(resolved);
			if (typeof ev.currentTarget?.setPointerCapture === 'function' && ev.pointerId != null) {
				try {
					ev.currentTarget.setPointerCapture(ev.pointerId);
					pitchDragCaptureEl = /** @type {Element} */ (ev.currentTarget);
					pitchDragCaptureId = ev.pointerId;
				} catch {
					/* ignore */
				}
			}
			const sx = resolved.x ?? VIEW_W / 2;
			const sy = resolved.y ?? VIEW_H / 2;
			const p0 = clampToPitch(sx, sy);
			appendTrailPoint(p0.x, p0.y);
			return;
		}
		if (warRoomTool === 'ROUTE') {
			ev.preventDefault();
			ev.stopPropagation();
			const sx = player.x ?? VIEW_W / 2;
			const sy = player.y ?? VIEW_H / 2;
			const p0 = clampToPitch(sx, sy);
			const mc = midCtrl(p0.x, p0.y, p0.x, p0.y);
			routingActive = true;
			selectedRouteId = null;
			routeDraft = {
				id: '',
				x1: p0.x,
				y1: p0.y,
				cx: mc.cx,
				cy: mc.cy,
				x2: p0.x,
				y2: p0.y,
				color: activeRouteColor,
				bindPlayerId: player.id,
				pathKind: routeDrawKind,
				delay: 0,
			};
		}
	}

	/**
	 * @param {MouseEvent | TouchEvent | PointerEvent} ev
	 * @param {string} routeId
	 * @param {'start' | 'ctrl' | 'end'} kind
	 */
	function onAnchorDown(ev, routeId, kind) {
		ev.stopPropagation();
		if (warRoomTool !== 'ROUTE') return;
		anchorDrag = { routeId, kind };
		if (kind === 'start') {
			drawnRoutes = drawnRoutes.map((rawR) => {
				const r = normalizeRoute(rawR);
				if (r.id !== routeId) return rawR;
				return { ...r, bindPlayerId: null };
			});
		}
	}

	function rosterLabel(/** @type {TacticalToken} */ p) {
		const n = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : '';
		if (n) return n;
		return p.number ? `#${p.number}` : p.id;
	}

	/**
	 * `#each allPitchTokens` uses shallow copies for `side`; drag must target bindable bucket refs.
	 * @param {TacticalToken} player
	 * @returns {TacticalToken}
	 */
	function resolvePitchToken(player) {
		const id = player.id;
		return wrBucketPitch.find((t) => t.id === id) ?? wrOppPitch.find((t) => t.id === id) ?? player;
	}

	function onPitchMouseLeave(ev) {
		if (anchorDrag) return;
		if (draggingPlayer) return;
		if (radialOpen || hubPop.current > 0.06) return;
		handlePointerUp(/** @type {PointerEvent} */ (ev));
	}

	/**
	 * @param {TacticalToken} player
	 */
	function ringColor(player) {
		return player.side === 'opponent' ? OPP_RING : player.color || FRIENDLY_RING;
	}

	/**
	 * @param {string} routeId
	 */
	function showAnchorsFor(routeId) {
		return selectedRouteId === routeId || hoveredRouteId === routeId;
	}
</script>

<svelte:window
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onkeydown={handleKeyDown}
/>

<div
	class="tw-relative tw-fixed tw-inset-0 tw-z-[100] tw-flex tw-h-screen tw-w-screen tw-flex-col tw-overflow-hidden tw-bg-[#020202] tw-font-sans"
	transition:fade={{ duration: 220 }}
>
	<header
		class="tw-z-20 tw-flex tw-h-14 tw-shrink-0 tw-items-center tw-justify-between tw-border-b tw-border-[#00f0ff]/25 tw-bg-black/95 tw-px-6 tw-backdrop-blur-md"
	>
		<div class="tw-flex tw-items-center tw-gap-4">
			<div
				class="tw-h-3 tw-w-3 tw-animate-pulse tw-rounded-full tw-bg-[#00f0ff] tw-shadow-[0_0_16px_#00f0ff]"
			></div>
			<h2
				class="tw-font-mono tw-text-[12px] tw-uppercase tw-tracking-[0.28em] tw-text-[#00f0ff] tw-drop-shadow-[0_0_10px_rgba(0,240,255,0.55)]"
			>
				Tactical War Room // Active Grid
			</h2>
		</div>
		<button
			type="button"
			class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-lg tw-border-2 tw-border-white/20 tw-bg-black/90 tw-font-mono tw-text-xl tw-text-white tw-shadow-[0_0_20px_rgba(0,0,0,0.8)] tw-transition-colors hover:tw-border-[#ff0033]/70 hover:tw-bg-black hover:tw-text-[#ff0033] hover:tw-shadow-[0_0_18px_rgba(255,0,51,0.45)]"
			onclick={closeOverlay}
			aria-label="Close tactical board"
		>
			✕
		</button>
	</header>

	<div
		class="tw-grid tw-min-h-0 tw-flex-1 tw-w-full tw-grid-rows-[1fr_100px] tw-overflow-hidden tw-bg-[#020202]"
	>
		<div
			class="tw-relative tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-overflow-hidden tw-p-4 md:tw-p-8"
			style="perspective: 1500px;"
		>
			<div
				class="tw-relative tw-h-full tw-w-full tw-transition-transform tw-duration-700 tw-ease-in-out tw-[transform-style:preserve-3d] {isHolotableMode ?
					'tw-rotate-x-[45deg] tw-scale-90 tw-translate-y-12 tw-shadow-[0_100px_100px_rgba(0,240,255,0.1)]'
				:	''}"
			>
				<div
					class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-40 tw-bg-[linear-gradient(rgba(0,240,255,0.03)_50%,transparent_50%)] tw-bg-[length:100%_4px] tw-animate-[scanlines_10s_linear_infinite]"
				></div>
				<div
					class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-40 tw-bg-[radial-gradient(circle_at_center,transparent_40%,#020202_100%)]"
				></div>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<svg
					bind:this={pitchSvgEl}
					id="tactical-pitch"
					class="tw-relative tw-z-10 tw-h-full tw-w-full tw-max-h-full tw-max-w-full tw-touch-none tw-select-none tw-drop-shadow-[0_0_30px_rgba(0,240,255,0.05)] {warRoomTool === 'ROUTE' ?
						'tw-cursor-crosshair'
					:	'tw-cursor-default'}"
					viewBox="0 0 1600 900"
					preserveAspectRatio="xMidYMid meet"
					role="img"
					aria-label="Tactical pitch"
					onpointerdown={onPitchPointerDown}
					onpointerup={onPitchPointerUpClearLongPress}
					onpointerleave={onPitchMouseLeave}
					oncontextmenu={onPitchContextMenu}
					onclick={handleSvgClick}
				>
				<defs>
					<filter id="heavy-bloom" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
						<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
						<feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur3" />
						<feMerge>
							<feMergeNode in="blur3" />
							<feMergeNode in="blur2" />
							<feMergeNode in="blur1" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<filter id="identity-disc-glow" x="-100%" y="-100%" width="300%" height="300%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="dg" />
						<feMerge>
							<feMergeNode in="dg" />
							<feMergeNode in="dg" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<pattern id="cyber-grid" width="40" height="40" patternUnits="userSpaceOnUse">
						<rect width="40" height="40" fill="none" />
						<path
							d="M 40 0 L 0 0 0 40"
							fill="none"
							stroke="rgba(0,240,255,0.07)"
							stroke-width="1"
						/>
					</pattern>
					<radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
						<stop offset="40%" stop-color="white" stop-opacity="1" />
						<stop offset="100%" stop-color="white" stop-opacity="0" />
					</radialGradient>
					<mask id="grid-mask">
						<rect width="100%" height="100%" fill="url(#grid-fade)" />
					</mask>
					<radialGradient id="magnet-core-radial" cx="32%" cy="28%" r="72%">
						<stop offset="0%" stop-color="#2a2a32" />
						<stop offset="42%" stop-color="#0c0c10" />
						<stop offset="100%" stop-color="#020203" />
					</radialGradient>
					{#each allRouteMarkerColors as c (c)}
						{@const aresMk = String(c).replace(/#/g, '')}
						<marker
							id={`ares-disc-${aresMk}`}
							markerWidth="24"
							markerHeight="24"
							refX="12"
							refY="12"
							orient="auto"
							markerUnits="userSpaceOnUse"
						>
							<circle
								cx="12"
								cy="12"
								r="9"
								fill="transparent"
								stroke={c}
								stroke-width="3"
								filter="url(#heavy-bloom)"
							/>
							<circle cx="12" cy="12" r="5" fill="#050505" stroke="#ffffff" stroke-width="1.5" />
						</marker>
					{/each}
				</defs>

				<GridPitch {showLabels} />

				{#if draggingPlayer && activeDragTrail.length > 1 && trailString}
					<polyline
						points={trailString}
						fill="none"
						stroke={dragTrailBloomColor}
						stroke-width="18"
						stroke-linecap="round"
						stroke-linejoin="round"
						opacity="0.15"
						filter="url(#heavy-bloom)"
						pointer-events="none"
					/>
					<polyline
						points={trailString}
						fill="none"
						stroke={dragTrailBloomColor}
						stroke-width="6"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-dasharray="14 22"
						opacity="0.82"
						filter="url(#heavy-bloom)"
						class="tw-animate-[plasma-flow_1.5s_linear_infinite]"
						pointer-events="none"
					/>
					<polyline
						points={trailString}
						fill="none"
						stroke="#ffffff"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						pointer-events="none"
					/>
				{/if}

				{#each routesLive as route (route.id)}
					<GridRoute
						{route}
						pathD={routePathD(route)}
						renderLayer="stroke"
						isSelected={selectedRouteId === route.id}
						timelineMs={simulator.currentTime}
					/>
				{/each}
				{#each routesLive as route (route.id)}
					<GridRoute
						{route}
						pathD={routePathD(route)}
						renderLayer="hit"
						timelineMs={simulator.currentTime}
						{warRoomTool}
						onPathClick={(e) => onRouteStrokePointerDown(e, route)}
						onRouteHoverEnter={() => (hoveredRouteId = route.id)}
						onRouteHoverLeave={() => (hoveredRouteId = null)}
					/>
				{/each}
				{#each routesLive as route (route.id)}
					{#if warRoomTool === 'ROUTE' && showAnchorsFor(route.id)}
						<GridRoute
							{route}
							renderLayer="anchors"
							isSelected={selectedRouteId === route.id}
							timelineMs={simulator.currentTime}
							onControlPointDrag={(e, kind) => onAnchorDown(e, route.id, kind)}
						/>
					{/if}
				{/each}

				{#each routesLive as route (route.id)}
					{#if route.bindPlayerId}
						<GridRoute
							{route}
							renderLayer="ghost"
							timelineMs={simulator.currentTime}
						/>
					{/if}
				{/each}

				{#if routingActive && routeDraft}
					{@const draftAresKey = String(routeDraft.color ?? '').replace(/#/g, '')}
					<path
						d={routePathD(routeDraft)}
						fill="none"
						stroke={routeDraft.color}
						stroke-width="18"
						stroke-linecap="round"
						stroke-linejoin="round"
						opacity="0.15"
						filter="url(#heavy-bloom)"
						pointer-events="none"
					/>
					<path
						d={routePathD(routeDraft)}
						fill="none"
						stroke={routeDraft.color}
						stroke-width="6"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-dasharray="14 22"
						opacity="0.82"
						filter="url(#heavy-bloom)"
						class="tw-animate-[plasma-flow_1.5s_linear_infinite]"
						pointer-events="none"
					/>
					<path
						d={routePathD(routeDraft)}
						fill="none"
						stroke="#ffffff"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						pointer-events="none"
						marker-end={`url(#ares-disc-${draftAresKey})`}
					/>
				{/if}

				{#if !draggingPlayer && activeDragTrail.length >= 2 && trailString}
					<polyline
						points={trailString}
						fill="none"
						stroke={dragTrailBloomColor}
						stroke-width="18"
						stroke-linecap="round"
						stroke-linejoin="round"
						opacity="0.15"
						filter="url(#heavy-bloom)"
						pointer-events="none"
					/>
					<polyline
						points={trailString}
						fill="none"
						stroke={dragTrailBloomColor}
						stroke-width="6"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-dasharray="14 22"
						opacity="0.82"
						filter="url(#heavy-bloom)"
						class="tw-animate-[plasma-flow_1.5s_linear_infinite]"
						pointer-events="none"
					/>
					<polyline
						points={trailString}
						fill="none"
						stroke="#ffffff"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						pointer-events="none"
					/>
				{/if}

				{#each allPitchTokens as player (player.id)}
					<GridEntity
						{player}
						isHovered={hoveredDiscId === player.id}
						isSelected={focusedPlayerId === player.id}
						ringStroke={ringColor(player)}
						charging={simulator.isPlaying && simChargePlayerIds.includes(player.id)}
						timelineMs={simulator.currentTime}
						{warRoomTool}
						onSelect={() => (focusedPlayerId = player.id)}
						onPointerDown={(e) => startDrag(e, player)}
						onMouseEnter={() => (hoveredDiscId = player.id)}
						onMouseLeave={() => (hoveredDiscId = null)}
					/>
				{/each}

				{#if warRoomTool === 'ROUTE' && selectedRouteId}
					{@const hudRoute = routesLive.find((x) => x.id === selectedRouteId)}
					{#if hudRoute}
						<g transform="translate({hudRoute.x1}, {hudRoute.y1 - 54})" pointer-events="all">
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<foreignObject x="-100" y="-20" width="200" height="42">
								<div
									xmlns="http://www.w3.org/1999/xhtml"
									class="tw-z-[60] tw-box-border tw-inline-flex tw-items-center tw-gap-2 tw-rounded-none tw-border tw-border-[#00f0ff]/50 tw-bg-[#050505]/95 tw-px-2 tw-py-1 tw-font-mono tw-text-[10px] tw-text-[#00f0ff] tw-backdrop-blur-md"
									style="clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);"
									onpointerdown={(e) => e.stopPropagation()}
								>
									<span class="tw-tracking-wide">HOLD: {(hudRoute.delay / 1000).toFixed(1)}s</span>
									<button
										type="button"
										class="tw-border tw-border-[#00f0ff]/60 tw-bg-black/50 tw-px-1.5 tw-py-0.5 tw-font-mono tw-text-[10px] tw-text-[#00f0ff] tw-transition-colors hover:tw-bg-[#00f0ff]/15"
										style="clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px);"
										aria-label="Decrease route delay"
										onclick={(e) => {
											e.stopPropagation();
											bumpRouteDelay(hudRoute.id, -DELAY_STEP_MS);
										}}
									>
										−
									</button>
									<button
										type="button"
										class="tw-border tw-border-[#00f0ff]/60 tw-bg-black/50 tw-px-1.5 tw-py-0.5 tw-font-mono tw-text-[10px] tw-text-[#00f0ff] tw-transition-colors hover:tw-bg-[#00f0ff]/15"
										style="clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px);"
										aria-label="Increase route delay"
										onclick={(e) => {
											e.stopPropagation();
											bumpRouteDelay(hudRoute.id, DELAY_STEP_MS);
										}}
									>
										+
									</button>
								</div>
							</foreignObject>
						</g>
					{/if}
				{/if}

				<GridRadialHub
					{radialOpen}
					{radialCx}
					{radialCy}
					{hubPop}
					{radialAllSlots}
					{hubHoveredKey}
					{hubCenterLabel}
				/>
			</svg>
			</div>
		</div>

		<div
			class="tw-relative tw-z-50 tw-h-full tw-w-full tw-border-t-2 tw-border-[#00f0ff]/20 tw-bg-black/90 tw-backdrop-blur-xl"
		>
			<GridHUD
				bind:warRoomTool
				bind:isHolotableMode
				{simulator}
				bind:showLabels
				bind:activeRouteColor
				bind:routeDrawKind
				{focusedPlayerId}
				allTokens={allPitchTokens}
				{recallBench}
				{clearRoutesOnly}
			/>
		</div>
	</div>
</div>

<style>
	:global(.disc-visual) {
		transform-box: fill-box;
	}

	/* Target Lock: extra chromatic lift on the locked token (holotable cinematic read). */
	:global(.grid-entity--selected .tg-target-lock-orbit) {
		filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.45))
			drop-shadow(0 0 22px rgba(0, 240, 255, 0.18));
	}

	:global(.tg-disc-charge .tg-reactor-halo) {
		animation: tg-reactor-charge 0.45s ease-in-out infinite alternate;
	}

	@keyframes tg-reactor-charge {
		from {
			opacity: 0.45;
			stroke-width: 3;
		}
		to {
			opacity: 1;
			stroke-width: 6;
		}
	}
</style>
