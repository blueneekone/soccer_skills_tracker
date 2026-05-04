import { setContext } from 'svelte';
import { SimulatorEngine } from '$lib/states/SimulatorEngine.svelte';
import { normalizeRoute, routePathD, DELAY_MAX_MS } from '$lib/states/war-room/routeModel';
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
import { WAR_ROOM_CARTRIDGE_CONTEXT } from '$lib/states/war-room/types';
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
	let isHolotableMode = $state(false);

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

	const allRouteMarkerColors = $derived.by(() => {
		const s = new Set<string>([...INK_PALETTE]);
		for (const raw of host.drawnRoutes.get()) {
			s.add(normalizeRoute(raw).color);
		}
		return [...s];
	});

	function clientToSvg(ev: MouseEvent | TouchEvent | PointerEvent) {
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
	}

	setContext(WAR_ROOM_CARTRIDGE_CONTEXT, { loadCartridge });

	function onPitchContextMenu(ev: Event) {
		ev.preventDefault();
		if (host.warRoomTool.get() !== 'DRAG' || anchorDrag) return;
		radial.openRadialHub(ev as PointerEvent, null, true);
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

	return {
		pitchSvgEl,
		activeRouteColor,
		routeDrawKind,
		showLabels,
		focusedPlayerId,
		isHolotableMode,
		allPitchTokens,
		draggingPlayer,
		activeDragTrail,
		trailString,
		dragTrailBloomColor,
		routingActive,
		routeDraft,
		hoveredDiscId,
		selectedRouteId,
		routesLive,
		allRouteMarkerColors,
		simulator,
		input,
		radial,
		routePathD,
		bumpRouteDelay,
		closeOverlay,
		handleSvgClick,
		handleKeyDown,
		onPitchContextMenu,
		onPitchPointerUpClearLongPress,
		recallBench,
		clearRoutesOnly,
		ringColor,
		resolvePitchToken,
		showAnchorsFor,
		simChargePlayerIds,
		setHoveredRouteId: (id: string | null) => (hoveredRouteId = id),
		setHoveredDiscId: (id: string | null) => (hoveredDiscId = id),
		setFocusedPlayerId: (id: string | null) => (focusedPlayerId = id),
	};
}
