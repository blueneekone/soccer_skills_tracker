import type { TacticalGridHost } from './tacticalWarRoom.svelte';
import type { TacticalToken } from './types';
import { normalizeRoute } from './routeModel';
import { FRIENDLY_RING, OPP_RING } from './constants';
import type { RadialSlotSource } from './tacticalGridRadial.svelte';

const DELAY_MAX_MS = 5000;

export function bumpRouteDelay(host: TacticalGridHost, routeId: string, deltaMs: number) {
	host.drawnRoutes.set(
		host.drawnRoutes.get().map((raw) => {
			const r = normalizeRoute(raw as any);
			if (r.id !== routeId) return raw;
			const next = Math.max(0, Math.min(DELAY_MAX_MS, r.delay + deltaMs));
			return { ...r, delay: next };
		}),
	);
}

export function closeOverlay(host: any) {
	host.showTacticalOverlay.set(false);
	if (host.activeCartridge) host.activeCartridge.set(null);
}

export function recallBench(host: any) {
	host.wrBucketXi.set([...host.wrBucketXi.get(), ...host.wrBucketPitch.get()]);
	host.wrBucketPitch.set([]);
	host.wrOppPitch.set([]);
	if (host.engine) host.wrBucketBench.set(host.engine.getTacticalRoster());
}

export function clearRoutesOnly(host: any, simulator: any, simRouteHoldPrev: any) {
	host.drawnRoutes.set([]);
	simulator.clearSim();
	simRouteHoldPrev.value = false;
	if (host.timeMs) host.timeMs.set(0);
	if (host.isPlaying) host.isPlaying.set(false);
}

export function deployTokenAt(host: TacticalGridHost, t: TacticalToken, source: RadialSlotSource, p: { x: number; y: number }) {
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

export function setActiveTool(host: TacticalGridHost, t: 'DRAG' | 'ROUTE') {
	host.warRoomTool.set(t);
}

export function deleteRoute(host: TacticalGridHost, routeId: string, getSelected: () => string | null, setSelected: (v: string | null) => void) {
	host.drawnRoutes.set(
		host.drawnRoutes.get().filter((raw) => {
			const r = normalizeRoute(raw as any);
			return r.id !== routeId;
		}),
	);
	if (getSelected() === routeId) setSelected(null);
}
