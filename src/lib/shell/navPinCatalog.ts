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

export type PinTriple = [string | null, string | null, string | null];

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

const DEFAULT_PINS: Record<NavPersonaKey, PinTriple> = {
	player: ['/player/dashboard', '/player/workout', '/stats'],
	coach: ['/coach', '/coach/forge', '/messages'],
	parent: ['/parent/household', '/parent/vpc', '/parent/dashboard'],
	director: ['/director?tab=home', '/director?tab=teams', '/director?tab=field'],
	admin: ['/admin/overview', '/admin/organizations', '/admin/users'],
	registrar: ['/director?tab=home', '/director?tab=teams', '/director?tab=licenses'],
	recruiter: ['/recruiter', '/messages', null],
};

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
		coachLinks.find((l) => l.href === '/coach')!,
		coachLinks.find((l) => l.href === '/coach/forge')!,
		messagesNavItem,
	];
	const tier2 = coachLinks.filter(
		(l) => l.href !== '/coach' && l.href !== '/coach/forge' && l.href !== '/coach/tactical',
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

export function getDefaultPins(personaKey: NavPersonaKey): PinTriple {
	const defaults = DEFAULT_PINS[personaKey] ?? DEFAULT_PINS.player;
	return [...defaults] as PinTriple;
}

export function isHrefAllowedForPersona(href: string, personaKey: NavPersonaKey): boolean {
	return getNavCatalog(personaKey).some((item) => item.href === href);
}

export function findCatalogItem(
	personaKey: NavPersonaKey,
	href: string,
): NavPinItem | undefined {
	return getNavCatalog(personaKey).find((item) => item.href === href);
}

export function sanitizePins(raw: readonly (string | null)[], personaKey: NavPersonaKey): PinTriple {
	const defaults = getDefaultPins(personaKey);
	const result: PinTriple = [null, null, null];
	for (let i = 0; i < 3; i++) {
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
