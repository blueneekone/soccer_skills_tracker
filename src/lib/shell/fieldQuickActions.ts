import type { IconName } from '$lib/icons/registry.js';

export interface FieldQuickAction {
	label: string;
	icon: IconName;
	href: string;
}

const FAB_ACTIONS: Array<{
	prefix: string;
	tab?: string | null;
	label: string;
	icon: IconName;
	href: string;
}> = [
	{ prefix: '/director', tab: 'teams', label: 'Invite Player', icon: 'user.plus', href: '/director?tab=teams' },
	{ prefix: '/director', tab: 'household', label: 'Add Household', icon: 'nav.home', href: '/director?tab=household' },
	{
		prefix: '/director',
		tab: 'compliance',
		label: 'Staff Clearance',
		icon: 'status.shield-check',
		href: '/director/compliance',
	},
	{ prefix: '/director', tab: null, label: 'Quick Action', icon: 'game.zap', href: '/director?tab=teams' },
	{ prefix: '/admin/organizations', label: 'New Club', icon: 'org.building', href: '/admin/organizations' },
	{ prefix: '/admin/users', label: 'Add User', icon: 'user.plus', href: '/admin/users' },
	{ prefix: '/admin', label: 'Overview', icon: 'data.chart-line', href: '/admin/overview' },
	{ prefix: '/coach/forge', label: 'Create Drill', icon: 'game.dumbbell', href: '/coach/forge' },
	{ prefix: '/coach/match-day', label: 'Log Match', icon: 'data.activity', href: '/coach/match-day' },
	{ prefix: '/coach', label: 'View Roster', icon: 'user.group', href: '/coach' },
];

/** Route-scoped quick actions formerly surfaced by MobileDirectorFab on field. */
export function getFieldQuickActions(pathname: string): FieldQuickAction[] {
	const sorted = [...FAB_ACTIONS].sort((a, b) => b.prefix.length - a.prefix.length);
	const match = sorted.find((a) => pathname.startsWith(a.prefix));
	if (!match) return [];
	return [{ label: match.label, icon: match.icon, href: match.href }];
}
