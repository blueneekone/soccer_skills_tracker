/**
 * rosterDisplayDedupe.ts — one assignable row per auth uid at roster merge boundaries.
 * Prefer users/{uid} (or doc with valid uid field) over email-key ghosts / name-only rows
 * when display names match. Do not refactor teamsStore — use at IntentEngine / SquadTelemetry merge only.
 */

export type RosterDedupeRow = {
	uid?: string;
	rosterKey?: string;
	playerName?: string;
	email?: string;
	assignable?: boolean;
	nameOnly?: boolean;
};

function normName(name: string): string {
	return name.trim().toLowerCase();
}

/** Valid Firebase Auth uid — not an email doc id. */
export function isValidAuthUid(uid: unknown): uid is string {
	return typeof uid === 'string' && uid.trim().length > 0 && !uid.includes('@');
}

function rowScore(row: RosterDedupeRow): number {
	let score = 0;
	if (isValidAuthUid(row.uid)) score += 10;
	if (row.assignable) score += 5;
	if (!row.nameOnly) score += 3;
	if (row.email && row.email.includes('@')) score += 1;
	if (row.rosterKey && isValidAuthUid(row.rosterKey)) score += 2;
	return score;
}

/**
 * Collapse duplicate roster rows: one entry per auth uid; name-only ghosts lose to uid-linked rows.
 */
export function dedupeRosterEntries<T extends RosterDedupeRow>(rows: readonly T[]): T[] {
	const byUid = new Map<string, T>();
	const byName = new Map<string, T>();
	const passthrough: T[] = [];

	for (const row of rows) {
		const uid = isValidAuthUid(row.uid) ? row.uid.trim() : '';
		const name = typeof row.playerName === 'string' ? normName(row.playerName) : '';

		if (uid) {
			const prev = byUid.get(uid);
			if (!prev || rowScore(row) > rowScore(prev)) byUid.set(uid, row);
			continue;
		}

		if (name) {
			const prev = byName.get(name);
			if (!prev || rowScore(row) > rowScore(prev)) byName.set(name, row);
			continue;
		}

		passthrough.push(row);
	}

	const uidRows = [...byUid.values()];
	const uidNames = new Set(
		uidRows
			.map((r) => (typeof r.playerName === 'string' ? normName(r.playerName) : ''))
			.filter(Boolean),
	);

	const result: T[] = [...uidRows];
	for (const [name, row] of byName) {
		if (uidNames.has(name)) continue;
		result.push(row);
	}
	result.push(...passthrough);

	return result;
}

/**
 * Coach HQ roster table: canonical display names with duplicate uid / ghost collapse.
 */
export function buildCoachRosterDisplayNames(input: {
	userDocs: Array<{ id: string; data: Record<string, unknown> }>;
	rosterNames: string[];
	statsKeys: string[];
	statsByKey: Record<string, { playerName?: unknown }>;
	linkedNameToEmail: Record<string, string>;
}): string[] {
	const userRows = input.userDocs
		.filter((d) => d.data.role === 'player')
		.map((d) => {
			const x = d.data;
			const authUid = isValidAuthUid(x.uid) ? String(x.uid).trim() : '';
			const playerName =
				typeof x.playerName === 'string' && x.playerName.trim() ?
					x.playerName.trim()
				:	d.id;
			return {
				uid: authUid,
				rosterKey: authUid || d.id,
				email: d.id,
				playerName,
				assignable: Boolean(authUid || d.id.includes('@')),
				nameOnly: false,
			};
		});

	const deduped = dedupeRosterEntries(userRows);
	const assignableNames = new Set(
		deduped
			.filter((r) => r.assignable && typeof r.playerName === 'string')
			.map((r) => normName(r.playerName!)),
	);

	const names: string[] = [];
	const seen = new Set<string>();

	const pushName = (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed) return;
		const key = normName(trimmed);
		if (seen.has(key)) return;
		seen.add(key);
		names.push(trimmed);
	};

	for (const row of deduped) {
		if (typeof row.playerName === 'string') pushName(row.playerName);
	}

	for (const rawName of input.rosterNames) {
		if (typeof rawName !== 'string') continue;
		const key = normName(rawName);
		if (assignableNames.has(key)) continue;
		pushName(rawName);
	}

	for (const [displayName] of Object.entries(input.linkedNameToEmail)) {
		const key = normName(displayName);
		if (assignableNames.has(key)) continue;
		pushName(displayName);
	}

	for (const statsKey of input.statsKeys) {
		const statsRow = input.statsByKey[statsKey];
		const label =
			typeof statsRow?.playerName === 'string' && statsRow.playerName.trim() ?
				statsRow.playerName.trim()
			:	statsKey;
		const key = normName(label);
		if (assignableNames.has(key) || seen.has(key)) continue;
		pushName(label);
	}

	return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
