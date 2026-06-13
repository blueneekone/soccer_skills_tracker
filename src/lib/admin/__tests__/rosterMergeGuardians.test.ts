import { describe, expect, it } from 'vitest';
import { mergeAdminRoster } from '../rosterMerge.js';

describe('mergeAdminRoster — guardian graph fields', () => {
	it('passes parentEmails, householdId, and vpcStatus through linked rows', () => {
		const rows = mergeAdminRoster(
			[
				{
					email: 'kid@operative.local',
					playerName: 'Kid One',
					ageGroup: 'U12',
					teamId: 'club_team',
					parentEmails: ['parent@example.com'],
					householdId: 'hh_abc',
					vpcStatus: 'verified',
				},
			],
			[],
			'club_team',
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].parentEmails).toEqual(['parent@example.com']);
		expect(rows[0].householdId).toBe('hh_abc');
		expect(rows[0].vpcStatus).toBe('verified');
	});

	it('defaults guardian fields for name-only roster entries', () => {
		const rows = mergeAdminRoster([], ['Legacy Name'], 'club_team');
		expect(rows[0].parentEmails).toEqual([]);
		expect(rows[0].householdId).toBeNull();
		expect(rows[0].vpcStatus).toBeNull();
		expect(rows[0].nameOnly).toBe(true);
	});
});
