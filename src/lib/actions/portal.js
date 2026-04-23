/**
 * Move a node to `document.body` (or another host) so `position: fixed` overlays
 * are not trapped in `.ec-canvas` stacking contexts and scroll locks behave predictably.
 *
 * @type {import('svelte/action').Action<HTMLElement, string | HTMLElement | undefined>}
 */
export function portal(node, target = 'body') {
	const host =
		typeof target === 'string'
			? /** @type {HTMLElement | null} */ (document.querySelector(target))
			: target;
	if (host instanceof HTMLElement) {
		host.appendChild(node);
	}
	return {};
}
