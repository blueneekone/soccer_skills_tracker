/**
 * Quartermaster — Operative OS reward catalog (Path B: Tactical Credits economy).
 * SIEM / enterprise framing: commissary issues kit against clearance level, not charisma.
 *
 * @typedef {'physical' | 'digital'} ArmoryItemType
 *
 * @typedef {object} QuartermasterItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {ArmoryItemType} type
 * @property {number} cost — Tactical Credits (TC), integer ≥ 0
 * @property {number} minLevel — minimum Operative level to reveal this SKU in the armory
 * @property {string} icon — Phosphor icon class suffix (e.g. `ph-target` → `class="ph ph-target"`)
 */

/** @type {ReadonlyArray<QuartermasterItem>} */
export const QUARTERMASTER_INVENTORY = Object.freeze([
	{
		id: 'item_patch_sniper',
		title: 'Sniper Certification Patch',
		description:
			'Woven command patch for verified finishing drills. Issued to operatives with cleared L3 threat vectors — show it on the touchline, not the timeline.',
		type: 'physical',
		cost: 85,
		minLevel: 4,
		icon: 'ph-crosshair',
	},
	{
		id: 'item_border_thermal',
		title: 'Thermal HUD Card Border',
		description:
			'Digital frame for your Operative ID: faux thermal sweep, no sensor drift. Simulates SIEM heat-map without touching production telemetry.',
		type: 'digital',
		cost: 40,
		minLevel: 2,
		icon: 'ph-squares-four',
	},
	{
		id: 'item_wrist_ledger',
		title: 'Field Ops Wrist Ledger',
		description:
			'Pocket-sized waterproof log for reps and RPE when the sideline app is a no-go. Quartermaster-stamped; not a medical device — training intel only.',
		type: 'physical',
		cost: 120,
		minLevel: 6,
		icon: 'ph-notebook',
	},
	{
		id: 'item_badge_calm',
		title: 'Calm-Under-Scan Pin',
		description:
			'Lapel pin: “No false positives.” Awarded in-universe to operatives who hold composure through full-session monitoring drills.',
		type: 'physical',
		cost: 55,
		minLevel: 3,
		icon: 'ph-shield-check',
	},
	{
		id: 'item_avatar_orbit',
		title: 'Low-Orbit Avatar Halo',
		description:
			'Cosmetic ring asset for your roster portrait — subtle parallax, Command-approved palette. Denied for accounts below clearance; no refund on downgrade.',
		type: 'digital',
		cost: 200,
		minLevel: 10,
		icon: 'ph-planet',
	},
]);

/**
 * Returns armory line items the operative is cleared to *see* at this level
 * (catalog rows at or below their clearance). Purchase still costs {@link QuartermasterItem.cost} TC.
 *
 * @param {number} playerLevel — current Operative level (1–99 in typical play)
 * @returns {QuartermasterItem[]}
 */
export function getAvailableItems(playerLevel) {
	const L = Math.max(0, Math.floor(Number(playerLevel) || 0));
	return QUARTERMASTER_INVENTORY.filter((item) => L >= item.minLevel);
}
