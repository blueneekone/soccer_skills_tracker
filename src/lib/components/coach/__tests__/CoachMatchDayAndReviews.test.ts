// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock dependencies
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true,
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost:5173/coach/logistics?tab=matches'),
	},
}));

vi.mock('$lib/authStore.svelte', () => ({
	authStore: {
		isAuthenticated: true,
		isLoading: false,
		teamId: 'team_alpha_123',
		role: 'coach',
		user: { email: 'coach@fc.com', teamId: 'team_alpha_123' },
		userProfile: { email: 'coach@fc.com', teamId: 'team_alpha_123', clubId: 'club_789' },
	},
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		isAuthenticated: true,
		isLoading: false,
		teamId: 'team_alpha_123',
		role: 'coach',
		user: { email: 'coach@fc.com', teamId: 'team_alpha_123' },
		userProfile: { email: 'coach@fc.com', teamId: 'team_alpha_123', clubId: 'club_789' },
	},
}));

const { mockSetDoc } = vi.hoisted(() => ({
	mockSetDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/firebase', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		getActiveDb: vi.fn(() => ({})),
		db: {},
	};
});
vi.mock('$lib/firebase.js', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		getActiveDb: vi.fn(() => ({})),
		db: {},
	};
});

vi.mock('firebase/auth', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		getAuth: vi.fn(() => ({
			currentUser: {
				uid: 'coach-123',
				email: 'coach@fc.com',
				getIdToken: vi.fn().mockResolvedValue('mock-token'),
				getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'coach', teamId: 'team_alpha_123' } }),
			},
		})),
		onIdTokenChanged: vi.fn((_auth, callback) => {
			callback({
				uid: 'coach-123',
				email: 'coach@fc.com',
				getIdToken: vi.fn().mockResolvedValue('mock-token'),
				getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'coach', teamId: 'team_alpha_123' } }),
			});
			return vi.fn();
		}),
		onAuthStateChanged: vi.fn((_auth, callback) => {
			callback({
				uid: 'coach-123',
				email: 'coach@fc.com',
				getIdToken: vi.fn().mockResolvedValue('mock-token'),
				getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'coach', teamId: 'team_alpha_123' } }),
			});
			return vi.fn();
		}),
		getIdToken: vi.fn().mockResolvedValue('mock-token'),
		getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'coach', teamId: 'team_alpha_123' } }),
		signOut: vi.fn().mockResolvedValue(undefined),
	};
});

vi.mock('firebase/firestore', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		collection: vi.fn(),
		doc: vi.fn(),
		getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
		getDocs: vi.fn().mockResolvedValue({ empty: true, forEach: () => {} }),
		setDoc: mockSetDoc,
		addDoc: vi.fn().mockResolvedValue({ id: 'mock_evt_1' }),
		query: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
		where: vi.fn(),
		onSnapshot: vi.fn((_q, callback) => {
			callback({
				forEach: (fn: any) => {
					fn({
						id: 'saved_match_1',
						data: () => ({
							teamId: 'team_alpha_123',
							teamName: 'Lightning FC',
							opponentName: 'Thunderbolts',
							homeScore: 3,
							awayScore: 1,
							finalScore: '3 - 1',
							result: 'WIN',
							matchDate: '2026-08-27T10:00:00Z',
							durationMinutes: 90,
							playerStats: {
								player_1: {
									id: 'player_1',
									name: 'Sophia Smith',
									jersey: '11',
									goals: 2,
									assists: 1,
									shots: 4,
									tackles: 2,
									saves: 0,
									fouls: 0,
									yellowCards: 0,
									redCards: 0,
									mistakes: 0,
								},
							},
							mistakes: [
								{
									id: 'm_1',
									time: '10:15 AM',
									minute: 28,
									playerId: 'player_2',
									playerName: 'Trinity Rodman',
									note: 'Lost runner on back post corner kick',
								},
							],
							events: [
								{ id: 'e_1', type: 'GOAL', label: '⚽ GOAL: Sophia Smith #11', time: '10:12 AM', minute: 25 },
							],
						}),
					});
				},
			});
			return vi.fn();
		}),
		serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
	};
});

import { MatchDayEngine } from '$lib/services/coach/MatchDayTelemetry.svelte';
import MatchPlayerPickerModal from '../../../../routes/(app)/coach/matchday/MatchPlayerPickerModal.svelte';
import MatchMistakePromptModal from '../../../../routes/(app)/coach/matchday/MatchMistakePromptModal.svelte';
import MatchPostReviewPanel from '../../../../routes/(app)/coach/matchday/MatchPostReviewPanel.svelte';
import CoachTeamMatchesPanel from '$lib/coach/logistics/CoachTeamMatchesPanel.svelte';

describe('Match Day Player Stat Attribution & Mistake Prompts', () => {
	let engine: MatchDayEngine;

	beforeEach(() => {
		engine = new MatchDayEngine();
		engine.teamScope.selectedTeamId = 'team_alpha_123';
		engine.teamScope.teamLabel = 'Lightning FC';
		engine.roster = [
			{ id: 'player_1', name: 'Sophia Smith', jersey: '11', initials: 'SS', status: 'starter' },
			{ id: 'player_2', name: 'Trinity Rodman', jersey: '2', initials: 'TR', status: 'starter' },
		];
		// Initialize box scores
		engine.playerStats = {
			player_1: {
				id: 'player_1',
				name: 'Sophia Smith',
				jersey: '11',
				goals: 0,
				assists: 0,
				shots: 0,
				tackles: 0,
				saves: 0,
				fouls: 0,
				yellowCards: 0,
				redCards: 0,
				mistakes: 0,
			},
			player_2: {
				id: 'player_2',
				name: 'Trinity Rodman',
				jersey: '2',
				goals: 0,
				assists: 0,
				shots: 0,
				tackles: 0,
				saves: 0,
				fouls: 0,
				yellowCards: 0,
				redCards: 0,
				mistakes: 0,
			},
		};
	});

	it('attributes goals to a specific player and increments score', () => {
		expect(engine.homeScore).toBe(0);
		expect(engine.playerStats['player_1'].goals).toBe(0);

		// Record goal for Sophia Smith
		engine.logEvent('GOAL', undefined, 'player_1');

		expect(engine.homeScore).toBe(1);
		expect(engine.finalScore).toBe('1 - 0');
		expect(engine.playerStats['player_1'].goals).toBe(1);
		expect(engine.events[0].label).toContain('Sophia Smith');
		expect(engine.events[0].playerId).toBe('player_1');
	});

	it('attributes assists and shots to a specific player', () => {
		engine.logEvent('ASSIST', undefined, 'player_2');
		engine.logEvent('SHOT', undefined, 'player_1');

		expect(engine.playerStats['player_2'].assists).toBe(1);
		expect(engine.playerStats['player_1'].shots).toBe(1);
	});

	it('records a coach mistake reminder with player attribution and note', () => {
		const reminderNote = 'Lost runner on far post corner kick';
		engine.logMistake(reminderNote, 'player_2');

		expect(engine.mistakes.length).toBe(1);
		expect(engine.mistakes[0].playerName).toBe('Trinity Rodman');
		expect(engine.mistakes[0].note).toBe(reminderNote);
		expect(engine.playerStats['player_2'].mistakes).toBe(1);
		expect(engine.targetPrompts[0]).toContain(reminderNote);
	});

	it('saves match record with box score and mistake reminders to Firestore', async () => {
		engine.homeScore = 2;
		engine.awayScore = 0;
		engine.opponentName = 'Thunderbolts';

		const res = await engine.saveMatchRecord();

		expect(res.ok).toBe(true);
		expect(mockSetDoc).toHaveBeenCalled();
	});

	it('renders MatchPlayerPickerModal and handles player selection', async () => {
		const onSelectPlayer = vi.fn();
		const { getByText } = render(MatchPlayerPickerModal, {
			open: true,
			statType: 'GOAL',
			roster: engine.roster,
			onSelectPlayer,
		});

		expect(getByText(/ATTRIBUTE ⚽ GOAL TO ATHLETE/i)).toBeTruthy();
		expect(getByText(/Sophia Smith/i)).toBeTruthy();

		await fireEvent.click(getByText(/Sophia Smith/i));
		expect(onSelectPlayer).toHaveBeenCalledWith('player_1');
	});

	it('renders MatchMistakePromptModal and logs reminder notes', async () => {
		const onConfirm = vi.fn();
		const { getByText, getByPlaceholderText } = render(MatchMistakePromptModal, {
			open: true,
			roster: engine.roster,
			initialPlayerId: 'player_2',
			onConfirm,
		});

		expect(getByText(/LOG MISTAKE & TACTICAL REMINDER/i)).toBeTruthy();
		expect(getByText(/Lost runner on set piece/i)).toBeTruthy();

		// Click quick tag
		await fireEvent.click(getByText(/Lost runner on set piece/i));

		const textarea = getByPlaceholderText(/What happened\?/i) as HTMLTextAreaElement;
		expect(textarea.value).toBe('Lost runner on set piece');

		// Click submit button
		await fireEvent.click(getByText(/Record Reminder/i));
		expect(onConfirm).toHaveBeenCalledWith('player_2', 'Lost runner on set piece');
	});

	it('renders MatchPostReviewPanel with scoreline, mistake reminders and box score', () => {
		engine.homeScore = 3;
		engine.awayScore = 1;
		engine.opponentName = 'Thunderbolts';
		engine.mistakes = [
			{
				id: 'm_1',
				time: '10:30 AM',
				minute: 42,
				playerId: 'player_2',
				playerName: 'Trinity Rodman',
				note: 'Turnover under high press',
			},
		];

		const { getByText } = render(MatchPostReviewPanel, { engine });

		expect(getByText(/POST-MATCH TELEMETRY & COACH REVIEW DOSSIER/i)).toBeTruthy();
		expect(getByText(/Turnover under high press/i)).toBeTruthy();
		expect(getByText(/SAVE MATCH TO TEAM OPS/i)).toBeTruthy();
		expect(getByText(/Sophia Smith/i)).toBeTruthy();
	});

	it('renders CoachTeamMatchesPanel in Team Ops with match archives and dossiers', () => {
		const { getByText } = render(CoachTeamMatchesPanel, { teamId: 'team_alpha_123' });

		expect(getByText(/PREVIOUS MATCH REVIEWS & TACTICAL DOSSIERS/i)).toBeTruthy();
		expect(getByText(/Lightning FC/i)).toBeTruthy();
		expect(getByText(/Thunderbolts/i)).toBeTruthy();
		expect(getByText(/Review Match Dossier →/i)).toBeTruthy();
	});

	it('CoachLogisticsView integrates Match Reviews tab and renders CoachTeamMatchesPanel', () => {
		const fileSrc = readFileSync(
			join(process.cwd(), 'src/lib/coach/logistics/CoachLogisticsView.svelte'),
			'utf-8'
		);

		expect(fileSrc).toMatch(/CoachTeamMatchesPanel/);
		expect(fileSrc).toMatch(/'matches', label: 'Match Reviews'/);
		expect(fileSrc).toMatch(/activeTab === 'matches'/);
	});
});
