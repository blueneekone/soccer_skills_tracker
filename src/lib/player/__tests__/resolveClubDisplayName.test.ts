import { describe, it, expect } from 'vitest';
import {
	resolveClubDisplayName,
	resolveClubIdFromProfile,
} from '$lib/player/resolveClubDisplayName.js';

describe('resolveClubDisplayName', () => {
	it('clubs doc name wins over clubDisplayName', () => {
		expect(
			resolveClubDisplayName(
				{ clubDisplayName: 'Fallback FC' },
				{ name: '  Real Org SC  ' },
			),
		).toBe('Real Org SC');
	});

	it('clubDisplayName used when no doc', () => {
		expect(resolveClubDisplayName({ clubDisplayName: 'Display Only' }, null)).toBe(
			'Display Only',
		);
		expect(resolveClubDisplayName({ clubDisplayName: 'Display Only' }, undefined)).toBe(
			'Display Only',
		);
	});

	it('empty string when neither doc name nor clubDisplayName', () => {
		expect(resolveClubDisplayName({}, { name: '' })).toBe('');
		expect(resolveClubDisplayName(null, null)).toBe('');
	});

	it('never reads team roster name — only clubs doc name and clubDisplayName', () => {
		const teamDoc = { clubId: 'club-1', name: 'Roster Team', teamName: 'U14 Phoenixes' };
		expect(resolveClubDisplayName({ clubDisplayName: 'Profile Org' }, null)).toBe('Profile Org');
		expect(resolveClubIdFromProfile({ teamId: 'team-1' }, teamDoc)).toBe('club-1');
		expect(resolveClubDisplayName({ clubDisplayName: 'Ignored' }, { name: 'Club Org' })).toBe(
			'Club Org',
		);
		expect(resolveClubDisplayName({ clubDisplayName: 'Profile Org' }, { name: 'Roster Team' })).toBe(
			'Roster Team',
		);
	});
});

describe('resolveClubIdFromProfile', () => {
	it('prefers profile.clubId over team doc', () => {
		expect(
			resolveClubIdFromProfile(
				{ clubId: 'direct-club', teamId: 'team-1' },
				{ clubId: 'from-team' },
			),
		).toBe('direct-club');
	});

	it('uses team doc clubId when profile has no clubId', () => {
		expect(resolveClubIdFromProfile({ teamId: 'team-1' }, { clubId: 'club-via-team' })).toBe(
			'club-via-team',
		);
	});

	it('returns empty when no clubId on profile or team doc', () => {
		expect(resolveClubIdFromProfile({}, { name: 'Ignored Team Name', teamName: 'U14' })).toBe('');
		expect(resolveClubIdFromProfile({ teamId: 'team-1' }, null)).toBe('');
	});
});
