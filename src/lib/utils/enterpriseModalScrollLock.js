/**
 * Strike 7 — Titanium modal scroll lock for nested SvelteKit / enterprise shells.
 *
 * Locks every common scrollport: `html`, `body`, `.ec-canvas`, and `.ec-main`.
 * Shell nodes use `overflow: hidden !important` via inline styles so underlying
 * CSS cannot keep a scroll context alive.
 *
 * @returns {() => void} Disposer — restores all touched values on modal teardown.
 */
export function lockEnterpriseShellScroll() {
	if (typeof document === 'undefined') return () => {};

	const html = document.documentElement;
	const body = document.body;

	const snap = {
		htmlOverflow: html.style.overflow,
		bodyOverflow: body.style.overflow,
		bodyPaddingRight: body.style.paddingRight,
	};

	html.setAttribute('data-modal-open', 'true');
	html.style.overflow = 'hidden';
	body.style.overflow = 'hidden';

	const gutter = window.innerWidth - html.clientWidth;
	if (gutter > 0) {
		body.style.paddingRight = `${gutter}px`;
	}

	/** @type {{ el: HTMLElement; overflow: string; paddingRight: string; overscroll: string }[]} */
	const shellSnaps = [];

	/** @param {HTMLElement | null} el */
	function captureShell(el) {
		if (!el) return;
		const overflow = el.style.overflow;
		const paddingRight = el.style.paddingRight;
		const overscroll = el.style.overscrollBehavior;
		shellSnaps.push({ el, overflow, paddingRight, overscroll });
		el.style.setProperty('overflow', 'hidden', 'important');
		el.style.setProperty('overscroll-behavior', 'none', 'important');
		const sw = el.offsetWidth - el.clientWidth;
		if (sw > 0) {
			const base = paddingRight ? parseFloat(paddingRight) || 0 : 0;
			el.style.paddingRight = `${base + sw}px`;
		}
	}

	captureShell(/** @type {HTMLElement | null} */ (document.querySelector('.ec-canvas')));
	captureShell(/** @type {HTMLElement | null} */ (document.querySelector('.ec-main')));

	return () => {
		html.removeAttribute('data-modal-open');
		html.style.overflow = snap.htmlOverflow;
		body.style.overflow = snap.bodyOverflow;
		body.style.paddingRight = snap.bodyPaddingRight;

		for (const s of shellSnaps) {
			s.el.style.overflow = s.overflow;
			s.el.style.paddingRight = s.paddingRight;
			s.el.style.overscrollBehavior = s.overscroll;
		}
	};
}
