/**
 * rosterPanelEngine.test.ts
 * ──────────────────────────
 * Verifies the RosterPanelEngine Brain layer in isolation.
 * No Svelte rendering required — tests the class methods directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase deps ────────────────────────────────────────────────────────

vi.mock('$lib/firebase.js', () => ({
	db: { _isMockDb: true },
}));

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	onSnapshot: vi.fn((_q, onSnap, _onErr) => {
		// Immediately invoke with a mock snapshot containing 2 players
		onSnap({
			docs: [
				{
					id: 'alice@test.com',
					data: () => ({
						displayName: 'Alice Smith',
						parentName: 'Jane Smith',
						parentPhone: '555-0001',
						parentEmail: 'jane@test.com',
					}),
				},
				{
					id: 'bob@test.com',
					data: () => ({
						playerName: 'Bob Jones',
						parentName: '',
						parentPhone: '',
						parentEmail: '',
					}),
				},
			],
		});
		return vi.fn(); // unsub
	}),
	doc: vi.fn((_db, _col, id) => ({ id })),
	setDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn(() => true),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { RosterPanelEngine } = await import('../RosterPanelEngine.svelte.js');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RosterPanelEngine', () => {
	let engine: InstanceType<typeof RosterPanelEngine>;

	beforeEach(() => {
		engine = new RosterPanelEngine();
		vi.clearAllMocks();
	});

	it('subscribe() populates players from onSnapshot', () => {
		engine.subscribe('team_abc');
		expect(engine.players).toHaveLength(2);
		expect(engine.loading).toBe(false);
	});

	it('players are sorted alphabetically by displayName', () => {
		engine.subscribe('team_abc');
		const names = engine.players.map((p) => p.displayName);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});

	it('uses playerName as fallback when displayName is missing', () => {
		engine.subscribe('team_abc');
		const bob = engine.players.find((p) => p.email === 'bob@test.com');
		expect(bob?.displayName).toBe('Bob Jones');
	});

	it('startEdit() populates editData with player values', () => {
		engine.subscribe('team_abc');
		const alice = engine.players.find((p) => p.email === 'alice@test.com')!;
		engine.startEdit(alice);
		expect(engine.editingPlayerId).toBe('alice@test.com');
		expect(engine.editData.displayName).toBe('Alice Smith');
		expect(engine.editData.parentName).toBe('Jane Smith');
	});

	it('cancelEdit() clears editingPlayerId', () => {
		engine.subscribe('team_abc');
		const alice = engine.players[0];
		engine.startEdit(alice);
		engine.cancelEdit();
		expect(engine.editingPlayerId).toBeNull();
	});

	it('saveEdit() calls setDoc with merged payload', async () => {
		const { setDoc } = await import('firebase/firestore');
		engine.subscribe('team_abc');
		const alice = engine.players.find((p) => p.email === 'alice@test.com')!;
		engine.startEdit(alice);
		engine.editData.parentPhone = '999-1234';
		await engine.saveEdit(alice.id);
		expect(setDoc).toHaveBeenCalledOnce();
		const payload = (setDoc as any).mock.calls[0][1];
		expect(payload.parentPhone).toBe('999-1234');
		expect(payload.displayName).toBe('Alice Smith');
	});

	it('saveEdit() clears editingPlayerId on success', async () => {
		engine.subscribe('team_abc');
		const alice = engine.players[0];
		engine.startEdit(alice);
		await engine.saveEdit(alice.id);
		expect(engine.editingPlayerId).toBeNull();
	});

	it('subscribe() returns early without calling onSnapshot when not ready', async () => {
		const { isFirestoreReady } = await import('$lib/utils/firestoreGuard.js');
		const { onSnapshot } = await import('firebase/firestore');
		(isFirestoreReady as any).mockReturnValueOnce(false);
		engine.subscribe('team_xyz');
		expect(onSnapshot).not.toHaveBeenCalled();
		expect(engine.players).toHaveLength(0);
		expect(engine.loading).toBe(false);
	});

	it('detach() calls the unsub function', () => {
		const { onSnapshot } = await import('firebase/firestore') as any;
		const mockUnsub = vi.fn();
		onSnapshot.mockReturnValueOnce(mockUnsub);
		engine.subscribe('team_abc');
		engine.detach();
		expect(mockUnsub).toHaveBeenCalledOnce();
	});
});
