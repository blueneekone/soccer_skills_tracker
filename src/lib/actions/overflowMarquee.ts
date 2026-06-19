import type { Action } from 'svelte/action';

/** Horizontal marquee when inline content overflows its container. */
export const overflowMarquee: Action<HTMLElement> = (node) => {
	let clone: HTMLElement | null = null;
	let ro: ResizeObserver | null = null;

	function sync() {
		const track = node.querySelector('.overflow-marquee__track');
		const segment = node.querySelector('.overflow-marquee__segment:not(.overflow-marquee__segment--clone)');
		if (!(track instanceof HTMLElement) || !(segment instanceof HTMLElement)) return;

		if (!clone) {
			clone = segment.cloneNode(true) as HTMLElement;
			clone.classList.add('overflow-marquee__segment--clone');
			clone.setAttribute('aria-hidden', 'true');
			track.appendChild(clone);
		}

		node.classList.toggle('overflow-marquee--active', track.scrollWidth > node.clientWidth + 1);
	}

	if (typeof ResizeObserver !== 'undefined') {
		ro = new ResizeObserver(sync);
		ro.observe(node);
		const track = node.querySelector('.overflow-marquee__track');
		if (track) ro.observe(track);
	}

	sync();
	requestAnimationFrame(sync);

	return {
		destroy() {
			ro?.disconnect();
			clone?.remove();
		},
	};
};
