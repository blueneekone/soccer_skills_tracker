import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	computeIsMinorAccount,
	computeIsOperativeProxy,
	getPrefsDefaults,
	loadUserPreferences,
	saveUserPreferences,
	saveProfile,
	sendPasswordReset,
	type UserPreferences,
	type ProfileDoc,
	type SaveProfileInput
} from '../playerSettingsHandlers';
import { getDoc, updateDoc, doc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '$lib/firebase.js';

vi.mock('firebase/firestore', () => ({
	doc: vi.fn(() => ({})),
	getDoc: vi.fn(),
	updateDoc: vi.fn()
}));

vi.mock('firebase/auth', () => ({
	sendPasswordResetEmail: vi.fn()
}));

vi.mock('$lib/firebase.js', () => ({
	auth: { currentUser: { email: 'test@example.com' } },
	db: {}
}));

const defaults: UserPreferences = {
	push_weatherAlerts: true,
	push_gameReminders: true,
	push_messages: true,
	email_weeklyReport: false
};

describe('computeIsMinorAccount', () => {
	it('returns false when profile is null or undefined', () => {
		expect(computeIsMinorAccount(null)).toBe(false);
		expect(computeIsMinorAccount(undefined)).toBe(false);
	});

	it('returns true when profile.isMinor is explicitly true', () => {
		expect(computeIsMinorAccount({ isMinor: true })).toBe(true);
	});

	it('returns false when profile.isMinor is explicitly false', () => {
		expect(computeIsMinorAccount({ isMinor: false })).toBe(false);
		expect(computeIsMinorAccount({ isMinor: false, dateOfBirth: { toDate: () => new Date(2020, 1, 1) } })).toBe(false);
	});

	it('calculates minor status based on dateOfBirth if isMinor is undefined', () => {
		const now = new Date();
		// Under 13: 10 years ago
		const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
		expect(computeIsMinorAccount({ dateOfBirth: { toDate: () => tenYearsAgo } })).toBe(true);

		// Over 13: 15 years ago
		const fifteenYearsAgo = new Date(now.getFullYear() - 15, now.getMonth(), now.getDate());
		expect(computeIsMinorAccount({ dateOfBirth: { toDate: () => fifteenYearsAgo } })).toBe(false);
	});

	it('handles age boundary precisely when birthday has not occurred yet this year', () => {
		const now = new Date();
		// Exactly 13 years ago, but month is next month -> age is 12 -> minor
		const birthdayNextMonth = new Date(now.getFullYear() - 13, now.getMonth() + 1, now.getDate());
		expect(computeIsMinorAccount({ dateOfBirth: { toDate: () => birthdayNextMonth } })).toBe(true);

		// Exactly 13 years ago, same month, day is tomorrow -> age is 12 -> minor
		const birthdayTomorrow = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate() + 1);
		expect(computeIsMinorAccount({ dateOfBirth: { toDate: () => birthdayTomorrow } })).toBe(true);

		// Exactly 13 years ago, same month, day was yesterday -> age is 13 -> not minor
		const birthdayYesterday = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate() - 1);
		expect(computeIsMinorAccount({ dateOfBirth: { toDate: () => birthdayYesterday } })).toBe(false);
	});

	it('returns false if dateOfBirth lacks a valid toDate function', () => {
		expect(computeIsMinorAccount({ dateOfBirth: {} as any })).toBe(false);
		expect(computeIsMinorAccount({ playerName: 'John' })).toBe(false);
	});
});

describe('computeIsOperativeProxy', () => {
	it('returns true for @operative.local email with player role', () => {
		expect(computeIsOperativeProxy('agent007@operative.local', 'player')).toBe(true);
	});

	it('returns false for @operative.local email with non-player role', () => {
		expect(computeIsOperativeProxy('agent007@operative.local', 'coach')).toBe(false);
		expect(computeIsOperativeProxy('agent007@operative.local', 'director')).toBe(false);
	});

	it('returns false for standard emails even with player role', () => {
		expect(computeIsOperativeProxy('player@gmail.com', 'player')).toBe(false);
	});
});

describe('getPrefsDefaults', () => {
	it('enables push_weatherAlerts for coach role', () => {
		const prefs = getPrefsDefaults('coach');
		expect(prefs.push_weatherAlerts).toBe(true);
		expect(prefs.push_gameReminders).toBe(true);
		expect(prefs.push_messages).toBe(true);
		expect(prefs.email_weeklyReport).toBe(false);
	});

	it('enables push_weatherAlerts for director, super_admin, and global_admin roles', () => {
		expect(getPrefsDefaults('director').push_weatherAlerts).toBe(true);
		expect(getPrefsDefaults('super_admin').push_weatherAlerts).toBe(true);
		expect(getPrefsDefaults('global_admin').push_weatherAlerts).toBe(true);
	});

	it('disables push_weatherAlerts for player and parent roles', () => {
		expect(getPrefsDefaults('player').push_weatherAlerts).toBe(false);
		expect(getPrefsDefaults('parent').push_weatherAlerts).toBe(false);
	});
});

describe('loadUserPreferences', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns defaults immediately when email is empty', async () => {
		const res = await loadUserPreferences('', defaults);
		expect(res).toEqual(defaults);
		expect(getDoc).not.toHaveBeenCalled();
	});

	it('returns merged preferences when doc exists with preferences', async () => {
		vi.mocked(getDoc).mockResolvedValueOnce({
			exists: () => true,
			data: () => ({ preferences: { push_weatherAlerts: false } })
		} as any);

		const res = await loadUserPreferences('user@test.com', defaults);
		expect(res).toEqual({ ...defaults, push_weatherAlerts: false });
	});

	it('returns defaults when doc exists but has no preferences', async () => {
		vi.mocked(getDoc).mockResolvedValueOnce({
			exists: () => true,
			data: () => ({})
		} as any);

		const res = await loadUserPreferences('user@test.com', defaults);
		expect(res).toEqual(defaults);
	});

	it('returns defaults when doc does not exist', async () => {
		vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as any);

		const res = await loadUserPreferences('user@test.com', defaults);
		expect(res).toEqual(defaults);
	});

	it('handles Firestore errors gracefully by returning defaults (error path)', async () => {
		vi.mocked(getDoc).mockRejectedValueOnce(new Error('Firestore error'));

		const res = await loadUserPreferences('user@test.com', defaults);
		expect(res).toEqual(defaults);
	});
});

describe('saveUserPreferences', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does nothing when email is empty', async () => {
		await saveUserPreferences('', defaults);
		expect(updateDoc).not.toHaveBeenCalled();
	});

	it('calls updateDoc with user preferences when email is provided', async () => {
		await saveUserPreferences('user@test.com', defaults);
		expect(doc).toHaveBeenCalled();
		expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { preferences: defaults });
	});
});

describe('saveProfile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(auth as any).currentUser = { email: 'User@Test.com' };
	});

	it('returns error if display name is empty and role is not director/admin', async () => {
		const input: SaveProfileInput = {
			playerName: '   ',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'user@test.com',
			role: 'player'
		};
		const res = await saveProfile(input);
		expect(res).toEqual({ error: 'Display name is required.' });
		expect(updateDoc).not.toHaveBeenCalled();
	});

	it('allows empty display name for directors and admins', async () => {
		vi.mocked(updateDoc).mockResolvedValueOnce(undefined as any);
		const input: SaveProfileInput = {
			playerName: '',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: { playerName: 'Existing Name' },
			email: 'director@test.com',
			role: 'director'
		};
		const res = await saveProfile(input);
		expect(res).toEqual({ message: 'Profile updated' });
		expect(updateDoc).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				playerName: 'Existing Name',
				privacyProfile: 'public',
				telemetryOptIn: true
			})
		);
	});

	it('returns error if user is not signed in', async () => {
		(auth as any).currentUser = null;
		const input: SaveProfileInput = {
			playerName: 'John',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'user@test.com',
			role: 'player'
		};
		const res = await saveProfile(input);
		expect(res).toEqual({ error: 'Not signed in.' });
	});

	it('returns error for operative proxy player account', async () => {
		const input: SaveProfileInput = {
			playerName: 'Agent',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'agent@operative.local',
			role: 'player'
		};
		const res = await saveProfile(input);
		expect(res).toEqual({ error: 'Use the Operative Call Sign screen.' });
	});

	it('enforces strict minor privacy settings when isMinorAccount is true', async () => {
		vi.mocked(updateDoc).mockResolvedValueOnce(undefined as any);
		const input: SaveProfileInput = {
			playerName: 'Minor Player',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: true,
			profile: null,
			email: 'minor@test.com',
			role: 'player'
		};
		const res = await saveProfile(input);
		expect(res).toEqual({ message: 'Profile updated' });
		expect(updateDoc).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				playerName: 'Minor Player',
				privacyProfile: 'strict_minor_defaults',
				telemetryOptIn: false
			})
		);
	});

	it('falls back to email prefix when playerName and profile.playerName are empty for director', async () => {
		vi.mocked(updateDoc).mockResolvedValueOnce(undefined as any);
		const input: SaveProfileInput = {
			playerName: '',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'director@test.com',
			role: 'director'
		};
		await saveProfile(input);
		expect(updateDoc).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				playerName: 'director'
			})
		);
	});

	it('handles updateDoc errors gracefully', async () => {
		vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Update failed'));
		const input: SaveProfileInput = {
			playerName: 'Valid Name',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'user@test.com',
			role: 'player'
		};
		const res = await saveProfile(input);
		expect(res).toEqual({ error: 'Update failed' });
	});

	it('handles non-Error thrown objects gracefully in catch block', async () => {
		vi.mocked(updateDoc).mockRejectedValueOnce('String error');
		const input: SaveProfileInput = {
			playerName: 'Valid Name',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'user@test.com',
			role: 'player'
		};
		const res = await saveProfile(input);
		expect(res).toEqual({ error: 'Save failed.' });
	});
});

describe('sendPasswordReset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns error when email is empty', async () => {
		const res = await sendPasswordReset('');
		expect(res).toEqual({ error: 'No email on file.' });
		expect(sendPasswordResetEmail).not.toHaveBeenCalled();
	});

	it('returns sent: true when reset email is sent successfully', async () => {
		vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce(undefined as any);
		const res = await sendPasswordReset('user@test.com');
		expect(res).toEqual({ sent: true });
		expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'user@test.com');
	});

	it('handles sendPasswordResetEmail error', async () => {
		vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error('User not found'));
		const res = await sendPasswordReset('unknown@test.com');
		expect(res).toEqual({ error: 'User not found' });
	});

	it('handles non-Error objects in catch block', async () => {
		vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce('Unknown error');
		const res = await sendPasswordReset('unknown@test.com');
		expect(res).toEqual({ error: 'Reset failed.' });
	});
});
