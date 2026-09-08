import { describe, expect, it } from 'vitest';
import {
	filterClubsBySport,
	filterOrganizations,
	tierForClub,
	toggleInList,
	verificationForClub,
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
	});
});
