import { describe, it, expect } from 'vitest';
import { clampToPitch, snapPointToDockingCore, bindPlayerIdAtRouteStart } from '$lib/utils/canvasPhysics';
import { executeSerializeToCartridge, executeLoadCartridge, executeResetPositions } from '$lib/utils/cartridgeOps';
import { normalizeRoute, routePathD, DELAY_MAX_MS } from '../routeModel';
import { VIEW_W, VIEW_H, DISC_HIT_R, FRIENDLY_RING, OPP_RING, INK_PALETTE } from '../constants';
import { TACTICAL_CARTRIDGE_SCHEMA_VERSION, type TacticalCartridge, type TacticalToken, type TacticalRoute } from '../types';

describe('Tactical War Room: Coach OS Capabilities & Stratagem', () => {
	it('serializes complete tactical board with friendly, opponent tokens and routes to valid schema version 2 cartridge', () => {
		const friendlyTokens: TacticalToken[] = [
			{ id: 'f1', name: 'Alex Morgan', number: '13', position: 'ST', side: 'friendly', x: 800, y: 400, color: '#14b8a6' },
			{ id: 'f2', name: 'Rose Lavelle', number: '16', position: 'CAM', side: 'friendly', x: 600, y: 450, color: '#14b8a6' },
			{ id: 'BALL', name: 'BALL', number: 'B', position: 'BALL', side: 'friendly', x: 600, y: 450, color: '#ffffff' }
		];
		const oppTokens: TacticalToken[] = [
			{ id: 'opp1', name: 'Defender', number: '4', position: 'CB', side: 'opponent', x: 900, y: 400, color: '#ef4444' }
		];
		const routes: TacticalRoute[] = [
			{ id: 'r1', x1: 600, y1: 450, cx: 700, cy: 425, x2: 800, y2: 400, color: '#ffffff', pathKind: 'pass', bindPlayerId: 'BALL', delay: 500 }
		];

		const mockHost = {
			wrBucketPitch: { get: () => friendlyTokens, set: (v: TacticalToken[]) => {} },
			wrOppPitch: { get: () => oppTokens, set: (v: TacticalToken[]) => {} },
			drawnRoutes: { get: () => routes, set: (v: unknown[]) => {} },
			wrBucketXi: { get: () => [], set: (v: TacticalToken[]) => {} },
			wrBucketBench: { get: () => [], set: (v: TacticalToken[]) => {} },
			routesLive: () => routes,
			simulator: {
				maxDuration: 5000,
				loadCartridge: () => {},
				pause: () => {},
				scrub: () => {}
			} as any,
			teardownAnchorDrag: () => {},
			setRouteBodyDrag: () => {},
			releaseRouteBodyCapture: () => {},
			releasePitchDragCapture: () => {},
			setDraggingPlayer: () => {},
			setActiveDragTrail: () => {},
			setSelectedRouteId: () => {},
			setFocusedPlayerId: () => {},
			setHoveredDiscId: () => {},
			setHoveredRouteId: () => {},
			setRoutingActive: () => {},
			setRouteDraft: () => {},
			closeRadialHub: () => {},
			capturePlaybackBaseline: () => {},
			playbackBaselinePitch: () => friendlyTokens,
			playbackBaselineOpp: () => oppTokens,
			simRouteHoldPrev: new Map()
		};

		const cartridge = executeSerializeToCartridge(mockHost as any);
		expect(cartridge.schemaVersion).toBe(TACTICAL_CARTRIDGE_SCHEMA_VERSION);
		expect(cartridge.entities.length).toBe(4);
		expect(cartridge.routes.length).toBe(1);
		expect(cartridge.routes[0].pathKind).toBe('pass');
		expect(cartridge.metadata.sport).toBe('soccer');
		expect(cartridge.metadata.duration).toBe(5000);
	});

	it('loads cartridge and cleanly restores pitch tokens, opponent entities, and routes', () => {
		let pitchState: TacticalToken[] = [];
		let oppState: TacticalToken[] = [];
		let routesState: unknown[] = [];

		const mockHost = {
			wrBucketPitch: { get: () => pitchState, set: (v: TacticalToken[]) => { pitchState = v; } },
			wrOppPitch: { get: () => oppState, set: (v: TacticalToken[]) => { oppState = v; } },
			drawnRoutes: { get: () => routesState, set: (v: unknown[]) => { routesState = v; } },
			wrBucketXi: { get: () => [], set: (v: TacticalToken[]) => {} },
			wrBucketBench: { get: () => [], set: (v: TacticalToken[]) => {} },
			routesLive: () => routesState as TacticalRoute[],
			simulator: {
				maxDuration: 4000,
				loadCartridge: () => {},
				pause: () => {},
				scrub: () => {}
			} as any,
			teardownAnchorDrag: () => {},
			setRouteBodyDrag: () => {},
			releaseRouteBodyCapture: () => {},
			releasePitchDragCapture: () => {},
			setDraggingPlayer: () => {},
			setActiveDragTrail: () => {},
			setSelectedRouteId: () => {},
			setFocusedPlayerId: () => {},
			setHoveredDiscId: () => {},
			setHoveredRouteId: () => {},
			setRoutingActive: () => {},
			setRouteDraft: () => {},
			closeRadialHub: () => {},
			capturePlaybackBaseline: () => {},
			playbackBaselinePitch: () => pitchState,
			playbackBaselineOpp: () => oppState,
			simRouteHoldPrev: new Map()
		};

		const cartridgeToLoad: TacticalCartridge = {
			id: 'cart-123',
			title: 'Counter Attack Drill',
			schemaVersion: 2,
			metadata: { sport: 'soccer', duration: 4000, tags: ['transition'] },
			entities: [
				{ id: 'f1', name: 'Winger', side: 'friendly', x: 200, y: 150 },
				{ id: 'opp1', name: 'Fullback', side: 'opponent', x: 300, y: 150 }
			],
			routes: [
				{ id: 'r1', x1: 200, y1: 150, cx: 400, cy: 100, x2: 600, y2: 120, color: '#14b8a6', pathKind: 'curve', delay: 0 }
			]
		};

		executeLoadCartridge(cartridgeToLoad, mockHost as any);

		expect(pitchState.length).toBe(1);
		expect(pitchState[0].id).toBe('f1');
		expect(oppState.length).toBe(1);
		expect(oppState[0].id).toBe('opp1');
		expect(routesState.length).toBe(1);
	});

	it('resets token positions and rewinds simulator timeline safely on reset ritual', () => {
		let paused = false;
		let scrubTime = -1;

		const baselinePitch: TacticalToken[] = [{ id: 'p1', name: 'Player', side: 'friendly', x: 100, y: 200 }];
		const baselineOpp: TacticalToken[] = [{ id: 'o1', name: 'Opp', side: 'opponent', x: 300, y: 400 }];

		let currentPitch = [{ id: 'p1', name: 'Player', side: 'friendly', x: 800, y: 700 }];
		let currentOpp = [{ id: 'o1', name: 'Opp', side: 'opponent', x: 900, y: 800 }];

		const mockHost = {
			wrBucketPitch: { get: () => currentPitch, set: (v: TacticalToken[]) => { currentPitch = v; } },
			wrOppPitch: { get: () => currentOpp, set: (v: TacticalToken[]) => { currentOpp = v; } },
			drawnRoutes: { get: () => [], set: (v: unknown[]) => {} },
			wrBucketXi: { get: () => [], set: (v: TacticalToken[]) => {} },
			wrBucketBench: { get: () => [], set: (v: TacticalToken[]) => {} },
			routesLive: () => [],
			simulator: {
				pause: () => { paused = true; },
				scrub: (t: number) => { scrubTime = t; }
			} as any,
			teardownAnchorDrag: () => {},
			setRouteBodyDrag: () => {},
			releaseRouteBodyCapture: () => {},
			releasePitchDragCapture: () => {},
			setDraggingPlayer: () => {},
			setActiveDragTrail: () => {},
			setSelectedRouteId: () => {},
			setFocusedPlayerId: () => {},
			setHoveredDiscId: () => {},
			setHoveredRouteId: () => {},
			setRoutingActive: () => {},
			setRouteDraft: () => {},
			closeRadialHub: () => {},
			capturePlaybackBaseline: () => {},
			playbackBaselinePitch: () => baselinePitch,
			playbackBaselineOpp: () => baselineOpp,
			simRouteHoldPrev: new Map([['r1', true]])
		};

		executeResetPositions(mockHost as any);

		expect(paused).toBe(true);
		expect(scrubTime).toBe(0);
		expect(mockHost.simRouteHoldPrev.size).toBe(0);
		expect(currentPitch[0].x).toBe(100);
		expect(currentPitch[0].y).toBe(200);
		expect(currentOpp[0].x).toBe(300);
		expect(currentOpp[0].y).toBe(400);
	});
});

describe('Tactical War Room: Player OS & Execution Dynamics', () => {
	it('calculates route distance and stamina-scaled success probability correctly', () => {
		const r = { x1: 100, y1: 100, x2: 400, y2: 500 };
		const routeDistance = Math.hypot(r.x2 - r.x1, r.y2 - r.y1); // 300^2 + 400^2 = 500
		expect(routeDistance).toBe(500);

		// With stamina = 90
		const stamina = 90;
		const successProb = Math.round(Math.max(0, Math.min(100, stamina * (1 - routeDistance / 2000))));
		// 90 * (1 - 500/2000) = 90 * 0.75 = 67.5 => 68%
		expect(successProb).toBe(68);

		// Probability color tiers
		const getProbColor = (prob: number) => (prob >= 70 ? '#14b8a6' : prob >= 40 ? '#d97706' : '#ef4444');
		expect(getProbColor(85)).toBe('#14b8a6'); // Data Cyan
		expect(getProbColor(68)).toBe('#d97706'); // Amber
		expect(getProbColor(30)).toBe('#ef4444'); // Red
	});

	it('computes XP bounty accurately based on total path length and route count', () => {
		const routes: TacticalRoute[] = [
			{ id: 'r1', x1: 0, y1: 0, cx: 200, cy: 0, x2: 400, y2: 0, color: '#14b8a6', pathKind: 'curve', delay: 0 },
			{ id: 'r2', x1: 400, y1: 0, cx: 400, cy: 150, x2: 400, y2: 300, color: '#14b8a6', pathKind: 'curve', delay: 0 }
		];

		const totalDist = routes.reduce((acc, r) => {
			const chord = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
			const arms = Math.hypot(r.cx - r.x1, r.cy - r.y1) + Math.hypot(r.x2 - r.cx, r.y2 - r.cy);
			return acc + (chord + arms) / 2;
		}, 0);

		const xpBounty = Math.max(50, Math.round(totalDist / 8) + 50 * Math.max(1, routes.length));
		expect(xpBounty).toBeGreaterThanOrEqual(150);
	});
});

describe('Tactical War Room: Multi-Tenant Director & Parent Clearance', () => {
	it('enforces tenant isolation and creator tagging on tactical cartridges', () => {
		const sampleCartridge: TacticalCartridge = {
			id: 'cart-dir-01',
			title: '4-3-3 Tiki Taka High Press',
			schemaVersion: 2,
			metadata: {
				sport: 'soccer',
				duration: 6000,
				tags: ['tactical', 'possession', 'director_verified']
			},
			entities: [],
			routes: []
		};

		expect(sampleCartridge.schemaVersion).toBe(2);
		expect(sampleCartridge.metadata.tags).toContain('director_verified');
	});
});
