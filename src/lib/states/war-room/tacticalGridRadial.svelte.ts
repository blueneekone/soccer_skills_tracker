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

/** Hub deploy ring + long-press radial menu state (War Room pitch). */
export function createTacticalRadialHub(deps: TacticalRadialDeps) {
	let radialOpen = $state(false);
	let radialCx = $state(800);
	let radialCy = $state(450);
	let radialOpenerPointerId = $state(/** @type {number | null} */ (null));
	let radialViaContext = $state(false);
	let hubHoveredKey = $state(/** @type {string | null} */ (null));
	const hubPop = new Spring(0, { stiffness: 0.42, damping: 0.78 });

	let radialLongPressTimer = $state(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
	let radialLongPressOrigin = $state(
		/** @type {{ x: number; y: number; ev: PointerEvent } | null} */ (null),
	);

	const oppositionInModal = $derived(
		MOCK_OPPOSITION.filter((m) => !deps.wrOppPitch().some((p) => p.id === m.id)),
	);

	const radialFriendly = $derived.by(() => {
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
			angle: Math.PI * (0.5 + (0.42 * (n <= 1 ? 0.5 : i / (n - 1)))),
			ring: FRIENDLY_RING,
			wing: /** @type {const} */ ('L'),
		}));
	});

	const radialOppSlots = $derived.by(() => {
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
	});

	const radialAllSlots = $derived([...radialFriendly, ...radialOppSlots]);

	const hubCenterLabel = $derived.by(() => {
		if (!hubHoveredKey) return 'DEPLOY';
		const slot = radialAllSlots.find((s) => s.key === hubHoveredKey);
		if (!slot) return 'DEPLOY';
		const p = slot.token;
		const n = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : '';
		if (n) return n.toUpperCase();
		return p.number ? `#${p.number}` : p.id;
	});

	function cancelRadialLongPress() {
		if (radialLongPressTimer != null) {
			clearTimeout(radialLongPressTimer);
			radialLongPressTimer = null;
		}
		radialLongPressOrigin = null;
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
		radialCx = p.x;
		radialCy = p.y;
		radialOpen = true;
		radialOpenerPointerId = openerPointerId;
		radialViaContext = viaContext;
		hubHoveredKey = null;
		hubPop.target = 1;
		cancelRadialLongPress();
	}

	function closeRadialHub() {
		radialOpen = false;
		radialViaContext = false;
		radialOpenerPointerId = null;
		hubHoveredKey = null;
		hubPop.target = 0;
		cancelRadialLongPress();
	}

	function updateRadialHover(ev: PointerEvent) {
		const svg = deps.svg();
		if (!svg) return;
		if (!radialOpen && hubPop.current < 0.04) return;
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
		hubHoveredKey = bestKey;
	}

	function tryConsumeRadialPointerUp(ev: PointerEvent): boolean {
		const hubActive = radialOpen || hubPop.current > 0.06;
		if (!hubActive) return false;
		if (ev.pointerType === 'mouse' && ev.button === 2) return true;
		if (radialOpenerPointerId != null && ev.pointerId !== radialOpenerPointerId) return false;
		if (hubHoveredKey) {
			const slot = radialAllSlots.find((s) => s.key === hubHoveredKey);
			if (slot)
				deps.deployTokenAt(slot.token, slot.source as RadialSlotSource, deps.clampToPitch(radialCx, radialCy));
		}
		closeRadialHub();
		return true;
	}

	function radialLongPressOriginGetter() {
		return radialLongPressOrigin;
	}
	function radialLongPressOriginSetter(v: { x: number; y: number; ev: PointerEvent } | null) {
		radialLongPressOrigin = v;
	}
	function radialLongPressTimerGetter() {
		return radialLongPressTimer;
	}
	function radialLongPressTimerSetter(v: ReturnType<typeof setTimeout> | null) {
		radialLongPressTimer = v;
	}

	function radialBlocking() {
		return radialOpen || hubPop.current > 0.06;
	}

	return {
		get radialOpen() {
			return radialOpen;
		},
		get radialCx() {
			return radialCx;
		},
		get radialCy() {
			return radialCy;
		},
		get hubHoveredKey() {
			return hubHoveredKey;
		},
		get radialViaContext() {
			return radialViaContext;
		},
		hubPop,
		get radialAllSlots() { return radialAllSlots; },
		get hubCenterLabel() { return hubCenterLabel; },
		openRadialHub,
		closeRadialHub,
		updateRadialHover,
		tryConsumeRadialPointerUp,
		cancelRadialLongPress,
		radialBlocking,
		radialLongPressOrigin: radialLongPressOriginGetter,
		setRadialLongPressOrigin: radialLongPressOriginSetter,
		radialLongPressTimer: radialLongPressTimerGetter,
		setRadialLongPressTimer: radialLongPressTimerSetter,
	};
}
