import { describe, expect, it } from 'vitest';
import { normalizeClubDocument, sortClubsByName } from '$lib/admin/organizationsNormalize.js';

describe('organizationsNormalize', () => {
	it('normalizeClubDocument preserves id and trims strings', () => {
		const club = normalizeClubDocument('aggies-fc', {
			name: '  Aggies FC  ',
			sport: 'soccer',
			directorEmail: 'dir@example.com',
		});
		expect(club).toMatchObject({
			id: 'aggies-fc',
			name: 'Aggies FC',
			sport: 'soccer',
			directorEmail: 'dir@example.com',
		});
	});

	it('sortClubsByName does not mutate the input array', () => {
		const input = [
			{ id: 'b', name: 'Beta' },
			{ id: 'a', name: 'Alpha' },
		];
		const sorted = sortClubsByName(input);
		expect(input[0]?.id).toBe('b');
		expect(sorted.map((c) => c.id)).toEqual(['a', 'b']);
	});
});
