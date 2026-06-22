import { describe, expect, it } from 'vitest';
import {
	buildCoachRosterDisplayNames,
	dedupeRosterEntries,
	isValidAuthUid,
} from '../rosterDisplayDedupe.js';

describe('rosterDisplayDedupe — LAUNCH-HOTFIX-P5', () => {
	it('isValidAuthUid rejects email-shaped ids', () => {
		expect(isValidAuthUid('abc123uid')).toBe(true);
		expect(isValidAuthUid('player@example.com')).toBe(false);
		expect(isValidAuthUid('')).toBe(false);
	});

	it('dedupeRosterEntries keeps uid doc over email ghost with same name', () => {
		const rows = dedupeRosterEntries([
			{
				uid: '',
				rosterKey: 'ghost@example.com',
				email: 'ghost@example.com',
				playerName: 'Alex Operative',
				assignable: true,
				nameOnly: false,
			},
			{
				uid: 'auth-uid-alex',
				rosterKey: 'auth-uid-alex',
				email: 'alex@household.com',
				playerName: 'Alex Operative',
				assignable: true,
				nameOnly: false,
			},
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.uid).toBe('auth-uid-alex');
	});

	it('dedupeRosterEntries collapses duplicate auth uids', () => {
		const rows = dedupeRosterEntries([
			{
				uid: 'uid-a',
				rosterKey: 'uid-a',
				playerName: 'Player A',
				assignable: true,
			},
			{
				uid: 'uid-a',
				rosterKey: 'legacy@example.com',
				playerName: 'Player A Legacy',
				assignable: true,
			},
		]);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.rosterKey).toBe('uid-a');
	});

	it('buildCoachRosterDisplayNames drops roster ghost when assignable uid row exists', () => {
		const names = buildCoachRosterDisplayNames({
			userDocs: [
				{
					id: 'auth-uid-1',
					data: {
						role: 'player',
						uid: 'auth-uid-1',
						playerName: 'Jordan Test',
					},
				},
				{
					id: 'ghost@example.com',
					data: {
						role: 'player',
						playerName: 'Jordan Test',
					},
				},
			],
			rosterNames: ['Jordan Test'],
			statsKeys: [],
			statsByKey: {},
			linkedNameToEmail: {},
		});
		expect(names).toEqual(['Jordan Test']);
	});
});
