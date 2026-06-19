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
const WORKSPACE_NAV = join(ROOT, 'lib/shell/workspaceNav.js');

const STAFF_ADMIN_ROLES = [
	'coach',
	'director',
	'admin',
	'global_admin',
	'super_admin',
	'registrar',
	'recruiter',
];

/** Count href entries in PlayerShell NAV_LINKS array */
function parsePlayerShellNavLinkCount(src: string): number {
	const block = src.match(/const NAV_LINKS[^=]*=\s*\[([\s\S]*?)\];/);
	expect(block).toBeTruthy();
	return [...block![1].matchAll(/href:\s*['"`]/g)].length;
}

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

describe('NAV-IMPL debt (expected fail until implementation slice)', () => {
	it.fails('PlayerShell NAV_LINKS capped at 4 primary field tabs (+ More)', () => {
		const playerShell = readFileSync(PLAYER_SHELL, 'utf-8');
		const count = parsePlayerShellNavLinkCount(playerShell);
		expect(count, 'NAV-IMPL: split to playerPrimaryNav.ts — max 4 primary + More sheet').toBeLessThanOrEqual(
			4,
		);
	});

	it.fails('EnterpriseConsoleShell overflow drawer excludes primary tab href duplicates', () => {
		const enterprise = readFileSync(ENTERPRISE_SHELL, 'utf-8');
		// Canon §1: sidebar drawer on field must not list same hrefs as MobileTabBar primary tabs.
		// Current impl passes full `links` to both sidebar {#each} and MobileTabBar (first 5).
		expect(
			enterprise,
			'NAV-IMPL: filter sidebar drawer links to exclude MobileTabBar primary hrefs on field',
		).toMatch(/overflowLinks|primaryTabLinks|fieldDrawerLinks|excludePrimary/i);
	});

	it.fails('recruiter role receives staff field chrome (MobileTabBar)', () => {
		const enterprise = readFileSync(ENTERPRISE_SHELL, 'utf-8');
		const rolesBlock = enterprise.match(/MANAGEMENT_ROLES\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
		expect(rolesBlock).toBeTruthy();
		expect(rolesBlock![1], 'NAV-IMPL: add recruiter to MANAGEMENT_ROLES for field chrome').toContain(
			'recruiter',
		);
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
