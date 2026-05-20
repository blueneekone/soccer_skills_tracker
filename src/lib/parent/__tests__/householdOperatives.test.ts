import { describe, expect, it } from 'vitest';
import { baseRowsFromHousehold } from '$lib/parent/householdOperatives.js';

describe('householdOperatives', () => {
	it('baseRowsFromHousehold maps parallel household arrays', () => {
		const rows = baseRowsFromHousehold({
			playerEmails: ['ace@operative.local', ''],
			playerNames: ['Ace Star', ''],
			playerCallsigns: ['ace_star', ''],
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			email: 'ace@operative.local',
			name: 'Ace Star',
			callsign: 'ace_star',
		});
	});

	it('baseRowsFromHousehold derives callsign from operative email when missing', () => {
		const rows = baseRowsFromHousehold({
			playerEmails: ['nova@operative.local'],
			playerNames: [],
			playerCallsigns: [],
		});
		expect(rows[0]?.callsign).toBe('nova');
		expect(rows[0]?.name).toBe('nova');
	});
});
