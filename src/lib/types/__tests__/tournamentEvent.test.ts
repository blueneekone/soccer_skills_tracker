import { describe, it, expect } from 'vitest';
import {
	totalRemainingCapacity,
	isEventOpen,
	labelToTierId,
	type TournamentEventDoc
} from '../tournamentEvent';

describe('tournamentEvent', () => {
	describe('totalRemainingCapacity', () => {
		it('calculates correct capacity when multiple tiers exist and none are sold out', () => {
			const event = {
				ticketTiers: {
					general: { capacity: 100, soldCount: 0, unitPriceCents: 1000, label: 'General' },
					vip: { capacity: 50, soldCount: 0, unitPriceCents: 5000, label: 'VIP' }
				}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(150);
		});

		it('calculates correct capacity when some tiers are partially sold', () => {
			const event = {
				ticketTiers: {
					general: { capacity: 100, soldCount: 30, unitPriceCents: 1000, label: 'General' },
					vip: { capacity: 50, soldCount: 50, unitPriceCents: 5000, label: 'VIP' }
				}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(70);
		});

		it('ignores negative remaining capacity if soldCount > capacity', () => {
			const event = {
				ticketTiers: {
					general: { capacity: 100, soldCount: 110, unitPriceCents: 1000, label: 'General' },
					vip: { capacity: 50, soldCount: 20, unitPriceCents: 5000, label: 'VIP' }
				}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(30);
		});

		it('returns 0 when all tiers are fully sold out', () => {
			const event = {
				ticketTiers: {
					general: { capacity: 100, soldCount: 100, unitPriceCents: 1000, label: 'General' },
					vip: { capacity: 50, soldCount: 50, unitPriceCents: 5000, label: 'VIP' }
				}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(0);
		});

		it('returns 0 when there are no ticket tiers', () => {
			const event = {
				ticketTiers: {}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(0);
		});
	});

	describe('isEventOpen', () => {
		it('returns true when status is published and remaining capacity > 0', () => {
			const event = {
				status: 'published',
				ticketTiers: {
					general: { capacity: 100, soldCount: 0, unitPriceCents: 1000, label: 'General' }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(event)).toBe(true);
		});

		it('returns false when status is published but remaining capacity is 0', () => {
			const event = {
				status: 'published',
				ticketTiers: {
					general: { capacity: 100, soldCount: 100, unitPriceCents: 1000, label: 'General' }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(event)).toBe(false);
		});

		it('returns false when status is draft, even if capacity > 0', () => {
			const event = {
				status: 'draft',
				ticketTiers: {
					general: { capacity: 100, soldCount: 0, unitPriceCents: 1000, label: 'General' }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(event)).toBe(false);
		});

		it('returns false when status is concluded, even if capacity > 0', () => {
			const event = {
				status: 'concluded',
				ticketTiers: {
					general: { capacity: 100, soldCount: 0, unitPriceCents: 1000, label: 'General' }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(event)).toBe(false);
		});

		it('returns false when status is archived, even if capacity > 0', () => {
			const event = {
				status: 'archived',
				ticketTiers: {
					general: { capacity: 100, soldCount: 0, unitPriceCents: 1000, label: 'General' }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(event)).toBe(false);
		});
	});

	describe('labelToTierId', () => {
		it('converts label to lowercase url-safe ID', () => {
			expect(labelToTierId('General Admission!')).toBe('general_admission');
			expect(labelToTierId('  VIP Tier  ')).toBe('vip_tier');
			expect(labelToTierId('Tier 1 & 2')).toBe('tier_1_2');
		});

		it('truncates to 32 characters', () => {
			const longLabel = 'This is a very long ticket tier label that exceeds the limit';
			expect(labelToTierId(longLabel)).toBe('this_is_a_very_long_ticket_tier_');
		});
	});
});
