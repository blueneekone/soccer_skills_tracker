import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	loadUserPreferences,
	saveUserPreferences,
	saveProfile,
	sendPasswordReset,
	computeIsMinorAccount,
	computeIsOperativeProxy,
	getPrefsDefaults,
	type UserPreferences,
	type ProfileDoc,
	type SaveProfileInput
} from '../playerSettingsHandlers';
import { getDoc, updateDoc, doc } from 'firebase/firestore';
import { auth } from '$lib/firebase.js';
import { sendPasswordResetEmail } from 'firebase/auth';

vi.mock('firebase/firestore', () => ({
	doc: vi.fn((_db, _col, id) => ({ id })),
	getDoc: vi.fn(),
	updateDoc: vi.fn()
}));

vi.mock('firebase/auth', () => ({
	sendPasswordResetEmail: vi.fn()
}));

vi.mock('$lib/firebase.js', () => ({
	auth: { currentUser: { email: 'user@test.com' } },
	db: {}
}));

const defaults: UserPreferences = {
	push_weatherAlerts: true,
	push_gameReminders: true,
	push_messages: true,
	email_weeklyReport: false
};

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

	it('handles Firestore errors gracefully by returning defaults (Error object)', async () => {
		vi.mocked(getDoc).mockRejectedValueOnce(new Error('Firestore permission denied'));

		const res = await loadUserPreferences('user@test.com', defaults);
		expect(res).toEqual(defaults);
	});

	it('handles non-Error throwables gracefully by returning defaults', async () => {
		vi.mocked(getDoc).mockRejectedValueOnce('Network connection failed');

		const res = await loadUserPreferences('user@test.com', defaults);
		expect(res).toEqual(defaults);
	});

	it('handles unexpected null rejections gracefully by returning defaults', async () => {
		vi.mocked(getDoc).mockRejectedValueOnce(null);

		const res = await loadUserPreferences('user@test.com', defaults);
		expect(res).toEqual(defaults);
	});
});

describe('saveUserPreferences', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns early when email is empty', async () => {
		await saveUserPreferences('', defaults);
		expect(updateDoc).not.toHaveBeenCalled();
	});

	it('calls updateDoc with target user email and preferences', async () => {
		await saveUserPreferences('user@test.com', defaults);
		expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'user@test.com');
		expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { preferences: defaults });
	});
});

describe('getPrefsDefaults', () => {
	it('returns push_weatherAlerts = true for coach role', () => {
		const res = getPrefsDefaults('coach');
		expect(res).toEqual({
			push_weatherAlerts: true,
			push_gameReminders: true,
			push_messages: true,
			email_weeklyReport: false
		});
	});

	it('returns push_weatherAlerts = true for director, super_admin, global_admin roles', () => {
		for (const role of ['director', 'super_admin', 'global_admin']) {
			const res = getPrefsDefaults(role);
			expect(res.push_weatherAlerts).toBe(true);
		}
	});

	it('returns push_weatherAlerts = false for player and parent roles', () => {
		expect(getPrefsDefaults('player').push_weatherAlerts).toBe(false);
		expect(getPrefsDefaults('parent').push_weatherAlerts).toBe(false);
	});
});

describe('computeIsMinorAccount', () => {
	it('returns false when profile is null or undefined', () => {
		expect(computeIsMinorAccount(null)).toBe(false);
		expect(computeIsMinorAccount(undefined)).toBe(false);
	});

	it('respects explicit profile.isMinor boolean flags', () => {
		expect(computeIsMinorAccount({ isMinor: true })).toBe(true);
		expect(computeIsMinorAccount({ isMinor: false })).toBe(false);
	});

	it('calculates age under 13 from dateOfBirth', () => {
		const now = new Date();
		const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
		const profile: ProfileDoc = {
			dateOfBirth: { toDate: () => tenYearsAgo }
		};
		expect(computeIsMinorAccount(profile)).toBe(true);
	});

	it('calculates age 13 or over from dateOfBirth', () => {
		const now = new Date();
		const fifteenYearsAgo = new Date(now.getFullYear() - 15, now.getMonth(), now.getDate());
		const profile: ProfileDoc = {
			dateOfBirth: { toDate: () => fifteenYearsAgo }
		};
		expect(computeIsMinorAccount(profile)).toBe(false);
	});

	it('handles dateOfBirth boundary conditions correctly (birthday later this month)', () => {
		const now = new Date();
		const date = new Date(now.getFullYear() - 13, (now.getMonth() + 1) % 12, 15);
		const profile: ProfileDoc = {
			dateOfBirth: { toDate: () => date }
		};
		expect(computeIsMinorAccount(profile)).toBe(true);
	});

	it('returns false if dateOfBirth is missing or lacks toDate function', () => {
		expect(computeIsMinorAccount({})).toBe(false);
		expect(computeIsMinorAccount({ dateOfBirth: {} as any })).toBe(false);
	});
});

describe('computeIsOperativeProxy', () => {
	it('returns true for @operative.local email with role player', () => {
		expect(computeIsOperativeProxy('agent007@operative.local', 'player')).toBe(true);
	});

	it('returns false for non-operative email domain or non-player role', () => {
		expect(computeIsOperativeProxy('agent007@gmail.com', 'player')).toBe(false);
		expect(computeIsOperativeProxy('agent007@operative.local', 'coach')).toBe(false);
	});
});

describe('saveProfile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		auth.currentUser = { email: 'user@test.com' } as any;
	});

	it('returns error if display name is empty and role is non-director', async () => {
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

	it('allows empty display name if role is director and falls back to profile name or email prefix', async () => {
		const input: SaveProfileInput = {
			playerName: '   ',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'director@test.com',
			role: 'director'
		};
		vi.mocked(updateDoc).mockResolvedValueOnce();

		const res = await saveProfile(input);
		expect(res).toEqual({ message: 'Profile updated' });
		expect(updateDoc).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				playerName: 'director',
				privacyProfile: 'public',
				telemetryOptIn: true
			})
		);
	});

	it('returns error if user is not signed in (auth.currentUser is null)', async () => {
		auth.currentUser = null;
		const input: SaveProfileInput = {
			playerName: 'Alex',
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

	it('returns error for operative proxy player', async () => {
		const input: SaveProfileInput = {
			playerName: 'Operative Player',
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

	it('enforces strict minor defaults when isMinorAccount is true', async () => {
		const input: SaveProfileInput = {
			playerName: 'Minor Player',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: true,
			profile: null,
			email: 'user@test.com',
			role: 'player'
		};
		vi.mocked(updateDoc).mockResolvedValueOnce();

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

	it('returns error message when updateDoc fails', async () => {
		const input: SaveProfileInput = {
			playerName: 'Alex',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'user@test.com',
			role: 'player'
		};
		vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Update failed in database'));

		const res = await saveProfile(input);
		expect(res).toEqual({ error: 'Update failed in database' });
	});

	it('returns generic error string when non-Error throwable is caught', async () => {
		const input: SaveProfileInput = {
			playerName: 'Alex',
			privacyProfile: 'public',
			telemetryOptIn: true,
			isMinorAccount: false,
			profile: null,
			email: 'user@test.com',
			role: 'player'
		};
		vi.mocked(updateDoc).mockRejectedValueOnce('Network error string');

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

	it('dispatches sendPasswordResetEmail and returns sent: true on success', async () => {
		vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce();
		const res = await sendPasswordReset('user@test.com');
		expect(res).toEqual({ sent: true });
		expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'user@test.com');
	});

	it('catches and formats Error object when reset fails', async () => {
		vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error('User not found'));
		const res = await sendPasswordReset('user@test.com');
		expect(res).toEqual({ error: 'User not found' });
	});

	it('catches non-Error throwable and returns default message', async () => {
		vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce('Firebase network error');
		const res = await sendPasswordReset('user@test.com');
		expect(res).toEqual({ error: 'Reset failed.' });
	});
});
