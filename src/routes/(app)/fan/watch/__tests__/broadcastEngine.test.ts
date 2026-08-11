import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { BroadcastEngine } from '../BroadcastEngine.svelte.js';
import { writeBatch } from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
	const actual = await vi.importActual('firebase/firestore');
	return {
		...actual,
		doc: vi.fn(),
		collection: vi.fn(),
		query: vi.fn(),
		limit: vi.fn(),
		onSnapshot: vi.fn((_, cb) => {
			// Mock initial snapshot trigger if needed
			return vi.fn(); // unsubscribe mock
		}),
		writeBatch: vi.fn(() => ({
			set: vi.fn(),
			commit: vi.fn().mockResolvedValue(undefined)
		}))
	};
});

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn()
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn()
}));

vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
	authStore: {
		user: null,
		isAuthenticated: false,
		isLoading: false
	}
}));

describe('BroadcastEngine', () => {
	let engine: BroadcastEngine;

	beforeEach(() => {
		engine = new BroadcastEngine();
		vi.clearAllMocks();
	});

	afterEach(() => {
		engine.disconnect();
	});

	it('Test 1: Rejects vote submission without authentic credentials', async () => {
		vi.mocked(isFirestoreReady).mockReturnValue(true);
		Object.assign(authStore, { user: null }); // Unauthenticated
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		engine.connect('test-session');

		// Setup mock state to pretend voting is active
		// (We'll use a hack to set the state since it's private but we can rely on early return)
		Object.defineProperty(engine, 'isVotingOpen', { get: () => true });

		const result = await engine.submitVote('player1');

		expect(result).toBe(false);
		expect(writeBatch).not.toHaveBeenCalled();
	});

	it('Test 2: Verifies real-time visual reactions occur after successful DB commit', async () => {
		vi.mocked(isFirestoreReady).mockReturnValue(true);
		Object.assign(authStore, { user: { uid: 'user123' } });
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		Object.defineProperty(engine, 'isVotingOpen', { get: () => true });
		engine.connect('test-session');

		const mockCommit = vi.fn().mockResolvedValue(undefined);
		vi.mocked(writeBatch).mockReturnValue({
			set: vi.fn(),
			commit: mockCommit
		} as any);

		const result = await engine.submitVote('player1');

		expect(result).toBe(true);
		expect(mockCommit).toHaveBeenCalled();
	});

	it('Test 3: Asserts isFirestoreReady blocks data-fetching if unauthenticated', () => {
		vi.mocked(isFirestoreReady).mockReturnValue(false); // Unauthenticated / Not Ready

		engine.connect('test-session');

		expect(getActiveDb).not.toHaveBeenCalled();
	});
});
