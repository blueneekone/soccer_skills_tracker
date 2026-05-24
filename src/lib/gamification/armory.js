import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '$lib/firebase.js';

/**
 * Quartermaster gamification — **The Ledger** (Path B).
 * Enterprise catalog: all `cost` values are denominated in **Tactical Credits** (TC);
 * the ledger is the system of record for list prices. Redemption and balance enforcement
 * live in consuming modules (not this pure-data layer).
 *
 * @typedef {'physical' | 'digital'} ArmoryItemType
 *
 * @typedef {object} QuartermasterItem
 * @property {string} id — Stable SKU key for armory / fulfillment pipelines.
 * @property {string} title — Human-readable line item in Command / Quartermaster UIs.
 * @property {string} description — In-universe and compliance-safe marketing copy.
 * @property {ArmoryItemType} type — Fulfillment channel: on-field kit vs. in-app entitlements.
 * @property {number} cost — **Tactical Credits (TC)** required at list price; non-negative integer.
 * @property {number} minLevel — Minimum Operative level before this row appears in the available catalog.
 * @property {string} icon — Icon registry token (e.g. `nav.crosshair`).
 */

/**
 * Authoritative **Quartermaster** SKU table. Every {@link QuartermasterItem.cost} is in **Tactical Credits**.
 * @type {ReadonlyArray<QuartermasterItem>}
 */
export const QUARTERMASTER_INVENTORY = Object.freeze([
	{
		id: 'patch_sniper',
		title: 'Sniper Certification Patch',
		description:
			'Physical embroidered patch. Awarded for elite striking accuracy. Attach to your training kit.',
		type: 'physical',
		cost: 1500,
		minLevel: 5,
		icon: 'nav.crosshair',
	},
	{
		id: 'digi_border_neon',
		title: 'Neon Operative Border',
		description: 'Digital UI upgrade. Surrounds your Player ID card with a glowing tactical border.',
		type: 'digital',
		cost: 500,
		minLevel: 2,
		icon: 'content.package',
	},
	{
		id: 'tactical_override',
		title: 'Tactical Override: Choose Drill',
		description:
			'Submit a request to HQ to choose the closing drill for the next training session.',
		type: 'digital',
		cost: 800,
		minLevel: 3,
		icon: 'comm.bell',
	},
	{
		id: 'gear_armband',
		title: "Captain's Tactical Armband",
		description: 'Physical gear. High-visibility armband authorizing field command during scrimmages.',
		type: 'physical',
		cost: 5000,
		minLevel: 10,
		icon: 'status.shield-check',
	},
]);

/**
 * Returns catalog rows the operative is **cleared to obtain** at the given level: `minLevel <= playerLevel`.
 * Results are ordered by **Tactical Credits** list price, ascending (budget-friendly first).
 * Does not deduct TC; balance checks belong to the wallet / checkout flow.
 *
 * @param {number} playerLevel — Current Operative level (floor-coerced; sub-threshold yields empty set).
 * @returns {QuartermasterItem[]} Shallow-copied, sorted subset of {@link QUARTERMASTER_INVENTORY}; prices remain in **Tactical Credits**.
 */
export function getAvailableItems(playerLevel) {
	const L = Math.max(0, Math.floor(Number(playerLevel) || 0));
	return [...QUARTERMASTER_INVENTORY]
		.filter((item) => L >= item.minLevel)
		.sort((a, b) => a.cost - b.cost);
}

/**
 * Firestore `users/{id}` in this app is typically keyed by **lowercased email**; falls back to Auth `uid`
 * when email is missing (e.g. rare anonymous flows).
 * @param {{ uid?: string, email?: string | null, displayName?: string | null, callSign?: string }} u
 * @returns {string}
 */
function getUserDocumentId(u) {
	if (u && typeof u.email === 'string' && u.email.trim()) {
		return u.email.trim().toLowerCase();
	}
	return String(u?.uid || '');
}

/**
 * @param {{ uid?: string, email?: string | null, displayName?: string | null, callSign?: string }} u
 * @returns {string}
 */
function getPlayerNameForFulfillment(u) {
	const d = u && typeof u.displayName === 'string' && u.displayName.trim() ? u.displayName.trim() : '';
	if (d) return d;
	const cs = u && typeof u.callSign === 'string' && u.callSign.trim() ? u.callSign.trim() : '';
	if (cs) return cs;
	if (u && typeof u.email === 'string' && u.email.includes('@')) {
		const first = u.email.split('@')[0] || '';
		if (first) return first;
	}
	return 'Operative';
}

/**
 * Deducts Tactical Credits and creates a club-scoped fulfillment request (Quartermaster / Path B).
 *
 * @param {{ uid?: string, email?: string | null, displayName?: string | null, callSign?: string }} user — Firebase Auth user or compatible object
 * @param {QuartermasterItem} item
 * @param {string} clubId
 * @returns {Promise<string>} The new fulfillment document id
 */
export async function processDeploymentRequest(user, item, clubId) {
	const club = typeof clubId === 'string' ? clubId.trim() : '';
	if (!club) {
		throw new Error('processDeploymentRequest: clubId is required.');
	}
	if (!user || (!user.uid && !user.email)) {
		throw new Error('processDeploymentRequest: user with uid or email is required.');
	}
	const idKey = getUserDocumentId(user);
	if (!idKey) {
		throw new Error('processDeploymentRequest: could not resolve user document id.');
	}

	const userRef = doc(db, 'users', idKey);
	const fulfillmentsCol = collection(db, 'organizations', club, 'fulfillments');
	const fulfillmentRef = doc(fulfillmentsCol);

	const cost = Math.max(0, Math.floor(Number(item?.cost) || 0));
	const itemId = typeof item?.id === 'string' ? item.id : '';
	const itemTitle = typeof item?.title === 'string' ? item.title : '';
	const itemType = item?.type === 'physical' || item?.type === 'digital' ? item.type : 'digital';
	if (!itemId) {
		throw new Error('processDeploymentRequest: item.id is required.');
	}

	const playerName = getPlayerNameForFulfillment(/** @type {Parameters<typeof getPlayerNameForFulfillment>[0]} */ (user));
	const playerId = String(user.uid || idKey);

	const fulfillmentPayload = {
		playerId,
		playerName,
		itemId,
		itemTitle,
		cost,
		type: itemType,
		status: 'pending',
		requestedAt: serverTimestamp(),
	};

	// Lazy import breaks armory ↔ loadoutSchema circular dependency at module init.
	const { getLoadoutCatalog } = await import('./loadoutSchema.js');
	const LOADOUT_CATALOG_IDS = new Set(getLoadoutCatalog().map((row) => row.id));
	const isDigitalLoadoutSku = itemType === 'digital' && LOADOUT_CATALOG_IDS.has(itemId);

	if (isDigitalLoadoutSku) {
		const redeemFn = httpsCallable(functions, 'redeemQuartermasterDigital');
		const result = await redeemFn({ itemId, clubId: club });
		return /** @type {{ data?: { fulfillmentId?: string } }} */ (result).data?.fulfillmentId ?? '';
	}

	try {
		const fulfillmentId = await runTransaction(db, async (transaction) => {
			const userSnap = await transaction.get(userRef);
			if (!userSnap.exists()) {
				throw new Error('User profile not found.');
			}
			const data = userSnap.data();
			const credits = Math.max(0, Math.floor(Number(data?.tacticalCredits) || 0));
			if (credits < cost) {
				throw new Error('Insufficient Tactical Credits.');
			}
			/** @type {Record<string, unknown>} */
			const userPatch = { tacticalCredits: credits - cost };
			transaction.update(userRef, userPatch);
			transaction.set(fulfillmentRef, fulfillmentPayload);
			return fulfillmentRef.id;
		});
		return fulfillmentId;
	} catch (e) {
		console.error('[armory] processDeploymentRequest', e);
		throw e;
	}
}
