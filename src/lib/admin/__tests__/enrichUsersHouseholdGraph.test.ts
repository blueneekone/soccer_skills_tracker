import { describe, expect, it } from 'vitest';
import { formatHouseholdGraphLabel } from '../enrichUsersHouseholdGraph.js';
import type { GlobalUserRow } from '$lib/types/adminUsers.js';

const baseRow = (overrides: Partial<GlobalUserRow>): GlobalUserRow => ({
	id: 'test@test.com',
	email: 'test@test.com',
	displayName: '',
	playerName: '',
	role: 'player',
	clubId: 'club',
	teamId: '',
	lastActiveAt: 0,
	lastActiveSource: '',
	photoURL: '',
	...overrides,
});

describe('enrichUsersHouseholdGraph — formatHouseholdGraphLabel', () => {
	it('shows guardian emails for player rows', () => {
		const label = formatHouseholdGraphLabel(
			baseRow({ role: 'player', email: 'kid@operative.local' }),
			{ parentEmails: ['parent@example.com'] },
			['parent@example.com'],
		);
		expect(label).toBe('Guardian: parent@example.com');
	});

	it('shows athlete count for parent rows', () => {
		const label = formatHouseholdGraphLabel(
			baseRow({ role: 'parent', householdId: 'hh1' }),
			{ playerEmails: ['a@operative.local', 'b@operative.local'] },
		);
		expect(label).toMatch(/2 athletes/);
	});

	it('flags unlinked players', () => {
		const label = formatHouseholdGraphLabel(baseRow({ role: 'player' }), null, []);
		expect(label).toBe('Unlinked');
	});
});
