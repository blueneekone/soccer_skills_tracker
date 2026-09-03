// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CoachScoutingView from '../CoachScoutingView.svelte';

vi.mock('$app/environment', () => ({
	browser: true,
	dev: true,
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost:5173/coach/scouting'),
	},
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		isAuthenticated: true,
		isLoading: false,
		teamId: 'team_alpha_123',
		role: 'coach',
		user: { email: 'coach@fc.com', uid: 'coach_uid_1' },
		userProfile: { email: 'coach@fc.com', teamId: 'team_alpha_123' },
	},
}));

vi.mock('$lib/stores/teams.svelte.js', () => ({
	teamsStore: {
		loaded: true,
		teams: [
			{ id: 'team_alpha_123', name: 'Lightning FC', sport: 'soccer' },
		],
		getCoachTeams: vi.fn(() => [
			{ id: 'team_alpha_123', name: 'Lightning FC', sport: 'soccer' },
		]),
	},
}));

vi.mock('$lib/firebase.js', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		auth: {
			currentUser: {
				uid: 'coach_uid_1',
				email: 'coach@fc.com',
			},
		},
		db: {},
	};
});

vi.mock('firebase/firestore', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		collection: vi.fn(),
		doc: vi.fn(),
		query: vi.fn(),
		where: vi.fn(),
		serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
		setDoc: vi.fn().mockResolvedValue(undefined),
		onSnapshot: vi.fn((_q, callback) => {
			Promise.resolve().then(() => {
				callback({
					docChanges: () => [],
					docs: [
						{
							id: 'player1@fc.com',
							data: () => ({
								displayName: 'Sophia Smith',
								position: 'Forward / Winger',
								jerseyNumber: '11',
								teamId: 'team_alpha_123',
							}),
						},
						{
							id: 'player2@fc.com',
							data: () => ({
								displayName: 'Naomi Girma',
								position: 'Center Back',
								jerseyNumber: '4',
								teamId: 'team_alpha_123',
							}),
						},
					],
				});
			});
			return vi.fn();
		}),
	};
});

import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

import { tick } from 'svelte';

describe('Coach Scouting Suite Redesign', () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('renders top command header with SIEM beacon and squad anchor', async () => {
		const { getByText } = render(CoachScoutingView);
		await tick();
		await new Promise(r => setTimeout(r, 10)); // Allow microtasks to settle
		await tick();

		expect(getByText(/SCOUTING DOSSIER & TALENT MATRIX/i)).toBeTruthy();
		expect(getByText(/SIEM v2/i)).toBeTruthy();
	});

	it('renders prospect roster with athlete count and position filters', async () => {
		const { getByText, getAllByText } = render(CoachScoutingView);
		await tick();
		await new Promise(r => setTimeout(r, 10)); // Allow microtasks to settle
		await tick();

		expect(getByText(/PROSPECT ROSTER/i)).toBeTruthy();
		expect(getByText(/2 ATHLETES/i)).toBeTruthy();
		expect(getByText('ALL')).toBeTruthy();
		expect(getByText('FW')).toBeTruthy();
		expect(getByText('MF')).toBeTruthy();
		expect(getByText('DF')).toBeTruthy();
		expect(getByText('GK')).toBeTruthy();
		expect(getByText('Sophia Smith')).toBeTruthy();
	});

	it('renders Scout\'s Six Radar profile with SVG polygon and axis labels', async () => {
		const { getByText } = render(CoachScoutingView);
		await tick();
		await new Promise(r => setTimeout(r, 10)); // Allow microtasks to settle
		await tick();

		expect(getByText(/SCOUT'S SIX RADAR PROFILE/i)).toBeTruthy();
		expect(getByText('PACE')).toBeTruthy();
		expect(getByText('TECH')).toBeTruthy();
		expect(getByText('VISION')).toBeTruthy();
		expect(getByText('PHYS')).toBeTruthy();
		expect(getByText('DEF')).toBeTruthy();
		expect(getByText('MENT')).toBeTruthy();
	});

	it('renders tactile steppers and qualitative scouting tags', async () => {
		const { getByText } = render(CoachScoutingView);
		await tick();
		await new Promise(r => setTimeout(r, 10)); // Allow microtasks to settle
		await tick();

		expect(getByText('Pace')).toBeTruthy();
		expect(getByText('Technique')).toBeTruthy();
		expect(getByText('Tactical Vision')).toBeTruthy();
		expect(getByText('Physicality')).toBeTruthy();
		expect(getByText('Defending')).toBeTruthy();
		expect(getByText('Mentality')).toBeTruthy();

		expect(getByText(/QUALITATIVE SCOUTING TAGS/i)).toBeTruthy();
		expect(getByText('Elite First Touch')).toBeTruthy();
		expect(getByText('High Work Rate')).toBeTruthy();
		expect(getByText('Dominant 1v1')).toBeTruthy();
		expect(getByText(/CONFIDENTIAL SCOUTING & RECRUITMENT NOTES/i)).toBeTruthy();
	});

	it('renders primary Action Gold Lock & Submit button', async () => {
		const { getByText } = render(CoachScoutingView);
		await tick();
		await new Promise(r => setTimeout(r, 10)); // Allow microtasks to settle
		await tick();

		const lockBtn = getByText(/LOCK & SUBMIT ASSESSMENT/i);
		expect(lockBtn).toBeTruthy();
	});
});
