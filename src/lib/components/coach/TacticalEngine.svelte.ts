import { setContext } from 'svelte';
import { SimulatorEngine } from '$lib/states/SimulatorEngine.svelte';
import { normalizeRoute, routePathD, sampleRoutePointAt, DELAY_MAX_MS } from '$lib/states/war-room/routeModel';
import {
	VIEW_W,
	VIEW_H,
	DISC_HIT_R,
	TRAIL_MAX_POINTS,
	DRAG_TRAIL_MAX_POINTS,
	INK_PALETTE,
	FRIENDLY_RING,
	OPP_RING,
} from '$lib/states/war-room/constants';
import { createTacticalInputEngine } from '$lib/states/war-room/TacticalInputEngine.svelte';
import { createTacticalRadialHub, type RadialSlotSource } from '$lib/states/war-room/tacticalGridRadial.svelte';
import { wireTacticalPlayback, type TacticalPlaybackHost } from '$lib/states/war-room/tacticalGridPlayback.svelte';
import { WAR_ROOM_CARTRIDGE_CONTEXT, TACTICAL_CARTRIDGE_SCHEMA_VERSION } from '$lib/states/war-room/types';
import type { TacticalCartridge, TacticalRoute, TacticalToken } from '$lib/states/war-room/types';
import type { AnchorDrag, RouteBodyDrag, TrailPt } from '$lib/states/war-room/TacticalInputEngine.svelte';

export type TacticalGridHost = {
	showTacticalOverlay: { get: () => boolean; set: (v: boolean) => void };
	warRoomTool: { get: () => 'DRAG' | 'ROUTE'; set: (v: 'DRAG' | 'ROUTE') => void };
	wrBucketPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	wrBucketXi: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	wrBucketBench: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	wrOppPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	drawnRoutes: { get: () => unknown[]; set: (v: unknown[]) => void };
};

export type TacticalWarRoomModel = ReturnType<typeof createTacticalWarRoom>;

/** Pure war-room state + physics + playback — UI shells consume via TacticalArena / TacticalHUD. */
export function createTacticalWarRoom(host: TacticalGridHost) {
	const simulator = new SimulatorEngine();

	let pitchSvgEl = $state<SVGSVGElement | undefined>();

	let activeRouteColor = $state('#00f0ff');
	let routeDrawKind = $state<'curve' | 'cut'>('curve');
	let showLabels = $state(false);
	let focusedPlayerId = $state<string | null>(null);
	function ringColor(player: TacticalToken) {
		return player.side === 'opponent' ? OPP_RING : player.color || FRIENDLY_RING;
	}

	const allPitchTokens = $derived.by(() => {
		const f = host.wrBucketPitch.get().map((t) => ({ ...t, side: 'friendly' as const }));
		const o = host.wrOppPitch.get().map((t) => ({ ...t, side: 'opponent' as const }));
		return [...f, ...o];
	});

	let draggingPlayer = $state<TacticalToken | null>(null);
	let activeDragTrail = $state<TrailPt[]>([]);
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
	let routeDraft = $state<TacticalRoute | null>(null);

	let hoveredDiscId = $state<string | null>(null);
	let hoveredRouteId = $state<string | null>(null);
	let selectedRouteId = $state<string | null>(null);

	let anchorDrag = $state<AnchorDrag | null>(null);
	let routeBodyDrag = $state<RouteBodyDrag | null>(null);
	let isDrawerOpen = $state(false);

	/** Snapshots for rewind — restored by `resetPositions()` (timeline + x/y). */
	let playbackBaselinePitch = $state<TacticalToken[]>([]);
	let playbackBaselineOpp = $state<TacticalToken[]>([]);

	function capturePlaybackBaseline() {
		playbackBaselinePitch = host.wrBucketPitch.get().map((t) => ({ ...t }));
		playbackBaselineOpp = host.wrOppPitch.get().map((t) => ({ ...t }));
	}

	let simChargePlayerIds = $state<string[]>([]);
	const simRouteHoldPrev = new Map<string, boolean>();

	const routeBodyCapture = { el: null as Element | null, id: null as number | null };
	const pitchDragCapture = { el: null as Element | null, id: null as number | null };

	const ribbon = {
		get value() {
			return trailRibbonColor;
		},
		set value(v: string) {
			trailRibbonColor = v;
		},
	};

	const routesLive = $derived(host.drawnRoutes.get().map(normalizeRoute));

	/**
	 * Play validation — at least one route must be bound to a player. An empty
	 * board or routes without `bindPlayerId` cannot run a meaningful simulation.
	 */
	const canPlay = $derived(routesLive.some((r) => r.bindPlayerId != null));

	/**
	 * Global timeline → bound discs ride their fiber routes.
	 * Per-route delay: while simulator.currentTime < r.delay, the player holds
	 * at the route start (u = 0); after that, u maps from r.delay → maxDuration.
	 * Coordinate math (sampleRoutePointAt / routePathD) untouched.
	 */
	const kineticPitchTokens = $derived.by(() => {
		const maxT = Math.max(1, simulator.maxDuration);
		const tNow = simulator.currentTime;
		const dragId = draggingPlayer?.id ?? null;
		const routes = routesLive;
		return allPitchTokens.map((tok) => {
			if (dragId && tok.id === dragId) return tok;
			const r = routes.find((x) => x.bindPlayerId === tok.id);
			if (!r || typeof tok.x !== 'number' || typeof tok.y !== 'number') return tok;
			const delay = Math.max(0, r.delay ?? 0);
			const span = Math.max(1, maxT - delay);
			const uRoute = tNow < delay ? 0 : Math.max(0, Math.min(1, (tNow - delay) / span));
			const p = sampleRoutePointAt(r, uRoute);
			return { ...tok, x: p.x, y: p.y };
		});
	});

	const timelineNorm = $derived(
		simulator.maxDuration > 0 ? Math.max(0, Math.min(1, simulator.currentTime / simulator.maxDuration)) : 0,
	);

	const allRouteMarkerColors = $derived.by(() => {
		const s = new Set<string>([...INK_PALETTE]);
		for (const raw of host.drawnRoutes.get()) {
			s.add(normalizeRoute(raw).color);
		}
		return [...s];
	});

	// Zero-Gravity coordinate math — viewBox dimensions sourced from constants so the
	// fallback is a pure ratio interpolation regardless of CSS 3D transforms.
	const viewBoxWidth = VIEW_W;
	const viewBoxHeight = VIEW_H;

	function clientToSvg(ev: MouseEvent | TouchEvent | PointerEvent) {
		if (!pitchSvgEl) return { x: 0, y: 0 };
		const clientX = 'touches' in ev ? (ev.touches[0]?.clientX ?? 0) : ev.clientX;
		const clientY = 'touches' in ev ? (ev.touches[0]?.clientY ?? 0) : ev.clientY;

		// Fast path: invertible CTM (no 3D projection on ancestors).
		try {
			const pt = pitchSvgEl.createSVGPoint();
			pt.x = clientX;
			pt.y = clientY;
			const ctm = pitchSvgEl.getScreenCTM();
			if (ctm && Math.abs(ctm.a * ctm.d - ctm.b * ctm.c) > 0.00001) {
				return pt.matrixTransform(ctm.inverse());
			}
		} catch {
			/* DOMException — fall through to hard-coded fallback. */
		}

	// Hard-coded Zero-Gravity fallback: linear ratio interpolation off bbox.
	const rect = pitchSvgEl.getBoundingClientRect();
	const rw = rect.width || 1;
	const rh = rect.height || 1;
	return {
			x: (clientX - rect.left) * (viewBoxWidth / rw),
			y: (clientY - rect.top) * (viewBoxHeight / rh),
		};
	}

	function clampToPitch(x: number, y: number) {
		const pad = DISC_HIT_R + 6;
		return {
			x: Math.min(VIEW_W - pad, Math.max(pad, x)),
			y: Math.min(VIEW_H - pad, Math.max(pad, y)),
		};
	}


	function bindPlayerIdAtRouteStart(x1: number, y1: number) {
		const rHit = DISC_HIT_R + 2;
		for (const t of allPitchTokens) {
			if (typeof t.x !== 'number' || typeof t.y !== 'number') continue;
			if (Math.hypot(t.x - x1, t.y - y1) <= rHit) return t.id;
		}
		return null;
	}

	function appendTrailPoint(x: number, y: number, color?: string) {
		const now = performance.now();
		const pt: TrailPt = { x, y, t: now };
		if (color) pt.c = color;
		let next = [...activeDragTrail, pt];
		const cap = draggingPlayer ? DRAG_TRAIL_MAX_POINTS : TRAIL_MAX_POINTS;
		while (next.length > cap) next.shift();
		activeDragTrail = next;
	}

	function teardownAnchorDrag() {
		anchorDrag = null;
	}

	const playbackHost: TacticalPlaybackHost = {
		drawnRoutesRaw: () => host.drawnRoutes.get(),
		wrBucketPitch: () => host.wrBucketPitch.get(),
		setWrBucketPitch: (v: TacticalToken[]) => host.wrBucketPitch.set(v),
		wrOppPitch: () => host.wrOppPitch.get(),
		setWrOppPitch: (v: TacticalToken[]) => host.wrOppPitch.set(v),
		activeDragTrail: () => activeDragTrail,
		setActiveDragTrail: (v: TrailPt[]) => (activeDragTrail = v),
		setTrailRibbonColor: (c: string) => (trailRibbonColor = c),
		simChargePlayerIds: () => simChargePlayerIds,
		setSimChargePlayerIds: (v: string[]) => (simChargePlayerIds = v),
		appendTrailPoint,
		simRouteHoldPrev,
	};
	wireTacticalPlayback(simulator, playbackHost);

	// First roster hydration (no cartridge): capture once so Rewind can restore layout.
	$effect(() => {
		const f = host.wrBucketPitch.get();
		const o = host.wrOppPitch.get();
		if (playbackBaselinePitch.length > 0 || playbackBaselineOpp.length > 0) return;
		if (f.length === 0 && o.length === 0) return;
		capturePlaybackBaseline();
	});

	function bumpRouteDelay(routeId: string, deltaMs: number) {
		host.drawnRoutes.set(
			host.drawnRoutes.get().map((raw) => {
				const r = normalizeRoute(raw);
				if (r.id !== routeId) return raw;
				const next = Math.max(0, Math.min(DELAY_MAX_MS, r.delay + deltaMs));
				return { ...r, delay: next };
			}),
		);
	}

	function closeOverlay() {
		host.showTacticalOverlay.set(false);
		host.warRoomTool.set('DRAG');
		routingActive = false;
		routeDraft = null;
		teardownAnchorDrag();
		routeBodyDrag = null;
		input.releaseRouteBodyCapture();
		draggingPlayer = null;
		activeDragTrail = [];
		selectedRouteId = null;
		focusedPlayerId = null;
		input.releasePitchDragCapture();
		simulator.pause();
		radial.closeRadialHub();
	}

	function handleSvgClick(e: MouseEvent) {
		const el = e.target;
		const tag = el instanceof Element ? el.tagName.toLowerCase() : '';
		if (tag === 'svg' || tag === 'rect') {
			focusedPlayerId = null;
		}
	}

	function recallBench() {
		teardownAnchorDrag();
		routeBodyDrag = null;
		input.releaseRouteBodyCapture();
		simulator.timelineAuthorCapMs = 0;
		if (host.wrBucketPitch.get().length > 0) {
			const recalled = host.wrBucketPitch.get().map(({ x: _x, y: _y, ...rest }) => rest);
			host.wrBucketXi.set([...host.wrBucketXi.get(), ...recalled]);
			host.wrBucketPitch.set([]);
		}
		host.drawnRoutes.set([]);
		host.wrOppPitch.set([]);
		activeDragTrail = [];
		selectedRouteId = null;
		playbackBaselinePitch = [];
		playbackBaselineOpp = [];
	}

	function clearRoutesOnly() {
		host.drawnRoutes.set([]);
		routeDraft = null;
		routingActive = false;
		teardownAnchorDrag();
		routeBodyDrag = null;
		input.releaseRouteBodyCapture();
		selectedRouteId = null;
	}

	function deployTokenAt(t: TacticalToken, source: RadialSlotSource, p: { x: number; y: number }) {
		const isOpp = t.side === 'opponent' || source === 'opp';
		const placed: TacticalToken = {
			...t,
			x: p.x,
			y: p.y,
			side: isOpp ? 'opponent' : 'friendly',
			color: isOpp ? OPP_RING : t.color || FRIENDLY_RING,
		};
		if (isOpp) {
			host.wrOppPitch.set([...host.wrOppPitch.get(), placed]);
		} else {
			host.wrBucketPitch.set([...host.wrBucketPitch.get(), placed]);
			if (source === 'xi') host.wrBucketXi.set(host.wrBucketXi.get().filter((x) => x.id !== t.id));
			else host.wrBucketBench.set(host.wrBucketBench.get().filter((x) => x.id !== t.id));
		}
	}

	const radial = createTacticalRadialHub({
		svg: () => pitchSvgEl,
		wrBucketXi: () => host.wrBucketXi.get(),
		wrBucketBench: () => host.wrBucketBench.get(),
		wrOppPitch: () => host.wrOppPitch.get(),
		clientToSvg,
		clampToPitch,
		deployTokenAt,
	});

	const pointerHost = {
		svg: () => pitchSvgEl,
		warRoomTool: () => host.warRoomTool.get(),
		clientToSvg,
		clampToPitch,
		anchorDrag: () => anchorDrag,
		setAnchorDrag: (v: AnchorDrag | null) => (anchorDrag = v),
		routeBodyDrag: () => routeBodyDrag,
		setRouteBodyDrag: (v: RouteBodyDrag | null) => (routeBodyDrag = v),
		draggingPlayer: () => draggingPlayer,
		setDraggingPlayer: (v: TacticalToken | null) => (draggingPlayer = v),
		routingActive: () => routingActive,
		setRoutingActive: (v: boolean) => (routingActive = v),
		routeDraft: () => routeDraft,
		setRouteDraft: (v: TacticalRoute | null) => (routeDraft = v),
		drawnRoutes: () => host.drawnRoutes.get(),
		setDrawnRoutes: (v: unknown[]) => host.drawnRoutes.set(v),
		wrBucketPitch: () => host.wrBucketPitch.get(),
		setWrBucketPitch: (v: TacticalToken[]) => host.wrBucketPitch.set(v),
		wrOppPitch: () => host.wrOppPitch.get(),
		setWrOppPitch: (v: TacticalToken[]) => host.wrOppPitch.set(v),
		activeDragTrail: () => activeDragTrail,
		setActiveDragTrail: (v: TrailPt[]) => (activeDragTrail = v),
		activeRouteColor: () => activeRouteColor,
		routeDrawKind: () => routeDrawKind,
		selectedRouteId: () => selectedRouteId,
		setSelectedRouteId: (v: string | null) => (selectedRouteId = v),
		ribbon,
		appendTrailPoint,
		bindPlayerIdAtRouteStart,
		resolvePitchToken,
		updateRadialHover: radial.updateRadialHover,
		cancelRadialLongPress: radial.cancelRadialLongPress,
		tryConsumeRadialPointerUp: radial.tryConsumeRadialPointerUp,
		radialLongPressOrigin: radial.radialLongPressOrigin,
		setRadialLongPressOrigin: radial.setRadialLongPressOrigin,
		radialLongPressTimer: radial.radialLongPressTimer,
		setRadialLongPressTimer: radial.setRadialLongPressTimer,
		openRadialHub: radial.openRadialHub,
		radialBlocking: radial.radialBlocking,
		teardownAnchorDrag,
		routeBodyCapture,
		pitchDragCapture,
		get pitchSvgEl() { return pitchSvgEl; },
	};

	const input = createTacticalInputEngine(pointerHost);

	function loadCartridge(payload: TacticalCartridge) {
		teardownAnchorDrag();
		routeBodyDrag = null;
		input.releaseRouteBodyCapture();
		input.releasePitchDragCapture();
		draggingPlayer = null;
		activeDragTrail = [];
		selectedRouteId = null;
		focusedPlayerId = null;
		hoveredDiscId = null;
		hoveredRouteId = null;
		routingActive = false;
		routeDraft = null;
		radial.closeRadialHub();

		const friendly: TacticalToken[] = [];
		const opp: TacticalToken[] = [];
		for (const e of payload.entities) {
			const side = e.side === 'opponent' ? 'opponent' : 'friendly';
			const token: TacticalToken = {
				...e,
				side,
				color: e.color ?? (side === 'opponent' ? OPP_RING : FRIENDLY_RING),
			};
			if (side === 'opponent') opp.push(token);
			else friendly.push(token);
		}
		host.wrBucketPitch.set(friendly);
		host.wrOppPitch.set(opp);
		host.drawnRoutes.set(payload.routes.map((raw) => ({ ...normalizeRoute(raw) })));
		host.wrBucketXi.set([]);
		host.wrBucketBench.set([]);

		simulator.loadCartridge(payload);
		capturePlaybackBaseline();
	}

	function serializeToCartridge(): TacticalCartridge {
		const entities: TacticalToken[] = [
			...host.wrBucketPitch.get().map((t) => ({ ...t, side: 'friendly' as const })),
			...host.wrOppPitch.get().map((t) => ({ ...t, side: 'opponent' as const })),
		];
		return {
			id: crypto.randomUUID(),
			title: `Play ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
			schemaVersion: TACTICAL_CARTRIDGE_SCHEMA_VERSION,
			metadata: { sport: 'soccer', duration: simulator.maxDuration, tags: [] },
			entities,
			routes: routesLive,
		};
	}

	setContext(WAR_ROOM_CARTRIDGE_CONTEXT, { loadCartridge });

	function onPitchContextMenu(ev: Event) {
		ev.preventDefault();
		if (host.warRoomTool.get() !== 'DRAG' || anchorDrag) return;
		radial.openRadialHub(ev as PointerEvent, null, true);
	}

	/** Token right-click: suppress native menu and open deploy radial (same rules as pitch context menu). */
	function onTokenContextMenu(ev: MouseEvent, player: TacticalToken) {
		ev.preventDefault();
		ev.stopPropagation();
		if (host.warRoomTool.get() !== 'DRAG' || anchorDrag) return;
		focusedPlayerId = player.id;
		radial.openRadialHub(ev, null, true);
	}

	function onPitchPointerUpClearLongPress() {
		radial.cancelRadialLongPress();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		e.preventDefault();
		if (radial.radialBlocking()) {
			radial.closeRadialHub();
			return;
		}
		closeOverlay();
	}

	function resolvePitchToken(player: TacticalToken) {
		const id = player.id;
		return (
			host.wrBucketPitch.get().find((t) => t.id === id) ??
			host.wrOppPitch.get().find((t) => t.id === id) ??
			player
		);
	}

	function showAnchorsFor(routeId: string) {
		return selectedRouteId === routeId || hoveredRouteId === routeId;
	}

	function deleteRoute(routeId: string) {
		host.drawnRoutes.set(
			host.drawnRoutes.get().filter((raw) => {
				const r = normalizeRoute(raw);
				return r.id !== routeId;
			}),
		);
		if (selectedRouteId === routeId) selectedRouteId = null;
	}

	/** Rewind timeline and restore pitch token x/y from last captured baseline. */
	function resetPositions() {
		simulator.pause();
		simulator.scrub(0);
		simRouteHoldPrev.clear();
		activeDragTrail = [];
		draggingPlayer = null;
		teardownAnchorDrag();
		routeBodyDrag = null;
		input.releaseRouteBodyCapture();
		input.releasePitchDragCapture();
		if (playbackBaselinePitch.length === 0 && playbackBaselineOpp.length === 0) return;
		const byIdPitch = new Map(playbackBaselinePitch.map((t) => [t.id, t]));
		const byIdOpp = new Map(playbackBaselineOpp.map((t) => [t.id, t]));
		host.wrBucketPitch.set(
			host.wrBucketPitch.get().map((t) => {
				const b = byIdPitch.get(t.id);
				return b ? { ...t, x: b.x, y: b.y } : t;
			}),
		);
		host.wrOppPitch.set(
			host.wrOppPitch.get().map((t) => {
				const b = byIdOpp.get(t.id);
				return b ? { ...t, x: b.x, y: b.y } : t;
			}),
		);
	}

	/** Monospace-friendly scrub clock (ms). */
	function formatTimelineMs(ms: number) {
		const s = Math.max(0, ms / 1000);
		const m = Math.floor(s / 60);
		const r = s % 60;
		if (m > 0) return `${m}:${r.toFixed(2).padStart(5, '0')}`;
		return `${r.toFixed(2)}s`;
	}

	function toggleTimelinePlayback() {
		simulator.togglePlay();
	}

	function scrubTimelineNorm(norm: number) {
		const n = Math.max(0, Math.min(1, norm));
		simulator.scrub(n * simulator.maxDuration);
	}

	/** Active war-room tool — single source via host bindable. */
	const activeTool = $derived(host.warRoomTool.get());

	function setActiveTool(t: 'DRAG' | 'ROUTE') {
		host.warRoomTool.set(t);
	}

	// ── Tactical Readout cursor tracking ────────────────────────────────────
	let cursorSvgX = $state(0);
	let cursorSvgY = $state(0);

	// ── Radial Context Menu (right-click summon) ────────────────────────────
	let contextMenuOpen = $state(false);
	let contextMenuClientX = $state(0);
	let contextMenuClientY = $state(0);
	let contextMenuTargetId = $state<string | null>(null);

	function openMenu(clientX: number, clientY: number, targetId: string | null = null) {
		contextMenuClientX = clientX;
		contextMenuClientY = clientY;
		contextMenuTargetId = targetId;
		contextMenuOpen = true;
	}

	function closeMenu() {
		contextMenuOpen = false;
		contextMenuTargetId = null;
	}

	/** Public pointer façade (Arena + window forward here). */
	function handlePointerMove(e: PointerEvent) {
		const p = clientToSvg(e);
		cursorSvgX = p.x;
		cursorSvgY = p.y;
		input.handlePointerMove(e);
	}

	function handlePointerUp(e: PointerEvent) {
		input.handlePointerUp(e);
	}

	function handlePointerCancel(e: PointerEvent) {
		input.handlePointerUp(e);
	}

	function handlePointerDown(e: PointerEvent, _context?: unknown) {
		input.onPitchPointerDown(e);
	}

	return {
		// ── bind:-compatible reactive properties ─────────────────────────────
		// Plain shorthand `{ pitchSvgEl }` copies the value at call time; child
		// writes via bind: would update the model object but never reach the
		// $state signal.  Explicit get/set pairs close that loop.
		get pitchSvgEl() { return pitchSvgEl; },
		set pitchSvgEl(v: SVGSVGElement | undefined) { pitchSvgEl = v; },
		get activeRouteColor() { return activeRouteColor; },
		set activeRouteColor(v: string) { activeRouteColor = v; },
		get routeDrawKind() { return routeDrawKind; },
		set routeDrawKind(v: 'curve' | 'cut') { routeDrawKind = v; },
		get showLabels() { return showLabels; },
		set showLabels(v: boolean) { showLabels = v; },
		get focusedPlayerId() { return focusedPlayerId; },
		set focusedPlayerId(v: string | null) { focusedPlayerId = v; },
		get isDrawerOpen() { return isDrawerOpen; },
		set isDrawerOpen(v: boolean) { isDrawerOpen = v; },
		// ── Reactive getters — $state/$derived must be exposed via get so that
		// Svelte 5 component templates can track the underlying signal.
		// Plain shorthand `{ routingActive }` copies the initial value and breaks reactivity.
		get allPitchTokens() { return allPitchTokens; },
		get kineticPitchTokens() { return kineticPitchTokens; },
		get timelineNorm() { return timelineNorm; },
		get activeTool() { return activeTool; },
		get draggingPlayer() { return draggingPlayer; },
		get activeDragTrail() { return activeDragTrail; },
		get trailString() { return trailString; },
		get dragTrailBloomColor() { return dragTrailBloomColor; },
		get routingActive() { return routingActive; },
		get routeDraft() { return routeDraft; },
		get hoveredDiscId() { return hoveredDiscId; },
		get selectedRouteId() { return selectedRouteId; },
		get routesLive() { return routesLive; },
		get canPlay() { return canPlay; },
		get allRouteMarkerColors() { return allRouteMarkerColors; },
		get simChargePlayerIds() { return simChargePlayerIds; },
		// ── Stable function references (no getter needed) ────────────────────
		formatTimelineMs,
		toggleTimelinePlayback,
		scrubTimelineNorm,
		setActiveTool,
		handlePointerMove,
		handlePointerUp,
		handlePointerCancel,
		handlePointerDown,
		simulator,
		input,
		radial,
		routePathD,
		bumpRouteDelay,
		closeOverlay,
		handleSvgClick,
		handleKeyDown,
		onPitchContextMenu,
		onTokenContextMenu,
		onPitchPointerUpClearLongPress,
		recallBench,
		clearRoutesOnly,
		serializeToCartridge,
		ringColor,
		resolvePitchToken,
		showAnchorsFor,
		deleteRoute,
		resetPositions,
		setHoveredRouteId: (id: string | null) => (hoveredRouteId = id),
		setHoveredDiscId: (id: string | null) => (hoveredDiscId = id),
		setFocusedPlayerId: (id: string | null) => (focusedPlayerId = id),
		// Tactical Readout — live cursor coords in SVG/viewBox space.
		get cursorSvgX() { return cursorSvgX; },
		get cursorSvgY() { return cursorSvgY; },
		get viewBoxWidth() { return viewBoxWidth; },
		get viewBoxHeight() { return viewBoxHeight; },
		clientToSvg,
		// Radial context menu state + API (right-click summon).
		get contextMenuOpen() { return contextMenuOpen; },
		get contextMenuClientX() { return contextMenuClientX; },
		get contextMenuClientY() { return contextMenuClientY; },
		get contextMenuTargetId() { return contextMenuTargetId; },
		openMenu,
		closeMenu,
	};
}
