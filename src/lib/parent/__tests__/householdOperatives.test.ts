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

	it('baseRowsFromHousehold dedupes duplicate playerEmails by normalized email', () => {
		const rows = baseRowsFromHousehold({
			playerEmails: ['ace@operative.local', 'ACE@operative.local', 'ace@operative.local'],
			playerNames: ['Ace One', 'Ace Two', 'Ace Three'],
			playerCallsigns: ['ace_one', 'ace_two', 'ace_three'],
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]?.email).toBe('ace@operative.local');
		expect(rows[0]?.name).toBe('Ace One');
	});
});
