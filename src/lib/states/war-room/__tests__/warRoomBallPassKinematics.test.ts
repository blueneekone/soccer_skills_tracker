import { describe, it, expect } from 'vitest';
import { normalizeRoute, routePathD, midCtrl, DELAY_MAX_MS } from '../routeModel';
import { VIEW_W, VIEW_H, DISC_HIT_R } from '../constants';
import { clampToPitch, snapPointToDockingCore, bindPlayerIdAtRouteStart } from '$lib/utils/canvasPhysics';
import { executePointerDown, executePointerMove, executePointerUp } from '$lib/utils/tacticalInputHandlers';
import type { TacticalPointerHost } from '../TacticalInputEngine.svelte';
import type { TacticalToken, TacticalRoute } from '../types';

describe('War Room Ball Pass & Route Kinematics (Microscopic Math & Physics)', () => {
	it('normalizeRoute normalizes cut, curve, and pass routes with finite coordinates and clamped delay', () => {
		const rawPass = {
			id: 'route-pass-1',
			x1: '100',
			y1: '200',
			x2: '500',
			y2: '600',
			pathKind: 'pass',
			delay: 1500,
			color: '#ffffff',
			bindPlayerId: 'BALL'
		};

		const normalized = normalizeRoute(rawPass);
		expect(normalized.id).toBe('route-pass-1');
		expect(normalized.x1).toBe(100);
		expect(normalized.y1).toBe(200);
		expect(normalized.x2).toBe(500);
		expect(normalized.y2).toBe(600);
		expect(normalized.cx).toBe(300); // mid-point fallback: (100 + 500) / 2
		expect(normalized.cy).toBe(400); // (200 + 600) / 2
		expect(normalized.pathKind).toBe('pass');
		expect(normalized.delay).toBe(1500);
		expect(normalized.bindPlayerId).toBe('BALL');

		// Clamping out-of-range delay
		const overDelay = normalizeRoute({ ...rawPass, delay: 999999 });
		expect(overDelay.delay).toBe(DELAY_MAX_MS);

		const underDelay = normalizeRoute({ ...rawPass, delay: -500 });
		expect(underDelay.delay).toBe(0);
	});

	it('routePathD renders precise quadratic bezier for pass/curve and polygonal segments for cut', () => {
		const passRoute: TacticalRoute = {
			id: 'r-pass',
			x1: 100,
			y1: 100,
			cx: 200,
			cy: 150,
			x2: 300,
			y2: 200,
			color: '#ffffff',
			pathKind: 'pass',
			delay: 0
		};
		expect(routePathD(passRoute)).toBe('M 100 100 L 200 150 L 300 200');

		const cutRoute: TacticalRoute = {
			...passRoute,
			pathKind: 'cut'
		};
		expect(routePathD(cutRoute)).toBe('M 100 100 L 200 150 L 300 200');
	});

	it('midCtrl correctly calculates midpoint anchor coordinates', () => {
		const mc = midCtrl(200, 100, 600, 500);
		expect(mc.cx).toBe(400);
		expect(mc.cy).toBe(300);
	});

	it('clampToPitch enforces pitch padding boundaries strictly within 1600x900', () => {
		const pad = DISC_HIT_R + 6;
		const oobTopLeft = clampToPitch(-100, -50);
		expect(oobTopLeft.x).toBe(pad);
		expect(oobTopLeft.y).toBe(pad);

		const oobBottomRight = clampToPitch(2000, 1200);
		expect(oobBottomRight.x).toBe(VIEW_W - pad);
		expect(oobBottomRight.y).toBe(VIEW_H - pad);

		const inside = clampToPitch(800, 450);
		expect(inside.x).toBe(800);
		expect(inside.y).toBe(450);
	});

	it('snapPointToDockingCore snaps coordinates to closest token within dock radius (25px)', () => {
		const tokens: TacticalToken[] = [
			{ id: 'p1', name: 'Player 1', side: 'friendly', x: 200, y: 300 },
			{ id: 'p2', name: 'Player 2', side: 'friendly', x: 500, y: 400 }
		];

		// Near p1 (dist = 10 <= 25)
		const snapNearP1 = snapPointToDockingCore(206, 308, tokens);
		expect(snapNearP1.bindPlayerId).toBe('p1');
		expect(snapNearP1.x).toBe(200);
		expect(snapNearP1.y).toBe(300);

		// Far from any token (dist > 25)
		const noSnap = snapPointToDockingCore(350, 350, tokens);
		expect(noSnap.bindPlayerId).toBeNull();
		expect(noSnap.x).toBe(350);
		expect(noSnap.y).toBe(350);
	});

	it('bindPlayerIdAtRouteStart binds to closest token at route origin', () => {
		const tokens: TacticalToken[] = [
			{ id: 'striker', name: 'Striker', side: 'friendly', x: 400, y: 500 }
		];

		expect(bindPlayerIdAtRouteStart(405, 505, tokens)).toBe('striker');
		expect(bindPlayerIdAtRouteStart(600, 700, tokens)).toBeNull();
	});
});

describe('War Room Ball Pass Workflow & Multi-Pass Chaining', () => {
	function createMockPointerHost(initialPitch: TacticalToken[] = []): TacticalPointerHost & {
		drawnRoutesList: unknown[];
		pitchTokens: TacticalToken[];
		oppTokens: TacticalToken[];
		draft: TacticalRoute | null;
		activeTool: 'DRAG' | 'ROUTE';
		drawKind: 'curve' | 'cut' | 'pass';
	} {
		let drawnRoutesList: unknown[] = [];
		let pitchTokens: TacticalToken[] = [...initialPitch];
		let oppTokens: TacticalToken[] = [];
		let draft: TacticalRoute | null = null;
		let routingActiveState = false;
		let activeTool: 'DRAG' | 'ROUTE' = 'ROUTE';
		let drawKind: 'curve' | 'cut' | 'pass' = 'pass';
		let selectedRouteIdState: string | null = null;

		return {
			drawnRoutesList,
			pitchTokens,
			oppTokens,
			draft,
			activeTool,
			drawKind,
			svg: () => undefined,
			warRoomTool: () => activeTool,
			clientToSvg: (ev) => {
				const pe = ev as MouseEvent;
				return { x: pe.clientX, y: pe.clientY };
			},
			clampToPitch: (x, y) => clampToPitch(x, y),
			anchorDrag: () => null,
			setAnchorDrag: () => {},
			routeBodyDrag: () => null,
			setRouteBodyDrag: () => {},
			draggingPlayer: () => null,
			setDraggingPlayer: () => {},
			routingActive: () => routingActiveState,
			setRoutingActive: (v) => { routingActiveState = v; },
			routeDraft: () => draft,
			setRouteDraft: (v) => { draft = v; },
			drawnRoutes: () => drawnRoutesList,
			setDrawnRoutes: (v) => { drawnRoutesList = v; },
			wrBucketPitch: () => pitchTokens,
			setWrBucketPitch: (v) => { pitchTokens = v; },
			wrOppPitch: () => oppTokens,
			setWrOppPitch: (v) => { oppTokens = v; },
			activeDragTrail: () => [],
			setActiveDragTrail: () => {},
			activeRouteColor: () => '#ffffff',
			routeDrawKind: () => drawKind,
			selectedRouteId: () => selectedRouteIdState,
			setSelectedRouteId: (v) => { selectedRouteIdState = v; },
			ribbon: { value: '#14b8a6' },
			appendTrailPoint: () => {},
			bindPlayerIdAtRouteStart: (x1, y1) => bindPlayerIdAtRouteStart(x1, y1, pitchTokens),
			resolvePitchToken: (p) => p,
			updateRadialHover: () => {},
			cancelRadialLongPress: () => {},
			tryConsumeRadialPointerUp: () => false,
			radialLongPressOrigin: () => null,
			setRadialLongPressOrigin: () => {},
			radialLongPressTimer: () => null,
			setRadialLongPressTimer: () => {},
			openRadialHub: () => {},
			radialBlocking: () => false,
			teardownAnchorDrag: () => {},
			routeBodyCapture: { el: null, id: null },
			pitchDragCapture: { el: null, id: null },
			pitchSvgEl: undefined
		};
	}

	it('drawing a Ball Pass route automatically provisions BALL token and binds pass trajectory', () => {
		const host = createMockPointerHost([
			{ id: 'midfielder_1', name: 'Midfielder', side: 'friendly', x: 200, y: 300 },
			{ id: 'winger_1', name: 'Winger', side: 'friendly', x: 600, y: 300 }
		]);

		host.activeTool = 'ROUTE';
		host.drawKind = 'pass';

		// 1. Pointer Down near Midfielder (200, 300)
		const downEv = { clientX: 200, clientY: 300, target: null } as unknown as PointerEvent;
		executePointerDown(downEv, host);

		expect(host.routingActive()).toBe(true);
		expect(host.routeDraft()).not.toBeNull();
		expect(host.routeDraft()?.pathKind).toBe('pass');

		// 2. Pointer Move to simulate dragging to Winger (600, 300)
		const moveEv = { clientX: 600, clientY: 300 } as unknown as PointerEvent;
		executePointerMove(moveEv, host);

		// 3. Pointer Up near Winger (600, 300)
		const upEv = { clientX: 600, clientY: 300 } as unknown as PointerEvent;
		executePointerUp(upEv, host, () => {}, () => {}, null);

		expect(host.routingActive()).toBe(false);
		expect(host.drawnRoutes().length).toBe(1);

		const createdRoute = host.drawnRoutes()[0] as TacticalRoute;
		expect(createdRoute.pathKind).toBe('pass');
		expect(createdRoute.bindPlayerId).toBe('BALL');
		expect(createdRoute.x1).toBe(200);
		expect(createdRoute.y1).toBe(300);
		expect(createdRoute.x2).toBe(600);
		expect(createdRoute.y2).toBe(300);

		// Check that BALL token was created in wrBucketPitch
		const ball = host.wrBucketPitch().find((t) => t.id === 'BALL');
		expect(ball).toBeDefined();
		expect(ball?.name).toBe('BALL');
		expect(ball?.x).toBe(200);
		expect(ball?.y).toBe(300);
	});

	it('supports chaining consecutive ball passes across multiple players', () => {
		const host = createMockPointerHost([
			{ id: 'p_cb', name: 'Center Back', side: 'friendly', x: 200, y: 500 },
			{ id: 'p_cm', name: 'Central Mid', side: 'friendly', x: 500, y: 500 },
			{ id: 'p_st', name: 'Striker', side: 'friendly', x: 900, y: 500 }
		]);

		host.activeTool = 'ROUTE';
		host.drawKind = 'pass';

		// Pass 1: CB -> CM
		executePointerDown({ clientX: 200, clientY: 500, target: null } as unknown as PointerEvent, host);
		executePointerUp({ clientX: 500, clientY: 500 } as unknown as PointerEvent, host, () => {}, () => {}, null);

		expect(host.drawnRoutes().length).toBe(1);

		// Pass 2: CM -> ST
		executePointerDown({ clientX: 500, clientY: 500, target: null } as unknown as PointerEvent, host);
		executePointerUp({ clientX: 900, clientY: 500 } as unknown as PointerEvent, host, () => {}, () => {}, null);

		expect(host.drawnRoutes().length).toBe(2);

		const [pass1, pass2] = host.drawnRoutes() as TacticalRoute[];
		expect(pass1.pathKind).toBe('pass');
		expect(pass2.pathKind).toBe('pass');
		expect(pass1.x2).toBe(500);
		expect(pass2.x1).toBe(500);
		expect(pass2.x2).toBe(900);
	});

	it('applyPassRouteKinematics moves player and ball together to pivot before ball releases', async () => {
		const { applyPassRouteKinematics } = await import('../routeModel');
		const passer: TacticalToken = { id: 'p1', name: 'Passer', side: 'friendly', x: 100, y: 100 };
		const ball: TacticalToken = { id: 'BALL', name: 'BALL', side: 'friendly', x: 100, y: 100 };
		const tokens = [passer, ball];

		const passRoute: TacticalRoute = {
			id: 'pr-1',
			x1: 100,
			y1: 100,
			cx: 200, // Pivot Point at (200, 100)
			cy: 100,
			x2: 300, // Destination at (300, 100)
			y2: 100,
			color: '#ffffff',
			pathKind: 'pass',
			attachedPlayerId: 'p1',
			bindPlayerId: 'BALL',
			delay: 0,
		};

		// 1. Mid-way to pivot point (t = 25% of total route)
		const map1 = new Map<string, TacticalToken>([
			['p1', { ...passer }],
			['BALL', { ...ball }],
		]);
		applyPassRouteKinematics(map1, [passRoute], tokens, 2.5, 10, null);
		const p1AtRun = map1.get('p1')!;
		const ballAtRun = map1.get('BALL')!;
		// Split is at 50% (d1 = 100, d2 = 100). At t=2.5/10 (u=0.25), player is at sub = 0.25/0.5 = 0.5 -> x = 150
		expect(p1AtRun.x).toBe(150);
		// Ball MUST stay locked to the running player's position!
		expect(ballAtRun.x).toBe(150);

		// 2. Beyond pivot point (t = 75% of total route)
		const map2 = new Map<string, TacticalToken>([
			['p1', { ...passer }],
			['BALL', { ...ball }],
		]);
		applyPassRouteKinematics(map2, [passRoute], tokens, 7.5, 10, null);
		const p1AtRelease = map2.get('p1')!;
		const ballAtRelease = map2.get('BALL')!;
		// Player has reached and remains at pivot point (200, 100)
		expect(p1AtRelease.x).toBe(200);
		// Ball has been released and traversed half of segment 2 -> sub = (0.75 - 0.5)/0.5 = 0.5 -> x = 250
		expect(ballAtRelease.x).toBe(250);
	});

	it('clearPitch wipes friendly tokens, opponent tokens, drawn routes, and simulator timeline', async () => {
		const { clearPitch } = await import('../tacticalWarRoomApi');
		let pitch = [{ id: 'p1', side: 'friendly' }, { id: 'BALL', side: 'friendly' }];
		let opp = [{ id: 'opp1', side: 'opponent' }];
		let bench = [{ id: 'bench1', side: 'friendly' }];
		let routes = [{ id: 'r1' }];
		let simCleared = false;

		const host: any = {
			wrBucketPitch: { get: () => pitch, set: (v: any) => { pitch = v; } },
			wrOppPitch: { get: () => opp, set: (v: any) => { opp = v; } },
			wrBucketBench: { get: () => bench, set: (v: any) => { bench = v; } },
			drawnRoutes: { get: () => routes, set: (v: any) => { routes = v; } },
		};
		const simulator = { clearSim: () => { simCleared = true; } };

		clearPitch(host, simulator);

		expect(pitch).toEqual([]);
		expect(opp).toEqual([]);
		expect(routes).toEqual([]);
		expect(simCleared).toBe(true);
		expect(bench.some((b: any) => b.id === 'p1')).toBe(true);
	});
});

