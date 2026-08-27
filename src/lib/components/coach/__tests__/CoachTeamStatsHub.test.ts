// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CoachTeamStatsHub from '../stats/CoachTeamStatsHub.svelte';
import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';

vi.mock('$lib/firebase.js', () => ({
	db: {}
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: { isAuthenticated: true, user: { uid: 'coach-123' } }
}));

vi.mock('$lib/services/sportsConfigs.svelte.js', () => ({
	sportsConfigStore: {
		currentSportConfig: { sportId: 'soccer' }
	}
}));

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	getDocs: vi.fn(() => Promise.resolve({
		forEach: (cb: any) => {
			// Mock documents
		}
	}))
}));

describe('CoachTeamStatsHub', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders telemetry and attribute intelligence header', () => {
		const { getByText } = render(CoachTeamStatsHub, { teamId: 'team-456' });
		expect(getByText(/TEAM TELEMETRY & ATTRIBUTE INTELLIGENCE/i)).toBeTruthy();
		expect(getByText(/6-Axis Tactical Radar/i)).toBeTruthy();
		expect(getByText(/7-Day XP Velocity/i)).toBeTruthy();
	});

	it('renders the drill-down selector and defaults to entire squad', () => {
		const { getByRole, getByText } = render(CoachTeamStatsHub, { teamId: 'team-456' });
		const select = getByRole('combobox');
		expect(select).toBeTruthy();
		expect(getByText(/ENTIRE SQUAD \(AVERAGE\)/i)).toBeTruthy();
	});

	it('renders the 6 concentric radar axis markers', () => {
		const { getByText } = render(CoachTeamStatsHub, { teamId: 'team-456' });
		expect(getByText('Pace')).toBeTruthy();
		expect(getByText('Technical')).toBeTruthy();
		expect(getByText('Game IQ')).toBeTruthy();
		expect(getByText('Physical')).toBeTruthy();
		expect(getByText('Mental')).toBeTruthy();
		expect(getByText('Defending')).toBeTruthy();
	});
});
