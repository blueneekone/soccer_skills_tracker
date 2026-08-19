import { describe, it, expect } from 'vitest';
import { computePlatformFee } from '../pricingEngine.svelte.js';
import { mockVolumePolicy, mockRebatePolicy } from './helpers/pricingFixtures.js';

describe('computePlatformFee - Volume Breakpoints & Negative Rates', () => {
	it('applies base rate when ytdGrossCents is absent or below threshold', () => {
		const res0 = computePlatformFee({
			policy: mockVolumePolicy,
			transactionType: 'season_registration',
			grossCents: 10000,
		});
		expect(res0.rateBp).toBe(1000);
		expect(res0.platformFeeCents).toBe(1000);

		const resBelow = computePlatformFee({
			policy: mockVolumePolicy,
			transactionType: 'season_registration',
			grossCents: 10000,
			ytdGrossCents: 50000,
		});
		expect(resBelow.rateBp).toBe(1000);
	});

	it('applies modifier when ytdGrossCents reaches or exceeds volume thresholds', () => {
		// Tier 1: threshold 100000, modifier 0.8 -> 1000 * 0.8 = 800 bp
		const resTier1 = computePlatformFee({
			policy: mockVolumePolicy,
			transactionType: 'season_registration',
			grossCents: 10000,
			ytdGrossCents: 100000,
		});
		expect(resTier1.rateBp).toBe(800);
		expect(resTier1.platformFeeCents).toBe(800);

		// Tier 2: threshold 500000, modifier 0.5 -> 1000 * 0.5 = 500 bp
		const resTier2 = computePlatformFee({
			policy: mockVolumePolicy,
			transactionType: 'season_registration',
			grossCents: 10000,
			ytdGrossCents: 600000,
		});
		expect(resTier2.rateBp).toBe(500);
		expect(resTier2.platformFeeCents).toBe(500);
	});

	it('handles negative rateBp for rebate flows', () => {
		const res = computePlatformFee({
			policy: mockRebatePolicy,
			transactionType: 'hotel_rebate',
			grossCents: 10000,
		});
		expect(res.rateBp).toBe(-7000);
		expect(res.platformFeeCents).toBe(-7000);
		expect(res.netCents).toBe(17000);
	});
});
