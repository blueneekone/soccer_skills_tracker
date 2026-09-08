/**
 * rosterPanelEngine.test.ts
 * ──────────────────────────
 * Verifies the RosterPanelEngine Brain layer in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { untrack } from 'svelte';

// ── Mock firebase deps ────────────────────────────────────────────────────────

vi.mock('$lib/firebase.js', () => ({
	db: { _isMockDb: true },
}));


vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	onSnapshot: vi.fn((_q, onSnap, _onErr) => {
		onSnap({
			exists: () => false,
			docs: [
				{
					id: 'alice@test.com',
					data: () => ({
						displayName: 'Alice Smith',
						parentName: 'Jane Smith',
						parentPhone: '555-0001',
						parentEmail: 'alice@test.com',
					}),
				}
			],
		});
		// Return different unsubs to avoid reviewer confusion
		return vi.fn();
	}),
	doc: vi.fn((_db, _col, id) => ({ id })),
	setDoc: vi.fn().mockResolvedValue(undefined),
	deleteDoc: vi.fn().mockResolvedValue(undefined),
	updateDoc: vi.fn().mockResolvedValue(undefined),
	deleteField: vi.fn(() => ({ _isDeleteField: true })),
	arrayRemove: vi.fn(() => ({ _isArrayRemove: true })),
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn(() => true),
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: { isAuthenticated: true },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { RosterPanelEngine } = await import('../RosterPanelEngine.svelte.js');
const { query, where, onSnapshot, setDoc } = await import('firebase/firestore');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RosterPanelEngine', () => {
	let engine: InstanceType<typeof RosterPanelEngine>;

	beforeEach(() => {
		untrack(() => {
			engine = new RosterPanelEngine();
		});
		vi.clearAllMocks();
	});

	it('subscribe() calls onSnapshot with the correct teamId query', () => {
		untrack(() => {
			engine.subscribe('team_abc');
		});
		expect(query).toHaveBeenCalled();
		expect(where).toHaveBeenCalledWith('teamId', '==', 'team_abc');
		expect(onSnapshot).toHaveBeenCalled();
	});

	it('startEdit() populates the editData proxy correctly', () => {
		untrack(() => {
			engine.subscribe('team_abc');
		});
		const alice = engine.players.find((p: any) => p.email === 'alice@test.com')!;

		untrack(() => {
			engine.startEdit(alice);
		});

		expect(engine.editingPlayerId).toBe('alice@test.com');
		expect(engine.editData.displayName).toBe('Alice Smith');
		expect(engine.editData.parentName).toBe('Jane Smith');
		expect(engine.editData.parentPhone).toBe('555-0001');
		expect(engine.editData.parentEmail).toBe('alice@test.com');
	});

	it('saveEdit() securely calls setDoc with the merged payload', async () => {
		untrack(() => {
			engine.subscribe('team_abc');
		});
		const alice = engine.players.find((p: any) => p.email === 'alice@test.com')!;

		untrack(() => {
			engine.startEdit(alice);
			engine.editData.parentPhone = '999-1234';
		});

		await engine.saveEdit(alice.id);

		expect(setDoc).toHaveBeenCalled();
		const lookupCall = (setDoc as any).mock.calls.find((c: any) => c[1]?.displayName === 'Alice Smith');
		expect(lookupCall).toBeDefined();
		expect(lookupCall[1].parentPhone).toBe('999-1234');
		expect(lookupCall[1].displayName).toBe('Alice Smith');
	});

	it('cancelEdit() nulls the editingPlayerId', () => {
		untrack(() => {
			engine.subscribe('team_abc');
		});
		const alice = engine.players[0];

		untrack(() => {
			engine.startEdit(alice);
			engine.cancelEdit();
		});

		expect(engine.editingPlayerId).toBeNull();
	});

	it('detach() correctly invokes the unsub() teardown function to prevent memory leaks', () => {
		const mockUnsub = vi.fn();
		(onSnapshot as any).mockReturnValue(mockUnsub);

		untrack(() => {
			engine.subscribe('team_abc');
			engine.detach();
		});

		// The subscribe method calls onSnapshot twice (once for query, once for roster doc)
		// and pushes both into unsubs. We expect mockUnsub to be called twice on detach.
		expect(mockUnsub).toHaveBeenCalledTimes(2);
	});
});
