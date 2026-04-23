/**
 * Modal scroll lock — targets the shell scrollport (`.ec-canvas` / `.ps-canvas`),
 * freezes vertical scroll, and optionally pads for a disappearing scrollbar.
 *
 * Important: `.ec-canvas` uses `scrollbar-gutter: stable` (enterprise-console.css).
 * That already reserves gutter space, so adding extra `padding-right` to “replace”
 * the scrollbar **narrows** the canvas and forces wide tables (e.g. orgs admin)
 * into horizontal scroll while a modal is open. Skip padding when stable gutter is active.
 */

let depth = 0;

/** @type {{ el: HTMLElement; overflowY: string; paddingRight: string; scrollTop: number } | null} */
let snapshot = null;

/** @returns {HTMLElement | null} */
function pickScrollHost() {
	if (typeof document === 'undefined') return null;
	const ec = document.querySelector('.ec-canvas');
	if (ec instanceof HTMLElement) return ec;
	const ps = document.querySelector('.ps-canvas');
	if (ps instanceof HTMLElement) return ps;
	return document.documentElement;
}

/**
 * @param {CSSStyleDeclaration} cs
 * @returns {boolean}
 */
function hasStableScrollbarGutter(cs) {
	const g = (cs.scrollbarGutter || '').trim().toLowerCase();
	return g.includes('stable');
}

export function lockBody() {
	if (typeof window === 'undefined') return;
	const el = pickScrollHost();
	if (!el) return;

	if (depth === 0) {
		const cs = window.getComputedStyle(el);
		const skipScrollbarPad = hasStableScrollbarGutter(cs);
		const scrollbarW = skipScrollbarPad
			? 0
			: Math.max(0, el.offsetWidth - el.clientWidth);
		const computedPad = parseFloat(cs.paddingRight) || 0;
		snapshot = {
			el,
			overflowY: el.style.overflowY,
			paddingRight: el.style.paddingRight,
			scrollTop: el.scrollTop,
		};
		/* Only pin vertical scroll; keep stylesheet `overflow-x` (usually hidden on ec-canvas). */
		el.style.overflowY = 'hidden';
		if (scrollbarW > 0) {
			el.style.paddingRight = `${computedPad + scrollbarW}px`;
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

	const { el, overflowY, paddingRight, scrollTop } = snapshot;
	el.style.overflowY = overflowY;
	el.style.paddingRight = paddingRight;
	el.scrollTop = scrollTop;
	snapshot = null;
}
