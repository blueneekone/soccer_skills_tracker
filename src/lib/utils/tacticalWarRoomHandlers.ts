import type { TacticalToken } from '$lib/states/war-room/types';

export function formatTimelineMs(ms: number) {
	const s = Math.max(0, ms / 1000);
	const m = Math.floor(s / 60);
	const r = s % 60;
	if (m > 0) return `${m}:${r.toFixed(2).padStart(5, '0')}`;
	return `${r.toFixed(2)}s`;
}

export function executeRecallBench(
	wrBucketPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void },
	wrBucketBench: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void },
	wrOppPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void }
) {
	const bench = wrBucketBench.get();
	const bPitch = wrBucketPitch.get();
	const opp = wrOppPitch.get();
	const toBench = [...bPitch, ...opp];
	
	const bId = new Set(bench.map((t) => t.id));
	const deduped: TacticalToken[] = [...bench];
	for (const t of toBench) {
		if (!bId.has(t.id)) deduped.push({ ...t, x: undefined, y: undefined });
	}
	wrBucketPitch.set([]);
	wrOppPitch.set([]);
	wrBucketBench.set(deduped);
}

export function executeClearRoutesOnly(
	drawnRoutes: { set: (v: unknown[]) => void },
	simulator: any,
	simRouteHoldPrev: Map<string, boolean>
) {
	simulator.pause();
	simulator.scrub(0);
	simRouteHoldPrev.clear();
	drawnRoutes.set([]);
}

export interface WarRoomHandlersHost {
	wrBucketPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	wrBucketBench: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	wrOppPitch: { get: () => TacticalToken[]; set: (v: TacticalToken[]) => void };
	drawnRoutes: { set: (v: unknown[]) => void };
	simulator: any;
	simRouteHoldPrev: Map<string, boolean>;
}

export function executeCloseOverlay(host: { showTacticalOverlay: { set: (v: boolean) => void } }) {
	host.showTacticalOverlay.set(false);
}

export function executeHandleSvgClick(ev: MouseEvent | TouchEvent, host: { contextMenuOpen: boolean, setContextMenuOpen: (v: boolean) => void, cancelRadialLongPress: () => void, radialBlocking: () => boolean, closeRadialHub: () => void }) {
	if (host.contextMenuOpen) {
		host.setContextMenuOpen(false);
		return;
	}
	host.cancelRadialLongPress();
	if (host.radialBlocking()) {
		host.closeRadialHub();
		return;
	}
}
