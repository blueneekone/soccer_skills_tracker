import { describe, expect, it } from 'vitest';
import { mapUserDocumentToRow, sliceUsersPage } from '$lib/admin/globalUsersMapper.js';

describe('globalUsersMapper', () => {
	it('mapUserDocumentToRow picks lastActivityDate when present', () => {
		const row = mapUserDocumentToRow('user@test.com', {
			email: 'user@test.com',
			role: 'coach',
			lastActivityDate: 1_700_000_000_000,
		});
		expect(row.email).toBe('user@test.com');
		expect(row.lastActiveAt).toBe(1_700_000_000_000);
		expect(row.lastActiveSource).toBe('lastActivityDate');
	});

	it('sliceUsersPage detects next page', () => {
		const rows = Array.from({ length: 3 }, (_, i) => ({
			id: `u${i}`,
			email: `u${i}@test.com`,
			displayName: '',
			playerName: '',
			role: 'coach',
			clubId: '',
			teamId: '',
			lastActiveAt: 0,
			lastActiveSource: '',
			photoURL: '',
		}));
		const page = sliceUsersPage(rows, 2);
		expect(page.rows).toHaveLength(2);
		expect(page.hasNextPage).toBe(true);
	});
});
