import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TournamentEngine, generateDoubleEliminationBracket, calculateStandings } from '../TournamentEngine.svelte.js';
import * as firestoreGuard from '$lib/utils/firestoreGuard.js';
import * as firebase from '$lib/firebase.js';
import * as firestore from 'firebase/firestore';

// Mock dependencies
let mockRole = 'commissioner';
vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
	authStore: new Proxy({}, {
		get: (_, prop) => {
			if (prop === "role") return mockRole;
			if (prop === "isAuthenticated") return true;
			if (prop === "isLoading") return false;
			if (prop === "userProfile") return { tenantId: "tenant-123" };
			return undefined;
		},
		set: (_, prop, val) => {
			if (prop === 'role') mockRole = val;
			return true;
		}
	}),
}));

vi.mock('$lib/firebase.js', () => ({
	getActiveDb: vi.fn()
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: vi.fn()
}));

const mockWriteBatch = {
	update: vi.fn(),
	set: vi.fn(),
	commit: vi.fn().mockResolvedValue(undefined)
};

vi.mock('firebase/firestore', () => {
	return {
		collection: vi.fn(),
		query: vi.fn(),
		where: vi.fn(),
		getDocs: vi.fn(),
		doc: vi.fn((db, col, id) => ({ db, col, id })),
		getDoc: vi.fn(),
		writeBatch: vi.fn(() => mockWriteBatch)
	};
});

const mockTeams = Array.from({ length: 8 }, (_, i) => ({
	id: `team_${i + 1}`,
	name: `Team ${i + 1}`,
	seed: i + 1
}));

describe('Tournament OS Bracket Base Operations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRole = 'commissioner';
	});

	it('should generate a correct double-elimination bracket with 14 matches for 8 teams', () => {
		const bracket = generateDoubleEliminationBracket(mockTeams);

		expect(bracket.format).toBe('double_elimination');
		expect(bracket.teamSize).toBe(8);
		expect(bracket.teams.length).toBe(8);
		expect(bracket.matches.length).toBe(14);
	});

	it('should establish correct first round seeded pairings in winners bracket', () => {
		const bracket = generateDoubleEliminationBracket(mockTeams);
		const round0Matches = bracket.matches.filter(m => m.side === 'winners' && m.round === 0);

		expect(round0Matches.length).toBe(4);
		expect(round0Matches[0].homeTeamId).toBe('team_1');
		expect(round0Matches[0].awayTeamId).toBe('team_8');
		expect(round0Matches[1].homeTeamId).toBe('team_4');
		expect(round0Matches[1].awayTeamId).toBe('team_5');
	});

	it('should configure losers bracket and grand final matches with null teams initially', () => {
		const bracket = generateDoubleEliminationBracket(mockTeams);

		const losersMatches = bracket.matches.filter(m => m.side === 'losers');
		expect(losersMatches.length).toBe(6);
		expect(losersMatches.every(m => m.homeTeamId === null && m.awayTeamId === null)).toBe(true);

		const grandFinal = bracket.matches.find(m => m.side === 'grand_final');
		expect(grandFinal).toBeDefined();
		expect(grandFinal?.homeTeamId).toBeNull();
		expect(grandFinal?.awayTeamId).toBeNull();
	});
});

describe('TournamentEngine Scoring & Standings Sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRole = 'commissioner';
	});

	it('should gate database operations if B815 defensive hydration guard is not ready', async () => {
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(false);

		const engine = new TournamentEngine();
		await engine.loadBracketFromDb('event-123');

		expect(firebase.getActiveDb).not.toHaveBeenCalled();
		expect(engine.bracket).toBeNull();
	});

	it('should load bracket and update scores with correct winner/loser path propagation', async () => {
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);
		const mockDb = {};
		vi.mocked(firebase.getActiveDb).mockReturnValue(mockDb as any);

		const bracket = generateDoubleEliminationBracket(mockTeams);
		const mockSnap = {
			exists: () => true,
			data: () => ({ bracket, venues: ['Venue A'] })
		};
		vi.mocked(firestore.getDoc).mockResolvedValue(mockSnap as any);

		const engine = new TournamentEngine();
		await engine.loadBracketFromDb('event-123');

		await engine.updateLiveScore('r0_s0', {
			homeScore: 3,
			awayScore: 1,
			status: 'final',
			venue: 'Venue A',
			scheduledTime: '2025-08-11T10:00:00Z'
		});

		expect(engine.bracket?.matches.find(m => m.id === 'r1_s0')?.homeTeamId).toBe('team_1');
		expect(engine.bracket?.matches.find(m => m.id === 'lb_r0_s0')?.homeTeamId).toBe('team_8');
		expect(firestore.writeBatch).toHaveBeenCalled();
	});

	it('should automatically calculate and synchronize division standings on score updates', async () => {
		vi.mocked(firestoreGuard.isFirestoreReady).mockReturnValue(true);
		const mockDb = {};
		vi.mocked(firebase.getActiveDb).mockReturnValue(mockDb as any);

		const bracket = generateDoubleEliminationBracket(mockTeams);
		const mockSnap = {
			exists: () => true,
			data: () => ({ bracket })
		};
		vi.mocked(firestore.getDoc).mockResolvedValue(mockSnap as any);

		const engine = new TournamentEngine();
		await engine.loadBracketFromDb('event-123');

		await engine.updateLiveScore('r0_s0', {
			homeScore: 3,
			awayScore: 1,
			status: 'final'
		});

		const standings = calculateStandings(engine.bracket!, 'tenant-123', 'event-123');
		const team1Standing = standings.find(s => s.teamId === 'team_1');
		expect(team1Standing?.played).toBe(1);
		expect(team1Standing?.wins).toBe(1);
		expect(team1Standing?.points).toBe(3);

		expect(mockWriteBatch.set).toHaveBeenCalledTimes(8);
	});
});
