import type { TacticalRoute, TacticalToken } from './types';
import { normalizeRoute, sampleRoutePointAt } from './routeModel';
import { SIM_ROUTE_DURATION_MS } from './constants';
import type { SimulatorEngine } from '$lib/states/SimulatorEngine.svelte';

export type TrailPt = { x: number; y: number; t: number; c?: string };

export interface TacticalPlaybackHost {
	drawnRoutesRaw(): unknown[];
	wrBucketPitch(): TacticalToken[];
	setWrBucketPitch(v: TacticalToken[]): void;
	wrOppPitch(): TacticalToken[];
	setWrOppPitch(v: TacticalToken[]): void;
	activeDragTrail(): TrailPt[];
	setActiveDragTrail(v: TrailPt[]): void;
	setTrailRibbonColor(c: string): void;
	simChargePlayerIds(): string[];
	setSimChargePlayerIds(v: string[]): void;
	appendTrailPoint(x: number, y: number, color?: string): void;
	simRouteHoldPrev: Map<string, boolean>;
}

export function orchestrationCycleMs(drawnRoutesRaw: unknown[]) {
	let maxEnd = SIM_ROUTE_DURATION_MS;
	let anyBound = false;
	for (const raw of drawnRoutesRaw) {
		const r = normalizeRoute(raw);
		if (!r.bindPlayerId) continue;
		anyBound = true;
		maxEnd = Math.max(maxEnd, r.delay + SIM_ROUTE_DURATION_MS);
	}
	return anyBound ? maxEnd : SIM_ROUTE_DURATION_MS;
}

export function applyStaggeredPlayback(
	host: TacticalPlaybackHost,
	elapsedLoop: number,
	opts: { playing: boolean },
) {
	const charge = new Set<string>();
	let pitchChanged = false;
	let oppChanged = false;
	const drawnRoutesRaw = host.drawnRoutesRaw();
	const nextPitch = [...host.wrBucketPitch()];
	const nextOpp = [...host.wrOppPitch()];
	const eps = 0.25;

	for (const raw of drawnRoutesRaw) {
		const r = normalizeRoute(raw);
		const bid = r.bindPlayerId;
		if (!bid) continue;

		const playerActiveTime = elapsedLoop - r.delay;
		let pt: { x: number; y: number };
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
			const wasHolding = host.simRouteHoldPrev.has(r.id)
				? /** @type {boolean} */ (host.simRouteHoldPrev.get(r.id))
				: isHolding;
			if (wasHolding && !isHolding) {
				host.setActiveDragTrail([]);
				host.setTrailRibbonColor(r.color);
			}
			host.simRouteHoldPrev.set(r.id, isHolding);
			if (!isHolding && prog < 1 - 1e-6) {
				host.appendTrailPoint(pt.x, pt.y, r.color);
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

	if (opts.playing) host.setSimChargePlayerIds([...charge]);
	else host.setSimChargePlayerIds([]);

	if (pitchChanged) host.setWrBucketPitch(nextPitch);
	if (oppChanged) host.setWrOppPitch(nextOpp);
}

export function wireTacticalPlayback(simulator: SimulatorEngine, host: TacticalPlaybackHost) {
	$effect(() => {
		const orch = orchestrationCycleMs(host.drawnRoutesRaw());
		const cap = simulator.timelineAuthorCapMs;
		const md = Math.max(1, orch, cap);
		simulator.maxDuration = md;
		if (simulator.currentTime > md) simulator.scrub(md);
	});

	$effect(() => {
		if (simulator.isPlaying) host.simRouteHoldPrev.clear();
	});

	$effect(() => {
		host.drawnRoutesRaw();
		simulator.currentTime;
		simulator.isPlaying;
		applyStaggeredPlayback(host, simulator.currentTime, { playing: simulator.isPlaying });
	});
}
