/**
 * Season 1 collectible ID card metadata — pure resolver (Sprint 3.5k).
 * Authority: docs/vision/OPERATIVE_ID_CARD.md §9
 */

import { parseOperativeLoadout, type OperativeLoadoutV1 } from './loadoutSchema.js';
import { getSeasonOneCardById } from './seasonOneData.js';

export type CardPrintVariant = 'base' | 'holo' | 'radiant' | 'alt-art';

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'illustration_rare';

export type OperativeCardMetadata = {
	setId: 'S1';
	collectorNumber: string;
	rarity: CardRarity;
	flavorText?: string;
	promoStamp?: string;
};

export const SEASON_ONE_COLLECTOR_CAP = 198;

export const RARITY_CHIP_LABELS: Record<CardRarity, string> = {
	common: 'COMMON',
	rare: 'RARE',
	epic: 'EPIC',
	legendary: 'LEGENDARY',
	illustration_rare: 'ILLUSTRATION RARE',
};

const RARITY_RANK: Record<CardRarity, number> = {
	common: 0,
	rare: 1,
	epic: 2,
	legendary: 3,
	illustration_rare: 4,
};

/** Loadout cosmetic id → minimum print rarity (alpha heuristic). */
const LOADOUT_RARITY_FLOOR: Readonly<Record<string, CardRarity>> = {
	digi_border_neon: 'rare',
	album_border_street_kings_holo: 'epic',
	album_badge_street_kings: 'rare',
	album_banner_vanguard: 'rare',
	album_banner_snipers: 'rare',
	album_banner_dark_arts: 'rare',
};

export type ResolveOperativeCardMetadataInput = {
	operativeLoadout?: unknown;
	ownedSeasonOneCards?: readonly string[];
	totalXp?: number;
	rankName?: string;
	/** uid or emailKey — deterministic collector number only; never echoed in flavor copy. */
	emailKey?: string;
	/** Public recruit path — suppress rank-specific flavor tiers. */
	publicRecruit?: boolean;
};

function djb2(str: string): number {
	let h = 5381;
	for (let i = 0; i < str.length; i++) {
		h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
	}
	return h;
}

export function formatCollectorNumber(emailKey: string | undefined, cap = SEASON_ONE_COLLECTOR_CAP): string {
	const seed = String(emailKey ?? 'operative').trim().toLowerCase() || 'operative';
	const n = (djb2(seed) % cap) + 1;
	return `${String(n).padStart(3, '0')}/${cap}`;
}

function maxRarity(a: CardRarity, b: CardRarity): CardRarity {
	return RARITY_RANK[a] >= RARITY_RANK[b] ? a : b;
}

function rarityFromSeasonOneCard(cardId: string): CardRarity | null {
	const row = getSeasonOneCardById(cardId);
	if (!row) return null;
	if (row.variant === 'alt-art') return 'illustration_rare';
	switch (row.rarity) {
		case 'Legendary':
			return 'legendary';
		case 'Epic':
			return 'epic';
		case 'Rare':
			return 'rare';
		default:
			return 'common';
	}
}

function rarityFromLoadout(loadout: OperativeLoadoutV1 | null): CardRarity {
	if (!loadout) return 'common';
	let best: CardRarity = 'common';
	for (const id of Object.values(loadout.equipped)) {
		if (typeof id !== 'string' || !id) continue;
		const floor = LOADOUT_RARITY_FLOOR[id];
		if (floor) best = maxRarity(best, floor);
	}
	return best;
}

/**
 * COPPA-safe flavor — rank tier only, no PII or player name.
 */
export function resolveFlavorText(rankName?: string, publicRecruit = false): string {
	if (publicRecruit) {
		return 'Coach-verified training telemetry — club-agnostic Season 1 print.';
	}
	const rank = (rankName ?? '').trim().toLowerCase();
	if (rank.includes('legend') || rank.includes('vanguard') || rank.includes('elite')) {
		return 'Elite operatives earn every stripe on the card.';
	}
	if (rank.includes('veteran') || rank.includes('specialist')) {
		return 'Rank earned in sessions — consistency beats shortcuts.';
	}
	if (rank.includes('operative') || rank.includes('agent')) {
		return 'Train the telemetry — every rep updates your dossier.';
	}
	return 'Every logged rep writes your operative file.';
}

/** Map print rarity → StickerVariantShell variant (foil tier driven by rarity). */
export function stickerVariantFromCardRarity(rarity: CardRarity): CardPrintVariant {
	switch (rarity) {
		case 'illustration_rare':
			return 'alt-art';
		case 'legendary':
			return 'radiant';
		case 'epic':
		case 'rare':
			return 'holo';
		default:
			return 'base';
	}
}

/**
 * Alpha rarity rules:
 * 1. Highest owned Season 1 album card (variant + rarity from seasonOneData).
 * 2. Floor from equipped border / badge / banner loadout ids.
 * 3. Default common when neither applies.
 */
export function resolveOperativeCardMetadata(
	input: ResolveOperativeCardMetadataInput,
): OperativeCardMetadata {
	const loadout = parseOperativeLoadout(input.operativeLoadout);
	let rarity: CardRarity = rarityFromLoadout(loadout);

	for (const cardId of input.ownedSeasonOneCards ?? []) {
		if (typeof cardId !== 'string') continue;
		const fromCard = rarityFromSeasonOneCard(cardId);
		if (fromCard) rarity = maxRarity(rarity, fromCard);
	}

	return {
		setId: 'S1',
		collectorNumber: formatCollectorNumber(input.emailKey),
		rarity,
		flavorText: resolveFlavorText(input.rankName, input.publicRecruit),
	};
}
