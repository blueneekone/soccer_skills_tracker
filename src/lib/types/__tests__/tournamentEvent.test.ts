import { describe, it, expect } from 'vitest';
import { totalRemainingCapacity, isEventOpen, labelToTierId, type TournamentEventDoc } from '../tournamentEvent';

describe('tournamentEvent helpers', () => {
	describe('totalRemainingCapacity', () => {
		it('computes total remaining seats correctly across all tiers', () => {
			const event = {
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 5 },
					tier2: { capacity: 20, soldCount: 20 },
					tier3: { capacity: 5, soldCount: 0 }
				}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(10);
		});

		it('does not return negative values if soldCount exceeds capacity', () => {
			const event = {
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 15 }, // -5
					tier2: { capacity: 5, soldCount: 0 }    // +5
				}
			} as unknown as TournamentEventDoc;

			// Should be 0 (from tier1 Math.max(0, -5)) + 5 = 5
			expect(totalRemainingCapacity(event)).toBe(5);
		});

		it('returns 0 for empty ticketTiers', () => {
			const event = {
				ticketTiers: {}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(0);
		});

		it('returns 0 if all tiers are exactly sold out', () => {
			const event = {
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 10 },
					tier2: { capacity: 5, soldCount: 5 }
				}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(0);
		});

		it('handles 0 capacity tiers correctly', () => {
			const event = {
				ticketTiers: {
					tier1: { capacity: 0, soldCount: 0 },
					tier2: { capacity: 10, soldCount: 5 }
				}
			} as unknown as TournamentEventDoc;

			expect(totalRemainingCapacity(event)).toBe(5);
		});
	});

	describe('isEventOpen', () => {
		it('returns true if event is published and has remaining capacity', () => {
			const event = {
				status: 'published',
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 5 }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(event)).toBe(true);
		});

		it('returns false if event is published but has 0 remaining capacity', () => {
			const event = {
				status: 'published',
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 10 }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(event)).toBe(false);
		});

		it('returns false if event has remaining capacity but is not published', () => {
			const eventDraft = {
				status: 'draft',
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 5 }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(eventDraft)).toBe(false);

			const eventArchived = {
				status: 'archived',
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 5 }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(eventArchived)).toBe(false);

			const eventConcluded = {
				status: 'concluded',
				ticketTiers: {
					tier1: { capacity: 10, soldCount: 5 }
				}
			} as unknown as TournamentEventDoc;

			expect(isEventOpen(eventConcluded)).toBe(false);
		});
	});

	describe('labelToTierId', () => {
		it('converts standard strings to lowercase and replaces spaces with underscores', () => {
			expect(labelToTierId('General Admission')).toBe('general_admission');
		});

		it('replaces non-alphanumeric characters with underscores', () => {
			expect(labelToTierId('VIP @ Main-Stage!')).toBe('vip_main_stage');
		});

		it('strips leading and trailing underscores', () => {
			expect(labelToTierId('---Early Bird---')).toBe('early_bird');
			expect(labelToTierId('___Staff___')).toBe('staff');
		});

		it('truncates the result to a maximum of 32 characters', () => {
			const longLabel = 'This is a very very very very very long label';
			const result = labelToTierId(longLabel);
			expect(result.length).toBe(32);
			expect(result).toBe('this_is_a_very_very_very_very_ve');
		});
	});
});
