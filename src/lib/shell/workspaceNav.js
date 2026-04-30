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
	{ label: 'Overview',        icon: 'ph-chart-line',   href: '/admin/overview' },
	{ label: 'Organizations',   icon: 'ph-buildings',    href: '/admin/organizations' },
	{ label: 'Global Users',    icon: 'ph-globe',        href: '/admin/users' },
	{ label: 'Recruiters',      icon: 'ph-binoculars',   href: '/admin/recruiters' },
	{ label: 'Audit Log',       icon: 'ph-shield-check', href: '/admin/audit-log' },
	{ label: 'System Settings', icon: 'ph-gear-six',     href: '/admin/system-settings' },
];

/** @type {ShellNavItem[]} */
const directorLinks = [
	{ tab: 'home', label: 'Overview', icon: 'ph-house', href: '/director?tab=home' },
	{ tab: 'teams', label: 'Roster & Teams', icon: 'ph-users-three', href: '/director?tab=teams' },
	{ tab: 'field', label: 'Field Ops', icon: 'ph-map-pin', href: '/director?tab=field' },
	{ tab: 'registrars', label: 'Registrars', icon: 'ph-swap', href: '/director?tab=registrars' },
	{ tab: 'brand', label: 'Club Branding', icon: 'ph-palette', href: '/director?tab=brand' },
	{ tab: 'playbook', label: 'Playbook', icon: 'ph-strategy', href: '/director?tab=playbook' },
	{ tab: 'licenses', label: 'Licenses & Seats', icon: 'ph-credit-card', href: '/director?tab=licenses' },
	{ tab: 'compliance', label: 'Compliance', icon: 'ph-shield-check', href: '/director?tab=compliance' },
	{ tab: 'household', label: 'Households & COPPA', icon: 'ph-house-line', href: '/director?tab=household' },
];

/** @type {ShellNavItem[]} */
const coachLinks = [
	{ label: 'Squad Telemetry', href: '/coach', icon: 'ph-users' },
	{ label: 'Trial Builder', href: '/coach/trial-builder', icon: 'ph-target' },
	{ label: 'Tactical Command', href: '/coach/tactical', icon: 'ph-strategy' },
	{ label: 'Mission Dispatch', href: '/coach/drills', icon: 'ph-rocket-launch' },
];

/**
 * Player OS (SIEM/SOAR): quests + logger = Command Center; stats = Operative Dossier.
 * @type {ShellNavItem[]}
 */
const athleteHouseholdLinks = [
	{ tab: '', label: 'Command Center', icon: 'ph-crosshair', href: '/player/workout' },
	{ tab: '', label: 'Operative Dossier', icon: 'ph-fingerprint', href: '/stats' },
	{ tab: '', label: 'Settings', icon: 'ph-gear', href: '/settings' },
];

/** @type {ShellNavItem[]} */
const parentLinks = [
	{ tab: '', label: 'Clearance', icon: 'ph-shield-check', href: '/parent/household' },
	{ tab: '', label: 'Household', icon: 'ph-house', href: '/parent/vpc' },
	{ tab: '', label: 'Log Workout', icon: 'ph-user-check', href: '/parent/log-workout' },
	{ tab: '', label: 'Payments', icon: 'ph-credit-card', href: '/pricing' },
	{ tab: '', label: 'Messages', icon: 'ph-chat-circle', href: '/messages' },
];

/** @type {ShellNavItem[]} */
const recruiterLinks = [
	{ tab: '', label: 'Recruiter Search', icon: 'ph-magnifying-glass', href: '/recruiter' },
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
	// Global Admin must follow URL context strictly (prevents dashboard bleed across workspaces).
	if (role === 'super_admin' || role === 'global_admin') {
		ctx = inferred;
	}
	const allowed = new Set(['admin', 'director', 'coach', 'registrar', 'recruiter', 'household']);
	if (!allowed.has(ctx)) {
		ctx = inferred;
	}

	switch (ctx) {
		case 'admin':
			return {
				workspaceLabel: 'Global Admin',
				mobileTitle: 'Global Admin',
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
				workspaceLabel: 'Registrar',
				mobileTitle: 'Director',
				links: directorLinks,
				showBilling: true,
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
			// If activeContext fell through to default, still give staff a real nav (not only Settings).
			if (role === 'coach') {
				return {
					workspaceLabel: 'Coach',
					mobileTitle: 'Coach',
					links: coachLinks,
					showBilling: false,
				};
			}
			if (role === 'director') {
				return {
					workspaceLabel: 'Director',
					mobileTitle: 'Director',
					links: directorLinks,
					showBilling: true,
				};
			}
			if (role === 'admin' || role === 'global_admin' || role === 'super_admin') {
				return {
					workspaceLabel: 'Global Admin',
					mobileTitle: 'Global Admin',
					links: adminLinks,
					showBilling: false,
				};
			}
			if (role === 'player') {
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
				links: [
					{ tab: '', label: 'Home', icon: 'ph-house', href: '/' },
					{ tab: '', label: 'Settings', icon: 'ph-gear', href: '/settings' },
				],
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

		// Admin OS uses deep path-based routing — use prefix matching so drill-down
		// pages (e.g. /admin/organizations/clubId) keep the parent link highlighted.
		if (pathname.startsWith('/admin') && u.pathname.startsWith('/admin')) {
			return pathname === u.pathname || pathname.startsWith(u.pathname + '/');
		}

		// Coach OS: Clean path-based routing
		if (pathname.startsWith('/coach') && u.pathname.startsWith('/coach')) {
			if (item.href === '/coach') {
				// Only highlight the main dashboard button if we are exactly on the root /coach
				return pathname === '/coach' || pathname === '/coach/' || pathname === '/coach/dashboard';
			}
			// For sub-pages (trial-builder, drills, tactical), highlight if the URL starts with that path
			return pathname.startsWith(item.href);
		}
		
		if (u.pathname !== pathname) return false;
		const curTab = searchParams.get('tab') || '';
		const wantTab = u.searchParams.get('tab');
		if (pathname === '/director') {
			const cur = curTab || 'home';
			const want = wantTab || 'home';
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
