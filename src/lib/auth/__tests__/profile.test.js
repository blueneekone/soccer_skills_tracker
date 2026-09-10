import { describe, it, expect } from 'vitest';
import { fallbackPlayerName } from '../profile.js';

describe('fallbackPlayerName', () => {
	it('should return displayName if present', () => {
		const profile = { displayName: 'JohnD', firstName: 'John', lastName: 'Doe' };
		expect(fallbackPlayerName(profile, 'test@example.com')).toBe('JohnD');
	});

	it('should return firstName and lastName if displayName is absent', () => {
		const profile = { firstName: 'John', lastName: 'Doe' };
		expect(fallbackPlayerName(profile, 'test@example.com')).toBe('John Doe');
	});

	it('should return firstName if lastName and displayName are absent', () => {
		const profile = { firstName: 'John' };
		expect(fallbackPlayerName(profile, 'test@example.com')).toBe('John');
	});

	it('should return the part of email before @ if no name fields are present', () => {
		const profile = {};
		expect(fallbackPlayerName(profile, 'johndoe@example.com')).toBe('johndoe');
	});

	it('should return the full email if there is no @ in it and no name fields are present', () => {
		const profile = {};
		expect(fallbackPlayerName(profile, 'johndoe')).toBe('johndoe');
	});

	it('should return Unknown Player if baseProfile is null and email is empty', () => {
		expect(fallbackPlayerName(null, '')).toBe('Unknown Player');
	});

	it('should return Unknown Player if baseProfile is undefined and email is undefined', () => {
		expect(fallbackPlayerName(undefined, undefined)).toBe('Unknown Player');
	});

	it('should return Unknown Player if baseProfile is empty object and email is empty', () => {
		expect(fallbackPlayerName({}, '')).toBe('Unknown Player');
	});

    it('should handle falsy values for names properly', () => {
        const profile = { displayName: '', firstName: '', lastName: '' };
        expect(fallbackPlayerName(profile, 'test@example.com')).toBe('test');
    });
});
