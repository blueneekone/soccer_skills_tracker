import type { IconName } from '$lib/icons/registry.js';

export type PlayerCommandCenterLink = {
	href: string;
	label: string;
	icon: IconName;
	description?: string;
};

/** Secondary Player OS destinations — surfaced via Command Center drawer only. */
export const PLAYER_COMMAND_CENTER_LINKS: readonly PlayerCommandCenterLink[] = Object.freeze([
	{
		href: '/player/tracker',
		label: "Today's Quests",
		icon: 'game.zap',
		description: 'Adaptive homework and daily drills',
	},
	{
		href: '/player/workout',
		label: 'Log Training',
		icon: 'content.checks',
		description: 'Record reps, minutes, and intensity',
	},
	{
		href: '/player/proving-grounds',
		label: 'Proving Grounds',
		icon: 'game.zap',
		description: 'Self-report benchmark drills · Scouts Six XP',
	},
	{
		href: '/player/media',
		label: 'Training Media',
		icon: 'content.film',
		description: 'Upload clips and review your film vault',
	},
	{
		href: '/stats',
		label: 'Career Stats',
		icon: 'data.chart-bar',
		description: 'Season metrics and growth charts',
	},
	{
		href: '/player/armory',
		label: 'Profile & Gear',
		icon: 'status.shield-check',
		description: 'Avatar, position, and unlocks',
	},
	{
		href: '/messages',
		label: 'Messages',
		icon: 'comm.chat',
		description: 'Team and household threads',
	},
	{
		href: '/player/settings',
		label: 'Settings',
		icon: 'sys.settings',
		description: 'Account, privacy, and billing',
	},
]);
