/**
 * Strike 16 — Fixed-snapshot body lock (ref-counted for nested modals).
 */

let depth = 0;

export function lockBody() {
	if (typeof window === 'undefined') return;
	if (depth === 0) {
		const scrollY = window.scrollY;
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollY}px`;
		document.body.style.width = '100%';
		document.body.style.overflowY = 'scroll'; // Forces the track to stay
	}
	depth++;
}

export function unlockBody() {
	if (typeof window === 'undefined') return;
	if (depth === 0) return;
	depth--;
	if (depth > 0) return;
	const scrollY = document.body.style.top;
	document.body.style.position = '';
	document.body.style.top = '';
	document.body.style.width = '';
	document.body.style.overflowY = '';
	window.scrollTo(0, parseInt(scrollY || '0') * -1);
}
