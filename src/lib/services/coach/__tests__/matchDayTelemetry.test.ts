import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn(() => ({ _isMockDb: true })),
	db: { _isMockDb: true },
}));

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	getDocs: vi.fn().mockResolvedValue({
		size: 2,
		forEach: (cb: any) => {
			cb({
				id: 'p1@test.com',
				data: () => ({ playerName: 'Abigail Watterson', jerseyNumber: '10', position: 'FWD' }),
			});
			cb({
				id: 'p2@test.com',
				data: () => ({ playerName: 'Braelynn Waechtler', jerseyNumber: '12', position: 'MID' }),
			});
		},
	}),
	getDoc: vi.fn().mockResolvedValue({
		exists: () => true,
		data: () => ({
			players: ['Abigail Watterson', 'Braelynn Waechtler', 'Ava Sorensen'],
			jerseys: { 'Ava Sorensen': '7' },
		}),
	}),
	doc: vi.fn(),
	addDoc: vi.fn().mockResolvedValue({ id: 'evt_123' }),
	serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		isAuthenticated: true,
		teamId: 'aggiesfc_16g_grey',
		role: 'coach',
		user: { uid: 'coach_123', email: 'coach@test.com' },
	},
}));

vi.mock('$lib/stores/teams.svelte.js', () => ({
	teamsStore: {
		loaded: true,
		teams: [{ id: 'aggiesfc_16g_grey', name: 'Aggies FC 16G Grey' }],
		getCoachTeams: vi.fn(() => [{ id: 'aggiesfc_16g_grey', name: 'Aggies FC 16G Grey' }]),
	},
}));

describe('MatchDayTelemetry / MatchDayEngine', () => {
	it('loads squad roster from player_lookup and rosters collection with 2-letter initials', async () => {
		const { MatchDayEngine } = await import('../MatchDayTelemetry.svelte.js');
		const engine = new MatchDayEngine();

		await engine.loadRoster('aggiesfc_16g_grey');

		expect(engine.roster.length).toBe(3);
		expect(engine.roster.map((p) => p.name)).toEqual([
			'Abigail Watterson',
			'Ava Sorensen',
			'Braelynn Waechtler',
		]);
		expect(engine.roster[0].initials).toBe('AW');
		expect(engine.roster[0].jersey).toBe('10');
		expect(engine.roster[1].initials).toBe('AS');
		expect(engine.roster[1].jersey).toBe('7');
		expect(engine.roster[2].initials).toBe('BW');
		expect(engine.roster[2].jersey).toBe('12');
	});

	it('partitions starters and bench, and handles substitutions', async () => {
		const { MatchDayEngine } = await import('../MatchDayTelemetry.svelte.js');
		const engine = new MatchDayEngine();

		await engine.loadRoster('aggiesfc_16g_grey');
		expect(engine.starters.length).toBe(3);
		expect(engine.bench.length).toBe(0);

		// Move player to bench
		engine.moveToBench(engine.starters[0].id);
		expect(engine.starters.length).toBe(2);
		expect(engine.bench.length).toBe(1);
		expect(engine.bench[0].name).toBe('Abigail Watterson');

		// Move back to starters
		engine.moveToStarters(engine.bench[0].id);
		expect(engine.starters.length).toBe(3);
		expect(engine.bench.length).toBe(0);
	});
});
