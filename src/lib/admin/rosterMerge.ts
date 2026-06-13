/**
 * Admin roster merge helper.
 * Merges email-linked rows (from player_lookup) with name-only entries
 * (from rosters/{teamId}.players[]).
 *
 * Rules:
 *  - Email-linked records are preferred (richer data).
 *  - Name-only entries fill in any name not already covered by a linked record.
 *  - Deduplication is by normalized (trimmed, lowercased) player name.
 *  - Result is sorted alphabetically by playerName.
 */

export interface RosterRow {
	/** Stable unique key for {#each} — email for linked rows, "nameonly:<name>" otherwise. */
	key: string;
	/** Actual email address, or empty string for name-only players. */
	email: string;
	playerName: string;
	ageGroup: string | null;
	teamId: string;
	/** True when the player was added to the roster without an account/email. */
	nameOnly: boolean;
	/** Linked guardian emails (denormalized from households / player_lookup). */
	parentEmails: string[];
	/** Household document id when linked. */
	householdId: string | null;
	/** VPC / consent status when known. */
	vpcStatus: string | null;
}

export interface LinkedRosterInput {
	email: string;
	playerName: string;
	ageGroup: string | null;
	teamId: string;
	parentEmails?: string[];
	householdId?: string | null;
	vpcStatus?: string | null;
}

/**
 * Merges player_lookup (email-linked) rows with name-only roster name strings.
 *
 * @param linkedRows  - Rows sourced from the player_lookup collection.
 * @param rosterNames - Name strings from rosters/{teamId}.players[].
 * @param teamId      - The team ID to attach to name-only rows.
 */
export function mergeAdminRoster(
	linkedRows: LinkedRosterInput[],
	rosterNames: string[],
	teamId: string,
): RosterRow[] {
	// Build a set of names already covered by an email-linked record (normalized).
	const linkedNameSet = new Set<string>(
		linkedRows
			.map((r) => r.playerName.trim().toLowerCase())
			.filter(Boolean),
	);

	const emailRows: RosterRow[] = linkedRows.map((r) => ({
		key: r.email,
		email: r.email,
		playerName: r.playerName,
		ageGroup: r.ageGroup,
		teamId: r.teamId,
		nameOnly: false,
		parentEmails: Array.isArray(r.parentEmails)
			? r.parentEmails.filter((e) => typeof e === 'string' && e.trim())
			: [],
		householdId: r.householdId?.trim() ? r.householdId.trim() : null,
		vpcStatus: r.vpcStatus?.trim() ? r.vpcStatus.trim() : null,
	}));

	const nameOnlyRows: RosterRow[] = rosterNames
		.filter((n) => typeof n === 'string' && n.trim().length > 0)
		.filter((n) => !linkedNameSet.has(n.trim().toLowerCase()))
		.map((n) => ({
			key: `nameonly:${n.trim()}`,
			email: '',
			playerName: n.trim(),
			ageGroup: null,
			teamId,
			nameOnly: true,
			parentEmails: [],
			householdId: null,
			vpcStatus: null,
		}));

	return [...emailRows, ...nameOnlyRows].sort((a, b) =>
		a.playerName.localeCompare(b.playerName, undefined, { sensitivity: 'base' }),
	);
}
