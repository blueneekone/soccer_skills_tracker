import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { BroadcastEngine } from '../BroadcastEngine.svelte.js';
import { writeBatch, onSnapshot } from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
	const actual = await vi.importActual('firebase/firestore');
	return {
		...actual,
		doc: vi.fn((...args) => {
			const path = args.map(a => typeof a === 'string' ? a : (a?.id || 'doc')).join('/');
			return { path, id: args[args.length - 1] };
		}),
		collection: vi.fn((...args) => {
			const path = args.map(a => typeof a === 'string' ? a : (a?.id || 'col')).join('/');
			return { path };
		}),
		query: vi.fn((col) => col),
		limit: vi.fn(),
		where: vi.fn(),
		onSnapshot: vi.fn((_, cb) => {
			return vi.fn();
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
		Object.assign(authStore, { user: null });
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		engine.connect('test-session');
		Object.defineProperty(engine, 'isVotingOpen', { get: () => true, configurable: true });

		const result = await engine.submitVote('player1');

		expect(result).toBe(false);
		expect(writeBatch).not.toHaveBeenCalled();
	});

	it('Test 2: Verifies real-time visual reactions occur after successful DB commit', async () => {
		vi.mocked(isFirestoreReady).mockReturnValue(true);
		Object.assign(authStore, { user: { uid: 'user123' } });
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		Object.defineProperty(engine, 'isVotingOpen', { get: () => true, configurable: true });
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
		vi.mocked(isFirestoreReady).mockReturnValue(false);

		engine.connect('test-session');

		expect(getActiveDb).not.toHaveBeenCalled();
	});
});

describe('Epic 6: Live MVP Voting Batching and Minor Player PII Protection', () => {
	let engine: BroadcastEngine;
	let sessionCallback: any = null;
	let campaignCallback: any = null;
	let userCallbacks: Record<string, any> = {};

	beforeEach(() => {
		vi.useFakeTimers();
		engine = new BroadcastEngine();
		sessionCallback = null;
		campaignCallback = null;
		userCallbacks = {};

		vi.mocked(isFirestoreReady).mockReturnValue(true);
		vi.mocked(getActiveDb).mockReturnValue({} as any);
		Object.assign(authStore, {
			user: { uid: 'user_fan_123' },
			isAuthenticated: true
		});

		vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any) => {
			const path = ref?.path || '';
			if (path.includes('broadcast_sessions/')) {
				sessionCallback = cb;
			} else if (path.includes('superdraw_campaigns') || path.includes('col/col')) {
				campaignCallback = cb;
			} else if (path.includes('users/')) {
				const parts = path.split('/');
				const uid = parts[parts.length - 1];
				userCallbacks[uid] = cb;
			}
			return vi.fn();
		});
	});

	afterEach(() => {
		engine.disconnect();
		vi.useRealTimers();
	});

	it('should correctly batch rapid sequential votes into a single writeBatch', async () => {
		const mockSessionData = {
			sessionId: 'session_abc',
			mvpVoting: {
				votingActive: true,
				candidates: ['player_1', 'player_2'],
				results: { player_1: 5, player_2: 3 }
			}
		};

		engine.connect('session_abc');
		expect(sessionCallback).toBeTypeOf('function');
		sessionCallback({
			exists: () => true,
			data: () => mockSessionData
		});

		expect(engine.isVotingOpen).toBe(true);

		const mockCommit = vi.fn().mockResolvedValue(undefined);
		const mockSet = vi.fn();
		vi.mocked(writeBatch).mockReturnValue({
			set: mockSet,
			commit: mockCommit
		} as any);

		const p1 = engine.submitVote('player_1');
		const p2 = engine.submitVote('player_2');
		const p3 = engine.submitVote('player_1');

		await vi.runAllTimersAsync();

		const results = await Promise.all([p1, p2, p3]);

		expect(results).toEqual([true, true, true]);
		expect(mockCommit).toHaveBeenCalledTimes(1);
		expect(mockSet).toHaveBeenCalledTimes(3);
	});

	it('should protect minor player PII by displaying pseudonymized metrics and names', () => {
		const mockSessionData = {
			sessionId: 'session_abc',
			mvpVoting: {
				votingActive: true,
				candidates: ['minor_unconsented_1', 'minor_consented_2', 'adult_3'],
				results: {}
			}
		};

		engine.connect('session_abc');
		sessionCallback({
			exists: () => true,
			data: () => mockSessionData
		});

		userCallbacks['minor_unconsented_1']?.({
			exists: () => true,
			data: () => ({
				isMinor: true,
				coppaStatus: 'denied',
				vpcStatus: 'not_required',
				playerName: 'Tommy Hawk',
				stats: { performanceTier: 'Gold', matchesCount: 15, avgRating: 8.5, privatePii: 'sensitive' },
				telemetry: { activityLevel: 'High', coordinates: [12.4, 45.6] }
			})
		});

		userCallbacks['minor_consented_2']?.({
			exists: () => true,
			data: () => ({
				isMinor: true,
				coppaStatus: 'granted',
				vpcStatus: 'verified',
				playerName: 'Sarah Connor',
				vettedStats: { performanceTier: 'Elite', matchesCount: 22, avgRating: 9.2 },
				vettedTelemetry: { activityLevel: 'Intense', vettedDistanceMeters: 5200 }
			})
		});

		userCallbacks['adult_3']?.({
			exists: () => true,
			data: () => ({
				isMinor: false,
				playerName: 'John Doe',
				stats: { performanceTier: 'Silver', matchesCount: 5 }
			})
		});

		const list = engine.candidates;
		expect(list).toHaveLength(3);

		const c1 = list.find(c => c.id === 'minor_unconsented_1');
		expect(c1).toBeDefined();
		expect(c1.isMinor).toBe(true);
		expect(c1.isConsented).toBe(false);
		expect(c1.name).toBe('Athlete #mino');
		expect(c1.stats.performanceTier).toBe('Verified');
		expect(c1.stats.privatePii).toBeUndefined();

		const c2 = list.find(c => c.id === 'minor_consented_2');
		expect(c2).toBeDefined();
		expect(c2.isMinor).toBe(true);
		expect(c2.isConsented).toBe(true);
		expect(c2.name).toBe('Sarah C.');
		expect(c2.stats.performanceTier).toBe('Elite');

		const c3 = list.find(c => c.id === 'adult_3');
		expect(c3).toBeDefined();
		expect(c3.isMinor).toBe(false);
		expect(c3.name).toBe('John Doe');
		expect(c3.stats.performanceTier).toBe('Silver');
	});

	it('should allow purchase of superdraw ticket before campaign endTime', async () => {
		engine.connect('session_abc');

		if (campaignCallback) {
			campaignCallback({
				empty: false,
				docs: [{
					data: () => ({
						campaignId: 'session_abc',
						endTime: new Date(Date.now() + 60000).toISOString(),
						totalPool: 1000,
						ticketPrice: 5
					})
				}]
			});
		}

		const mockCommit = vi.fn().mockResolvedValue(undefined);
		const mockSet = vi.fn();
		vi.mocked(writeBatch).mockReturnValue({
			set: mockSet,
			commit: mockCommit
		} as any);

		const result = await engine.purchaseSuperdrawEntry(2);
		expect(result).toBe(true);
		expect(mockCommit).toHaveBeenCalled();
	});

	it('should block purchase of superdraw ticket after campaign endTime', async () => {
		engine.connect('session_abc');

		if (campaignCallback) {
			campaignCallback({
				empty: false,
				docs: [{
					data: () => ({
						campaignId: 'session_abc',
						endTime: new Date(Date.now() - 60000).toISOString(),
						totalPool: 1000,
						ticketPrice: 5
					})
				}]
			});
		}

		const mockCommit = vi.fn().mockResolvedValue(undefined);
		vi.mocked(writeBatch).mockReturnValue({
			set: vi.fn(),
			commit: mockCommit
		} as any);

		const result = await engine.purchaseSuperdrawEntry(2);
		expect(result).toBe(false);
		expect(mockCommit).not.toHaveBeenCalled();
	});
});
