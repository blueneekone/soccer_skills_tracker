import { describe, expect, it } from 'vitest';
import {
	MAX_ROSTER_CSV_ROWS,
	mapRowToCoachRosterRow,
	parseCoachRosterCsv,
	parseCsv,
} from '../logistics/rosterCsvParse.js';

describe('rosterCsvParse — COACH-ROSTER-IMPORT', () => {
	it('parses header aliases into coach roster rows', () => {
		const rows = parseCsv(
			'Player Name,Email Address,Jersey Number\nAlex Morgan,sam@example.com,13\nJordan Lee,,7',
		);
		expect(rows).toHaveLength(2);
		const first = mapRowToCoachRosterRow(rows[0]!);
		expect(first.ok).toBe(true);
		if (first.ok) {
			expect(first.row).toEqual({
				playerName: 'Alex Morgan',
				playerEmail: 'sam@example.com',
				jersey: '13',
			});
		}
		const second = mapRowToCoachRosterRow(rows[1]!);
		expect(second.ok).toBe(true);
		if (second.ok) {
			expect(second.row).toEqual({ playerName: 'Jordan Lee', jersey: '7' });
		}
	});

	it('handles quoted CSV fields with embedded commas', () => {
		const rows = parseCsv('name,email\n"Morgan, Alex",alex@example.com');
		expect(rows[0]?.name).toBe('Morgan, Alex');
		const mapped = mapRowToCoachRosterRow(rows[0]!);
		expect(mapped.ok).toBe(true);
		if (mapped.ok) {
			expect(mapped.row.playerName).toBe('Morgan, Alex');
			expect(mapped.row.playerEmail).toBe('alex@example.com');
		}
	});

	it('rejects rows with empty player name', () => {
		const parsed = parseCoachRosterCsv('name,email\n,ghost@example.com\nValid Name,');
		expect(parsed.rows).toHaveLength(2);
		expect(parsed.rows[0]?.status).toBe('error');
		expect(parsed.rows[0]?.reason).toBe('empty_name');
		expect(parsed.rows[1]?.status).toBe('ready');
		expect(parsed.errors.some((e) => e.reason === 'empty_name')).toBe(true);
	});

	it(`caps import preview at ${MAX_ROSTER_CSV_ROWS} data rows`, () => {
		const header = 'name\n';
		const body = Array.from({ length: MAX_ROSTER_CSV_ROWS + 5 }, (_, i) => `Player ${i + 1}`).join('\n');
		const parsed = parseCoachRosterCsv(header + body);
		expect(parsed.capped).toBe(true);
		expect(parsed.rows).toHaveLength(MAX_ROSTER_CSV_ROWS);
		expect(parsed.errors.some((e) => e.reason === 'row_cap_exceeded')).toBe(true);
	});
});
