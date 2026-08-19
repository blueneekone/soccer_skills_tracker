import { describe, it, expect } from 'vitest';
import { formatVariantLabel } from '../seasonOneData.js';

describe('formatVariantLabel', () => {
	it('formats known sticker variants correctly', () => {
		expect(formatVariantLabel('holo')).toBe('Holo');
		expect(formatVariantLabel('radiant')).toBe('Radiant');
		expect(formatVariantLabel('alt-art')).toBe('Alt Art');
		expect(formatVariantLabel('base')).toBe('Base');
	});

	it('falls back to "Base" for unexpected or edge case inputs', () => {
		const unexpectedInputs = [
			'unknown',
			'INVALID',
			'',
			undefined,
			null,
			123,
			false,
			true,
			{},
			[],
		];

		for (const input of unexpectedInputs) {
			// @ts-expect-error - testing unexpected runtime inputs
			expect(formatVariantLabel(input)).toBe('Base');
		}
	});
});
