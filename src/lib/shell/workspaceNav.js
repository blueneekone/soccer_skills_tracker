/**
 * Enterprise shell sidebar: workspace label + links from pathname + role.
 * @typedef {{ tab?: string, label: string, icon: string, href: string }} ShellNavItem
 * @typedef {{ workspaceLabel: string, mobileTitle: string, links: ShellNavItem[], showBilling?: boolean }} ShellNavConfig
 */

/** @type {ShellNavItem[]} */
const adminLinks = [
	{ tab: 'overview', label: 'Overview', icon: 'ph-chart-line', href: '/admin' },
	{ tab: 'sports', label: 'Sports modules', icon: 'ph-trophy', href: '/admin?tab=sports' },
	{ tab: 'accounts', label: 'Accounts', icon: 'ph-users-three', href: '/admin?tab=accounts' },
	{ tab: 'billing', label: 'Licensing', icon: 'ph-credit-card', href: '/admin?tab=billing' },
	{ tab: 'security', label: 'Security', icon: 'ph-shield-check', href: '/admin?tab=security' },
];

/** @type {ShellNavItem[]} */
const directorLinks = [
	{ tab: 'home', label: 'Home', icon: 'ph-house', href: '/director?tab=home' },
	{ tab: 'teams', label: 'Roster & teams', icon: 'ph-users-three', href: '/director?tab=teams' },
	{ tab: 'field', label: 'Field ops', icon: 'ph-soccer-ball', href: '/director?tab=field' },
	{ tab: 'registrars', label: 'Registrars', icon: 'ph-swap', href: '/director?tab=registrars' },
	{ tab: 'brand', label: 'Club branding', icon: 'ph-palette', href: '/director?tab=brand' },
	{ tab: 'marketing', label: 'Playbook & campaigns', icon: 'ph-megaphone', href: '/director?tab=marketing' },
	{ tab: 'compliance', label: 'Compliance', icon: 'ph-shield-check', href: '/director?tab=compliance' },
	{ tab: 'household', label: 'Households & COPPA', icon: 'ph-house-line', href: '/director?tab=household' },
];

/** @type {ShellNavItem[]} */
const coachLinks = [
	{ tab: 'roster', label: 'My Team', icon: 'ph-users-three', href: '/coach?tab=roster' },
	{ tab: 'playbook', label: 'Playbook', icon: 'ph-book-open', href: '/coach?tab=playbook' },
	{ tab: 'videos', label: 'Videos', icon: 'ph-video-camera', href: '/coach?tab=videos' },
	{ tab: 'matchday', label: 'Match Day', icon: 'ph-soccer-ball', href: '/coach?tab=matchday' },
	{ tab: 'messages', label: 'Messages', icon: 'ph-chat-circle', href: '/coach?tab=messages' },
	{ tab: 'plan', label: 'Plan', icon: 'ph-calendar', href: '/coach?tab=plan' },
	{ tab: 'evals', label: 'Evals', icon: 'ph-clipboard-text', href: '/coach?tab=evals' },
	{ tab: 'strategy', label: 'Strategy', icon: 'ph-paint-brush', href: '/coach?tab=strategy' },
	{ tab: 'design', label: 'Drill Designer', icon: 'ph-ruler', href: '/coach?tab=design' },
	{ tab: 'tools', label: 'Tools', icon: 'ph-gear', href: '/coach?tab=tools' },
];

/** @type {ShellNavItem[]} */
const playerLinks = [
	{ tab: '', label: 'My Stats', icon: 'ph-chart-bar', href: '/stats' },
	{ tab: '', label: 'Log workout', icon: 'ph-list', href: '/tracker' },
	{ tab: '', label: 'Trials', icon: 'ph-trophy', href: '/challenges' },
	{ tab: '', label: 'Passport', icon: 'ph-identification-card', href: '/passport' },
	{ tab: '', label: 'Trophy Room', icon: 'ph-medal', href: '/trophies' },
	{ tab: '', label: 'Messages', icon: 'ph-chat-circle', href: '/messages' },
];

/** @type {ShellNavItem[]} */
const parentLinks = [
	{ tab: '', label: 'Household', icon: 'ph-house', href: '/parent/vpc' },
	{ tab: '', label: 'Log workout', icon: 'ph-user-check', href: '/parent/log-workout' },
	{ tab: '', label: 'Payments', icon: 'ph-credit-card', href: '/pricing' },
	{ tab: '', label: 'Messages', icon: 'ph-chat-circle', href: '/messages' },
];

/** @type {ShellNavItem[]} */
const registrarLinks = [
	{ tab: '', label: 'Compliance desk', icon: 'ph-shield-check', href: '/registrar' },
];

/** @type {ShellNavItem[]} */
const recruiterLinks = [
	{ tab: '', label: 'Recruiter search', icon: 'ph-magnifying-glass', href: '/recruiter' },
];

/** @type {ShellNavItem[]} */
const superAdminHomeLinks = [
	{ tab: '', label: 'Admin console', icon: 'ph-shield-star', href: '/admin' },
	{ tab: 'roster', label: 'Coach tools', icon: 'ph-megaphone', href: '/coach?tab=roster' },
];

/**
 * @param {string} pathname
 * @param {string} role
 * @returns {ShellNavConfig}
 */
export function getWorkspaceNav(pathname, role) {
	if (pathname.startsWith('/admin')) {
		return {
			workspaceLabel: 'Admin',
			mobileTitle: 'Admin',
			links: adminLinks,
			showBilling: false,
		};
	}
	if (pathname.startsWith('/director')) {
		return {
			workspaceLabel: 'Director',
			mobileTitle: 'Director',
			links: directorLinks,
			showBilling: true,
		};
	}
	if (pathname.startsWith('/coach')) {
		return {
			workspaceLabel: 'Coach',
			mobileTitle: 'Coach',
			links: coachLinks,
			showBilling: false,
		};
	}
	if (pathname.startsWith('/registrar')) {
		return {
			workspaceLabel: 'Registrar Workspace',
			mobileTitle: 'Registrar Workspace',
			links: registrarLinks,
			showBilling: false,
		};
	}
	if (pathname.startsWith('/recruiter')) {
		return {
			workspaceLabel: 'Recruiter',
			mobileTitle: 'Recruiter',
			links: recruiterLinks,
			showBilling: false,
		};
	}

	switch (role) {
		case 'super_admin':
			return {
				workspaceLabel: 'Platform',
				mobileTitle: 'Admin',
				links: superAdminHomeLinks,
				showBilling: false,
			};
		case 'director':
			return {
				workspaceLabel: 'Director',
				mobileTitle: 'Director',
				links: [
					{ tab: 'home', label: 'Command center', icon: 'ph-squares-four', href: '/director?tab=home' },
					...directorLinks.slice(1, 5),
					{ tab: '', label: 'Recruiter', icon: 'ph-magnifying-glass', href: '/recruiter' },
					{ tab: '', label: 'Coach tools', icon: 'ph-megaphone', href: '/coach?tab=roster' },
				],
				showBilling: true,
			};
		case 'coach':
			return {
				workspaceLabel: 'Coach',
				mobileTitle: 'Coach',
				links: coachLinks,
				showBilling: false,
			};
		case 'player':
			return {
				workspaceLabel: 'Player',
				mobileTitle: 'Player',
				links: playerLinks,
				showBilling: false,
			};
		case 'parent':
			return {
				workspaceLabel: 'Parent',
				mobileTitle: 'Parent',
				links: parentLinks,
				showBilling: false,
			};
		case 'registrar':
			return {
				workspaceLabel: 'Registrar Workspace',
				mobileTitle: 'Registrar Workspace',
				links: registrarLinks,
				showBilling: false,
			};
		default:
			return {
				workspaceLabel: 'Workspace',
				mobileTitle: 'App',
				links: [{ tab: '', label: 'Settings', icon: 'ph-gear', href: '/settings' }],
				showBilling: false,
			};
	}
}

/**
 * @param {string} pathname
 * @param {URLSearchParams} searchParams
 * @param {ShellNavItem} item
 */
export function isShellNavActive(pathname, searchParams, item) {
	try {
		const u = new URL(item.href, 'https://placeholder.local');
		if (u.pathname !== pathname) return false;
		const curTab = searchParams.get('tab') || '';
		const wantTab = u.searchParams.get('tab');

		if (pathname === '/coach') {
			const cur = curTab || 'roster';
			const want = wantTab || 'roster';
			return cur === want;
		}
		if (pathname === '/director') {
			const cur = curTab || 'home';
			const want = wantTab || 'home';
			return cur === want;
		}
		if (pathname === '/admin') {
			const cur = curTab || 'overview';
			const want = wantTab || 'overview';
			return cur === want;
		}
		if (wantTab === null || wantTab === '') {
			return u.search === '' || u.search === '?';
		}
		return curTab === wantTab;
	} catch {
		return false;
	}
}
