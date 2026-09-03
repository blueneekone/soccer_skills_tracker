import type { TacticalGridHost } from './tacticalWarRoom.svelte';
import type { TacticalToken, TacticalRoute } from './types';
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

export function clearOpponents(host: any) {
	host.wrOppPitch.set([]);
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

export function updateSelectedRoute(host: TacticalGridHost, routeId: string, updates: Partial<TacticalRoute>) {
	if (!routeId) return;
	host.drawnRoutes.set(
		host.drawnRoutes.get().map((raw) => {
			const r = normalizeRoute(raw as any);
			if (r.id === routeId) {
				return { ...r, ...updates };
			}
			return r;
		})
	);
}

export function injectBall(host: TacticalGridHost) {
	const pitchTokens = host.wrBucketPitch.get();
	const oppTokens = host.wrOppPitch.get();
	const hasBall = [...pitchTokens, ...oppTokens].some((t) => t.position === 'BALL');
	if (!hasBall) {
		host.wrBucketPitch.set([
			...pitchTokens,
			{
				id: 'BALL',
				name: '⚽',
				number: '⚽',
				position: 'BALL',
				side: 'friendly',
				color: '#ffffff',
				x: 800,
				y: 450,
			},
		]);
	}
}

export function clearPitch(host: TacticalGridHost, simulator?: any) {
	const currentTokens = host.wrBucketPitch.get();
	const nextBench = [...host.wrBucketBench.get()];
	for (const token of currentTokens) {
		if (token.id !== 'BALL' && !nextBench.some((b) => b.id === token.id)) {
			nextBench.push(token);
		}
	}
	host.wrBucketPitch.set([]);
	host.wrOppPitch.set([]);
	host.wrBucketBench.set(nextBench);
	host.drawnRoutes.set([]);
	if (simulator && typeof simulator.clearSim === 'function') {
		simulator.clearSim();
	}
}

function getTwoLetterInitials(name: string): string {
	if (!name) return 'PL';
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase() || 'PL';
}

export async function fetchWarRoomRosterTokens(
	db: any,
	effectiveTeamId: string,
	getDocsFn: any,
	getDocFn: any,
	collectionFn: any,
	docFn: any,
	queryFn: any,
	whereFn: any
): Promise<TacticalToken[]> {
	if (!db || !effectiveTeamId) return [];
	const playerMap = new Map<string, TacticalToken>();

	const addToken = (id: string, name: string, pos: string) => {
		const cleanName = (name || '').trim();
		if (!cleanName) return;
		const key = cleanName.toLowerCase();
		if (!playerMap.has(key)) {
			playerMap.set(key, {
				id: `${effectiveTeamId}_${id}`,
				name: cleanName,
				number: getTwoLetterInitials(cleanName),
				position: pos || '',
				side: 'friendly',
				color: '#14b8a6',
			});
		}
	};

	try {
		const uSnap = await getDocsFn(queryFn(collectionFn(db, 'users'), whereFn('teamId', '==', effectiveTeamId)));
		uSnap?.forEach?.((d: any) => {
			const data = d.data() || {};
			const n = data.playerName || data.displayName || data.name || d.id;
			addToken(d.id, n, typeof data.position === 'string' ? data.position : '');
		});
	} catch (e) {
		console.warn('tacticalWarRoomApi users error', e);
	}

	try {
		const lSnap = await getDocsFn(queryFn(collectionFn(db, 'player_lookup'), whereFn('teamId', '==', effectiveTeamId)));
		lSnap?.forEach?.((d: any) => {
			const data = d.data() || {};
			const n = data.playerName || data.displayName || d.id;
			addToken(d.id, n, typeof data.position === 'string' ? data.position : '');
		});
	} catch (e) {
		console.warn('tacticalWarRoomApi player_lookup error', e);
	}

	try {
		const rSnap = await getDocFn(docFn(db, 'rosters', effectiveTeamId));
		if (rSnap?.exists?.() && Array.isArray(rSnap.data()?.players)) {
			for (const pName of rSnap.data().players) {
				addToken(String(pName).replace(/\s+/g, '_'), String(pName), '');
			}
		}
	} catch (e) {
		console.warn('tacticalWarRoomApi rosters error', e);
	}

	const tokens = Array.from(playerMap.values());
	tokens.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	return tokens;
}
