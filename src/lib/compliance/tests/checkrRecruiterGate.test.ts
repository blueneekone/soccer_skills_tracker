// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRecruiterCleared } from '$lib/components/recruiter/RecruiterOnboardingEngine.svelte.js';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import RecruiterSearchEngine from '$lib/components/recruiter/RecruiterSearchEngine.svelte';
import { getDocs } from 'firebase/firestore';

// Setup basic mocks using Proxy to avoid top-level hoisting ReferenceErrors in Vitest
let mockAuthenticated = false;
let mockUserProfile: any = null;

vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
	authStore: new Proxy({}, {
		get: (_, prop) => {
			if (prop === 'isAuthenticated') return mockAuthenticated;
			if (prop === 'userProfile') return mockUserProfile;
			return undefined;
		}
	})
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$lib/firebase.js', () => ({
	db: {}
}));

vi.mock('firebase/firestore', () => {
	const dummyRef = { _delegate: {} };
	return {
		collection: vi.fn(() => dummyRef),
		query: vi.fn(() => dummyRef),
		where: vi.fn(() => dummyRef),
		limit: vi.fn(() => dummyRef),
		orderBy: vi.fn(() => dummyRef),
		startAfter: vi.fn(() => dummyRef),
		doc: vi.fn(() => dummyRef),
		getDocs: vi.fn(() => ({
			docs: [],
			forEach: () => {}
		})),
		onSnapshot: vi.fn(() => () => {})
	};
});

describe('Checkr Recruiter Gate - RecruiterOnboardingEngine & isRecruiterCleared', () => {
	beforeEach(() => {
		mockAuthenticated = false;
		mockUserProfile = null;
		vi.mocked(getDocs).mockClear();
	});

	it('returns false when the recruiter is not authenticated', () => {
		mockAuthenticated = false;
		mockUserProfile = { vettingStatus: 'cleared' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false when userProfile is null', () => {
		mockAuthenticated = true;
		mockUserProfile = null;
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for pending accounts', () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'pending' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for consider accounts', () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'consider' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for suspended accounts', () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'suspended' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for flagged accounts', () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'flagged' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns true ONLY for explicitly cleared accounts', () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'cleared' };
		expect(isRecruiterCleared()).toBe(true);
	});

	it('returns true when status in clearance sub-object is clear/cleared', () => {
		mockAuthenticated = true;
		mockUserProfile = { clearance: { status: 'cleared' } };
		expect(isRecruiterCleared()).toBe(true);

		mockUserProfile = { clearance: { status: 'clear' } };
		expect(isRecruiterCleared()).toBe(true);
	});
});

describe('Checkr Recruiter Gate - RecruiterSearchEngine Search Query Lockout', () => {
	beforeEach(() => {
		mockAuthenticated = false;
		mockUserProfile = null;
		vi.mocked(getDocs).mockClear();
	});

	it('should return empty array and NOT execute firestore query for pending recruiter', async () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'pending' };

		render(RecruiterSearchEngine);

		// The initial $effect triggers search automatically, so we can wait and assert it is not called.
		await new Promise((r) => setTimeout(r, 100));
		expect(getDocs).not.toHaveBeenCalled();
	});

	it('should return empty array and NOT execute firestore query for consider recruiter', async () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'consider' };

		render(RecruiterSearchEngine);

		await new Promise((r) => setTimeout(r, 100));
		expect(getDocs).not.toHaveBeenCalled();
	});

	it('should return empty array and NOT execute firestore query for suspended recruiter', async () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'suspended' };

		render(RecruiterSearchEngine);

		await new Promise((r) => setTimeout(r, 100));
		expect(getDocs).not.toHaveBeenCalled();
	});

	it('should successfully execute query ONLY when recruiter is explicitly cleared', async () => {
		mockAuthenticated = true;
		mockUserProfile = { vettingStatus: 'cleared' };

		render(RecruiterSearchEngine);

		await waitFor(() => {
			expect(getDocs).toHaveBeenCalled();
		});
	});
});
