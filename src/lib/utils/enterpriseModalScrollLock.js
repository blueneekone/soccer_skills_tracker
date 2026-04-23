/**
 * Strike 8 — Enterprise modal scroll lock (html, body, .ec-canvas, .ec-main).
 *
 * `position: fixed` + negative `top` on `body` freezes document scroll; shell
 * nodes get `overflow: hidden !important`. Restores prior inline styles and
 * reapplies the saved scroll position on teardown.
 *
 * @returns {() => void} Disposer — run when the modal closes.
 */
export function lockEnterpriseShellScroll() {
	if (typeof document === 'undefined') return () => {};

	const html = document.documentElement;
	const body = document.body;
	const scrollY = window.scrollY;

	const snap = {
		htmlOverflow: html.style.overflow,
		bodyOverflow: body.style.overflow,
		bodyPaddingRight: body.style.paddingRight,
		bodyPosition: body.style.position,
		bodyTop: body.style.top,
		bodyLeft: body.style.left,
		bodyRight: body.style.right,
		bodyWidth: body.style.width,
	};

	html.setAttribute('data-modal-open', 'true');
	html.style.overflow = 'hidden';

	body.style.overflow = 'hidden';
	body.style.position = 'fixed';
	body.style.top = `-${scrollY}px`;
	body.style.left = '0';
	body.style.right = '0';
	body.style.width = '100%';

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
		body.style.position = snap.bodyPosition;
		body.style.top = snap.bodyTop;
		body.style.left = snap.bodyLeft;
		body.style.right = snap.bodyRight;
		body.style.width = snap.bodyWidth;

		for (const s of shellSnaps) {
			s.el.style.overflow = s.overflow;
			s.el.style.paddingRight = s.paddingRight;
			s.el.style.overscrollBehavior = s.overscroll;
		}

		window.scrollTo(0, scrollY);
	};
}
