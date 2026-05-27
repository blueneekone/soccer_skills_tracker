import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';
import { getSeasonOneCardsForSet, seasonOneSets } from './seasonOneData.js';

/** Season 1 album folders eligible for set-completion banner grants. */
export type AlbumSetId = 'street_kings' | 'snipers' | 'dark_arts';

export type AlbumSetBonusReward = {
	bannerCosmeticId: string;
	chipLabel: string;
};

/** Set folder → banner cosmetic + HQ dossier chip copy (cosmetic-only). */
export const ALBUM_SET_BONUS_REWARDS: Readonly<Record<AlbumSetId, AlbumSetBonusReward>> = {
	street_kings: {
		bannerCosmeticId: 'album_banner_vanguard',
		chipLabel: 'STREET KINGS SET',
	},
	snipers: {
		bannerCosmeticId: 'album_banner_snipers',
		chipLabel: 'SNIPERS SET',
	},
	dark_arts: {
		bannerCosmeticId: 'album_banner_dark_arts',
		chipLabel: 'DARK ARTS SET',
	},
};

const ALBUM_SET_IDS = new Set<string>(Object.keys(ALBUM_SET_BONUS_REWARDS));

function toOwnedSet(ownedCardIds: Set<string> | readonly string[]): Set<string> {
	if (ownedCardIds instanceof Set) return ownedCardIds;
	return new Set(ownedCardIds);
}

/** True when every catalog card for the set is in the owned id collection. */
export function isAlbumSetComplete(
	setId: string,
	ownedCardIds: Set<string> | readonly string[],
): boolean {
	const cards = getSeasonOneCardsForSet(setId);
	if (!cards.length) return false;
	const owned = toOwnedSet(ownedCardIds);
	return cards.every((c) => owned.has(c.id));
}

/** Completed set folder ids (order follows seasonOneSets). */
export function getCompletedAlbumSetIds(ownedCardIds: Set<string> | readonly string[]): string[] {
	return seasonOneSets
		.map((s) => s.id)
		.filter((setId) => isAlbumSetComplete(setId, ownedCardIds));
}

/**
 * Set ids where folder is complete but the set banner cosmetic is not yet owned.
 * Client uses this to trigger server `grantAlbumSetBonus` — never self-grant.
 */
export function getPendingSetBonusGrants(
	ownedCardIds: Set<string> | readonly string[],
	ownedCosmetics: readonly string[],
): AlbumSetId[] {
	const ownedCosm = new Set(ownedCosmetics);
	return getCompletedAlbumSetIds(ownedCardIds).filter((setId): setId is AlbumSetId => {
		if (!ALBUM_SET_IDS.has(setId)) return false;
		const reward = ALBUM_SET_BONUS_REWARDS[setId as AlbumSetId];
		return !ownedCosm.has(reward.bannerCosmeticId);
	});
}

/** HQ world strip chip label for a completed set, or null if unknown. */
export function getAlbumSetChipLabel(setId: string): string | null {
	if (!ALBUM_SET_IDS.has(setId)) return null;
	return ALBUM_SET_BONUS_REWARDS[setId as AlbumSetId].chipLabel;
}

/** Chip labels for all completed sets (for HQ badges). */
export function getCompletedAlbumSetChipLabels(
	ownedCardIds: Set<string> | readonly string[],
): { setId: string; label: string }[] {
	return getCompletedAlbumSetIds(ownedCardIds)
		.map((setId) => {
			const label = getAlbumSetChipLabel(setId);
			return label ? { setId, label } : null;
		})
		.filter((row): row is { setId: string; label: string } => row != null);
}

/**
 * Server-verified grants for pending set bonuses (debounced caller in Armory).
 * Idempotent: already-owned banners return OK from callable.
 */
export async function grantPendingAlbumSetBonuses(
	ownedCardIds: Set<string> | readonly string[],
	ownedCosmetics: readonly string[],
): Promise<void> {
	const pending = getPendingSetBonusGrants(ownedCardIds, ownedCosmetics);
	if (!pending.length) return;

	const grantFn = httpsCallable<{ setId: string }, { ok: boolean }>(
		functions,
		'grantAlbumSetBonus',
	);

	for (const setId of pending) {
		await grantFn({ setId });
	}
}
