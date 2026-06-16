/**
 * tournamentBracket.ts — single-elimination bracket helpers (P2).
 * Pure functions only; no Firestore or browser dependencies.
 */
import type {
	BracketMatch,
	BracketSide,
	BracketTeam,
	BracketTeamSize,
	TournamentBracket,
} from '$lib/types/tournamentEvent.js';

export const BRACKET_TEAM_SIZES: BracketTeamSize[] = [4, 8, 16, 32];
export const DOUBLE_ELIM_MIN_TEAMS = 8;

export function isPowerOfTwo(n: number): boolean {
	return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

export function roundsForTeamCount(teamCount: number): number {
	return Math.log2(teamCount);
}

export function matchesInRound(teamCount: number, round: number): number {
	return teamCount / 2 ** (round + 1);
}

export function roundLabel(round: number, totalRounds: number): string {
	const fromFinal = totalRounds - round - 1;
	if (fromFinal === 0) return 'Final';
	if (fromFinal === 1) return 'Semifinals';
	if (fromFinal === 2) return 'Quarterfinals';
	if (fromFinal === 3) return 'Round of 16';
	return `Round ${round + 1}`;
}

export function teamIdFromIndex(index: number): string {
	return `team_${index + 1}`;
}

export function defaultTeams(count: BracketTeamSize): BracketTeam[] {
	return Array.from({ length: count }, (_, i) => ({
		id: teamIdFromIndex(i),
		name: `Team ${i + 1}`,
		seed: i + 1,
	}));
}

/** Classic bracket slot order (1-indexed seeds) for single-elimination first round. */
export function bracketSeedOrder(teamCount: number): number[] {
	if (teamCount === 2) return [1, 2];
	const half = bracketSeedOrder(teamCount / 2);
	const order: number[] = [];
	for (const seed of half) {
		order.push(seed);
		order.push(teamCount + 1 - seed);
	}
	return order;
}

/** First-round pairings from ordered teams (respects seed numbers on each team). */
export function firstRoundPairings(teams: BracketTeam[]): Array<[string, string]> {
	const order = bracketSeedOrder(teams.length);
	const bySeed = new Map(teams.map((t) => [t.seed, t.id]));
	const pairings: Array<[string, string]> = [];
	for (let slot = 0; slot < order.length; slot += 2) {
		const homeId = bySeed.get(order[slot]);
		const awayId = bySeed.get(order[slot + 1]);
		if (homeId && awayId) pairings.push([homeId, awayId]);
	}
	return pairings;
}

export function moveTeamInList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
	if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
	if (fromIndex >= list.length || toIndex >= list.length) return list;
	const next = [...list];
	const [item] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, item);
	return next;
}

export function shuffleTeamList<T>(list: T[]): T[] {
	const next = [...list];
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}

export function reseedTeams(teams: BracketTeam[]): BracketTeam[] {
	return teams.map((team, index) => ({ ...team, seed: index + 1 }));
}

export function generateSingleEliminationBracket(teams: BracketTeam[]): TournamentBracket {
	const teamCount = teams.length;
	if (!isPowerOfTwo(teamCount) || teamCount < 2 || teamCount > 32) {
		throw new Error('Team count must be a power of 2 between 2 and 32.');
	}

	const matches: BracketMatch[] = [];
	const numRounds = roundsForTeamCount(teamCount);

	for (let round = 0; round < numRounds; round++) {
		const count = matchesInRound(teamCount, round);
		for (let slot = 0; slot < count; slot++) {
			const match: BracketMatch = {
				id: `r${round}_s${slot}`,
				round,
				slot,
				homeTeamId: null,
				awayTeamId: null,
				status: 'pending',
			};
			if (round === 0) {
				const [homeId, awayId] = firstRoundPairings(teams)[slot] ?? [null, null];
				match.homeTeamId = homeId;
				match.awayTeamId = awayId;
			}
			matches.push(match);
		}
	}

	return {
		format: 'single_elimination',
		teamSize: teamCount as BracketTeamSize,
		teams,
		matches,
	};
}

/** Losers-bracket round slot counts for double-elim (8-team → [2,2,1,1]). */
export function losersRoundSlots(teamCount: number): number[] {
	const total = teamCount - 2;
	const rounds: number[] = [];
	let remaining = total;
	let slots = Math.max(1, teamCount / 4);
	while (remaining > 0) {
		const take = Math.min(remaining, Math.max(1, Math.floor(slots)));
		rounds.push(take);
		remaining -= take;
		slots = Math.max(1, Math.floor(slots / 2));
	}
	return rounds;
}

export function generateLosersBracketMatches(teamCount: number): BracketMatch[] {
	const matches: BracketMatch[] = [];
	const roundSlots = losersRoundSlots(teamCount);
	for (let round = 0; round < roundSlots.length; round++) {
		for (let slot = 0; slot < roundSlots[round]; slot++) {
			matches.push({
				id: `lb_r${round}_s${slot}`,
				round,
				slot,
				side: 'losers',
				homeTeamId: null,
				awayTeamId: null,
				status: 'pending',
			});
		}
	}
	return matches;
}

/** Double-elimination bracket — minimum 8 teams (2×teamSize − 2 matches incl. grand final). */
export function generateDoubleEliminationBracket(teams: BracketTeam[]): TournamentBracket {
	const teamCount = teams.length;
	if (teamCount < DOUBLE_ELIM_MIN_TEAMS || !isPowerOfTwo(teamCount) || teamCount > 32) {
		throw new Error('Double elimination requires a power-of-2 team count between 8 and 32.');
	}

	const winners = generateSingleEliminationBracket(teams);
	const winnersMatches = winners.matches.map((m) => ({ ...m, side: 'winners' as BracketSide }));
	const losersMatches = generateLosersBracketMatches(teamCount);
	const grandFinal: BracketMatch = {
		id: 'gf_s0',
		round: 0,
		slot: 0,
		side: 'grand_final',
		homeTeamId: null,
		awayTeamId: null,
		status: 'pending',
	};

	return {
		format: 'double_elimination',
		teamSize: teamCount as BracketTeamSize,
		teams,
		matches: [...winnersMatches, ...losersMatches, grandFinal],
	};
}

export function expectedDoubleElimMatchCount(teamCount: number): number {
	return teamCount * 2 - 2;
}

export function matchesForSide(
	bracket: TournamentBracket,
	side: BracketSide,
): BracketMatch[] {
	return bracket.matches.filter((m) => (m.side ?? 'winners') === side);
}

export function teamNameMap(bracket: TournamentBracket): Map<string, string> {
	return new Map(bracket.teams.map((t) => [t.id, t.name]));
}

export function matchesByRound(bracket: TournamentBracket): BracketMatch[][] {
	const totalRounds = roundsForTeamCount(bracket.teamSize);
	const grouped: BracketMatch[][] = [];
	for (let round = 0; round < totalRounds; round++) {
		grouped.push(
			bracket.matches
				.filter((m) => m.round === round)
				.sort((a, b) => a.slot - b.slot),
		);
	}
	return grouped;
}

export function advanceWinner(
	bracket: TournamentBracket,
	matchId: string,
	winnerId: string,
	homeScore?: number | null,
	awayScore?: number | null,
): TournamentBracket {
	const matches = bracket.matches.map((m) => ({ ...m }));
	const idx = matches.findIndex((m) => m.id === matchId);
	if (idx === -1) return bracket;

	const match = matches[idx];
	match.winnerId = winnerId;
	match.status = 'final';
	if (homeScore !== undefined) match.homeScore = homeScore;
	if (awayScore !== undefined) match.awayScore = awayScore;

	const nextRound = match.round + 1;
	const nextSlot = Math.floor(match.slot / 2);
	const nextMatch = matches.find((m) => m.round === nextRound && m.slot === nextSlot);
	if (nextMatch) {
		if (match.slot % 2 === 0) nextMatch.homeTeamId = winnerId;
		else nextMatch.awayTeamId = winnerId;
	}

	return { ...bracket, matches };
}

export function setMatchLive(bracket: TournamentBracket, matchId: string): TournamentBracket {
	return {
		...bracket,
		matches: bracket.matches.map((m) =>
			m.id === matchId ? { ...m, status: 'live' } : m,
		),
	};
}

export function bracketHasStarted(bracket: TournamentBracket | null | undefined): boolean {
	return Boolean(bracket?.matches?.length);
}

export function championTeamId(bracket: TournamentBracket): string | null {
	const finalRound = roundsForTeamCount(bracket.teamSize) - 1;
	const finalMatch = bracket.matches.find((m) => m.round === finalRound && m.slot === 0);
	return finalMatch?.winnerId ?? null;
}
