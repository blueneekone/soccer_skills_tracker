import { QUARTERMASTER_INVENTORY } from './armory.js';

import cosmeticsManifest from './cosmetics.manifest.json';



export const OPERATIVE_LOADOUT_VERSION = 1;



export const LOADOUT_SLOTS = ['border', 'badge', 'banner', 'title'] as const;



export type LoadoutSlotId = (typeof LOADOUT_SLOTS)[number];



export type EquippedLoadout = Partial<Record<LoadoutSlotId, string | null>>;



export type OperativeLoadoutV1 = {

	v: typeof OPERATIVE_LOADOUT_VERSION;

	equipped: EquippedLoadout;

};



export type OwnedCosmeticsList = string[];



export type LoadoutCatalogEntry = {

	id: string;

	slot: LoadoutSlotId;

	label: string;

	renderKey: string;

	assetPath?: string;

	contentHash?: string;

};



/** Quartermaster digital SKUs mapped to equip slots (physical SKUs excluded). */

const QUARTERMASTER_SLOT_MAP: Readonly<Record<string, LoadoutSlotId>> = {

	digi_border_neon: 'border',

};



type ManifestRow = {

	id: string;

	slot: string;

	label: string;

	renderKey: string;

	assetPath: string;

	contentHash: string;

};



function manifestRowToCatalogEntry(row: ManifestRow): LoadoutCatalogEntry {

	const qm = QUARTERMASTER_INVENTORY.find((item) => item.id === row.id);

	return {

		id: row.id,

		slot: row.slot as LoadoutSlotId,

		label: qm?.title ?? row.label,

		renderKey: row.renderKey,

		assetPath: row.assetPath,

		contentHash: row.contentHash,

	};

}



function buildLoadoutCatalog(): LoadoutCatalogEntry[] {

	const manifestIds = new Set(cosmeticsManifest.map((row) => row.id));

	const fromManifest = cosmeticsManifest.map(manifestRowToCatalogEntry);



	const fromQuartermaster: LoadoutCatalogEntry[] = QUARTERMASTER_INVENTORY.filter(

		(item) => item.type === 'digital' && QUARTERMASTER_SLOT_MAP[item.id] && !manifestIds.has(item.id),

	).map((item) => ({

		id: item.id,

		slot: QUARTERMASTER_SLOT_MAP[item.id],

		label: item.title,

		renderKey: item.id === 'digi_border_neon' ? 'border-neon' : item.id,

	}));



	return [...fromManifest, ...fromQuartermaster];

}



/** Authoritative loadout catalog — cosmetics manifest + Quartermaster digital SKUs. */

export function getLoadoutCatalog(): LoadoutCatalogEntry[] {

	return buildLoadoutCatalog();

}



export const LOADOUT_CATALOG = Object.freeze(buildLoadoutCatalog()) as readonly LoadoutCatalogEntry[];



const CATALOG_BY_ID = new Map(LOADOUT_CATALOG.map((entry) => [entry.id, entry]));



function isLoadoutSlotId(key: string): key is LoadoutSlotId {

	return (LOADOUT_SLOTS as readonly string[]).includes(key);

}



/**

 * @param {unknown} raw

 * @returns {OperativeLoadoutV1 | null}

 */

export function parseOperativeLoadout(raw: unknown): OperativeLoadoutV1 | null {

	if (!raw || typeof raw !== 'object') return null;

	const o = raw as Record<string, unknown>;

	if (o.v !== OPERATIVE_LOADOUT_VERSION) return null;

	if (!o.equipped || typeof o.equipped !== 'object') return null;



	const eq = o.equipped as Record<string, unknown>;

	const equipped: EquippedLoadout = {};



	for (const key of Object.keys(eq)) {

		if (!isLoadoutSlotId(key)) return null;

		const val = eq[key];

		if (val !== null && val !== undefined && typeof val !== 'string') return null;

		equipped[key] = val == null ? null : String(val);

	}



	return { v: OPERATIVE_LOADOUT_VERSION, equipped };

}



/** @returns {OperativeLoadoutV1} Empty equipped slots (versioned shell). */

export function defaultOperativeLoadout(): OperativeLoadoutV1 {

	return { v: OPERATIVE_LOADOUT_VERSION, equipped: {} };

}



/**

 * Strips unknown slot keys and nulls ids not in catalog or owned set.

 *

 * @param {OperativeLoadoutV1} loadout

 * @param {OwnedCosmeticsList} [ownedIds]

 * @returns {EquippedLoadout}

 */

export function normalizeEquipped(

	loadout: OperativeLoadoutV1,

	ownedIds?: OwnedCosmeticsList,

): EquippedLoadout {

	const owned = ownedIds ? new Set(ownedIds) : null;

	const result: EquippedLoadout = {};



	for (const slot of LOADOUT_SLOTS) {

		const raw = loadout.equipped[slot];

		if (raw === undefined) continue;



		if (typeof raw !== 'string') {

			result[slot] = null;

			continue;

		}



		const entry = CATALOG_BY_ID.get(raw);

		if (!entry || entry.slot !== slot) {

			result[slot] = null;

			continue;

		}



		if (owned && !owned.has(raw)) {

			result[slot] = null;

			continue;

		}



		result[slot] = raw;

	}



	return result;

}



/**

 * @param {LoadoutSlotId} slot

 * @param {string} itemId

 * @param {OwnedCosmeticsList} ownedIds

 * @param {readonly LoadoutCatalogEntry[]} [catalog]

 * @returns {boolean}

 */

export function canEquipItem(

	slot: LoadoutSlotId,

	itemId: string,

	ownedIds: OwnedCosmeticsList,

	catalog: readonly LoadoutCatalogEntry[] = LOADOUT_CATALOG,

): boolean {

	if (!ownedIds.includes(itemId)) return false;

	const entry = catalog.find((row) => row.id === itemId);

	if (!entry) return false;

	return entry.slot === slot;

}



/**

 * Catalog rows for a slot filtered to owned ids.

 *

 * @param {LoadoutSlotId} slot

 * @param {OwnedCosmeticsList} ownedIds

 * @param {readonly LoadoutCatalogEntry[]} [catalog]

 * @returns {LoadoutCatalogEntry[]}

 */

export function getOwnedCatalogForSlot(

	slot: LoadoutSlotId,

	ownedIds: OwnedCosmeticsList,

	catalog: readonly LoadoutCatalogEntry[] = LOADOUT_CATALOG,

): LoadoutCatalogEntry[] {

	const owned = new Set(ownedIds);

	return catalog.filter((entry) => entry.slot === slot && owned.has(entry.id));

}



/**

 * Safe equipped map for preview renderers — parses, normalizes, and strips unowned ids.

 *

 * @param {OperativeLoadoutV1 | null | undefined} loadout

 * @param {OwnedCosmeticsList} [ownedIds]

 * @returns {EquippedLoadout}

 */

export function resolveEquippedForRender(

	loadout: OperativeLoadoutV1 | null | undefined,

	ownedIds?: OwnedCosmeticsList,

): EquippedLoadout {

	if (!loadout) return {};

	return normalizeEquipped(loadout, ownedIds);

}

