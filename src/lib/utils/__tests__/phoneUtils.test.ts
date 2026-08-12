import { describe, it, expect } from 'vitest';
import { toE164, isValidPhone, prefixAndNationalToE164 } from '../phoneUtils';

describe('phoneUtils', () => {
	describe('toE164', () => {
		it('formats a US national number correctly when US country code is provided', () => {
			expect(toE164('(202) 555-0123', 'US')).toBe('+12025550123');
		});

		it('formats an international number with a plus prefix without a country code', () => {
			expect(toE164('+44 20 7946 0958')).toBe('+442079460958');
		});

		it('returns null for an invalid string', () => {
			expect(toE164('not-a-number', 'US')).toBeNull();
		});

		it('returns null for an incomplete phone number', () => {
			expect(toE164('123', 'US')).toBeNull();
		});

		it('returns null when empty string is provided', () => {
			expect(toE164('')).toBeNull();
		});

		it('returns null for a national number when country code is missing', () => {
			expect(toE164('(202) 555-0123')).toBeNull();
		});

		it('handles numbers with extra spaces or dashes', () => {
			expect(toE164('202- 555 - 0123', 'US')).toBe('+12025550123');
		});

		it('handles valid UK number when GB country code is provided', () => {
			expect(toE164('020 7946 0958', 'GB')).toBe('+442079460958');
		});
	});

	describe('isValidPhone', () => {
		it('returns true for a valid number', () => {
			expect(isValidPhone('(202) 555-0123', 'US')).toBe(true);
		});

		it('returns false for an invalid number', () => {
			expect(isValidPhone('not-a-number', 'US')).toBe(false);
		});
	});

	describe('prefixAndNationalToE164', () => {
		it('formats a number with a known prefix', () => {
			expect(prefixAndNationalToE164('+1', '(202) 555-0123')).toBe('+12025550123');
		});

		it('formats a number with a known prefix and no formatting', () => {
			expect(prefixAndNationalToE164('+44', '2079460958')).toBe('+442079460958');
		});

		it('returns null for a known prefix but invalid national number', () => {
			expect(prefixAndNationalToE164('+1', '123')).toBeNull();
		});

		it('returns valid number for prefix even if prefix is not in the dictionary', () => {
			expect(prefixAndNationalToE164('+358', '40 123 4567')).toBe('+358401234567');
		});
	});
});
