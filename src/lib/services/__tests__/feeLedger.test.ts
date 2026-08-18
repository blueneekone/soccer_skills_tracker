import { describe, it, expect } from 'vitest';
import { FeeLedgerEngine } from '../feeLedger.svelte.js';

describe('FeeLedgerEngine', () => {
	it('handles static constructor values', () => {
		const engine = new FeeLedgerEngine('team', 10);
		const ytdCost = engine.legacySubscriptionYtdCostCents();
		expect(ytdCost).toBeGreaterThan(0);
	});

	it('handles dynamic getter functions', () => {
		let currentTier: string | null = 'club';
		let currentSeats = 20;

		const engine = new FeeLedgerEngine(
			() => currentTier,
			() => currentSeats,
		);

		const initialCost = engine.legacySubscriptionYtdCostCents();
		expect(initialCost).toBeGreaterThan(0);

		currentSeats = 40;
		const updatedCost = engine.legacySubscriptionYtdCostCents();
		expect(updatedCost).toBe(initialCost * 2);

		currentTier = null;
		expect(engine.savingsCentsVsLegacy()).toBeNull();
	});
});
