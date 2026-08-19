import { describe, it, expect } from 'vitest';
import { getAvailableItems, QUARTERMASTER_INVENTORY } from '../armory.js';

describe('armory — getAvailableItems', () => {
	it('returns empty array when player level is below any item minLevel', () => {
		expect(getAvailableItems(0)).toEqual([]);
		expect(getAvailableItems(1)).toEqual([]);
		expect(getAvailableItems(-5)).toEqual([]);
	});

	it('returns filtered items where minLevel <= playerLevel sorted by cost ascending', () => {
		const level2Items = getAvailableItems(2);
		expect(level2Items).toHaveLength(1);
		expect(level2Items[0].id).toBe('digi_border_neon');

		const level5Items = getAvailableItems(5);
		expect(level5Items.map((i) => i.id)).toEqual([
			'digi_border_neon',
			'tactical_override',
			'patch_sniper',
		]);
		expect(level5Items.map((i) => i.cost)).toEqual([500, 800, 1500]);
	});

	it('returns all catalog items at high levels sorted by cost ascending', () => {
		const level10Items = getAvailableItems(10);
		expect(level10Items).toHaveLength(QUARTERMASTER_INVENTORY.length);
		const costs = level10Items.map((i) => i.cost);
		expect(costs).toEqual([500, 800, 1500, 5000]);
	});

	it('handles numeric coercions and float/string edge cases properly', () => {
		expect(getAvailableItems('5')).toEqual(getAvailableItems(5));
		expect(getAvailableItems(2.9)).toEqual(getAvailableItems(2));
		expect(getAvailableItems(null)).toEqual([]);
		expect(getAvailableItems(undefined)).toEqual([]);
		expect(getAvailableItems(NaN)).toEqual([]);
		expect(getAvailableItems('invalid')).toEqual([]);
	});

	it('does not mutate QUARTERMASTER_INVENTORY and returns a shallow copy', () => {
		const result = getAvailableItems(10);
		expect(result).not.toBe(QUARTERMASTER_INVENTORY);
		expect(Object.isFrozen(QUARTERMASTER_INVENTORY)).toBe(true);
	});
});
