/**
 * Advanced markers (replaces deprecated google.maps.Marker).
 * Requires {@link https://developers.google.com/maps/documentation/javascript/advanced-markers/overview | mapId} on the Map constructor.
 *
 * @param {typeof globalThis.google} g
 * @param {google.maps.Map} map
 * @param {{ lat: number; lng: number }} position
 * @param {{ title?: string; background?: string; borderColor?: string; glyphColor?: string; zIndex?: number; draggable?: boolean }} [opts]
 */
export async function createAdvancedPinMarker(g, map, position, opts = {}) {
	const { AdvancedMarkerElement, PinElement } = await g.maps.importLibrary('marker');
	const pin = new PinElement({
		background: opts.background ?? '#f59e0b',
		borderColor: opts.borderColor ?? '#0f172a',
		glyphColor: opts.glyphColor ?? '#ffffff',
	});
	const marker = new AdvancedMarkerElement({
		map,
		position,
		content: pin.element,
		title: opts.title ?? '',
		zIndex: opts.zIndex ?? 1,
		gmpDraggable: opts.draggable === true,
	});
	return marker;
}
