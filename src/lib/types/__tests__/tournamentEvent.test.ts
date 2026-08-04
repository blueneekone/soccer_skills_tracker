import { describe, expect, it } from 'vitest';
import { totalRemainingCapacity, type TournamentEventDoc, type TicketTierMap } from '../tournamentEvent.js';

describe('totalRemainingCapacity', () => {
	const createMockEvent = (ticketTiers: TicketTierMap): TournamentEventDoc => ({
		id: 'mock-event-1',
		name: 'Mock Event',
		hostClubId: 'host-1',
		eventStartAt: '2025-01-01T00:00:00Z',
		status: 'published',
		ticketTiers,
	});

	it('returns 0 when there are no ticket tiers', () => {
		const event = createMockEvent({});
		expect(totalRemainingCapacity(event)).toBe(0);
	});

	it('calculates remaining capacity correctly for a single tier', () => {
		const event = createMockEvent({
			vip: { unitPriceCents: 1000, capacity: 50, soldCount: 10, label: 'VIP' },
		});
		expect(totalRemainingCapacity(event)).toBe(40);
	});

	it('calculates remaining capacity correctly across multiple tiers', () => {
		const event = createMockEvent({
			vip: { unitPriceCents: 1000, capacity: 50, soldCount: 10, label: 'VIP' },
			general: { unitPriceCents: 500, capacity: 200, soldCount: 150, label: 'General' },
		});
		expect(totalRemainingCapacity(event)).toBe(90); // (50 - 10) + (200 - 150) = 40 + 50 = 90
	});

	it('handles oversold tiers by treating remaining capacity as 0', () => {
		const event = createMockEvent({
			vip: { unitPriceCents: 1000, capacity: 50, soldCount: 60, label: 'VIP' }, // oversold by 10
		});
		expect(totalRemainingCapacity(event)).toBe(0); // Max(0, 50 - 60) = 0
	});

	it('sums up totals correctly when some tiers are oversold and others have remaining capacity', () => {
		const event = createMockEvent({
			vip: { unitPriceCents: 1000, capacity: 50, soldCount: 60, label: 'VIP' }, // oversold by 10 (remaining 0)
			general: { unitPriceCents: 500, capacity: 200, soldCount: 150, label: 'General' }, // remaining 50
		});
		expect(totalRemainingCapacity(event)).toBe(50); // 0 + 50 = 50
	});
});
