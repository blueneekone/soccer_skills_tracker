/**
 * Player OS primary navigation — registry §2 source of truth (NAV-CANON / NAV-IMPL).
 * Field: ≤3 primary tabs + More sheet. Desk: full rail via playerRailNav.
 */
import type { IconName } from '$lib/icons/registry.js';

export type PlayerNavLink = {
	href: string;
	icon: IconName;
	label: string;
};

export const PLAYER_HQ_HREF = '/player/dashboard';

/** Tier 1 primary field tabs — PS-PL01–PL03 */
export const playerPrimaryFieldNav: PlayerNavLink[] = [
	{ href: PLAYER_HQ_HREF, icon: 'content.grid', label: 'HQ' },
	{ href: '/player/workout', icon: 'content.checks', label: 'Train' },
	{ href: '/stats', icon: 'data.chart-bar', label: 'Stats' },
];

/** Tier 2+ overflow (More sheet) — not duplicated in bottom tab row */
export const playerOverflowNav: PlayerNavLink[] = [
	{ href: '/player/tracker', icon: 'game.zap', label: 'Tracker' },
	{ href: '/messages', icon: 'comm.chat', label: 'Comms' },
	{ href: '/player/armory', icon: 'status.shield-check', label: 'Armory' },
	{ href: '/player/settings', icon: 'sys.settings', label: 'Settings' },
];

/** Desktop left rail — primary then overflow */
export const playerRailNav: PlayerNavLink[] = [...playerPrimaryFieldNav, ...playerOverflowNav];

export function isPlayerHubActive(path: string, hqHref = PLAYER_HQ_HREF): boolean {
	return path === hqHref || path.startsWith(`${hqHref}/`);
}

export function isPlayerNavActive(href: string, path: string, hqHref = PLAYER_HQ_HREF): boolean {
	if (href === hqHref) return isPlayerHubActive(path, hqHref);
	if (path === href) return true;
	if (href === '/operative/profile') {
		return path === '/operative/profile' || path.startsWith('/operative/');
	}
	return path.startsWith(`${href}/`);
}
