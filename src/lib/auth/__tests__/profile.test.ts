import { describe, it, expect } from 'vitest';
import { fallbackPlayerName } from '../profile.js';

describe('fallbackPlayerName', () => {
	it('should return displayName from baseProfile if present', () => {
		const profile = { displayName: 'John Player', firstName: 'John', lastName: 'Doe' };
		expect(fallbackPlayerName(profile, 'john@example.com')).toBe('John Player');
	});

	it('should return firstName and lastName if displayName is not present', () => {
		const profile = { firstName: 'Jane', lastName: 'Doe' };
		expect(fallbackPlayerName(profile, 'jane.doe@example.com')).toBe('Jane Doe');
	});

	it('should return firstName if displayName and lastName are not present', () => {
		const profile = { firstName: 'Jane' };
		expect(fallbackPlayerName(profile, 'jane.doe@example.com')).toBe('Jane');
	});

	it('should return lastName if only lastName is present (should fall back to email in this case according to the logic)', () => {
		const profile = { lastName: 'Doe' };
		expect(fallbackPlayerName(profile, 'jane.doe@example.com')).toBe('jane.doe');
	});

	it('should fall back to local part of email if no valid name fields are in baseProfile', () => {
		const profile = { otherField: 'Something' };
		expect(fallbackPlayerName(profile, 'jane.doe@example.com')).toBe('jane.doe');
	});

	it('should fall back to local part of email if baseProfile is null', () => {
		expect(fallbackPlayerName(null, 'jane.doe@example.com')).toBe('jane.doe');
	});

	it('should fall back to local part of email if baseProfile is undefined', () => {
		expect(fallbackPlayerName(undefined, 'jane.doe@example.com')).toBe('jane.doe');
	});

	it('should return "Unknown Player" if baseProfile has no valid fields and email is undefined', () => {
		expect(fallbackPlayerName(undefined, undefined)).toBe('Unknown Player');
	});

	it('should return "Unknown Player" if baseProfile has no valid fields and email is null', () => {
		expect(fallbackPlayerName(null, null)).toBe('Unknown Player');
	});

	it('should handle email with multiple @ symbols by splitting at the first one', () => {
		expect(fallbackPlayerName(null, 'strange@email@example.com')).toBe('strange');
	});

	it('should return local part if baseProfile fields are empty strings', () => {
		const profile = { displayName: '', firstName: '', lastName: '' };
		expect(fallbackPlayerName(profile, 'localpart@example.com')).toBe('localpart');
	});

	it('should handle email without @ correctly', () => {
		expect(fallbackPlayerName(null, 'justaname')).toBe('justaname');
	});

	it('should handle an empty string email by returning Unknown Player', () => {
		expect(fallbackPlayerName(null, '')).toBe('Unknown Player');
	});
});
