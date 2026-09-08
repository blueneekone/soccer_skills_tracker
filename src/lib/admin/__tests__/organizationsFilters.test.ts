import { describe, expect, it } from 'vitest';
import {
	countClubsBySport,
	filterClubsBySport,
	filterOrganizations,
	stateForClub,
	tierForClub,
	toggleInList,
	verificationForClub,
	filterStateOptions,
} from '$lib/admin/organizationsFilters.js';
import type { AdminClub } from '$lib/types/adminOrganizations.js';

const SAMPLE: AdminClub[] = [
	{
		id: 'tx-club',
		name: 'Texas Elite',
		sport: 'soccer',
		tier: 'pro',
		verifiedAddress: '123 Main, Austin, TX 78701',
		phoneNumber: '+15125550100',
	},
	{
		id: 'pending-club',
		name: 'Pending Org',
		sport: 'basketball',
		subscriptionTier: 'starter',
	},
];

describe('organizationsFilters', () => {
	it('verificationForClub requires address and phone', () => {
		expect(verificationForClub(SAMPLE[0]!)).toBe('verified');
		expect(verificationForClub(SAMPLE[1]!)).toBe('pending');
	});

	describe('stateForClub', () => {
		it('extracts state from standard 5-digit zip address', () => {
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: '123 Main, Austin, TX 78701' })).toBe('TX');
		});

		it('extracts state from 9-digit zip address', () => {
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: '123 Main, Austin, TX 78701-1234' })).toBe('TX');
		});

		it('returns empty string if address is empty', () => {
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: '' })).toBe('');
		});

		it('returns empty string if address is undefined', () => {
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: undefined })).toBe('');
		});

		it('returns empty string if address regex does not match', () => {
			// Missing zip code
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: '123 Main, Austin, TX' })).toBe('');
			// Lowercase state (regex strictly requires uppercase A-Z)
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: '123 Main, Austin, tx 78701' })).toBe('');
			// Malformed zip code
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: '123 Main, Austin, TX 7870' })).toBe('');
			// Only state and zip code string
			expect(stateForClub({ ...SAMPLE[0]!, verifiedAddress: 'NY 10001' })).toBe('NY');
		});
	});

	it('tierForClub normalizes subscriptionTier', () => {
		expect(tierForClub(SAMPLE[0]!)).toBe('pro');
		expect(tierForClub(SAMPLE[1]!)).toBe('starter');
	});

	it('toggleInList returns new array references', () => {
		const base = ['TX'];
		const next = toggleInList(base, 'CA');
		expect(base).toEqual(['TX']);
		expect(next).toEqual(['TX', 'CA']);
	});

	it('filterOrganizations applies search and tier filters', () => {
		const filtered = filterOrganizations(SAMPLE, {
			search: 'texas',
			sportTab: 'all',
			verification: 'all',
			states: [],
			tiers: ['pro'],
		});
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.id).toBe('tx-club');
	});

	describe('countClubsBySport', () => {
		it('returns all: 0 for empty array', () => {
			expect(countClubsBySport([])).toEqual({ all: 0 });
		});

		it('correctly aggregates clubs by sport', () => {
			const clubs: AdminClub[] = [
				{ ...SAMPLE[0]!, id: '1', sport: 'soccer' },
				{ ...SAMPLE[0]!, id: '2', sport: 'soccer' },
				{ ...SAMPLE[0]!, id: '3', sport: 'basketball' },
				{ ...SAMPLE[0]!, id: '4', sport: 'volleyball' },
			];
			const counts = countClubsBySport(clubs);
			expect(counts).toEqual({
				all: 4,
				soccer: 2,
				basketball: 1,
				volleyball: 1,
			});
		});

		it('normalizes sport names for counting', () => {
			const clubs: AdminClub[] = [
				{ ...SAMPLE[0]!, id: '1', sport: 'Soccer' },
				{ ...SAMPLE[0]!, id: '2', sport: 'SOCCER' },
				{ ...SAMPLE[0]!, id: '3', sport: ' basketball ' },
			];
			const counts = countClubsBySport(clubs);
			expect(counts).toEqual({
				all: 3,
				soccer: 2,
				basketball: 1,
			});
		});
	});

	describe('filterClubsBySport', () => {
		it('returns all clubs when sportTab is "all"', () => {
			const filtered = filterClubsBySport(SAMPLE, 'all');
			expect(filtered).toHaveLength(2);
			expect(filtered).toEqual(SAMPLE);
		});

		it('returns clubs matching a specific normalized sport', () => {
			const filtered = filterClubsBySport(SAMPLE, 'soccer');
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.id).toBe('tx-club');
		});

		it('returns empty array if no clubs match the sport', () => {
			const filtered = filterClubsBySport(SAMPLE, 'football' as any);
			expect(filtered).toHaveLength(0);
		});

		it('normalizes sport names with different casing and whitespace', () => {
			const noisySample = [
				{ id: '1', name: 'A', sport: ' SOCCER ' },
				{ id: '2', name: 'B', sport: 'BasketBall' },
				{ id: '3', name: 'C', sport: 'generic' }
			] as AdminClub[];
			expect(filterClubsBySport(noisySample, 'soccer')).toHaveLength(1);
			expect(filterClubsBySport(noisySample, 'basketball')).toHaveLength(1);
			expect(filterClubsBySport(noisySample, 'soccer')[0]?.id).toBe('1');
		});

		it('normalizes sport names using substrings explicitly handled by normalizeClubSport', () => {
			const substringSample = [
				{ id: '1', name: 'A', sport: 'ice skating' },
				{ id: '2', name: 'B', sport: 'basket' },
				{ id: '3', name: 'C', sport: 'volley ball' }
			] as AdminClub[];
			expect(filterClubsBySport(substringSample, 'hockey')).toHaveLength(1);
			expect(filterClubsBySport(substringSample, 'basketball')).toHaveLength(1);
			expect(filterClubsBySport(substringSample, 'volleyball')).toHaveLength(1);
			expect(filterClubsBySport(substringSample, 'hockey')[0]?.id).toBe('1');
		});

		it('handles undefined and missing sports safely', () => {
			const missingSample = [
				{ id: '1', name: 'A', sport: undefined },
				{ id: '2', name: 'B', sport: '' },
				{ id: '3', name: 'C', sport: 'soccer' }
			] as AdminClub[];
			expect(filterClubsBySport(missingSample, 'generic')).toHaveLength(2);
			expect(filterClubsBySport(missingSample, 'soccer')).toHaveLength(1);
		});
	});

	describe('filterStateOptions', () => {
		const states = ['TX', 'CA', 'NY', 'FL', 'WA'];

		it('returns all states when query is empty', () => {
			expect(filterStateOptions(states, '')).toEqual(states);
		});

		it('returns all states when query is just whitespace', () => {
			expect(filterStateOptions(states, '   ')).toEqual(states);
		});

		it('filters states case-insensitively', () => {
			expect(filterStateOptions(states, 'tx')).toEqual(['TX']);
			expect(filterStateOptions(states, 'tX')).toEqual(['TX']);
			expect(filterStateOptions(states, 'Tx')).toEqual(['TX']);
		});

		it('filters states based on partial matches', () => {
			expect(filterStateOptions(['NEW YORK', 'NEW JERSEY', 'CALIFORNIA'], 'NEW')).toEqual(['NEW YORK', 'NEW JERSEY']);
		});

		it('returns an empty array when no states match', () => {
			expect(filterStateOptions(states, 'ZZ')).toEqual([]);
		});

		it('trims whitespace from the query', () => {
			expect(filterStateOptions(states, '  CA  ')).toEqual(['CA']);
		});
	});
});
