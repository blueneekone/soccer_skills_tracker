// 🛡️ SafeSport Compliance Mandate: Enforces Parent Shadow CC routing for minors.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	normalizeRecruiterStatus,
	isRecruiterCleared,
	pollRecruiterCheckrStatus
} from '../checkrRecruiterClearance.js';
import { getDoc } from 'firebase/firestore';

const { mockAuthenticated, mockUserProfile } = vi.hoisted(() => {
	return {
		mockAuthenticated: { value: false },
		mockUserProfile: { value: null as any }
	};
});

vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
	authStore: new Proxy({}, {
		get: (_, prop) => {
			if (prop === 'isAuthenticated') return mockAuthenticated.value;
			if (prop === 'userProfile') return mockUserProfile.value;
			if (prop === 'user') return { uid: 'recruiter-test-uid' };
			return undefined;
		}
	})
}));

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn(() => ({})),
	db: {}
}));

vi.mock('firebase/firestore', () => ({
	doc: vi.fn((_db, _col, id) => ({ id })),
	getDoc: vi.fn()
}));

describe('checkrRecruiterClearance Unit Tests', () => {
	beforeEach(() => {
		mockAuthenticated.value = false;
		mockUserProfile.value = null;
		vi.mocked(getDoc).mockClear();
	});

	it('normalizeRecruiterStatus maps raw inputs correctly', () => {
		expect(normalizeRecruiterStatus('CLEAR')).toBe('clear');
		expect(normalizeRecruiterStatus('cleared')).toBe('clear');
		expect(normalizeRecruiterStatus('invited')).toBe('invited');
		expect(normalizeRecruiterStatus('consider')).toBe('consider');
		expect(normalizeRecruiterStatus('suspended')).toBe('suspended');
		expect(normalizeRecruiterStatus('unknown_status')).toBe('pending');
		expect(normalizeRecruiterStatus(null)).toBe('pending');
	});

	it('isRecruiterCleared returns false if user is unauthenticated', () => {
		mockAuthenticated.value = false;
		expect(isRecruiterCleared('clear')).toBe(false);
		expect(isRecruiterCleared('pending')).toBe(false);
	});

	it('isRecruiterCleared returns true when status string is clear/cleared and authenticated', () => {
		mockAuthenticated.value = true;
		expect(isRecruiterCleared('clear')).toBe(true);
		expect(isRecruiterCleared('cleared')).toBe(true);
	});

	it('isRecruiterCleared returns false for non-cleared statuses', () => {
		mockAuthenticated.value = true;
		expect(isRecruiterCleared('pending')).toBe(false);
		expect(isRecruiterCleared('invited')).toBe(false);
		expect(isRecruiterCleared('consider')).toBe(false);
		expect(isRecruiterCleared('suspended')).toBe(false);
	});

	it('isRecruiterCleared falls back to authStore userProfile vettingStatus', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'clear' };
		expect(isRecruiterCleared()).toBe(true);

		mockUserProfile.value = { vettingStatus: 'pending' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('pollRecruiterCheckrStatus retrieves status from Firestore doc', async () => {
		mockAuthenticated.value = true;
		vi.mocked(getDoc).mockResolvedValueOnce({
			exists: () => true,
			data: () => ({ checkrStatus: 'clear' })
		} as any);

		const res = await pollRecruiterCheckrStatus('rec-123');
		expect(res).toBe('clear');
	});

	it('pollRecruiterCheckrStatus defaults to pending if document does not exist', async () => {
		mockAuthenticated.value = true;
		vi.mocked(getDoc).mockResolvedValueOnce({
			exists: () => false,
			data: () => null
		} as any);

		const res = await pollRecruiterCheckrStatus('rec-123');
		expect(res).toBe('pending');
	});
});