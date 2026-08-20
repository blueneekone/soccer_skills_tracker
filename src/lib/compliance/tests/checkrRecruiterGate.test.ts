// 🛡️ SafeSport Compliance Mandate: Enforces Parent Shadow CC routing for minors.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRecruiterCleared } from '$lib/components/recruiter/RecruiterOnboardingEngine.svelte.js';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import RecruiterSearchEngine from '$lib/components/recruiter/RecruiterSearchEngine.svelte';
import { getDocs } from 'firebase/firestore';

// Setup basic mocks using Proxy to avoid top-level hoisting ReferenceErrors in Vitest
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
		mockAuthenticated.value = false;
		mockUserProfile.value = null;
		vi.mocked(getDocs).mockClear();
	});

	it('returns false when the recruiter is not authenticated', () => {
		mockAuthenticated.value = false;
		mockUserProfile.value = { vettingStatus: 'cleared' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false when userProfile is null', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = null;
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for pending accounts', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'pending' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for consider accounts', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'consider' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for suspended accounts', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'suspended' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns false for flagged accounts', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'flagged' };
		expect(isRecruiterCleared()).toBe(false);
	});

	it('returns true ONLY for explicitly cleared accounts', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'cleared' };
		expect(isRecruiterCleared()).toBe(true);
	});

	it('returns true when status in clearance sub-object is clear/cleared', () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { clearance: { status: 'cleared' } };
		expect(isRecruiterCleared()).toBe(true);

		mockUserProfile.value = { clearance: { status: 'clear' } };
		expect(isRecruiterCleared()).toBe(true);
	});
});

describe('Checkr Recruiter Gate - RecruiterSearchEngine Search Query Lockout', () => {
	beforeEach(() => {
		mockAuthenticated.value = false;
		mockUserProfile.value = null;
		vi.mocked(getDocs).mockClear();
	});

	it('should return empty array and NOT execute firestore query for pending recruiter', async () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'pending' };

		render(RecruiterSearchEngine);

		// The initial $effect triggers search automatically, so we can wait and assert it is not called.
		await new Promise((r) => setTimeout(r, 100));
		expect(getDocs).not.toHaveBeenCalled();
	});

	it('should return empty array and NOT execute firestore query for consider recruiter', async () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'consider' };

		render(RecruiterSearchEngine);

		await new Promise((r) => setTimeout(r, 100));
		expect(getDocs).not.toHaveBeenCalled();
	});

	it('should return empty array and NOT execute firestore query for suspended recruiter', async () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'suspended' };

		render(RecruiterSearchEngine);

		await new Promise((r) => setTimeout(r, 100));
		expect(getDocs).not.toHaveBeenCalled();
	});

	it('should successfully execute query ONLY when recruiter is explicitly cleared', async () => {
		mockAuthenticated.value = true;
		mockUserProfile.value = { vettingStatus: 'cleared' };

		render(RecruiterSearchEngine);

		await waitFor(() => {
			expect(getDocs).toHaveBeenCalled();
		});
	});
});
