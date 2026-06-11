import type { IconName } from '$lib/icons/registry.js';

export type MessagesTabChannel = {
	id: string;
	label: string;
	description: string;
	icon: IconName;
	source: 'team-default' | 'club-custom';
};

export const DEFAULT_TEAM_CHANNELS: MessagesTabChannel[] = [
	{
		id: 'game-day',
		label: 'Game Day',
		description: 'Matchday logistics & squad notes',
		icon: 'game.trophy',
		source: 'team-default',
	},
	{
		id: 'practice-sessions',
		label: 'Practice',
		description: 'Session plans, drills, and attendance',
		icon: 'game.dumbbell',
		source: 'team-default',
	},
	{
		id: 'general',
		label: 'General',
		description: 'Everyday team conversation',
		icon: 'comm.chats',
		source: 'team-default',
	},
];

export function isDefaultTeamChannelId(id: string): boolean {
	return DEFAULT_TEAM_CHANNELS.some((c) => c.id === id);
}

/** Map a clubs/{clubId}/channels doc into a sidebar row (null = hidden from coach matrix). */
export function mapClubChannelDoc(
	id: string,
	data: Record<string, unknown>,
	teamId: string,
): MessagesTabChannel | null {
	if (id.startsWith('parent-lounge-')) return null;
	const docTeamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
	if (docTeamId && docTeamId !== teamId) return null;
	const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Group chat';
	const type = typeof data.type === 'string' ? data.type : 'group';
	return {
		id,
		label: name.slice(0, 200),
		description:
			type === 'dm' ? 'Direct message channel' : 'Custom group channel (SafeSport monitored)',
		icon: type === 'dm' ? ('user.profile' as IconName) : ('comm.chats' as IconName),
		source: 'club-custom',
	};
}
