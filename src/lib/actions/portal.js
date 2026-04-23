/**
 * Move a node into `#modal-portal-host` (see app.html) so overlays sit outside
 * `.sveltekit-body-root` / `.ec-canvas` and are not clipped by `body { overflow: hidden }`.
 *
 * @type {import('svelte/action').Action<HTMLElement, string | HTMLElement | undefined>}
 */
export function portal(node, target) {
	const host =
		target != null
			? typeof target === 'string'
				? /** @type {HTMLElement | null} */ (document.querySelector(target))
				: target
			: /** @type {HTMLElement | null} */ (document.querySelector('#modal-portal-host'));
	const mount = host instanceof HTMLElement ? host : document.body;
	mount.appendChild(node);
	return {};
}
