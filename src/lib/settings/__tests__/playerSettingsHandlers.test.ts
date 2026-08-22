import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrefsDefaults, loadUserPreferences, type UserPreferences } from '../playerSettingsHandlers';
import { getDoc } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
	doc: vi.fn(() => ({})),
	getDoc: vi.fn(),
	updateDoc: vi.fn()
}));

vi.mock('$lib/firebase.js', () => ({
	auth: {},
	db: {}
}));

const defaults: UserPreferences = {
	push_weatherAlerts: true,
	push_gameReminders: true,
	push_messages: true,
	email_weeklyReport: false
};

describe('getPrefsDefaults', () => {
	it('returns push_weatherAlerts = true for elevated/leadership roles', () => {
		const roles = ['coach', 'director', 'super_admin', 'global_admin'];
		for (const role of roles) {
			const prefs = getPrefsDefaults(role);
			expect(prefs.push_weatherAlerts).toBe(true);
			expect(prefs.push_gameReminders).toBe(true);
			expect(prefs.push_messages).toBe(true);
			expect(prefs.email_weeklyReport).toBe(false);
		}
	});

	it('returns push_weatherAlerts = false for non-leadership roles and unknown roles', () => {
		const roles = ['player', 'parent', 'recruiter', 'fan', 'unknown', ''];
		for (const role of roles) {
			const prefs = getPrefsDefaults(role);
			expect(prefs.push_weatherAlerts).toBe(false);
			expect(prefs.push_gameReminders).toBe(true);
			expect(prefs.push_messages).toBe(true);
			expect(prefs.email_weeklyReport).toBe(false);
		}
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
