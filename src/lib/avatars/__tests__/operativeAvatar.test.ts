import { describe, it, expect } from 'vitest';
import { normalizeOperativeAvatarSeed } from '../operativeAvatar.js';

describe('normalizeOperativeAvatarSeed', () => {
	it('returns "operative" for undefined/null input', () => {
		expect(normalizeOperativeAvatarSeed(undefined)).toBe('operative');
		expect(normalizeOperativeAvatarSeed(null)).toBe('operative');
	});

	it('returns "operative" for empty or whitespace strings', () => {
		expect(normalizeOperativeAvatarSeed('')).toBe('operative');
		expect(normalizeOperativeAvatarSeed('   ')).toBe('operative');
		expect(normalizeOperativeAvatarSeed('\t\n')).toBe('operative');
	});

	it('preserves valid short strings', () => {
		expect(normalizeOperativeAvatarSeed('hello')).toBe('hello');
		expect(normalizeOperativeAvatarSeed('test-seed-123')).toBe('test-seed-123');
	});

	it('stringifies non-string inputs', () => {
		expect(normalizeOperativeAvatarSeed(123)).toBe('123');
		expect(normalizeOperativeAvatarSeed(true)).toBe('true');
		expect(normalizeOperativeAvatarSeed(false)).toBe('false');
		expect(normalizeOperativeAvatarSeed({})).toBe('[object Object]');
	});

	it('truncates strings longer than 128 characters', () => {
		const longString = 'a'.repeat(200);
		const result = normalizeOperativeAvatarSeed(longString);
		expect(result).toHaveLength(128);
		expect(result).toBe('a'.repeat(128));
	});

	it('trims whitespace before truncating', () => {
		const longString = '  ' + 'a'.repeat(150) + '  ';
		const result = normalizeOperativeAvatarSeed(longString);
		expect(result).toHaveLength(128);
		expect(result).toBe('a'.repeat(128));
	});
});
