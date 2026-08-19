import { describe, it, expect } from 'vitest';
import { computePlatformFee } from '../pricingEngine.svelte.js';
import {
	mockPercentagePolicy,
	mockFlatPolicy,
	mockContradictoryPolicy,
} from './helpers/pricingFixtures.js';

describe('computePlatformFee - Validation & Core Rules', () => {
	it('throws RangeError for invalid grossCents inputs', () => {
		expect(() =>
			computePlatformFee({ policy: mockPercentagePolicy, transactionType: 'season_registration', grossCents: -10 }),
		).toThrow(RangeError);
		expect(() =>
			computePlatformFee({ policy: mockPercentagePolicy, transactionType: 'season_registration', grossCents: 10.5 }),
		).toThrow(RangeError);
		expect(() =>
			computePlatformFee({ policy: mockPercentagePolicy, transactionType: 'season_registration', grossCents: NaN }),
		).toThrow(RangeError);
	});

	it('throws RangeError when rateCard entry has both rateBp and flatFeeCents', () => {
		expect(() =>
			computePlatformFee({ policy: mockContradictoryPolicy, transactionType: 'season_registration', grossCents: 1000 }),
		).toThrow(RangeError);
	});

	it('returns zero fee when transaction type is not configured in rateCard', () => {
		const res = computePlatformFee({ policy: mockPercentagePolicy, transactionType: 'hotel_rebate', grossCents: 5000 });
		expect(res).toEqual({ platformFeeCents: 0, netCents: 5000, rateBp: 0, policyVersion: 1, flatFee: false });
	});

	it('calculates flat fee and applies max cap', () => {
		const res = computePlatformFee({ policy: mockFlatPolicy, transactionType: 'recruiter_lead_export', grossCents: 1000 });
		expect(res).toEqual({ platformFeeCents: 50, netCents: 950, rateBp: 0, policyVersion: 1, flatFee: true });
	});

	it('calculates percentage rate, applies minimum fee floor, and maximum fee cap', () => {
		// 250 bp on 100 gross = 2.5 cents -> rounded to 3 cents, but min fee is 50
		const resMin = computePlatformFee({ policy: mockPercentagePolicy, transactionType: 'season_registration', grossCents: 100 });
		expect(resMin.platformFeeCents).toBe(50);

		// 250 bp on 10000 gross = 250 cents
		const resStandard = computePlatformFee({ policy: mockPercentagePolicy, transactionType: 'season_registration', grossCents: 10000 });
		expect(resStandard).toEqual({ platformFeeCents: 250, netCents: 9750, rateBp: 250, policyVersion: 1, flatFee: false });

		// 250 bp on 300000 gross = 7500 cents -> capped at maxFeeCentsPerTxn = 5000
		const resCap = computePlatformFee({ policy: mockPercentagePolicy, transactionType: 'season_registration', grossCents: 300000 });
		expect(resCap.platformFeeCents).toBe(5000);
	});
});
