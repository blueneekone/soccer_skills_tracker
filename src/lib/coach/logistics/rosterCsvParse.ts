/** Coach Team Ops CSV import — client parse for secureBulkAddPlayers preview. */

export const MAX_ROSTER_CSV_ROWS = 200;

export type CoachRosterCsvRow = {
	playerName: string;
	playerEmail?: string;
	jersey?: string;
};

export type RosterCsvPreviewRow = CoachRosterCsvRow & {
	line: number;
	status: 'ready' | 'error';
	reason?: string;
};

export type RosterCsvParseError = {
	line: number;
	reason: string;
};

export type ParsedRosterCsv = {
	rows: RosterCsvPreviewRow[];
	errors: RosterCsvParseError[];
	capped: boolean;
};

const normEmail = (e: string) => e.trim().toLowerCase();
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/**
 * Zero-dep CSV parser with quoted field support.
 */
export function parseCsv(text: string): Record<string, string>[] {
	const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
	if (lines.length < 2) return [];

	function splitLine(line: string): string[] {
		const fields: string[] = [];
		let cur = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (ch === ',' && !inQuotes) {
				fields.push(cur.trim());
				cur = '';
			} else {
				cur += ch;
			}
		}
		fields.push(cur.trim());
		return fields;
	}

	const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
	const rows: Record<string, string>[] = [];
	for (let i = 1; i < lines.length; i++) {
		const vals = splitLine(lines[i]);
		if (vals.every((v) => !v.trim())) continue;
		const row: Record<string, string> = {};
		headers.forEach((h, idx) => {
			row[h] = vals[idx] ?? '';
		});
		rows.push(row);
	}
	return rows;
}

function getCol(row: Record<string, string>, ...keys: string[]): string {
	for (const k of keys) {
		const v = row[k] ?? row[k.replace(/\s+/g, '_').toLowerCase()];
		if (v?.trim()) return v.trim();
	}
	return '';
}

/**
 * Map a normalized CSV row to coach roster import shape (name required).
 */
export function mapRowToCoachRosterRow(
	row: Record<string, string>,
): { ok: true; row: CoachRosterCsvRow } | { ok: false; reason: string } {
	const playerName =
		getCol(row, 'name', 'full_name', 'player_name', 'first_last', 'display_name') ||
		`${getCol(row, 'first_name', 'first')} ${getCol(row, 'last_name', 'last')}`.trim().replace(/\s+/g, ' ');

	if (!playerName) {
		return { ok: false as const, reason: 'empty_name' };
	}
	if (playerName.length > 200) {
		return { ok: false as const, reason: 'name_too_long' };
	}

	const emailRaw = getCol(row, 'email', 'email_address', 'player_email', 'e_mail');
	let playerEmail: string | undefined;
	if (emailRaw) {
		const normalized = normEmail(emailRaw);
		if (!normalized || !isValidEmail(normalized)) {
			return { ok: false as const, reason: 'invalid_email' };
		}
		playerEmail = normalized;
	}

	const jerseyRaw = getCol(row, 'number', 'jersey', 'jersey_number', 'shirt_number', 'no_');
	const jersey = jerseyRaw ? jerseyRaw.slice(0, 16) : undefined;

	return {
		ok: true as const,
		row: {
			playerName,
			...(playerEmail ? { playerEmail } : {}),
			...(jersey ? { jersey } : {}),
		},
	};
}

/** Parse CSV text into preview rows with per-line validation. */
export function parseCoachRosterCsv(text: string): ParsedRosterCsv {
	const rawRows = parseCsv(text);
	const capped = rawRows.length > MAX_ROSTER_CSV_ROWS;
	const slice = capped ? rawRows.slice(0, MAX_ROSTER_CSV_ROWS) : rawRows;

	/** @type {RosterCsvPreviewRow[]} */
	const rows: RosterCsvPreviewRow[] = [];
	/** @type {RosterCsvParseError[]} */
	const errors: RosterCsvParseError[] = [];

	slice.forEach((row, idx) => {
		const line = idx + 2;
		const mapped = mapRowToCoachRosterRow(row);
		if (mapped.ok) {
			rows.push({
				line,
				...mapped.row,
				status: 'ready',
			});
		} else if ('reason' in mapped) {
			errors.push({ line, reason: mapped.reason });
			rows.push({
				line,
				playerName: getCol(row, 'name', 'full_name', 'player_name') || '—',
				status: 'error',
				reason: mapped.reason,
			});
		}
	});

	if (capped) {
		errors.push({ line: MAX_ROSTER_CSV_ROWS + 2, reason: 'row_cap_exceeded' });
	}

	return { rows, errors, capped };
}
