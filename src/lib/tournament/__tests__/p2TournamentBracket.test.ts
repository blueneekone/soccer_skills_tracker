/**
 * p2TournamentBracket.test.ts — P2 tournament bracket polish guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	advanceWinner,
	bracketHasStarted,
	bracketSeedOrder,
	defaultTeams,
	firstRoundPairings,
	generateSingleEliminationBracket,
	moveTeamInList,
	reseedTeams,
	roundLabel,
} from '$lib/tournament/tournamentBracket.js';

const ROOT = join(process.cwd());
const EVENT_PAGE = join(ROOT, 'src/routes/(app)/director/events/[eventId]/+page.svelte');
const BUYER_PAGE = join(ROOT, 'src/routes/(marketing)/events/[eventId]/+page.svelte');
const PANEL = join(ROOT, 'src/lib/components/director/TournamentBracketPanel.svelte');
const TYPES = join(ROOT, 'src/lib/types/tournamentEvent.ts');
const COMMERCE_TICKETING = join(ROOT, 'functions-commerce/ticketing.js');
const COMMERCE_CONSTANTS = join(ROOT, 'functions-commerce/tournamentEventConstants.js');

describe('P2 tournament bracket — pure logic', () => {
	it('generates a full single-elimination tree for 8 teams', () => {
		const bracket = generateSingleEliminationBracket(defaultTeams(8));
		expect(bracket.teamSize).toBe(8);
		expect(bracket.matches).toHaveLength(7);
		expect(bracket.matches.filter((m) => m.round === 0)).toHaveLength(4);
		expect(bracket.matches[0].homeTeamId).toBe('team_1');
		expect(bracket.matches[0].awayTeamId).toBe('team_8');
	});

	it('uses classic bracket seed order for first-round pairings', () => {
		expect(bracketSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
		const teams = defaultTeams(8);
		const pairings = firstRoundPairings(teams);
		expect(pairings[0]).toEqual(['team_1', 'team_8']);
		expect(pairings[1]).toEqual(['team_4', 'team_5']);
	});

	it('reorders draft teams and reseeds after move', () => {
		const moved = moveTeamInList(defaultTeams(4), 0, 2);
		const reseeded = reseedTeams(moved);
		expect(reseeded.map((t) => t.seed)).toEqual([1, 2, 3, 4]);
		expect(reseeded[2].id).toBe('team_1');
	});

	it('advances winner into the next round slot', () => {
		const bracket = generateSingleEliminationBracket(defaultTeams(4));
		const first = bracket.matches.find((m) => m.id === 'r0_s0');
		expect(first).toBeTruthy();
		const next = advanceWinner(bracket, 'r0_s0', 'team_1', 2, 1);
		const semi = next.matches.find((m) => m.id === 'r1_s0');
		expect(semi?.homeTeamId).toBe('team_1');
		expect(next.matches.find((m) => m.id === 'r0_s0')?.status).toBe('final');
	});

	it('labels final and semifinal rounds', () => {
		expect(roundLabel(2, 3)).toBe('Final');
		expect(roundLabel(1, 3)).toBe('Semifinals');
		expect(roundLabel(0, 3)).toBe('Quarterfinals');
	});

	it('detects configured brackets', () => {
		expect(bracketHasStarted(null)).toBe(false);
		expect(bracketHasStarted(generateSingleEliminationBracket(defaultTeams(4)))).toBe(true);
	});
});

describe('P2 tournament bracket — director + buyer wiring', () => {
	it('event builder mounts TournamentBracketPanel and persists bracket on save', () => {
		const src = readFileSync(EVENT_PAGE, 'utf8');
		expect(src).toMatch(/TournamentBracketPanel/);
		expect(src).toMatch(/bracket:\s*bracket\s*\?\?\s*null/);
		expect(src).toMatch(/let bracket = \$state/);
	});

	it('buyer page shows read-only bracket when configured', () => {
		const src = readFileSync(BUYER_PAGE, 'utf8');
		expect(src).toMatch(/TournamentBracketPanel/);
		expect(src).toMatch(/readonly/);
		expect(src).toMatch(/bracketHasStarted/);
		expect(src).toMatch(/bracket-section/);
		expect(src).toMatch(/buyer-bracket-heading/);
	});

	it('bracket panel supports setup, generate, and round columns', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/Generate bracket/);
		expect(src).toMatch(/bracket-tree/);
		expect(src).toMatch(/advanceWinner/);
		expect(src).toMatch(/readonly/);
		expect(src).toMatch(/Shuffle seeds/);
		expect(src).toMatch(/pairing-preview/);
		expect(src).toMatch(/moveTeam/);
	});

	it('tournamentEvent types embed optional bracket on event doc', () => {
		const src = readFileSync(TYPES, 'utf8');
		expect(src).toMatch(/bracket\?:\s*TournamentBracket/);
		expect(src).toMatch(/interface TournamentBracket/);
		expect(src).toMatch(/single_elimination/);
	});
});

describe('P2 tournament bracket — commerce handlers', () => {
	it('upsertTournamentEvent validates and persists bracket payload', () => {
		const src = readFileSync(COMMERCE_TICKETING, 'utf8');
		expect(src).toMatch(/validateBracket/);
		expect(src).toMatch(/bracket:\s*bracketInput/);
		expect(src).toMatch(/FieldValue\.delete\(\)/);
	});

	it('tournamentEventConstants exports validateBracket with team size guards', () => {
		const src = readFileSync(COMMERCE_CONSTANTS, 'utf8');
		expect(src).toMatch(/function validateBracket/);
		expect(src).toMatch(/BRACKET_TEAM_SIZES/);
		expect(src).toMatch(/single_elimination/);
	});
});
