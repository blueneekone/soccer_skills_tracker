import { describe, expect, it } from 'vitest';
import {
	DEFAULT_POLICY_ID,
	BP_DIVISOR,
	bpToPercentLabel,
	centsToUsd
} from '../pricing.js';

describe('pricing types', () => {
	describe('constants', () => {
		it('DEFAULT_POLICY_ID is default-v1', () => {
			expect(DEFAULT_POLICY_ID).toBe('default-v1');
		});

		it('BP_DIVISOR is 10000', () => {
			expect(BP_DIVISOR).toBe(10000);
		});
	});

	describe('bpToPercentLabel', () => {
		it('converts positive basis points to percent label', () => {
			expect(bpToPercentLabel(100)).toBe('1.00%');
			expect(bpToPercentLabel(250)).toBe('2.50%');
			expect(bpToPercentLabel(10000)).toBe('100.00%');
		});

		it('converts negative basis points to percent label', () => {
			expect(bpToPercentLabel(-100)).toBe('-1.00%');
			expect(bpToPercentLabel(-7000)).toBe('-70.00%');
		});

		it('handles zero basis points', () => {
			expect(bpToPercentLabel(0)).toBe('0.00%');
		});
	});

	describe('centsToUsd', () => {
		it('converts positive cents to USD label', () => {
			expect(centsToUsd(12345)).toBe('$123.45');
			expect(centsToUsd(5)).toBe('$0.05');
			expect(centsToUsd(100)).toBe('$1.00');
			expect(centsToUsd(150000)).toBe('$1,500.00');
		});

		it('converts negative cents to USD label', () => {
			expect(centsToUsd(-12345)).toBe('-$123.45');
			expect(centsToUsd(-5)).toBe('-$0.05');
			expect(centsToUsd(-100)).toBe('-$1.00');
			expect(centsToUsd(-150000)).toBe('-$1,500.00');
		});

		it('handles zero cents', () => {
			expect(centsToUsd(0)).toBe('$0.00');
		});
	});
});
