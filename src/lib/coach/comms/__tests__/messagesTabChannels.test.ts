import { describe, it, expect } from 'vitest';
import {
	DEFAULT_TEAM_CHANNELS,
	isDefaultTeamChannelId,
	mapClubChannelDoc,
} from '../messagesTabChannels.js';

describe('messagesTabChannels', () => {
	it('recognizes default team channel ids', () => {
		expect(isDefaultTeamChannelId('game-day')).toBe(true);
		expect(isDefaultTeamChannelId('custom-abc')).toBe(false);
		expect(DEFAULT_TEAM_CHANNELS).toHaveLength(3);
	});

	it('maps club channel docs and hides parent lounge', () => {
		expect(
			mapClubChannelDoc('parent-lounge-t1', { teamId: 't1', name: 'Lounge' }, 't1'),
		).toBeNull();
		const row = mapClubChannelDoc(
			'ch1',
			{ teamId: 't1', name: 'Captains chat', type: 'group' },
			't1',
		);
		expect(row?.label).toBe('Captains chat');
		expect(row?.source).toBe('club-custom');
	});
});
