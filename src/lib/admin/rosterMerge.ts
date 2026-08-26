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
	const linkedMap = new Map<string, RosterRow>();

	for (const r of linkedRows) {
		const name = r.playerName?.trim() || '';
		const key = name.toLowerCase() || r.email.toLowerCase();
		if (!key) continue;

		const existing = linkedMap.get(key);
		const email = r.email.includes('@') ? r.email : existing?.email || '';
		const parentEmails = [
			...(existing?.parentEmails || []),
			...(Array.isArray(r.parentEmails) ? r.parentEmails.filter((e) => typeof e === 'string' && e.trim()) : []),
		];

		linkedMap.set(key, {
			key: email || r.email || `player:${key}`,
			email,
			playerName: name || existing?.playerName || key,
			ageGroup: r.ageGroup || existing?.ageGroup || null,
			teamId: r.teamId || existing?.teamId || teamId,
			nameOnly: false,
			parentEmails: Array.from(new Set(parentEmails)),
			householdId: r.householdId?.trim() || existing?.householdId || null,
			vpcStatus: r.vpcStatus?.trim() || existing?.vpcStatus || null,
		});
	}

	const linkedRowsDeduplicated = Array.from(linkedMap.values());
	const linkedNameSet = new Set<string>(
		linkedRowsDeduplicated.map((r) => r.playerName.trim().toLowerCase()).filter(Boolean),
	);

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

	return [...linkedRowsDeduplicated, ...nameOnlyRows].sort((a, b) =>
		a.playerName.localeCompare(b.playerName, undefined, { sensitivity: 'base' }),
	);
}
