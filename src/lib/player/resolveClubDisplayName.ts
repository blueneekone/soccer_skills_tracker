/** Profile fields used to resolve organization/club label for Operative ID surfaces. */
export type ClubProfileSlice = {
	clubId?: string | null;
	clubDisplayName?: string | null;
	teamId?: string | null;
};

export type ClubDocSlice = {
	name?: string | null;
} | null | undefined;

/** Team doc slice for clubId resolution only — never use name/teamName for display. */
export type TeamDocSlice = {
	clubId?: string | null;
	name?: string | null;
	teamName?: string | null;
} | null | undefined;

/**
 * Resolve club/org display name for emblem `clubName` — never `teams.teamName`.
 * Priority: `clubs/{clubId}.name` → `clubDisplayName` → ''.
 */
export function resolveClubDisplayName(
	profile: ClubProfileSlice | null | undefined,
	clubDoc?: ClubDocSlice,
): string {
	const fromDoc =
		typeof clubDoc?.name === 'string' && clubDoc.name.trim() ? clubDoc.name.trim() : '';
	if (fromDoc) return fromDoc;
	const fallback =
		typeof profile?.clubDisplayName === 'string' && profile.clubDisplayName.trim() ?
			profile.clubDisplayName.trim()
		:	'';
	return fallback;
}

export function clubIdFromProfile(profile: ClubProfileSlice | null | undefined): string {
	return typeof profile?.clubId === 'string' && profile.clubId.trim() ?
		profile.clubId.trim()
	:	'';
}

/**
 * Resolve `clubs/{clubId}` key: profile.clubId → teams doc clubId when profile has teamId.
 */
export function resolveClubIdFromProfile(
	profile: ClubProfileSlice | null | undefined,
	teamDoc?: TeamDocSlice,
): string {
	const fromProfile = clubIdFromProfile(profile);
	if (fromProfile) return fromProfile;
	const teamId =
		typeof profile?.teamId === 'string' && profile.teamId.trim() ? profile.teamId.trim() : '';
	if (!teamId || !teamDoc) return '';
	const fromTeam =
		typeof teamDoc.clubId === 'string' && teamDoc.clubId.trim() ? teamDoc.clubId.trim() : '';
	return fromTeam;
}
