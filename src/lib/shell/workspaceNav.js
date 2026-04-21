/**
 * Enterprise shell sidebar: strictly isolated by workspace `activeContext` (Context Switcher).
 * Do not mix workspace-jumping links here — use WorkspaceContextSwitcher for that.
 *
 * @typedef {{ tab?: string, label: string, icon: string, href: string }} ShellNavItem
 * @typedef {{ workspaceLabel: string, mobileTitle: string, links: ShellNavItem[], showBilling?: boolean }} ShellNavConfig
 * @typedef {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'recruiter' | 'household'} WorkspaceContext
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
	{ tab: 'field', label: 'Field ops', icon: 'ph-map-pin', href: '/director?tab=field' },
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

/**
 * Player / athlete OS (household context): no workspace-jumping links.
 * @type {ShellNavItem[]}
 */
const athleteHouseholdLinks = [
	{ tab: '', label: 'Player Stats', icon: 'ph-chart-bar', href: '/stats' },
	{ tab: '', label: 'Trophy Room', icon: 'ph-trophy', href: '/trophies' },
	{ tab: '', label: 'Log workout', icon: 'ph-list', href: '/tracker' },
	{ tab: '', label: 'Challenges', icon: 'ph-medal', href: '/challenges' },
	{ tab: '', label: 'Settings', icon: 'ph-gear', href: '/settings' },
];

/** @type {ShellNavItem[]} */
const parentLinks = [
	{ tab: '', label: 'Household', icon: 'ph-house', href: '/parent/vpc' },
	{ tab: '', label: 'Trophy Room', icon: 'ph-trophy', href: '/trophies' },
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

/**
 * When `activeContext` is not yet set, infer from URL (first paint / deep link).
 * @param {string} pathname
 * @returns {WorkspaceContext}
 */
export function inferWorkspaceContextFromPathname(pathname) {
	const p = pathname || '';
	if (p.startsWith('/admin')) return 'admin';
	if (p.startsWith('/director')) return 'director';
	if (p.startsWith('/coach')) return 'coach';
	if (p.startsWith('/registrar')) return 'registrar';
	if (p.startsWith('/recruiter')) return 'recruiter';
	return 'household';
}

/**
 * Sidebar links for the Enterprise shell — isolated by active workspace only.
 *
 * @param {string} pathname
 * @param {string} role
 * @param {string} [activeContext]
 * @returns {ShellNavConfig}
 */
export function getWorkspaceNav(pathname, role, activeContext = '') {
	const inferred = inferWorkspaceContextFromPathname(pathname);
	const raw = (activeContext || '').trim();
	/** @type {WorkspaceContext} */
	let ctx = raw || inferred;
	// Super Admin must follow URL context strictly (prevents dashboard bleed across workspaces).
	if (role === 'super_admin') {
		ctx = inferred;
	}
	const allowed = new Set(['admin', 'director', 'coach', 'registrar', 'recruiter', 'household']);
	if (!allowed.has(ctx)) {
		ctx = inferred;
	}

	switch (ctx) {
		case 'admin':
			return {
				workspaceLabel: 'Admin',
				mobileTitle: 'Admin',
				links: adminLinks,
				showBilling: false,
			};
		case 'director':
			return {
				workspaceLabel: 'Director',
				mobileTitle: 'Director',
				links: directorLinks,
				showBilling: true,
			};
		case 'coach':
			return {
				workspaceLabel: 'Coach',
				mobileTitle: 'Coach',
				links: coachLinks,
				showBilling: false,
			};
		case 'registrar':
			return {
				workspaceLabel: 'Registrar Workspace',
				mobileTitle: 'Registrar Workspace',
				links: registrarLinks,
				showBilling: false,
			};
		case 'recruiter':
			return {
				workspaceLabel: 'Recruiter',
				mobileTitle: 'Recruiter',
				links: recruiterLinks,
				showBilling: false,
			};
		case 'household':
		default: {
			// 'household' = Player OS / parent portal — never workspace-jumping links.
			if (role === 'parent') {
				return {
					workspaceLabel: 'Parent',
					mobileTitle: 'Parent',
					links: parentLinks,
					showBilling: false,
				};
			}
			if (role === 'player' || role === 'super_admin') {
				return {
					workspaceLabel: 'Player',
					mobileTitle: 'Player',
					links: athleteHouseholdLinks,
					showBilling: false,
				};
			}
			return {
				workspaceLabel: 'Workspace',
				mobileTitle: 'App',
				links: [{ tab: '', label: 'Settings', icon: 'ph-gear', href: '/settings' }],
				showBilling: false,
			};
		}
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
