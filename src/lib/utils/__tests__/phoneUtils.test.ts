import { describe, it, expect } from 'vitest';
import { toE164 } from '../phoneUtils.js';

describe('phoneUtils', () => {
	describe('toE164', () => {
		it('formats valid national numbers with a provided country code', () => {
			expect(toE164('(213) 373-4253', 'US')).toBe('+12133734253');
			expect(toE164('020 7946 0958', 'GB')).toBe('+442079460958'); // 020 7946 is an Ofcom drama number, libphonenumber might allow it? Let's see
		});

		it('formats valid international numbers (with +) ignoring or using country code', () => {
			expect(toE164('+44 20 7946 0958')).toBe('+442079460958');
			expect(toE164('+1 213 373 4253', 'US')).toBe('+12133734253');
			expect(toE164('+442079460958', 'US')).toBe('+442079460958'); // the + overrides country
		});

		it('returns null for non-phone strings', () => {
			expect(toE164('not-a-number', 'US')).toBeNull();
			expect(toE164('hello world')).toBeNull();
			expect(toE164('')).toBeNull();
		});

		it('returns null for invalid phone numbers (too short/long)', () => {
			expect(toE164('123', 'US')).toBeNull(); // too short
			expect(toE164('+1 213 373 4253 999999')).toBeNull(); // too long
		});

		it('handles undefined/null inputs gracefully', () => {
			expect(toE164(undefined as unknown as string)).toBeNull();
			expect(toE164(null as unknown as string)).toBeNull();
		});
	});
});
