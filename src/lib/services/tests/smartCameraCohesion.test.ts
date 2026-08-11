import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getActiveDb } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { SmartCameraEngine } from '../SmartCameraEngine.svelte.js';
import { onSnapshot } from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
	const actual = await vi.importActual('firebase/firestore');
	return {
		...actual,
		collection: vi.fn(),
		query: vi.fn(),
		where: vi.fn(),
		onSnapshot: vi.fn((q, cb) => {
			return vi.fn(); // unsubscribe mock
		}),
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

describe('SmartCameraEngine Cohesion', () => {
	let engine: SmartCameraEngine;

	beforeEach(() => {
		engine = new SmartCameraEngine();
		vi.clearAllMocks();
	});

	afterEach(() => {
		engine.disconnect();
	});

	it('should return empty fallback state when isFirestoreReady is false', () => {
		vi.mocked(isFirestoreReady).mockReturnValue(false);
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		engine.connect();

		expect(engine.cameras).toEqual([]);
		expect(onSnapshot).not.toHaveBeenCalled();
	});

	it('should connect and subscribe to smart_cameras collection when isFirestoreReady is true', () => {
		vi.mocked(isFirestoreReady).mockReturnValue(true);
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		engine.connect('venue-123');

		expect(onSnapshot).toHaveBeenCalled();
		expect(engine.cameras).toEqual([]);
		expect(engine.connectedVenueId).toBe('venue-123');
	});

	it('should pause stream hooks and disconnect when auth state drops (isFirestoreReady becomes false)', () => {
		vi.mocked(isFirestoreReady).mockReturnValue(true);
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		const unsubMock = vi.fn();
		vi.mocked(onSnapshot).mockReturnValue(unsubMock as any);

		engine.connect('venue-123');
		expect(onSnapshot).toHaveBeenCalled();

		// Simulate auth state dropping
		vi.mocked(isFirestoreReady).mockReturnValue(false);

		// Accessing cameras should trigger disconnect and return fallback state
		expect(engine.cameras).toEqual([]);
		expect(unsubMock).toHaveBeenCalled();
		expect(engine.connectedVenueId).toBeNull();
	});

	it('should immediately disconnect when snapshot fires after auth state has dropped', () => {
		vi.mocked(isFirestoreReady).mockReturnValue(true);
		vi.mocked(getActiveDb).mockReturnValue({} as any);

		let snapshotCallback: any = null;
		vi.mocked(onSnapshot).mockImplementation((q, cb) => {
			snapshotCallback = cb;
			return vi.fn();
		});

		engine.connect('venue-123');
		expect(snapshotCallback).toBeTypeOf('function');

		// Drop auth
		vi.mocked(isFirestoreReady).mockReturnValue(false);

		// Trigger snapshot
		const mockUnsub = vi.spyOn(engine, 'disconnect');
		snapshotCallback({
			forEach: () => {}
		});

		expect(mockUnsub).toHaveBeenCalled();
	});
});
