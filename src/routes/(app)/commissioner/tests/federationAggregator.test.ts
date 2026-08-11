import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FederationEngine } from '../FederationEngine.svelte.js';
import * as firestoreGuard from '$lib/utils/firestoreGuard.js';
import * as firebase from '$lib/firebase.js';
import * as firestore from 'firebase/firestore';

// Mock authStore properties dynamically
let mockRole = 'commissioner';
let mockIsAuthenticated = true;
let mockTenantId: string | null = 'master-tenant-123';

vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
	authStore: new Proxy({}, {
		get: (_, prop) => {
			if (prop === 'role') return mockRole;
			if (prop === 'isAuthenticated') return mockIsAuthenticated;
			if (prop === 'isLoading') return false;
			if (prop === 'tenantId') return mockTenantId;
			if (prop === 'userProfile') return { tenantId: mockTenantId };
			return undefined;
		},
		set: (_, prop, val) => {
			if (prop === 'role') mockRole = val as string;
			if (prop === 'isAuthenticated') mockIsAuthenticated = val as boolean;
			if (prop === 'tenantId') mockTenantId = val as string | null;
			return true;
		}
	})
}));

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn()
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	getDocs: vi.fn()
}));

describe('FederationEngine - Multi-Tenant Aggregator Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRole = 'commissioner';
		mockIsAuthenticated = true;
		mockTenantId = 'master-tenant-123';
	});

	it('Constructor properly locks access if role is not commissioner', () => {
		mockRole = 'coach';
		const engine = new FederationEngine();
		expect(engine.isAuthorized).toBe(false);
		expect(engine.tenantId).toBeNull();
	});

	it('Constructor allows access and sets master tenantId if commissioner', () => {
		const engine = new FederationEngine();
		expect(engine.isAuthorized).toBe(true);
		expect(engine.tenantId).toBe('master-tenant-123');
	});

	it('queryFederationRosters gates query when B815 defensive hydration is unready', async () => {
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(false);

		const engine = new FederationEngine();
		const players = await engine.queryFederationRosters();

		expect(players).toEqual([]);
		expect(firebase.getActiveDb).not.toHaveBeenCalled();
	});

	it('queryFederationRosters fails with error if unauthenticated', async () => {
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);
		mockIsAuthenticated = false;

		const engine = new FederationEngine();
		const players = await engine.queryFederationRosters();

		expect(players).toEqual([]);
		expect(engine.error).toBe('Unauthorized access.');
		expect(firebase.getActiveDb).not.toHaveBeenCalled();
	});

	it('queryFederationRosters calls cell-isolated helper and constructs master-tenant query', async () => {
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);
		const mockDb = {};
		vi.mocked(firebase.getActiveDb).mockReturnValue(mockDb as any);

		const mockDocs = [
			{
				id: 'player-1',
				data: () => ({ name: 'John Doe', clubId: 'club-a', role: 'player', tenantId: 'master-tenant-123' })
			},
			{
				id: 'player-2',
				data: () => ({ name: 'Jane Smith', clubId: 'club-b', role: 'player', tenantId: 'master-tenant-123' })
			}
		];
		vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any);

		const engine = new FederationEngine();
		const players = await engine.queryFederationRosters();

		expect(firebase.getActiveDb).toHaveBeenCalled();
		expect(firestore.collection).toHaveBeenCalledWith(mockDb, 'users');
		expect(firestore.where).toHaveBeenCalledWith('tenantId', '==', 'master-tenant-123');
		expect(firestore.where).toHaveBeenCalledWith('role', '==', 'player');
		expect(players).toHaveLength(2);
		expect(engine.rosterPlayers).toHaveLength(2);
	});

	it('queryFederationRosters filters results by clubIds if specified', async () => {
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);
		const mockDb = {};
		vi.mocked(firebase.getActiveDb).mockReturnValue(mockDb as any);

		const mockDocs = [
			{
				id: 'player-1',
				data: () => ({ name: 'John Doe', clubId: 'club-a', role: 'player', tenantId: 'master-tenant-123' })
			},
			{
				id: 'player-2',
				data: () => ({ name: 'Jane Smith', clubId: 'club-b', role: 'player', tenantId: 'master-tenant-123' })
			}
		];
		vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any);

		const engine = new FederationEngine();
		const players = await engine.queryFederationRosters(['club-a']);

		expect(players).toHaveLength(1);
		expect(players[0].id).toBe('player-1');
	});
});
