/**
 * tournamentBracket.ts — single-elimination bracket helpers (P2).
 * Pure functions only; no Firestore or browser dependencies.
 */
import type {
	BracketMatch,
	BracketTeam,
	BracketTeamSize,
	TournamentBracket,
} from '$lib/types/tournamentEvent.js';

export const BRACKET_TEAM_SIZES: BracketTeamSize[] = [4, 8, 16, 32];

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
				match.homeTeamId = teams[slot * 2]?.id ?? null;
				match.awayTeamId = teams[slot * 2 + 1]?.id ?? null;
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
