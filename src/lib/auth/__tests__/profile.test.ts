import { describe, it, expect } from 'vitest';
import { fallbackPlayerName } from '../profile.js';

describe('fallbackPlayerName', () => {
	it('should return playerName from baseProfile if present', () => {
		const profile = { playerName: 'John Player', name: 'John', player: 'Johnny' };
		expect(fallbackPlayerName(profile, 'john@example.com')).toBe('John Player');
	});

	it('should return name from baseProfile if playerName is not present', () => {
		const profile = { name: 'John Name', player: 'Johnny' };
		expect(fallbackPlayerName(profile, 'john@example.com')).toBe('John Name');
	});

	it('should return player from baseProfile if playerName and name are not present', () => {
		const profile = { player: 'John Player Field' };
		expect(fallbackPlayerName(profile, 'john@example.com')).toBe('John Player Field');
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

	it('should return "unknown" if baseProfile has no valid fields and email is undefined', () => {
		expect(fallbackPlayerName(undefined, undefined)).toBe('unknown');
	});

	it('should return "unknown" if baseProfile has no valid fields and email is null', () => {
		expect(fallbackPlayerName(null, null)).toBe('unknown');
	});

	it('should handle email with multiple @ symbols by splitting at the first one', () => {
		expect(fallbackPlayerName(null, 'strange@email@example.com')).toBe('strange');
	});

	it('should return local part if baseProfile fields are empty strings', () => {
		const profile = { playerName: '', name: '', player: '' };
		expect(fallbackPlayerName(profile, 'localpart@example.com')).toBe('localpart');
	});
});
