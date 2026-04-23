/**
 * Strike 14 — Lock the real admin scrollport (`.cc-scroll` or `.ec-canvas`)
 * so hiding overflow does not shift content; compensates for scrollbar width.
 */

let depth = 0;

/** @type {{ el: HTMLElement; overflow: string; paddingRight: string } | null} */
let snapshot = null;

export function lockEnterpriseShellScroll() {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;

	const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
	const scrollContainer =
		document.querySelector('.cc-scroll') ||
		document.querySelector('.ec-canvas') ||
		document.body;

	if (!scrollContainer || !(scrollContainer instanceof HTMLElement)) return;

	if (depth === 0) {
		const el = scrollContainer;
		const computedPad = parseFloat(window.getComputedStyle(el).paddingRight) || 0;
		snapshot = {
			el,
			overflow: el.style.overflow,
			paddingRight: el.style.paddingRight,
		};
		el.style.overflow = 'hidden';
		if (scrollbarWidth > 0) {
			el.style.paddingRight = `${computedPad + scrollbarWidth}px`;
		}
	}
	depth++;
}

export function unlockEnterpriseShellScroll() {
	if (depth === 0 || !snapshot) return;
	depth--;
	if (depth > 0) return;
	snapshot.el.style.overflow = snapshot.overflow;
	snapshot.el.style.paddingRight = snapshot.paddingRight;
	snapshot = null;
}
