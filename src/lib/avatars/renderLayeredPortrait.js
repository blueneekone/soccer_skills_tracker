import portraitPartsManifest from './portraitParts.manifest.json';
import {
	defaultPortraitV2,
	normalizePortraitParts,
} from './portraitV2Schema.js';

/** @typedef {import('./portraitV2Schema.js').PortraitPartSlot} PortraitPartSlot */
/** @typedef {import('./portraitV2Schema.js').OperativePortraitV2} OperativePortraitV2 */

/** Fixed bottom-to-top layer order for character silhouette stack. */
const LAYER_ORDER = /** @type {const} */ (['kit', 'face', 'hair']);

/**
 * @returns {Array<{ id: string; slot: PortraitPartSlot; label: string; renderKey: string; assetPath?: string; contentHash?: string }>}
 */
export function getPortraitPartCatalog() {
	return portraitPartsManifest.map((row) => ({
		id: row.id,
		slot: /** @type {PortraitPartSlot} */ (row.slot),
		label: row.label,
		renderKey: row.renderKey,
		assetPath: row.assetPath,
		contentHash: row.contentHash,
	}));
}

/**
 * @param {string | null | undefined} partId
 * @param {number} [size]
 * @returns {string}
 */
export function renderPortraitPartLayer(partId, size = 128) {
	if (!partId) return '';
	const entry = getPortraitPartCatalog().find((row) => row.id === partId);
	if (!entry?.assetPath) return '';

	const s = Math.max(1, Math.floor(Number(size) || 128));
	const hash = typeof entry.contentHash === 'string' ? entry.contentHash.slice(0, 16) : '';
	const href = hash ? `${entry.assetPath}?v=${hash}` : entry.assetPath;
	const variant = entry.renderKey.replace(/[^a-z0-9-]/gi, '-');

	return `<g class="portrait-layer portrait-layer--${variant}" data-portrait-layer="${entry.slot}"><image href="${href}" x="0" y="0" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/></g>`;
}

/**
 * Resolve part id for a slot — equipped value, slot default from catalog, or global v2 defaults.
 *
 * @param {Partial<Record<PortraitPartSlot, string | null>>} parts
 * @param {PortraitPartSlot} slot
 * @returns {string | null}
 */
function resolvePartId(parts, slot) {
	const equipped = parts[slot];
	if (typeof equipped === 'string' && equipped) return equipped;

	const slotDefault = getPortraitPartCatalog().find((row) => row.slot === slot && row.renderKey.endsWith('-default'));
	if (slotDefault) return slotDefault.id;

	const globalDefault = defaultPortraitV2().parts[slot];
	return typeof globalDefault === 'string' ? globalDefault : null;
}

/**
 * Deterministic layered SVG portrait from v2 schema + catalog assets.
 *
 * @param {OperativePortraitV2} portrait
 * @param {number} [size]
 * @param {readonly string[]} [ownedIds] — when provided, strip unowned part ids before compose
 * @returns {string}
 */
export function renderLayeredPortraitSvg(portrait, size = 128, ownedIds = undefined) {
	const s = Math.max(1, Math.floor(Number(size) || 128));
	const catalog = getPortraitPartCatalog();
	const parts = normalizePortraitParts(portrait.parts ?? {}, catalog, ownedIds);

	const layers = LAYER_ORDER.map((slot) => {
		const partId = resolvePartId(parts, slot);
		return renderPortraitPartLayer(partId, s);
	})
		.filter(Boolean)
		.join('\n\t');

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" class="layered-portrait" data-portrait-version="2" aria-hidden="true">\n\t${layers}\n</svg>`;
}
