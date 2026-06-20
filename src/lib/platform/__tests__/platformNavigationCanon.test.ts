import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const VISION = join(ROOT, '..', 'docs/vision');
const NAV_CANON = join(VISION, 'PLATFORM_NAVIGATION_CANON.md');
const DESIGN_SYSTEM = join(VISION, 'PLATFORM_DESIGN_SYSTEM.md');
const REGISTRY = join(VISION, 'PRODUCT_SURFACE_REGISTRY.md');
const AGENT_WORKFLOW = join(ROOT, '..', '.cursor/rules/sst-agent-workflow.mdc');
const MOBILE_PIN_BAR = join(ROOT, 'lib/components/shell/MobilePinBar.svelte');
const APP_MENU_SHEET = join(ROOT, 'lib/components/shell/AppMenuSheet.svelte');
const NAV_PIN_CATALOG = join(ROOT, 'lib/shell/navPinCatalog.ts');
const PLAYER_SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const ENTERPRISE_SHELL = join(ROOT, 'lib/components/shell/EnterpriseConsoleShell.svelte');
const PLAYER_PRIMARY_NAV = join(ROOT, 'lib/player/shell/playerPrimaryNav.ts');
const WORKSPACE_NAV = join(ROOT, 'lib/shell/workspaceNav.js');
const PLAYER_SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const ENTERPRISE_CONSOLE_CSS = join(ROOT, 'lib/styles/enterprise-console.css');
const OFFLINE_BANNER = join(ROOT, 'lib/components/shell/OfflineBanner.svelte');
const REPORT_ANOMALY = join(ROOT, 'lib/components/alpha/ReportAnomaly.svelte');
const OFFLINE_SYNC = join(ROOT, 'lib/services/offlineSync.svelte.ts');
const FIELD_MENU_SWIPE = join(ROOT, 'lib/shell/fieldMenuSwipe.ts');
const FIELD_QUICK_ACTIONS = join(ROOT, 'lib/shell/fieldQuickActions.ts');
const PARENT_LAYOUT = join(ROOT, 'routes/(app)/parent/+layout.svelte');
const PARENT_LOUNGE_SHELL_CSS = join(ROOT, 'lib/styles/parent-lounge-shell.css');

const STAFF_ADMIN_ROLES = [
	'coach',
	'director',
	'admin',
	'global_admin',
	'super_admin',
	'registrar',
	'recruiter',
];

/** Parse registry §1 player Tier 1 nav_visible routes */
function parsePlayerTier1NavRoutes(registrySrc: string): string[] {
	const section = registrySrc.split('## §1 Master table')[1]?.split('## §2')[0] ?? '';
	return section
		.split('\n')
		.filter((line) => line.startsWith('| PS-PL'))
		.map((line) => {
			const cols = line
				.split('|')
				.map((c) => c.trim())
				.filter(Boolean);
			return { route: cols[2].replace(/^`|`$/g, ''), tier: Number(cols[4]), navVisible: cols[5] === 'true' };
		})
		.filter((r) => r.tier === 1 && r.navVisible)
		.map((r) => r.route);
}

describe('PLATFORM_NAVIGATION_CANON gospel guards', () => {
	const canonSrc = readFileSync(NAV_CANON, 'utf-8');

	it('canon exists with two-axis contract, Option D, and 1024px breakpoints', () => {
		expect(canonSrc.length).toBeGreaterThan(500);
		expect(canonSrc).toContain('## §3 Two-axis contract');
		expect(canonSrc).toContain('Chrome grammar');
		expect(canonSrc).toContain('Skin grammar');
		expect(canonSrc).toMatch(/Option D/i);
		expect(canonSrc).not.toMatch(/Option A bottom tab/i);
		expect(canonSrc).toContain('--shell-field-max');
		expect(canonSrc).toContain('1023.98px');
		expect(canonSrc).toContain('--shell-desktop-min');
		expect(canonSrc).toContain('1024px');
		expect(canonSrc).toContain('AppMenuSheet');
		expect(canonSrc).toContain('navPinCatalog');
	});

	it('staff-admin bucket includes recruiter and all canonical roles', () => {
		expect(canonSrc).toContain('Staff admin bucket');
		expect(canonSrc).toMatch(/\*\*`recruiter`\*\*/);
		for (const role of STAFF_ADMIN_ROLES) {
			expect(canonSrc, `missing staff role ${role}`).toContain(role);
		}
	});

	it('design system and agent workflow reference navigation canon', () => {
		const design = readFileSync(DESIGN_SYSTEM, 'utf-8');
		const workflow = readFileSync(AGENT_WORKFLOW, 'utf-8');
		expect(design).toContain('PLATFORM_NAVIGATION_CANON.md');
		expect(workflow).toContain('PLATFORM_NAVIGATION_CANON.md');
	});

	it('MobilePinBar is hidden at desktop breakpoint (≥1024px)', () => {
		const pinBar = readFileSync(MOBILE_PIN_BAR, 'utf-8');
		expect(pinBar).toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)/);
		expect(pinBar).toMatch(/display:\s*none/);
	});

	it('registry Player Tier 1 nav routes match canon default pins', () => {
		const registrySrc = readFileSync(REGISTRY, 'utf-8');
		const tier1Routes = parsePlayerTier1NavRoutes(registrySrc);
		expect(tier1Routes).toEqual(['/player/dashboard', '/player/workout', '/stats']);
		expect(canonSrc).toMatch(/HQ · Train · Stats/);
		expect(canonSrc).toContain('registry §2');
	});
});

describe('NAV-OPTION-D implementation guards', () => {
	const playerShell = readFileSync(PLAYER_SHELL, 'utf-8');
	const playerNav = readFileSync(PLAYER_PRIMARY_NAV, 'utf-8');
	const enterprise = readFileSync(ENTERPRISE_SHELL, 'utf-8');
	const pinBar = readFileSync(MOBILE_PIN_BAR, 'utf-8');
	const menuSheet = readFileSync(APP_MENU_SHEET, 'utf-8');
	const navCatalog = readFileSync(NAV_PIN_CATALOG, 'utf-8');
	const playerShellCss = readFileSync(PLAYER_SHELL_CSS, 'utf-8');
	const enterpriseCss = readFileSync(ENTERPRISE_CONSOLE_CSS, 'utf-8');
	const workspaceNav = readFileSync(WORKSPACE_NAV, 'utf-8');

	it('navPinCatalog exports persona catalogs and default pins', () => {
		expect(navCatalog).toContain('export function getNavCatalog');
		expect(navCatalog).toContain('export function getDefaultPins');
		expect(navCatalog).toContain('export function isHrefAllowedForPersona');
	});

	it('PlayerShell uses MobilePinBar + AppMenuSheet on field', () => {
		expect(playerShell).toContain('MobilePinBar');
		expect(playerShell).toContain('AppMenuSheet');
		expect(playerShell).toContain('navPinsStore');
		expect(playerShell).not.toMatch(/ps-field-bar/);
		expect(playerShell).not.toMatch(/ps-more-sheet/);
	});

	it('playerPrimaryNav overflow includes settings and messages', () => {
		expect(playerNav).toMatch(/href:\s*['"]\/player\/settings['"]/);
		expect(playerNav).toMatch(/href:\s*['"]\/messages['"]/);
	});

	it('Player shell rail breakpoint is 1024px (not 768px)', () => {
		expect(playerShellCss).toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)/);
		expect(playerShellCss).not.toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
	});

	it('EnterpriseConsoleShell uses MobilePinBar + AppMenuSheet — no mobile header chrome', () => {
		expect(enterprise).toContain('MobilePinBar');
		expect(enterprise).toContain('AppMenuSheet');
		expect(enterprise).toContain('navPinsStore');
		expect(enterprise).not.toContain('MobileTabBar');
		expect(enterprise).not.toMatch(/ec-mobile-header__hamburger/);
		expect(enterprise).not.toMatch(/mobileNavOpen/);
	});

	it('field mode hides ec-mobile-header and mobile sidebar in CSS', () => {
		expect(enterpriseCss).toMatch(/\.ec-mobile-header\s*\{[^}]*display:\s*none\s*!important/s);
		expect(enterpriseCss).toMatch(/max-width:\s*1023\.98px[\s\S]*\.ec-sidebar\s*\{[^}]*display:\s*none\s*!important/s);
		expect(enterpriseCss).not.toMatch(/padding-top:\s*calc\(56px/);
	});

	it('recruiter and parent receive field chrome', () => {
		expect(enterprise).toMatch(/FIELD_CHROME_ROLES/);
		expect(enterprise).toContain("'recruiter'");
		expect(enterprise).toContain("'parent'");
	});

	it('MobilePinBar enterprise variant — no player-shell.css cross-import', () => {
		expect(pinBar).toMatch(/mobile-pin-bar--enterprise/);
		expect(pinBar).not.toMatch(/player-shell\.css/);
		expect(enterprise).toMatch(/variant=\{pinBarSkin\}/);
	});

	it('AppMenuSheet supports browse and pick-pin modes', () => {
		expect(menuSheet).toMatch(/pick-pin/);
		expect(menuSheet).toContain('Reset to');
	});

	it('coach catalog source excludes tactical war room in navPinCatalog', () => {
		expect(navCatalog).toContain('/coach/tactical');
		expect(navCatalog).toMatch(/tactical/);
	});

	it('workspaceNav still exports desk sidebar link arrays', () => {
		expect(workspaceNav).toContain('export const coachLinks');
		expect(workspaceNav).toContain('export function getWorkspaceNav');
	});
});

describe('NAV-OPTION-D-POLISH guards', () => {
	const playerShell = readFileSync(PLAYER_SHELL, 'utf-8');
	const enterprise = readFileSync(ENTERPRISE_SHELL, 'utf-8');
	const pinBar = readFileSync(MOBILE_PIN_BAR, 'utf-8');
	const menuSheet = readFileSync(APP_MENU_SHEET, 'utf-8');
	const offlineBanner = readFileSync(OFFLINE_BANNER, 'utf-8');
	const reportAnomaly = readFileSync(REPORT_ANOMALY, 'utf-8');
	const offlineSync = readFileSync(OFFLINE_SYNC, 'utf-8');
	const fieldMenuSwipe = readFileSync(FIELD_MENU_SWIPE, 'utf-8');
	const fieldQuickActions = readFileSync(FIELD_QUICK_ACTIONS, 'utf-8');
	const canonSrc = readFileSync(NAV_CANON, 'utf-8');

	it('canon documents field polish — no floating alpha, no cmd trigger on field', () => {
		expect(canonSrc).toContain('NAV-OPTION-D-POLISH');
		expect(canonSrc).toMatch(/No.*floating.*ReportAnomaly/i);
		expect(canonSrc).toMatch(/ec-cmd-trigger.*field|No.*ec-cmd-trigger/i);
		expect(canonSrc).toContain('fieldMenuSwipe');
	});

	it('MobilePinBar showMenuSlot is optional (default off)', () => {
		expect(pinBar).toContain('showMenuSlot');
		expect(pinBar).toMatch(/showMenuSlot\s*=\s*false/);
		expect(pinBar).not.toContain('onSwipeUp');
	});

	it('shell roots wire bottom-edge swipe on shell-outer (not ec-root / ps-root)', () => {
		expect(playerShell).toContain('ps-shell-outer');
		expect(playerShell).toMatch(/ps-shell-outer[\s\S]*fieldMenuSwipe/);
		expect(playerShell).not.toMatch(/class="ps-root[\s\S]*ontouchstart=\{fieldMenuSwipe/);
		expect(enterprise).toContain('ec-shell-outer');
		expect(enterprise).toMatch(/ec-shell-outer[\s\S]*fieldMenuSwipe/);
		expect(enterprise).not.toMatch(/class="ec-root"[\s\S]*ontouchstart=\{fieldMenuSwipe/);
		expect(fieldMenuSwipe).toContain("closest('.mobile-pin-bar')");
	});

	it('shells pass showMenuSlot on field', () => {
		expect(playerShell).toContain('showMenuSlot={true}');
		expect(enterprise).toContain('showMenuSlot={true}');
	});

	it('MobilePinBar + AppMenuSheet are siblings outside ec-root / ps-root (portal field chrome)', () => {
		const mobilePinInEnterprise = enterprise.indexOf('<MobilePinBar');
		expect(mobilePinInEnterprise).toBeGreaterThan(enterprise.indexOf('class="ec-root"'));
		expect(enterprise.slice(enterprise.indexOf('class="ec-root"'), mobilePinInEnterprise)).not.toContain(
			'<MobilePinBar',
		);
		expect(enterprise).toMatch(/\{#if showFieldChrome\}[\s\S]*<MobilePinBar/);

		const psRootOpen = playerShell.indexOf('class="ps-root');
		const mobilePinInPlayer = playerShell.indexOf('<MobilePinBar');
		expect(mobilePinInPlayer).toBeGreaterThan(psRootOpen);
		expect(playerShell.slice(psRootOpen, mobilePinInPlayer)).not.toContain('<MobilePinBar');
		expect(playerShell).toMatch(/\{#if !isDesktop\}[\s\S]*<MobilePinBar/);
	});

	it('parent layout has no duplicate z4 top nav — desk sidebar + field pin bar only', () => {
		const parentLayout = readFileSync(PARENT_LAYOUT, 'utf-8');
		expect(parentLayout).not.toContain('parent-lounge-z4-nav');
		expect(parentLayout).toContain('parent-lounge-z1-well');
		const parentShellCss = readFileSync(PARENT_LOUNGE_SHELL_CSS, 'utf-8');
		expect(parentShellCss).not.toContain('.parent-lounge-z4-nav');
		expect(parentShellCss).toMatch(
			/max-width:\s*1023\.98px[\s\S]*padding-bottom:\s*calc\(56px \+ env\(safe-area-inset-bottom/,
		);
		expect(canonSrc).toMatch(/Parent.*desk.*sidebar/i);
		expect(canonSrc).toMatch(/Option D/i);
	});

	it('enterprise field removes MobileDirectorFab and desk-only cmd trigger', () => {
		expect(enterprise).not.toContain('MobileDirectorFab');
		expect(enterprise).toMatch(/\{#if isDesktop\}[\s\S]*ec-cmd-trigger/);
		expect(enterprise).toMatch(/if \(!isDesktop\) return/);
	});

	it('AppMenuSheet accepts quick actions for former FAB routes', () => {
		expect(menuSheet).toContain('quickActions');
		expect(enterprise).toContain('fieldQuickActions');
		expect(fieldQuickActions).toContain('getFieldQuickActions');
	});

	it('MobilePinBar Menu slot wires onclick to onMenuOpen', () => {
		expect(pinBar).toContain('showMenuSlot');
		expect(pinBar).toMatch(
			/mobile-pin-bar__slot--menu[\s\S]*stopPropagation[\s\S]*onMenuOpen/,
		);
	});

	it('ReportAnomaly trigger hidden on field viewports', () => {
		expect(reportAnomaly).toMatch(/max-width:\s*1023\.98px[\s\S]*\.ra-trigger[\s\S]*display:\s*none/);
	});

	it('OfflineBanner field position above pin bar + sync timeout cap', () => {
		expect(offlineBanner).toMatch(/max-width:\s*1023\.98px[\s\S]*calc\(56px \+ env\(safe-area-inset-bottom/);
		expect(offlineBanner).toMatch(/max-width:\s*1023\.98px[\s\S]*z-index:\s*940/);
		expect(offlineSync).toContain('SYNC_FLUSH_TIMEOUT_MS');
		expect(offlineSync).toMatch(/SYNC_FLUSH_TIMEOUT_MS\s*=\s*10_000/);
		expect(fieldMenuSwipe).toContain('FIELD_MENU_EDGE_ZONE_PX');
	});

	it('FIELD-CHROME-HOTFIX-4 — field chrome + collapse decoupled from isDesktop', () => {
		expect(enterprise).toMatch(/const showFieldChrome = \$derived\(FIELD_CHROME_ROLES\.has/);
		expect(enterprise).not.toMatch(/showMobileChrome/);
		expect(enterprise).not.toMatch(
			/sidebarCollapsedDesktop = \$derived\(!workspaceContextStore\.isSidebarOpen && isDesktop\)/,
		);
		expect(enterprise).toMatch(
			/class:ec-sidebar--collapsed-desktop=\{!workspaceContextStore\.isSidebarOpen\}/,
		);
		expect(menuSheet).toMatch(/\{#if open\}[\s\S]*use:portal/);
	});

	it('FIELD-CHROME-HOTFIX-3 — desk sidebar links not gated by isDesktop', () => {
		expect(enterprise).toMatch(/const drawerLinks = \$derived\(links\)/);
		expect(enterprise).not.toMatch(/drawerLinks = \$derived\(isDesktop \? links/);
	});

	it('FIELD-CHROME-HOTFIX-3 — OfflineBanner offline-only (no syncing pill)', () => {
		expect(offlineBanner).toMatch(/!syncStatus\.isOnline \? 'offline' : 'hidden'/);
		expect(offlineBanner).not.toContain('Syncing pending changes');
		expect(offlineBanner).not.toMatch(/ob-root--syncing/);
		expect(offlineSync).toContain('_flushInFlight');
	});
});

describe('workspaceNav alignment with canon staff bucket', () => {
	const navSrc = readFileSync(WORKSPACE_NAV, 'utf-8');

	it('workspaceNav handles recruiter context', () => {
		expect(navSrc).toContain("case 'recruiter'");
		expect(navSrc).toContain('recruiterLinks');
	});

	it('workspaceNav allowed contexts include staff-admin roles', () => {
		for (const role of ['admin', 'director', 'coach', 'registrar', 'recruiter']) {
			expect(navSrc, `missing workspace context ${role}`).toContain(`'${role}'`);
		}
	});
});
