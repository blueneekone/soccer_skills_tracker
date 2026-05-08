/**
 * swipe.ts — Svelte 5 Swipe Gesture Action
 * ─────────────────────────────────────────
 * Pointer-event based swipe detection for iOS/Android UX patterns.
 * Works with touch, mouse, and stylus via the unified Pointer Events API.
 *
 * Usage:
 *   <li use:swipe={{ onSwipeLeft: () => deleteRow(id) }}>
 *   <div use:swipe={{ onSwipeRight: () => editItem(id), threshold: 80 }}>
 *
 * Options:
 *   onSwipeLeft    — fires when user swipes left  (right-to-left)
 *   onSwipeRight   — fires when user swipes right (left-to-right)
 *   onSwipeUp      — fires when user swipes up
 *   onSwipeDown    — fires when user swipes down
 *   threshold      — minimum px distance to count as a swipe (default 60)
 *   velocityMin    — minimum px/ms velocity (default 0.3) — filters slow drags
 *   disableScroll  — if true, prevent scroll during horizontal swipes
 */

import type { ActionReturn } from 'svelte/action';

export interface SwipeOptions {
	onSwipeLeft?: (delta: number) => void;
	onSwipeRight?: (delta: number) => void;
	onSwipeUp?: (delta: number) => void;
	onSwipeDown?: (delta: number) => void;
	/** Minimum pixel distance for a swipe to register. Default: 60 */
	threshold?: number;
	/** Minimum velocity (px/ms) to register. Default: 0.3 */
	velocityMin?: number;
	/** Prevent document scroll during active horizontal swipe. Default: false */
	disableScroll?: boolean;
}

interface SwipeAttributes {
	'on:swipeleft'?: (e: CustomEvent<{ delta: number }>) => void;
	'on:swiperight'?: (e: CustomEvent<{ delta: number }>) => void;
	'on:swipeup'?: (e: CustomEvent<{ delta: number }>) => void;
	'on:swipedown'?: (e: CustomEvent<{ delta: number }>) => void;
}

export function swipe(
	node: HTMLElement,
	options: SwipeOptions = {},
): ActionReturn<SwipeOptions, SwipeAttributes> {
	let startX = 0;
	let startY = 0;
	let startTime = 0;
	let tracking = false;

	const {
		threshold = 60,
		velocityMin = 0.3,
		disableScroll = false,
	} = options;

	let opts = { ...options };

	function onPointerDown(e: PointerEvent) {
		// Only track single-touch pointer events (primary pointer)
		if (!e.isPrimary) return;
		startX = e.clientX;
		startY = e.clientY;
		startTime = Date.now();
		tracking = true;
		node.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!tracking || !e.isPrimary) return;
		if (disableScroll) {
			const dx = Math.abs(e.clientX - startX);
			const dy = Math.abs(e.clientY - startY);
			if (dx > dy) e.preventDefault();
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (!tracking || !e.isPrimary) return;
		tracking = false;

		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const elapsed = Date.now() - startTime || 1;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);
		const velocity = Math.sqrt(dx * dx + dy * dy) / elapsed;

		if (velocity < velocityMin) return;

		// Horizontal swipe (dominant axis)
		if (absDx > absDy && absDx >= threshold) {
			if (dx < 0) {
				opts.onSwipeLeft?.(absDx);
				node.dispatchEvent(new CustomEvent('swipeleft', { detail: { delta: absDx } }));
			} else {
				opts.onSwipeRight?.(absDx);
				node.dispatchEvent(new CustomEvent('swiperight', { detail: { delta: absDx } }));
			}
			return;
		}

		// Vertical swipe (dominant axis)
		if (absDy > absDx && absDy >= threshold) {
			if (dy < 0) {
				opts.onSwipeUp?.(absDy);
				node.dispatchEvent(new CustomEvent('swipeup', { detail: { delta: absDy } }));
			} else {
				opts.onSwipeDown?.(absDy);
				node.dispatchEvent(new CustomEvent('swipedown', { detail: { delta: absDy } }));
			}
		}
	}

	function onPointerCancel() {
		tracking = false;
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointermove', onPointerMove, { passive: !disableScroll });
	node.addEventListener('pointerup', onPointerUp);
	node.addEventListener('pointercancel', onPointerCancel);

	return {
		update(newOptions: SwipeOptions) {
			opts = { ...options, ...newOptions };
		},
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerCancel);
		},
	};
}
