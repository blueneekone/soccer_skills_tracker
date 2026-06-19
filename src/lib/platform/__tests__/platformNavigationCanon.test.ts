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
const MOBILE_TAB_BAR = join(ROOT, 'lib/components/shell/MobileTabBar.svelte');
const PLAYER_SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const ENTERPRISE_SHELL = join(ROOT, 'lib/components/shell/EnterpriseConsoleShell.svelte');
const PLAYER_PRIMARY_NAV = join(ROOT, 'lib/player/shell/playerPrimaryNav.ts');
const WORKSPACE_NAV = join(ROOT, 'lib/shell/workspaceNav.js');
const PLAYER_SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const ENTERPRISE_CONSOLE_CSS = join(ROOT, 'lib/styles/enterprise-console.css');

const STAFF_ADMIN_ROLES = [
	'coach',
	'director',
	'admin',
	'global_admin',
	'super_admin',
	'registrar',
	'recruiter',
];

const PLAYER_FIELD_LABELS = ['HQ', 'Train', 'Stats'];
const COACH_FIELD_LABELS = ['Daily Intel', 'The Forge', 'Messages'];

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

	it('canon exists with two-axis contract, Option A, and 1024px breakpoints', () => {
		expect(canonSrc.length).toBeGreaterThan(500);
		expect(canonSrc).toContain('## §3 Two-axis contract');
		expect(canonSrc).toContain('Chrome grammar');
		expect(canonSrc).toContain('Skin grammar');
		expect(canonSrc).toMatch(/Option A/i);
		expect(canonSrc).toContain('--shell-field-max');
		expect(canonSrc).toContain('1023.98px');
		expect(canonSrc).toContain('--shell-desktop-min');
		expect(canonSrc).toContain('1024px');
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

	it('MobileTabBar is hidden at desktop breakpoint (≥1024px)', () => {
		const tabBar = readFileSync(MOBILE_TAB_BAR, 'utf-8');
		expect(tabBar).toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)/);
		expect(tabBar).toMatch(/display:\s*none/);
	});

	it('registry Player Tier 1 nav routes match canon primary tabs', () => {
		const registrySrc = readFileSync(REGISTRY, 'utf-8');
		const tier1Routes = parsePlayerTier1NavRoutes(registrySrc);
		expect(tier1Routes).toEqual(['/player/dashboard', '/player/workout', '/stats']);
		expect(canonSrc).toMatch(/HQ · Train · Stats/);
		expect(canonSrc).toContain('registry §2');
	});
});

describe('NAV-IMPL implementation guards', () => {
	const playerShell = readFileSync(PLAYER_SHELL, 'utf-8');
	const playerNav = readFileSync(PLAYER_PRIMARY_NAV, 'utf-8');
	const enterprise = readFileSync(ENTERPRISE_SHELL, 'utf-8');
	const mobileTabBar = readFileSync(MOBILE_TAB_BAR, 'utf-8');
	const playerShellCss = readFileSync(PLAYER_SHELL_CSS, 'utf-8');
	const workspaceNav = readFileSync(WORKSPACE_NAV, 'utf-8');

	it('PlayerShell uses playerPrimaryNav — max 3 primary field tabs + More', () => {
		expect(playerShell).toContain('playerPrimaryNav');
		expect(playerShell).not.toMatch(/const NAV_LINKS/);
		expect(playerShell).toMatch(/ps-field-bar/);
		expect(playerShell).toMatch(/ps-more-sheet/);
		const primaryCount = [...playerNav.matchAll(/playerPrimaryFieldNav[^[]*\[[\s\S]*?\];/g)][0]?.[0].match(
			/href:/g,
		)?.length;
		expect(primaryCount).toBe(3);
	});

	it('playerPrimaryNav overflow includes settings and messages', () => {
		expect(playerNav).toMatch(/href:\s*['"]\/player\/settings['"]/);
		expect(playerNav).toMatch(/href:\s*['"]\/messages['"]/);
	});

	it('Player shell rail breakpoint is 1024px (not 768px)', () => {
		expect(playerShellCss).toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)/);
		expect(playerShellCss).not.toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
	});

	it('EnterpriseConsoleShell splits primary tabs from overflow drawer on field', () => {
		expect(enterprise).toMatch(/getPrimaryFieldNavLinks/);
		expect(enterprise).toMatch(/getOverflowFieldNavLinks/);
		expect(enterprise).toMatch(/drawerLinks/);
		expect(enterprise).toMatch(/primaryFieldLinks/);
	});

	it('recruiter and parent receive field chrome', () => {
		expect(enterprise).toMatch(/FIELD_CHROME_ROLES/);
		expect(enterprise).toContain("'recruiter'");
		expect(enterprise).toContain("'parent'");
	});

	it('MobileTabBar enterprise variant — no player-shell.css cross-import', () => {
		expect(mobileTabBar).toMatch(/mobile-tab-bar--enterprise/);
		expect(mobileTabBar).not.toMatch(/player-shell\.css/);
		expect(enterprise).toMatch(/variant="enterprise"/);
		expect(mobileTabBar).not.toMatch(/enterprise-console\.css/);
	});

	it('coach primary field labels differ from player labels', () => {
		for (const label of PLAYER_FIELD_LABELS) {
			expect(workspaceNav).toContain(`label: '${label === 'Stats' ? 'Stats' : label}'`);
		}
		for (const label of COACH_FIELD_LABELS) {
			expect(workspaceNav).toContain(label);
		}
		expect(COACH_FIELD_LABELS).not.toContain('HQ');
		expect(COACH_FIELD_LABELS).not.toContain('Train');
	});

	it('workspaceNav exports field nav split helpers', () => {
		expect(workspaceNav).toContain('export function getPrimaryFieldNavLinks');
		expect(workspaceNav).toContain('export function getOverflowFieldNavLinks');
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
