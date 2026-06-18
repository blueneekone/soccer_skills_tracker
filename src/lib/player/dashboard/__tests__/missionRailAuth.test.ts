import { beforeEach, describe, it, expect, vi } from 'vitest';

const { getIdTokenResult, refreshClaims } = vi.hoisted(() => ({
	getIdTokenResult: vi.fn(),
	refreshClaims: vi.fn(),
}));

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('firebase/auth', () => ({ getIdTokenResult }));
vi.mock('$lib/firebase.js', () => ({ auth: { currentUser: { uid: 'player-uid' } } }));
vi.mock('$lib/stores/auth.svelte.js', () => ({ authStore: { refreshClaims } }));

import { MissionSnapshotRetryGate, refreshClaimsIfProfileTeamStale } from '../missionRailAuth.js';

describe('refreshClaimsIfProfileTeamStale', () => {
	beforeEach(() => {
		getIdTokenResult.mockReset();
		refreshClaims.mockReset();
		refreshClaims.mockResolvedValue(undefined);
	});

	it('refreshes when profile teamId is missing from JWT claims', async () => {
		getIdTokenResult.mockResolvedValue({ claims: { clubId: 'club-a' } });
		const refreshed = await refreshClaimsIfProfileTeamStale('team-a', 'club-a');
		expect(refreshed).toBe(true);
		expect(refreshClaims).toHaveBeenCalledOnce();
	});

	it('refreshes when JWT teamId differs from profile (QA-142)', async () => {
		getIdTokenResult.mockResolvedValue({ claims: { teamId: 'team-b', clubId: 'club-a' } });
		const refreshed = await refreshClaimsIfProfileTeamStale('team-a', 'club-a');
		expect(refreshed).toBe(true);
		expect(refreshClaims).toHaveBeenCalledOnce();
	});

	it('refreshes when JWT clubId differs from profile', async () => {
		getIdTokenResult.mockResolvedValue({ claims: { teamId: 'team-a', clubId: 'club-b' } });
		const refreshed = await refreshClaimsIfProfileTeamStale('team-a', 'club-a');
		expect(refreshed).toBe(true);
		expect(refreshClaims).toHaveBeenCalledOnce();
	});

	it('skips refresh when profile and JWT scope already match', async () => {
		getIdTokenResult.mockResolvedValue({ claims: { teamId: 'team-a', clubId: 'club-a' } });
		const refreshed = await refreshClaimsIfProfileTeamStale('team-a', 'club-a');
		expect(refreshed).toBe(false);
		expect(refreshClaims).not.toHaveBeenCalled();
	});
});

describe('MissionSnapshotRetryGate', () => {
	it('retries once then blocks', () => {
		const gate = new MissionSnapshotRetryGate();
		const onRetry = vi.fn();
		const onBlocked = vi.fn();

		gate.onError(onRetry, onBlocked);
		gate.onError(onRetry, onBlocked);

		expect(onRetry).toHaveBeenCalledTimes(1);
		expect(onBlocked).toHaveBeenCalledTimes(1);
	});

	it('resets after successful snapshot', () => {
		const gate = new MissionSnapshotRetryGate();
		const onRetry = vi.fn();
		const onBlocked = vi.fn();

		gate.onError(onRetry, onBlocked);
		gate.onSuccess();
		gate.onError(onRetry, onBlocked);

		expect(onRetry).toHaveBeenCalledTimes(2);
		expect(onBlocked).not.toHaveBeenCalled();
	});
});
