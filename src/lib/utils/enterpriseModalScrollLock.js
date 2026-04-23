/**
 * Strike 5 — Enterprise Console modal scroll lock.
 *
 * The authenticated app shell scrolls inside `.ec-canvas`, not `document.body`.
 * Locking `body` alone leaves the DataTable / canvas scrolling underneath modals.
 *
 * This helper:
 *   • sets `html[data-modal-open="true"]` for CSS fallbacks (sidebar nav, etc.)
 *   • sets `overflow: hidden` + scrollbar width compensation on `.ec-canvas`
 *     (and `.ec-main` as a belt-and-suspenders layer)
 *   • falls back to `document.body` when `.ec-canvas` is absent (e.g. rare routes)
 *
 * @returns {() => void} Disposer — run on modal close / `$effect` cleanup.
 */
export function lockEnterpriseShellScroll() {
	if (typeof document === 'undefined') return () => {};

	const html = document.documentElement;
	html.setAttribute('data-modal-open', 'true');

	const canvas = /** @type {HTMLElement | null} */ (document.querySelector('.ec-canvas'));
	const main = /** @type {HTMLElement | null} */ (document.querySelector('.ec-main'));

	/** @type {{ el: HTMLElement; overflow: string; paddingRight: string; overscroll: string }[]} */
	const snapshots = [];

	/** @param {HTMLElement | null} el */
	const capture = (el) => {
		if (!el) return;
		snapshots.push({
			el,
			overflow: el.style.overflow,
			paddingRight: el.style.paddingRight,
			overscroll: el.style.overscrollBehavior,
		});
		el.style.overflow = 'hidden';
		el.style.overscrollBehavior = 'none';
	};

	capture(canvas);
	capture(main);

	/** @type {{ overflow: string; paddingRight: string } | null} */
	let bodySnap = null;

	if (canvas) {
		const sw = canvas.offsetWidth - canvas.clientWidth;
		if (sw > 0) canvas.style.paddingRight = `${sw}px`;
	} else {
		const body = document.body;
		bodySnap = {
			overflow: body.style.overflow,
			paddingRight: body.style.paddingRight,
		};
		const sw = window.innerWidth - document.documentElement.clientWidth;
		body.style.overflow = 'hidden';
		if (sw > 0) body.style.paddingRight = `${sw}px`;
	}

	return () => {
		html.removeAttribute('data-modal-open');
		for (const s of snapshots) {
			s.el.style.overflow = s.overflow;
			s.el.style.paddingRight = s.paddingRight;
			s.el.style.overscrollBehavior = s.overscroll;
		}
		if (bodySnap) {
			document.body.style.overflow = bodySnap.overflow;
			document.body.style.paddingRight = bodySnap.paddingRight;
		}
	};
}
