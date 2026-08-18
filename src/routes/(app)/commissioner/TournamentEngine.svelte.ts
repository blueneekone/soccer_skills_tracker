import { getActiveDb } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { writeBatch, doc, getDoc } from 'firebase/firestore';

export type Team = {
	id: string;
	name: string;
	seed?: number;
};

export type MatchStatus = 'pending' | 'live' | 'final';

export type Match = {
	id: string;
	round: number;
	slot: number;
	side?: 'winners' | 'losers' | 'grand_final';
	homeTeamId: string | null;
	awayTeamId: string | null;
	homeScore?: number | null;
	awayScore?: number | null;
	winnerId?: string | null;
	status: MatchStatus;
	venue?: string;
	scheduledTime?: string;
};

export type Bracket = {
	format: 'double_elimination';
	teamSize: number;
	teams: Team[];
	matches: Match[];
};

export type Standing = {
	id: string;
	eventId: string;
	tenantId: string;
	teamId: string;
	teamName: string;
	played: number;
	wins: number;
	losses: number;
	points: number;
	goalsFor: number;
	goalsAgainst: number;
	updatedAt: string;
};

export type ScorePayload = {
	homeScore: number;
	awayScore: number;
	status?: MatchStatus;
	venue?: string;
	scheduledTime?: string;
};

function createMatch(
	id: string,
	round: number,
	slot: number,
	side: 'winners' | 'losers' | 'grand_final',
	homeId: string | null = null,
	awayId: string | null = null
): Match {
	return { id, round, slot, side, homeTeamId: homeId, awayTeamId: awayId, status: 'pending' };
}

export function generateDoubleEliminationBracket(teams: Team[]): Bracket {
	const teamCount = teams.length;
	if (teamCount !== 8) {
		throw new Error('Double elimination requires exactly 8 teams.');
	}

	const matches: Match[] = [];
	const seedOrder = [1, 8, 4, 5, 2, 7, 3, 6];
	const bySeed = new Map(teams.map((t) => [t.seed ?? 1, t.id]));

	// Winners Round 0
	for (let slot = 0; slot < 4; slot++) {
		const homeId = bySeed.get(seedOrder[slot * 2]) || null;
		const awayId = bySeed.get(seedOrder[slot * 2 + 1]) || null;
		matches.push(createMatch(`r0_s${slot}`, 0, slot, 'winners', homeId, awayId));
	}

	// Winners Rounds 1 & 2
	matches.push(createMatch('r1_s0', 1, 0, 'winners'));
	matches.push(createMatch('r1_s1', 1, 1, 'winners'));
	matches.push(createMatch('r2_s0', 2, 0, 'winners'));

	// Losers Rounds 0, 1, 2, 3
	matches.push(createMatch('lb_r0_s0', 0, 0, 'losers'));
	matches.push(createMatch('lb_r0_s1', 0, 1, 'losers'));
	matches.push(createMatch('lb_r1_s0', 1, 0, 'losers'));
	matches.push(createMatch('lb_r1_s1', 1, 1, 'losers'));
	matches.push(createMatch('lb_r2_s0', 2, 0, 'losers'));
	matches.push(createMatch('lb_r3_s0', 3, 0, 'losers'));

	// Grand Final
	matches.push(createMatch('gf_s0', 0, 0, 'grand_final'));

	return {
		format: 'double_elimination',
		teamSize: teamCount,
		teams,
		matches
	};
}

export function propagateTeams(matches: Match[], matchId: string, winnerId: string, loserId: string): void {
	const setHome = (id: string, team: string) => {
		const m = matches.find((m) => m.id === id);
		if (m) m.homeTeamId = team;
	};
	const setAway = (id: string, team: string) => {
		const m = matches.find((m) => m.id === id);
		if (m) m.awayTeamId = team;
	};

	if (matchId === 'r0_s0') {
		setHome('r1_s0', winnerId);
		setHome('lb_r0_s0', loserId);
	} else if (matchId === 'r0_s1') {
		setAway('r1_s0', winnerId);
		setAway('lb_r0_s0', loserId);
	} else if (matchId === 'r0_s2') {
		setHome('r1_s1', winnerId);
		setHome('lb_r0_s1', loserId);
	} else if (matchId === 'r0_s3') {
		setAway('r1_s1', winnerId);
		setAway('lb_r0_s1', loserId);
	} else if (matchId === 'r1_s0') {
		setHome('r2_s0', winnerId);
		setHome('lb_r1_s0', loserId);
	} else if (matchId === 'r1_s1') {
		setAway('r2_s0', winnerId);
		setHome('lb_r1_s1', loserId);
	} else if (matchId === 'r2_s0') {
		setHome('gf_s0', winnerId);
		setHome('lb_r3_s0', loserId);
	} else if (matchId === 'lb_r0_s0') {
		setAway('lb_r1_s0', winnerId);
	} else if (matchId === 'lb_r0_s1') {
		setAway('lb_r1_s1', winnerId);
	} else if (matchId === 'lb_r1_s0') {
		setHome('lb_r2_s0', winnerId);
	} else if (matchId === 'lb_r1_s1') {
		setAway('lb_r2_s0', winnerId);
	} else if (matchId === 'lb_r2_s0') {
		setAway('lb_r3_s0', winnerId);
	} else if (matchId === 'lb_r3_s0') {
		setAway('gf_s0', winnerId);
	}
}

export function calculateStandings(bracket: Bracket, tenantId: string, eventId: string): Standing[] {
	const standingsMap = new Map<string, Standing>();

	for (const team of bracket.teams) {
		standingsMap.set(team.id, {
			id: `${eventId}_${team.id}`,
			eventId,
			tenantId,
			teamId: team.id,
			teamName: team.name,
			played: 0,
			wins: 0,
			losses: 0,
			points: 0,
			goalsFor: 0,
			goalsAgainst: 0,
			updatedAt: new Date().toISOString()
		});
	}

	for (const match of bracket.matches) {
		if (match.status !== 'final' || match.homeScore === null || match.awayScore === null || !match.homeTeamId || !match.awayTeamId) {
			continue;
		}
		const home = standingsMap.get(match.homeTeamId);
		const away = standingsMap.get(match.awayTeamId);
		if (!home || !away) continue;

		home.played += 1;
		away.played += 1;
		home.goalsFor += match.homeScore ?? 0;
		home.goalsAgainst += match.awayScore ?? 0;
		away.goalsFor += match.awayScore ?? 0;
		away.goalsAgainst += match.homeScore ?? 0;

		if ((match.homeScore ?? 0) > (match.awayScore ?? 0)) {
			home.wins += 1;
			home.points += 3;
			away.losses += 1;
		} else {
			away.wins += 1;
			away.points += 3;
			home.losses += 1;
		}
	}

	return Array.from(standingsMap.values());
}

export class TournamentEngine {
	bracket = $state<Bracket | null>(null);
	eventId = $state<string | null>(null);
	isLoading = $state<boolean>(false);
	error = $state<string | null>(null);
	venues = $state<string[]>([]);

	constructor() {}

	async loadBracketFromDb(eventId: string) {
		if (!isFirestoreReady()) {
			return;
		}
		const db = getActiveDb();
		if (!db || !authStore.isAuthenticated) {
			return;
		}
		this.isLoading = true;
		this.error = null;
		this.eventId = eventId;
		try {
			const docRef = doc(db, 'tournament_events', eventId);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				const data = docSnap.data();
				this.bracket = data.bracket || null;
				this.venues = data.venues || [];
			}
		} catch (err: any) {
			this.error = err.message || 'Failed to load';
		} finally {
			this.isLoading = false;
		}
	}

	async updateLiveScore(matchId: string, scorePayload: ScorePayload) {
		if (!isFirestoreReady()) {
			throw new Error('Database not available or user not authenticated');
		}
		const db = getActiveDb();
		if (!db || !authStore.isAuthenticated) {
			throw new Error('Database not available or user not authenticated');
		}

		if (!this.bracket || !this.eventId) {
			throw new Error('No bracket or event loaded');
		}

		const match = this.bracket.matches.find((m) => m.id === matchId);
		if (!match) throw new Error(`Match not found: ${matchId}`);

		match.homeScore = scorePayload.homeScore;
		match.awayScore = scorePayload.awayScore;
		if (scorePayload.status) match.status = scorePayload.status;
		if (scorePayload.venue) match.venue = scorePayload.venue;
		if (scorePayload.scheduledTime) match.scheduledTime = scorePayload.scheduledTime;

		if (match.status === 'final') {
			const winId = scorePayload.homeScore > scorePayload.awayScore ? match.homeTeamId : match.awayTeamId;
			const loseId = scorePayload.homeScore > scorePayload.awayScore ? match.awayTeamId : match.homeTeamId;
			match.winnerId = winId;
			if (winId && loseId) {
				propagateTeams(this.bracket.matches, matchId, winId, loseId);
			}
		}

		const batch = writeBatch(db);
		const eventRef = doc(db, 'tournament_events', this.eventId);
		batch.update(eventRef, { bracket: this.bracket });

		const tenantId = authStore.userProfile?.tenantId || 'mock-tenant-id';
		const standings = calculateStandings(this.bracket, tenantId, this.eventId);
		for (const standing of standings) {
			const standingRef = doc(db, 'standings', standing.id);
			batch.set(standingRef, standing);
		}

		await batch.commit();
	}

	addVenue(venue: string) {
		if (!this.venues.includes(venue)) {
			this.venues = [...this.venues, venue];
		}
	}
}
