import type { PricingPolicyDoc } from '$lib/types/pricing';

export const mockPercentagePolicy: PricingPolicyDoc = {
	id: 'default-v1',
	version: 1,
	rateCard: {
		season_registration: { rateBp: 250, minimumFeeCents: 50 },
		merch_sale: { rateBp: 300 },
	},
	volumeBreakpoints: [],
	maxFeeCentsPerTxn: 5000,
};

export const mockFlatPolicy: PricingPolicyDoc = {
	id: 'flat-v1',
	version: 1,
	rateCard: {
		recruiter_lead_export: { flatFeeCents: 100 },
	},
	volumeBreakpoints: [],
	maxFeeCentsPerTxn: 50,
};

export const mockContradictoryPolicy: PricingPolicyDoc = {
	id: 'invalid-v1',
	version: 1,
	rateCard: {
		season_registration: { rateBp: 200, flatFeeCents: 50 } as any,
	},
	volumeBreakpoints: [],
	maxFeeCentsPerTxn: null,
};

export const mockRebatePolicy: PricingPolicyDoc = {
	id: 'rebate-v1',
	version: 1,
	rateCard: {
		hotel_rebate: { rateBp: -7000 },
	},
	volumeBreakpoints: [],
	maxFeeCentsPerTxn: null,
};

export const mockVolumePolicy: PricingPolicyDoc = {
	id: 'volume-v1',
	version: 1,
	rateCard: {
		season_registration: { rateBp: 1000 },
	},
	volumeBreakpoints: [
		{ ytdGrossCentsThreshold: 100000, rateModifier: 0.8 },
		{ ytdGrossCentsThreshold: 500000, rateModifier: 0.5 },
	],
	maxFeeCentsPerTxn: null,
};
