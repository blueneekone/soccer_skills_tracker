import type { AdminSportTab, AdminTierOption } from '$lib/types/adminOrganizations.js';

export const ADMIN_TIER_OPTIONS: AdminTierOption[] = [
	{ key: 'enterprise', label: 'Enterprise', accent: '#4338ca', icon: 'game.diamond' },
	{ key: 'club', label: 'Club', accent: '#0ea5e9', icon: 'org.building' },
	{ key: 'pro', label: 'Pro', accent: '#10b981', icon: 'game.trophy' },
	{ key: 'starter', label: 'Starter', accent: '#f59e0b', icon: 'game.seedling' },
	{ key: 'unassigned', label: 'Unassigned', accent: '#71717a', icon: 'sys.question' },
];

export const ADMIN_SPORT_TABS: AdminSportTab[] = [
	{ key: 'all', label: 'All', icon: 'content.grid' },
	{ key: 'soccer', label: 'Soccer', icon: 'sport.soccer' },
	{ key: 'basketball', label: 'Basketball', icon: 'sport.basketball' },
	{ key: 'volleyball', label: 'Volleyball', icon: 'sport.volleyball' },
	{ key: 'baseball', label: 'Baseball', icon: 'sport.baseball' },
	{ key: 'football', label: 'Football', icon: 'sport.football' },
	{ key: 'hockey', label: 'Hockey', icon: 'sport.hockey' },
	{ key: 'lacrosse', label: 'Lacrosse', icon: 'sport.lacrosse' },
	{ key: 'generic', label: 'Other', icon: 'sport.generic' },
];

export const ADMIN_ORG_PAGE_SIZE = 50;
