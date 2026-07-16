import { OPP_RING, FRIENDLY_RING } from '$lib/states/war-room/constants';
import { normalizeRoute } from '$lib/states/war-room/routeModel';
import { TACTICAL_CARTRIDGE_SCHEMA_VERSION } from '$lib/states/war-room/types';
import type { TacticalCartridge, TacticalToken, TacticalRoute } from '$lib/states/war-room/types';
import type { SimulatorEngine } from '$lib/states/SimulatorEngine.svelte';

export interface CartridgeOpsHost {
	wrBucketPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	wrOppPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	drawnRoutes: { get: () => unknown[]; set: (v: unknown[]) => void };
	wrBucketXi: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	wrBucketBench: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	routesLive: () => TacticalRoute[];
	
	teardownAnchorDrag: () => void;
	setRouteBodyDrag: (v: any) => void;
	releaseRouteBodyCapture: () => void;
	releasePitchDragCapture: () => void;
	setDraggingPlayer: (v: any) => void;
	setActiveDragTrail: (v: any[]) => void;
	setSelectedRouteId: (v: any) => void;
	setFocusedPlayerId: (v: any) => void;
	setHoveredDiscId: (v: any) => void;
	setHoveredRouteId: (v: any) => void;
	setRoutingActive: (v: boolean) => void;
	setRouteDraft: (v: any) => void;
	closeRadialHub: () => void;
	
	simulator: SimulatorEngine;
	capturePlaybackBaseline: () => void;
	playbackBaselinePitch: () => TacticalToken[];
	playbackBaselineOpp: () => TacticalToken[];
	simRouteHoldPrev: Map<string, boolean>;
}

export function executeLoadCartridge(payload: TacticalCartridge, host: CartridgeOpsHost) {
	host.teardownAnchorDrag();
	host.setRouteBodyDrag(null);
	host.releaseRouteBodyCapture();
	host.releasePitchDragCapture();
	host.setDraggingPlayer(null);
	host.setActiveDragTrail([]);
	host.setSelectedRouteId(null);
	host.setFocusedPlayerId(null);
	host.setHoveredDiscId(null);
	host.setHoveredRouteId(null);
	host.setRoutingActive(false);
	host.setRouteDraft(null);
	host.closeRadialHub();

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

	host.simulator.loadCartridge(payload);
	host.capturePlaybackBaseline();
}

export function executeSerializeToCartridge(host: CartridgeOpsHost): TacticalCartridge {
	const entities: TacticalToken[] = [
		...host.wrBucketPitch.get().map((t) => ({ ...t, side: 'friendly' as const })),
		...host.wrOppPitch.get().map((t) => ({ ...t, side: 'opponent' as const })),
	];
	return {
		id: crypto.randomUUID(),
		title: `Play ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
		schemaVersion: TACTICAL_CARTRIDGE_SCHEMA_VERSION,
		metadata: { sport: 'soccer', duration: host.simulator.maxDuration, tags: [] },
		entities,
		routes: host.routesLive(),
	};
}

export function executeResetPositions(host: CartridgeOpsHost) {
	host.simulator.pause();
	host.simulator.scrub(0);
	host.simRouteHoldPrev.clear();
	host.setActiveDragTrail([]);
	host.setDraggingPlayer(null);
	host.teardownAnchorDrag();
	host.setRouteBodyDrag(null);
	host.releaseRouteBodyCapture();
	host.releasePitchDragCapture();
	
	const basePitch = host.playbackBaselinePitch();
	const baseOpp = host.playbackBaselineOpp();
	if (basePitch.length === 0 && baseOpp.length === 0) return;
	
	const byIdPitch = new Map(basePitch.map((t) => [t.id, t]));
	const byIdOpp = new Map(baseOpp.map((t) => [t.id, t]));
	
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
