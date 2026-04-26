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
 * @property {string} icon — Phosphor icon class token (e.g. `ph-crosshair` with `class="ph ph-crosshair"`).
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
		icon: 'ph-crosshair',
	},
	{
		id: 'digi_border_neon',
		title: 'Neon Operative Border',
		description: 'Digital UI upgrade. Surrounds your Player ID card with a glowing tactical border.',
		type: 'digital',
		cost: 500,
		minLevel: 2,
		icon: 'ph-bounding-box',
	},
	{
		id: 'tactical_override',
		title: 'Tactical Override: Choose Drill',
		description:
			'Submit a request to HQ to choose the closing drill for the next training session.',
		type: 'digital',
		cost: 800,
		minLevel: 3,
		icon: 'ph-whistle',
	},
	{
		id: 'gear_armband',
		title: "Captain's Tactical Armband",
		description: 'Physical gear. High-visibility armband authorizing field command during scrimmages.',
		type: 'physical',
		cost: 5000,
		minLevel: 10,
		icon: 'ph-shield-star',
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
