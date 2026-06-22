import { describe, it, expect, vi } from 'vitest';
import {
	MissionSnapshotRetryGate,
	pickMissionRailTeamId,
} from '../missionRailAuth.js';

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

describe('pickMissionRailTeamId — FORGE-MISSION-RAIL-VISIBILITY', () => {
	it('prefers profile team when profile matches JWT', () => {
		expect(pickMissionRailTeamId('team-profile', 'team-workspace', 'team-profile')).toBe(
			'team-profile',
		);
	});

	it('prefers JWT team when profile team disagrees (list rules gate on tokenTeam)', () => {
		expect(pickMissionRailTeamId('team-profile', 'team-workspace', 'team-jwt')).toBe('team-jwt');
	});

	it('falls back to workspace then JWT when profile empty', () => {
		expect(pickMissionRailTeamId('', 'team-workspace', 'team-jwt')).toBe('team-workspace');
		expect(pickMissionRailTeamId('', '', 'team-jwt')).toBe('team-jwt');
	});

	it('skips admin sentinel', () => {
		expect(pickMissionRailTeamId('', '', 'admin')).toBe('');
		expect(pickMissionRailTeamId('admin', 'team-b', '')).toBe('team-b');
	});
});
