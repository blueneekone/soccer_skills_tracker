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
	{ label: 'Overview',        icon: 'data.chart-line',   href: '/admin/overview' },
	{ label: 'Organizations',   icon: 'org.building',      href: '/admin/organizations' },
	{ label: 'Global Users',    icon: 'content.globe',     href: '/admin/users' },
	{ label: 'Recruiters',      icon: 'sys.binoculars',    href: '/admin/recruiters' },
	{ label: 'Audit Log',       icon: 'status.shield-check', href: '/admin/audit-log' },
	{ label: 'Coach clearance', icon: 'status.verified',   href: '/admin/coach-clearance' },
	{ label: 'System Settings', icon: 'sys.settings-adv',  href: '/admin/system-settings' },
];

/** @type {ShellNavItem[]} */
const directorLinks = [
	{ tab: 'home',       label: 'Overview',          icon: 'nav.home',           href: '/director?tab=home' },
	{ tab: 'teams',      label: 'Roster & Teams',    icon: 'user.group',         href: '/director?tab=teams' },
	{ tab: 'field',      label: 'Field Ops',         icon: 'sys.map-pin',        href: '/director?tab=field' },
	{ tab: 'registrars', label: 'Registrars',        icon: 'nav.swap',           href: '/director?tab=registrars' },
	{ tab: 'brand',      label: 'Club Branding',     icon: 'sys.palette',        href: '/director?tab=brand' },
	{ tab: 'playbook',   label: 'Playbook',          icon: 'data.target',        href: '/director?tab=playbook' },
	{ tab: 'licenses',   label: 'Licenses & Seats',  icon: 'sys.credit-card',   href: '/director?tab=licenses' },
	{ tab: 'compliance', label: 'Player passports',  icon: 'status.shield-check',href: '/director?tab=compliance' },
	{ label: 'Staff clearance', icon: 'status.verified',   href: '/director/compliance' },
	{ tab: 'household',  label: 'Households & COPPA',icon: 'nav.home',           href: '/director?tab=household' },
];

/** @type {ShellNavItem[]} */
const coachLinks = [
	{ label: 'Daily Intel',       href: '/coach',               icon: 'content.grid' },
	{ label: 'The Forge',         href: '/coach/forge',         icon: 'game.dumbbell' },
	{ label: 'Match Day',         href: '/coach/match-day',     icon: 'data.activity' },
	{ label: 'Proving Grounds',   href: '/coach/scouting',      icon: 'data.target' },
	{ label: 'Logistics & Comms', href: '/coach/logistics',     icon: 'sys.calendar' },
];

/**
 * Player OS — labels match PlayerShell (HQ / Train / Stats / Settings).
 * Primary player routes use PlayerShell; these links cover enterprise-shell edge cases.
 * @type {ShellNavItem[]}
 */
const athleteHouseholdLinks = [
	{ tab: '', label: 'HQ',     icon: 'content.grid',       href: '/player/dashboard' },
	{ tab: '', label: 'Train',  icon: 'content.checks',   href: '/player/workout' },
	{ tab: '', label: 'Stats',  icon: 'data.chart-bar-2',   href: '/stats' },
	{ tab: '', label: 'Settings', icon: 'sys.settings',   href: '/player/settings' },
];

/** @type {ShellNavItem[]} */
const parentLinks = [
	{ tab: '', label: 'Clearance',     icon: 'status.shield-check', href: '/parent/household' },
	{ tab: '', label: 'Co-op Command', icon: 'content.grid',        href: '/parent/dashboard' },
	{ tab: '', label: 'Household',     icon: 'nav.home',            href: '/parent/vpc' },
	{ tab: '', label: 'Log Workout', icon: 'user.check',           href: '/parent/log-workout' },
	{ tab: '', label: 'Payments',    icon: 'sys.credit-card',      href: '/parent/payments' },
	{ tab: '', label: 'Messages',    icon: 'comm.chat',            href: '/messages' },
];

/** @type {ShellNavItem[]} */
const recruiterLinks = [
	{ tab: '', label: 'Recruiter Search', icon: 'action.search', href: '/recruiter' },
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
				{ tab: '', label: 'Home', icon: 'nav.home', href: '/' },
				{ tab: '', label: 'Settings', icon: 'sys.settings', href: '/settings' },
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

		// Coach OS: path prefix matching — hub `/coach` only when not inside a deeper pillar.
		if (pathname.startsWith('/coach') && u.pathname.startsWith('/coach')) {
			const norm = (/** @type {string} */ s) => s.replace(/\/$/, '') || '/';
			const pathNorm = norm(pathname.split('?')[0] || '');
			const hrefNorm = norm(u.pathname);

			if (hrefNorm === '/coach') {
				return (
					pathNorm === '/coach' ||
					pathNorm === '/coach/dashboard'
				);
			}
			return pathNorm === hrefNorm || pathNorm.startsWith(`${hrefNorm}/`);
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
