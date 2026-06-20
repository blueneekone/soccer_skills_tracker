import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

const HOUSEHOLD_PAGE = join(ROOT, 'routes/(app)/parent/household/+page.svelte');
const DASHBOARD_PAGE = join(ROOT, 'routes/(app)/parent/dashboard/+page.svelte');
const VPC_PAGE = join(ROOT, 'routes/(app)/parent/vpc/+page.svelte');
const LOAD_CLEARANCE = join(ROOT, 'lib/parent/loadHouseholdClearance.ts');
const FIELD_MENU = join(ROOT, 'lib/stores/fieldMenu.svelte.ts');
const ENTERPRISE_SHELL = join(ROOT, 'lib/components/shell/EnterpriseConsoleShell.svelte');
const PIN_BAR = join(ROOT, 'lib/components/shell/MobilePinBar.svelte');
const NAV_CATALOG = join(ROOT, 'lib/shell/navPinCatalog.ts');

/** Parent Tier-1 routes that must expose Option D field chrome + working Menu path. */
const PARENT_TIER1_ROUTES = ['/parent/household', '/parent/vpc', '/parent/dashboard'] as const;

describe('parent Tier-1 nav + workflow integration guards', () => {
	const catalog = readFileSync(NAV_CATALOG, 'utf-8');
	const shell = readFileSync(ENTERPRISE_SHELL, 'utf-8');
	const pinBar = readFileSync(PIN_BAR, 'utf-8');
	const fieldMenu = readFileSync(FIELD_MENU, 'utf-8');
	const loadClearance = readFileSync(LOAD_CLEARANCE, 'utf-8');
	const householdPage = readFileSync(HOUSEHOLD_PAGE, 'utf-8');

	it('navPinCatalog parent defaults cover Tier-1 routes + Menu pin in slot 4', () => {
		expect(catalog).toMatch(
			/parent:\s*\[['"]\/parent\/household['"],\s*['"]\/parent\/vpc['"],\s*['"]\/parent\/dashboard['"],\s*MENU_PIN_HREF\]/,
		);
		for (const route of PARENT_TIER1_ROUTES) {
			expect(catalog, `missing parent catalog route ${route}`).toContain(route);
		}
	});

	it('EnterpriseConsoleShell wires Menu pin → fieldMenu.openBrowse (parent uses same shell)', () => {
		expect(shell).toContain("'parent'");
		expect(shell).toContain('FIELD_CHROME_ROLES');
		expect(shell).toContain('onMenuOpen={() => fieldMenu.openBrowse()}');
		expect(shell).toContain('open={fieldMenu.open}');
		expect(shell).toMatch(/pinBarSkin = \$derived\(authStore\.role === 'parent' \? 'parent-trust'/);
	});

	it('MobilePinBar Menu pin uses touch-first open path (QA-NAV-03 / household dashboard fix)', () => {
		expect(pinBar).toContain('MENU_PIN_HREF');
		expect(pinBar).toContain('ontouchstart={openMenuFromPin}');
		expect(pinBar).toMatch(/openMenuFromPin[\s\S]*onMenuOpen\(\)/);
	});

	it('fieldMenu.openBrowse sets openedAt before open=true (anti ghost-dismiss on Tier-1 parent routes)', () => {
		expect(fieldMenu).toMatch(
			/openBrowse\(\):\s*void\s*\{[\s\S]*?openedAt\s*=\s*Date\.now\(\);[\s\S]*?open\s*=\s*true;/,
		);
		expect(fieldMenu).toContain('fieldMenuDismissBlocked');
		expect(fieldMenu).toContain('FIELD_MENU_DISMISS_GUARD_MS');
	});

	it('household clearance uses stable hid derived + generation-guarded loadBusy', () => {
		expect(householdPage).toContain('const clearanceHid = $derived(normalizeHouseholdId');
		expect(householdPage).toContain('const clearanceLoadReady = $derived');
		expect(householdPage).toContain('shouldClearLoadBusy');
		expect(householdPage).toMatch(/fetchHouseholdClearance\(db,\s*hid\)/);
		expect(householdPage).not.toMatch(/fetchHouseholdClearance\(getActiveDb\(\)/);
	});

	it('loadHouseholdClearance module exports generation + timeout guards', () => {
		expect(loadClearance).toContain('shouldClearLoadBusy');
		expect(loadClearance).toContain('HOUSEHOLD_CLEARANCE_TIMEOUT_MS');
		expect(loadClearance).toMatch(/abort[\s\S]*no-op: keep timeout armed/);
	});

	it('parent Tier-1 route files exist under (app)/parent/', () => {
		for (const route of PARENT_TIER1_ROUTES) {
			const slug = route.replace('/parent/', '');
			const path = join(ROOT, `routes/(app)/parent/${slug}/+page.svelte`);
			expect(readFileSync(path, 'utf-8').length, route).toBeGreaterThan(100);
		}
		expect(readFileSync(DASHBOARD_PAGE, 'utf-8')).toContain('parent');
		expect(readFileSync(VPC_PAGE, 'utf-8')).toContain('vpc');
	});
});
