/**
 * Season 1 sticker album — catalog + MTG/Pokémon-style print variants.
 * @typedef {'Common' | 'Rare' | 'Epic' | 'Legendary'} SeasonOneRarity
 * @typedef {'base' | 'holo' | 'radiant' | 'alt-art'} SeasonStickerVariant
 * @typedef {{
 *   id: string;
 *   conceptId: string;
 *   setId: string;
 *   name: string;
 *   rarity: SeasonOneRarity;
 *   variant: SeasonStickerVariant;
 *   imagePath: string;
 * }} SeasonOneCard
 * @typedef {{ id: string; title: string; tagline: string; order: number }} SeasonOneSetMeta
 */

/** @type {readonly SeasonStickerVariant[]} */
export const SEASON_STICKER_VARIANTS = /** @type {const} */ ([
	'base',
	'holo',
	'radiant',
	'alt-art',
]);

/** Canonical season key for persistence / UI copy. */
export const SEASON_ONE_ID = 'season_1';

/**
 * Designed collection ceiling for Season 1 (HUD denominator).
 */
export const SEASON_ONE_ALBUM_CAP = 200;

/** Ordered sticker sets (folders in the album). */
export const seasonOneSets = /** @type {const} */ ([
	{
		id: 'street_kings',
		title: 'The Street Kings',
		tagline: 'Flair, freeze, and concrete chaos.',
		order: 1,
	},
	{
		id: 'snipers',
		title: 'The Snipers',
		tagline: 'Cold blood in the final third.',
		order: 2,
	},
	{
		id: 'dark_arts',
		title: 'The Dark Arts',
		tagline: 'Gamesmanship & grit.',
		order: 3,
	},
]);

/**
 * @param {unknown} v
 * @returns {SeasonStickerVariant}
 */
export function normalizeStickerVariant(v) {
	if (v === 'holo' || v === 'radiant' || v === 'alt-art' || v === 'base') return v;
	return 'base';
}

/**
 * @param {SeasonStickerVariant} v
 */
export function formatVariantLabel(v) {
	switch (v) {
		case 'holo':
			return 'Holo';
		case 'radiant':
			return 'Radiant';
		case 'alt-art':
			return 'Alt Art';
		default:
			return 'Base';
	}
}

/**
 * Master Season 1 catalog (flat list — economy scales via multiple rows sharing `conceptId`).
 * `imagePath` uses SVG placeholder until PNG artwork ships.
 */
export const seasonOneCards = /** @type {SeasonOneCard[]} */ ([
	/* ─── The Street Kings ─── */
	{
		id: 'card_001_base',
		conceptId: 'the_nutmeg',
		setId: 'street_kings',
		name: 'The Nutmeg',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_001_holo',
		conceptId: 'the_nutmeg',
		setId: 'street_kings',
		name: 'The Nutmeg',
		rarity: 'Common',
		variant: 'holo',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_002_base',
		conceptId: 'concrete_touch',
		setId: 'street_kings',
		name: 'Concrete Touch',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_003_base',
		conceptId: 'rainbow_flick',
		setId: 'street_kings',
		name: 'Rainbow Flick',
		rarity: 'Rare',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_004_base',
		conceptId: 'stop_roll',
		setId: 'street_kings',
		name: 'Stop & Roll',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_005_base',
		conceptId: 'elastico_exit',
		setId: 'street_kings',
		name: 'Elastico Exit',
		rarity: 'Epic',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_006_base',
		conceptId: 'no_look_slip',
		setId: 'street_kings',
		name: 'No-Look Slip',
		rarity: 'Rare',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_007_base',
		conceptId: 'king_of_sidestep',
		setId: 'street_kings',
		name: 'King of Sidestep',
		rarity: 'Legendary',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_007_radiant',
		conceptId: 'king_of_sidestep',
		setId: 'street_kings',
		name: 'King of Sidestep',
		rarity: 'Legendary',
		variant: 'radiant',
		imagePath: '/cards/placeholder.svg',
	},

	/* ─── The Snipers ─── */
	{
		id: 'card_008_base',
		conceptId: 'top_bins_only',
		setId: 'snipers',
		name: 'Top Bins Only',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_009_base',
		conceptId: 'near_post_heat',
		setId: 'snipers',
		name: 'Near-Post Heat',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_010_base',
		conceptId: 'volley_violation',
		setId: 'snipers',
		name: 'Volley Violation',
		rarity: 'Rare',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_011_base',
		conceptId: 'first_time_cannon',
		setId: 'snipers',
		name: 'First-Time Cannon',
		rarity: 'Epic',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_012_base',
		conceptId: 'chip_chill',
		setId: 'snipers',
		name: 'Chip & Chill',
		rarity: 'Rare',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_013_base',
		conceptId: 'weak_foot_lie_detector',
		setId: 'snipers',
		name: 'Weak-Foot Lie Detector',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_014_base',
		conceptId: 'gk_sweatshirt',
		setId: 'snipers',
		name: 'GK Sweatshirt',
		rarity: 'Epic',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_015_base',
		conceptId: 'golden_boot_dreams',
		setId: 'snipers',
		name: 'Golden Boot Dreams',
		rarity: 'Legendary',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_015_alt_art',
		conceptId: 'golden_boot_dreams',
		setId: 'snipers',
		name: 'Golden Boot Dreams',
		rarity: 'Legendary',
		variant: 'alt-art',
		imagePath: '/cards/placeholder.svg',
	},

	/* ─── The Dark Arts ─── */
	{
		id: 'card_016_base',
		conceptId: 'professional_foul',
		setId: 'dark_arts',
		name: 'Professional Foul',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_017_base',
		conceptId: 'tunnel_vision_challenge',
		setId: 'dark_arts',
		name: 'Tunnel Vision Challenge',
		rarity: 'Common',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_018_base',
		conceptId: 'late_arrival_press',
		setId: 'dark_arts',
		name: 'Late-Arrival Press',
		rarity: 'Rare',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_019_base',
		conceptId: 'invisible_shirt_tug',
		setId: 'dark_arts',
		name: 'Invisible Shirt Tug',
		rarity: 'Epic',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_020_base',
		conceptId: 'ref_whisperer',
		setId: 'dark_arts',
		name: 'Ref Whisperer',
		rarity: 'Rare',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
	{
		id: 'card_021_base',
		conceptId: 'master_of_dark_arts',
		setId: 'dark_arts',
		name: 'Master of the Dark Arts',
		rarity: 'Legendary',
		variant: 'base',
		imagePath: '/cards/placeholder.svg',
	},
]);

/**
 * @param {string} setId
 * @returns {SeasonOneCard[]}
 */
export function getSeasonOneCardsForSet(setId) {
	return seasonOneCards.filter((c) => c.setId === setId);
}

/**
 * @param {string} conceptId
 * @returns {SeasonOneCard[]}
 */
export function getSeasonOneCardsByConcept(conceptId) {
	return seasonOneCards.filter((c) => c.conceptId === conceptId);
}

/**
 * @param {string} id
 * @returns {SeasonOneSetMeta | undefined}
 */
export function getSeasonOneSetById(id) {
	return seasonOneSets.find((s) => s.id === id);
}

/**
 * @param {string} cardId
 * @returns {SeasonOneCard | undefined}
 */
export function getSeasonOneCardById(cardId) {
	return seasonOneCards.find((c) => c.id === cardId);
}
