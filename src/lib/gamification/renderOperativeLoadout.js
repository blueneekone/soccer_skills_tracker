import { renderOperativeAvatarSvg, parseOperativeAvatar } from '../avatars/operativeAvatar.js';

import {

	parseOperativeLoadout,

	resolveEquippedForRender,

	getLoadoutCatalog,

	defaultOperativeLoadout,

} from './loadoutSchema.js';



/**

 * @param {{ assetPath?: string; contentHash?: string; renderKey: string }} entry

 * @param {number} size

 * @param {string} className

 * @returns {string}

 */

function renderManifestAsset(entry, size, className) {

	if (!entry?.assetPath) return '';

	const s = Math.max(1, Math.floor(Number(size) || 128));

	const hash = typeof entry.contentHash === 'string' ? entry.contentHash.slice(0, 16) : '';

	const src = hash ? `${entry.assetPath}?v=${hash}` : entry.assetPath;

	const variant = entry.renderKey.replace(/[^a-z0-9-]/gi, '-');

	return `<img src="${src}" width="${s}" height="${s}" alt="" aria-hidden="true" class="${className} loadout-asset--${variant}" loading="lazy" decoding="async" />`;

}



/**

 * @param {string | null | undefined} itemId

 * @param {number} [size]

 * @returns {string}

 */

export function renderLoadoutBorderLayer(itemId, size = 128) {

	if (!itemId) return '';

	const entry = getLoadoutCatalog().find((row) => row.id === itemId && row.slot === 'border');

	if (!entry) return '';



	if (entry.assetPath) {

		return renderManifestAsset(entry, size, 'loadout-border');

	}



	const s = Math.max(1, Math.floor(Number(size) || 128));

	const r = s / 2;

	const stroke = Math.max(2, Math.round(s * 0.04));

	const inner = r - stroke;



	if (entry.renderKey === 'border-neon') {

		return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true" class="loadout-border loadout-border--neon"><defs><filter id="loadout-neon-glow"><feGaussianBlur stdDeviation="${Math.max(1, stroke * 0.6)}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="${r}" cy="${r}" r="${inner}" fill="none" stroke="#14b8a6" stroke-width="${stroke}" opacity="0.95" filter="url(#loadout-neon-glow)"/><circle cx="${r}" cy="${r}" r="${inner - stroke}" fill="none" stroke="#5eead4" stroke-width="${Math.max(1, stroke * 0.35)}" opacity="0.35"/></svg>`;

	}



	if (entry.renderKey === 'border-holo') {

		return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true" class="loadout-border loadout-border--holo"><defs><linearGradient id="loadout-holo-a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient></defs><circle cx="${r}" cy="${r}" r="${inner}" fill="none" stroke="url(#loadout-holo-a)" stroke-width="${stroke}" opacity="0.9"/></svg>`;

	}



	return '';

}



/**

 * @param {string | null | undefined} itemId

 * @param {number} [size]

 * @returns {string}

 */

export function renderLoadoutBadgeLayer(itemId, size = 128) {

	if (!itemId) return '';

	const entry = getLoadoutCatalog().find((row) => row.id === itemId && row.slot === 'badge');

	if (!entry) return '';



	if (entry.assetPath) {

		return renderManifestAsset(entry, size, 'loadout-badge');

	}



	const s = Math.max(1, Math.floor(Number(size) || 128));

	const badgeSize = Math.max(12, Math.round(s * 0.22));

	const x = s - badgeSize - Math.round(s * 0.06);

	const y = Math.round(s * 0.06);



	if (entry.renderKey === 'badge-hex') {

		const cx = x + badgeSize / 2;

		const cy = y + badgeSize / 2;

		const hexR = badgeSize * 0.48;

		const points = Array.from({ length: 6 }, (_, i) => {

			const angle = (Math.PI / 3) * i - Math.PI / 6;

			return `${cx + hexR * Math.cos(angle)},${cy + hexR * Math.sin(angle)}`;

		}).join(' ');

		return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true" class="loadout-badge loadout-badge--hex"><polygon points="${points}" fill="#05050a" stroke="#fbbf24" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${hexR * 0.28}" fill="#14b8a6"/></svg>`;

	}



	return '';

}



/**

 * ProPlayerCard-style frame class for equipped border SKUs.

 *

 * @param {string | null | undefined} itemId

 * @returns {'loadout-frame--base' | 'loadout-frame--neon' | 'loadout-frame--holo'}

 */

export function getLoadoutFrameClass(itemId) {

	if (!itemId) return 'loadout-frame--base';

	const entry = getLoadoutCatalog().find((row) => row.id === itemId && row.slot === 'border');

	if (!entry) return 'loadout-frame--base';

	if (entry.renderKey === 'border-neon' || itemId === 'digi_border_neon') return 'loadout-frame--neon';

	if (entry.renderKey === 'border-holo') return 'loadout-frame--holo';

	return 'loadout-frame--base';

}



/**

 * Compose portrait base + optional border/badge overlays for dossier preview.

 *

 * @param {{

 *   operativeAvatar?: unknown;

 *   loadout?: unknown;

 *   size?: number;

 *   ownedIds?: string[];

 * }} opts

 * @returns {{

 *   portraitSvg: string;

 *   borderSvg: string;

 *   badgeSvg: string;

 *   frameClass: ReturnType<typeof getLoadoutFrameClass>;

 * }}

 */

export function composeOperativePortrait({ operativeAvatar, loadout, size = 128, ownedIds }) {

	const s = Math.max(1, Math.floor(Number(size) || 128));

	const parsedAvatar = parseOperativeAvatar(operativeAvatar);

	const seed = parsedAvatar?.seed ?? 'operative';

	const portraitSvg = renderOperativeAvatarSvg(seed, s);



	const parsedLoadout = parseOperativeLoadout(loadout) ?? defaultOperativeLoadout();

	const equipped = resolveEquippedForRender(parsedLoadout, ownedIds);

	const borderId = equipped.border ?? null;

	const badgeId = equipped.badge ?? null;



	return {

		portraitSvg,

		borderSvg: renderLoadoutBorderLayer(borderId, s),

		badgeSvg: renderLoadoutBadgeLayer(badgeId, s),

		frameClass: getLoadoutFrameClass(borderId),

	};

}

