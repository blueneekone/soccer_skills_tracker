import type { AdminClub } from '$lib/types/adminOrganizations.js';

function trimString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Normalizes a Firestore club document — never drops rows for missing fields. */
export function normalizeClubDocument(id: string, raw: Record<string, unknown>): AdminClub {
	return {
		id,
		name: trimString(raw.name),
		sport: trimString(raw.sport),
		directorEmail: trimString(raw.directorEmail),
		isInfinite: raw.isInfinite === true,
		tier: trimString(raw.tier),
		subscriptionTier: trimString(raw.subscriptionTier),
		logoUrl: trimString(raw.logoUrl),
		createdAt: raw.createdAt ?? null,
		verifiedAddress: trimString(raw.verifiedAddress),
		phoneNumber: trimString(raw.phoneNumber),
		primaryFacility: trimString(raw.primaryFacility),
	};
}

/** Sorts clubs alphabetically by name, falling back to id. */
export function sortClubsByName(clubs: AdminClub[]): AdminClub[] {
	return [...clubs].sort((a, b) => (a.name || a.id || '').localeCompare(b.name || b.id || ''));
}
