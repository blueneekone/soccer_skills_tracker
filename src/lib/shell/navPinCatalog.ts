/**
 * NAV-OPTION-D — persona nav catalogs + default bottom pins (single source).
 * Registry §2 hrefs via workspaceNav + playerPrimaryNav.
 */
import {
	adminLinks,
	coachLinks,
	directorLinks,
	messagesNavItem,
	parentLinks,
	recruiterLinks,
} from '$lib/shell/workspaceNav.js';
import {
	playerOverflowNav,
	playerPrimaryFieldNav,
} from '$lib/player/shell/playerPrimaryNav.js';
import type { IconName } from '$lib/icons/registry.js';

export type NavPersonaKey =
	| 'player'
	| 'coach'
	| 'parent'
	| 'director'
	| 'admin'
	| 'registrar'
	| 'recruiter';

export type NavPinItem = {
	href: string;
	label: string;
	icon: IconName | string;
	section: string;
	tab?: string;
};

export const MENU_PIN_HREF = '__field_menu__';

export type PinQuad = [string | null, string | null, string | null, string | null];
/** @deprecated alias — use PinQuad */
export type PinTriple = PinQuad;

type ShellLink = { href: string; label: string; icon: string; tab?: string };

const DIRECTOR_COMMAND_TABS = new Set([
	'home',
	'teams',
	'field',
	'comms',
	'registrars',
	'brand',
	'playbook',
]);

const DEFAULT_PINS: Record<NavPersonaKey, PinQuad> = {
	player: ['/player/dashboard', '/player/workout', '/stats', MENU_PIN_HREF],
	coach: ['/coach', '/coach/forge', '/messages', MENU_PIN_HREF],
	parent: ['/parent/household', '/parent/vpc', '/parent/dashboard', MENU_PIN_HREF],
	director: ['/director?tab=home', '/director?tab=teams', '/director?tab=field', MENU_PIN_HREF],
	admin: ['/admin/overview', '/admin/organizations', '/admin/users', MENU_PIN_HREF],
	registrar: ['/director?tab=home', '/director?tab=teams', '/director?tab=licenses', MENU_PIN_HREF],
	recruiter: ['/recruiter', '/messages', null, MENU_PIN_HREF],
};

export function getMenuPinItem(): NavPinItem {
	return {
		href: MENU_PIN_HREF,
		label: 'Menu',
		icon: 'nav.menu',
		section: 'System',
	};
}

function mapLinks(links: ShellLink[], section: string): NavPinItem[] {
	return links.map(({ href, label, icon, tab }) => ({
		href,
		label,
		icon,
		section,
		tab,
	}));
}

function directorSection(item: ShellLink): string {
	if (item.tab && DIRECTOR_COMMAND_TABS.has(item.tab)) return 'Command';
	return 'Compliance & ops';
}

function buildDirectorCatalog(): NavPinItem[] {
	return directorLinks.map((item) => ({
		href: item.href,
		label: item.label,
		icon: item.icon,
		section: directorSection(item),
		tab: item.tab,
	}));
}

function buildCoachCatalog(): NavPinItem[] {
	const tier1: ShellLink[] = [
		coachLinks.find((l) => l.href === '/coach/dashboard')!,
		coachLinks.find((l) => l.href === '/coach/forge')!,
		messagesNavItem,
	];
	const tier2 = coachLinks.filter(
		(l) => l.href !== '/coach/dashboard' && l.href !== '/coach/forge',
	);
	return [
		...mapLinks(tier1, 'Tier 1 / exec'),
		...mapLinks(tier2, 'Operations (Tier 2)'),
	];
}

function buildParentCatalog(): NavPinItem[] {
	const tier1Hrefs = new Set([
		'/parent/household',
		'/parent/vpc',
		'/parent/dashboard',
		'/messages',
	]);
	const tier1 = parentLinks.filter((l) => tier1Hrefs.has(l.href));
	const tier2 = parentLinks.filter((l) => !tier1Hrefs.has(l.href));
	return [...mapLinks(tier1, 'Tier 1'), ...mapLinks(tier2, 'Co-op (Tier 2)')];
}

function buildPlayerCatalog(): NavPinItem[] {
	return [
		...playerPrimaryFieldNav.map(({ href, label, icon }) => ({
			href,
			label,
			icon,
			section: 'Primary (Tier 1)',
		})),
		...playerOverflowNav.map(({ href, label, icon }) => ({
			href,
			label,
			icon,
			section: 'More routes',
		})),
	];
}

const CATALOGS: Record<NavPersonaKey, NavPinItem[]> = {
	player: buildPlayerCatalog(),
	coach: buildCoachCatalog(),
	parent: buildParentCatalog(),
	director: buildDirectorCatalog(),
	admin: mapLinks(adminLinks, 'Platform'),
	registrar: buildDirectorCatalog(),
	recruiter: [
		...mapLinks(recruiterLinks, 'Search'),
		{ ...messagesNavItem, section: 'Cross-persona', icon: messagesNavItem.icon as IconName },
	],
};

export function getNavCatalog(personaKey: NavPersonaKey): NavPinItem[] {
	return CATALOGS[personaKey] ?? CATALOGS.player;
}

export function getDefaultPins(personaKey: NavPersonaKey): PinQuad {
	const defaults = DEFAULT_PINS[personaKey] ?? DEFAULT_PINS.player;
	return [...defaults] as PinQuad;
}

export function getPickPinCatalog(personaKey: NavPersonaKey): NavPinItem[] {
	return [...getNavCatalog(personaKey), getMenuPinItem()];
}

export function isHrefAllowedForPersona(href: string, personaKey: NavPersonaKey): boolean {
	if (href === MENU_PIN_HREF) return true;
	return getNavCatalog(personaKey).some((item) => item.href === href);
}

export function findCatalogItem(
	personaKey: NavPersonaKey,
	href: string,
): NavPinItem | undefined {
	return getNavCatalog(personaKey).find((item) => item.href === href);
}

export function sanitizePins(raw: readonly (string | null)[], personaKey: NavPersonaKey): PinQuad {
	const defaults = getDefaultPins(personaKey);
	const result: PinQuad = [null, null, null, null];
	for (let i = 0; i < 4; i++) {
		const candidate = raw[i] ?? defaults[i];
		if (candidate && isHrefAllowedForPersona(candidate, personaKey)) {
			result[i] = candidate;
		} else {
			result[i] = defaults[i];
		}
	}
	return result;
}

/** Resolve nav persona key from auth role + workspace context (NAV-OPTION-D). */
export function resolveNavPersonaKey(
	role: string | null | undefined,
	activeContext: string | null | undefined,
): NavPersonaKey {
	const r = (role ?? '').trim();
	const ctx = (activeContext ?? '').trim();

	if (r === 'player') return 'player';
	if (r === 'parent') return 'parent';
	if (r === 'recruiter' || ctx === 'recruiter') return 'recruiter';
	if (r === 'registrar' || ctx === 'registrar') return 'registrar';
	if (ctx === 'admin' || r === 'admin' || r === 'global_admin' || r === 'super_admin') {
		return 'admin';
	}
	if (ctx === 'director' || r === 'director') return 'director';
	if (ctx === 'coach' || r === 'coach') return 'coach';
	return 'coach';
}

export function catalogSections(catalog: NavPinItem[]): string[] {
	const seen = new Set<string>();
	const sections: string[] = [];
	for (const item of catalog) {
		if (!seen.has(item.section)) {
			seen.add(item.section);
			sections.push(item.section);
		}
	}
	return sections;
}

export function showWorkspaceSwitcher(personaKey: NavPersonaKey): boolean {
	return personaKey === 'director' || personaKey === 'admin' || personaKey === 'registrar';
}
