/**
 * Modal scroll lock — targets the real scrollport (`.cc-scroll` or `.ec-canvas`),
 * preserves scroll position, and pads for the scrollbar gutter so nothing shifts sideways.
 */

let depth = 0;

/** @type {{ el: HTMLElement; overflow: string; paddingRight: string; scrollTop: number } | null} */
let snapshot = null;

/** @returns {HTMLElement | null} */
function pickScrollHost() {
	if (typeof document === 'undefined') return null;
	const cc = document.querySelector('.cc-scroll');
	if (cc instanceof HTMLElement) return cc;
	const ec = document.querySelector('.ec-canvas');
	if (ec instanceof HTMLElement) return ec;
	return document.documentElement;
}

export function lockBody() {
	if (typeof window === 'undefined') return;
	const el = pickScrollHost();
	if (!el) return;

	if (depth === 0) {
		const gutter = Math.max(0, el.offsetWidth - el.clientWidth);
		const computedPad = parseFloat(window.getComputedStyle(el).paddingRight) || 0;
		snapshot = {
			el,
			overflow: el.style.overflow,
			paddingRight: el.style.paddingRight,
			scrollTop: el.scrollTop,
		};
		el.style.overflow = 'hidden';
		if (gutter > 0) {
			el.style.paddingRight = `${computedPad + gutter}px`;
		}
	}
	depth++;
}

export function unlockBody() {
	if (typeof window === 'undefined') return;
	if (depth === 0) return;
	depth--;
	if (depth > 0) return;
	if (!snapshot) return;

	const { el, overflow, paddingRight, scrollTop } = snapshot;
	el.style.overflow = overflow;
	el.style.paddingRight = paddingRight;
	el.scrollTop = scrollTop;
	snapshot = null;
}
