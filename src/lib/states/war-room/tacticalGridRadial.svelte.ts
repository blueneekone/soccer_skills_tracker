import { Spring } from 'svelte/motion';
import {
	FRIENDLY_RING,
	OPP_RING,
	MOCK_OPPOSITION,
	HUB_ORBIT,
	HUB_HOVER_PX,
} from './constants';
import type { TacticalToken } from './types';

export type RadialSlotSource = 'xi' | 'bench' | 'opp';

export interface TacticalRadialDeps {
	svg(): SVGSVGElement | undefined;
	wrBucketXi(): TacticalToken[];
	wrBucketBench(): TacticalToken[];
	wrOppPitch(): TacticalToken[];
	clientToSvg(ev: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number };
	clampToPitch(x: number, y: number): { x: number; y: number };
	deployTokenAt(t: TacticalToken, source: RadialSlotSource, p: { x: number; y: number }): void;
}

function calcRadialFriendly(deps: TacticalRadialDeps) {
	const xi = deps.wrBucketXi().map((t) => ({
		token: t,
		source: /** @type {const} */ ('xi'),
		key: `xi:${t.id}`,
	}));
	const bn = deps.wrBucketBench().map((t) => ({
		token: t,
		source: /** @type {const} */ ('bench'),
		key: `bench:${t.id}`,
	}));
	const items = [...xi, ...bn];
	const n = items.length;
	return items.map((item, i) => ({
		...item,
		angle: Math.PI * (0.5 + 0.42 * (n <= 1 ? 0.5 : i / (n - 1))),
		ring: FRIENDLY_RING,
		wing: /** @type {const} */ ('L'),
	}));
}

function calcRadialOppSlots(oppositionInModal: TacticalToken[]) {
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
}

function calcRadialHover(
	deps: TacticalRadialDeps,
	ev: PointerEvent,
	radialOpen: boolean,
	hubPopCurrent: number,
	radialCx: number,
	radialCy: number,
	radialAllSlots: any[]
): string | null | undefined {
	const svg = deps.svg();
	if (!svg) return undefined;
	if (!radialOpen && hubPopCurrent < 0.04) return undefined;
	const { x, y } = deps.clientToSvg(ev);
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
	return bestKey;
}

function calcConsumeRadialPointerUp(
	ev: PointerEvent,
	radialOpen: boolean,
	hubPopCurrent: number,
	radialOpenerPointerId: number | null,
	hubHoveredKey: string | null,
	radialAllSlots: any[],
	radialCx: number,
	radialCy: number,
	deps: TacticalRadialDeps
): boolean {
	const hubActive = radialOpen || hubPopCurrent > 0.06;
	if (!hubActive) return false;
	if (ev.pointerType === 'mouse' && ev.button === 2) return true;
	if (radialOpenerPointerId != null && ev.pointerId !== radialOpenerPointerId) return false;
	if (hubHoveredKey) {
		const slot = radialAllSlots.find((s) => s.key === hubHoveredKey);
		if (slot)
			deps.deployTokenAt(slot.token, slot.source as RadialSlotSource, deps.clampToPitch(radialCx, radialCy));
	}
	return true;
}

function calcHubCenterLabel(hubHoveredKey: string | null, radialAllSlots: any[]) {
	if (!hubHoveredKey) return 'DEPLOY';
	const slot = radialAllSlots.find((s) => s.key === hubHoveredKey);
	if (!slot) return 'DEPLOY';
	const p = slot.token;
	const n = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : '';
	if (n) return n.toUpperCase();
	return p.number ? `#${p.number}` : p.id;
}

/** Hub deploy ring + long-press radial menu state (War Room pitch). */
export function createTacticalRadialHub(deps: TacticalRadialDeps) {
	const st = $state({
		radialOpen: false,
		radialCx: 800,
		radialCy: 450,
		radialOpenerPointerId: null as number | null,
		radialViaContext: false,
		hubHoveredKey: null as string | null,
		radialLongPressTimer: null as ReturnType<typeof setTimeout> | null,
		radialLongPressOrigin: null as { x: number; y: number; ev: PointerEvent } | null,
	});
	const hubPop = new Spring(0, { stiffness: 0.42, damping: 0.78 });

	const oppositionInModal = $derived(
		MOCK_OPPOSITION.filter((m) => !deps.wrOppPitch().some((p) => p.id === m.id)),
	);

	const radialFriendly = $derived.by(() => calcRadialFriendly(deps));
	const radialOppSlots = $derived.by(() => calcRadialOppSlots(oppositionInModal));

	const radialAllSlots = $derived([...radialFriendly, ...radialOppSlots]);

	const hubCenterLabel = $derived(calcHubCenterLabel(st.hubHoveredKey, radialAllSlots));

	function cancelRadialLongPress() {
		if (st.radialLongPressTimer != null) {
			clearTimeout(st.radialLongPressTimer);
			st.radialLongPressTimer = null;
		}
		st.radialLongPressOrigin = null;
	}

	function openRadialHub(
		ev: MouseEvent | TouchEvent | PointerEvent,
		openerPointerId: number | null,
		viaContext = false,
	) {
		const svg = deps.svg();
		if (!svg) return;
		const raw = deps.clientToSvg(ev);
		const p = deps.clampToPitch(raw.x, raw.y);
		st.radialCx = p.x;
		st.radialCy = p.y;
		st.radialOpen = true;
		st.radialOpenerPointerId = openerPointerId;
		st.radialViaContext = viaContext;
		st.hubHoveredKey = null;
		hubPop.target = 1;
		cancelRadialLongPress();
	}

	function closeRadialHub() {
		st.radialOpen = false;
		st.radialViaContext = false;
		st.radialOpenerPointerId = null;
		st.hubHoveredKey = null;
		hubPop.target = 0;
		cancelRadialLongPress();
	}

	function updateRadialHover(ev: PointerEvent) {
		const key = calcRadialHover(deps, ev, st.radialOpen, hubPop.current, st.radialCx, st.radialCy, radialAllSlots);
		if (key !== undefined) st.hubHoveredKey = key;
	}

	function tryConsumeRadialPointerUp(ev: PointerEvent): boolean {
		const consumed = calcConsumeRadialPointerUp(
			ev,
			st.radialOpen,
			hubPop.current,
			st.radialOpenerPointerId,
			st.hubHoveredKey,
			radialAllSlots,
			st.radialCx,
			st.radialCy,
			deps
		);
		if (consumed) closeRadialHub();
		return consumed;
	}

	return {
		get radialOpen() { return st.radialOpen; },
		get radialCx() { return st.radialCx; },
		get radialCy() { return st.radialCy; },
		get hubHoveredKey() { return st.hubHoveredKey; },
		get radialViaContext() { return st.radialViaContext; },
		hubPop,
		get radialAllSlots() { return radialAllSlots; },
		get hubCenterLabel() { return hubCenterLabel; },
		openRadialHub,
		closeRadialHub,
		updateRadialHover,
		tryConsumeRadialPointerUp,
		cancelRadialLongPress,
		radialBlocking: () => st.radialOpen || hubPop.current > 0.06,
		radialLongPressOrigin: () => st.radialLongPressOrigin,
		setRadialLongPressOrigin: (v: any) => (st.radialLongPressOrigin = v),
		radialLongPressTimer: () => st.radialLongPressTimer,
		setRadialLongPressTimer: (v: any) => (st.radialLongPressTimer = v),
	};
}
