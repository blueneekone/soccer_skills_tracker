import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadUserPreferences, type UserPreferences } from '../playerSettingsHandlers';
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
