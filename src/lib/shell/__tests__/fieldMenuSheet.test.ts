import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

describe('field menu sheet portal guards', () => {
	const enterprise = readFileSync(
		join(ROOT, 'lib/components/shell/EnterpriseConsoleShell.svelte'),
		'utf-8',
	);
	const playerShell = readFileSync(join(ROOT, 'lib/components/shell/PlayerShell.svelte'), 'utf-8');
	const menuSheet = readFileSync(join(ROOT, 'lib/components/shell/AppMenuSheet.svelte'), 'utf-8');
	const pinBar = readFileSync(join(ROOT, 'lib/components/shell/MobilePinBar.svelte'), 'utf-8');
	const fieldMenuStore = readFileSync(join(ROOT, 'lib/stores/fieldMenu.svelte.ts'), 'utf-8');

	it('AppMenuSheet is not nested inside ec-root or ps-root', () => {
		for (const [label, src, rootMarker, chromeGuard] of [
			['enterprise', enterprise, 'class="ec-root', '{#if showFieldChrome}'],
			['player', playerShell, 'class="ps-root', '{#if !isDesktop}'],
		] as const) {
			const rootIdx = src.indexOf(rootMarker);
			const chromeIdx = src.indexOf(chromeGuard);
			const sheetIdx = src.indexOf('<AppMenuSheet');
			expect(rootIdx, `${label} missing root`).toBeGreaterThanOrEqual(0);
			expect(chromeIdx, `${label} missing chrome guard`).toBeGreaterThanOrEqual(0);
			expect(sheetIdx, `${label} missing AppMenuSheet`).toBeGreaterThanOrEqual(0);
			expect(src.slice(rootIdx, sheetIdx), `${label} sheet inside root`).not.toContain('<AppMenuSheet');
		}
	});

	it('fieldMenu store exposes browse/pick-pin open helpers', () => {
		expect(fieldMenuStore).toContain('export const fieldMenu');
		expect(fieldMenuStore).toContain('openBrowse()');
		expect(fieldMenuStore).toContain('openPickPin(');
		expect(fieldMenuStore).toContain('close()');
	});

	it('openBrowse/openPickPin set openedAt synchronously before open=true (dismiss guard)', () => {
		expect(fieldMenuStore).toMatch(
			/openBrowse\(\):\s*void\s*\{[\s\S]*?fieldMenuState\.openedAt\s*=\s*Date\.now\(\);[\s\S]*?fieldMenuState\.open\s*=\s*true;/,
		);
		expect(fieldMenuStore).toMatch(
			/openPickPin\([\s\S]*?\):\s*void\s*\{[\s\S]*?fieldMenuState\.openedAt\s*=\s*Date\.now\(\);[\s\S]*?fieldMenuState\.open\s*=\s*true;/,
		);
		expect(fieldMenuStore).toContain('get openedAt()');
		expect(menuSheet).toContain('fieldMenuDismissBlocked()');
		expect(menuSheet).not.toMatch(/\$effect\(\(\)\s*=>\s*\{\s*if\s*\(open\)\s*openedAt/);
	});

	it('shells wire fieldMenuState — no local menuSheetOpen state', () => {
		expect(enterprise).toContain("import { fieldMenu, fieldMenuState } from '$lib/stores/fieldMenu.svelte.js'");
		expect(playerShell).toContain("import { fieldMenu, fieldMenuState } from '$lib/stores/fieldMenu.svelte.js'");
		expect(enterprise).toContain('open={fieldMenuState.open}');
		expect(playerShell).toContain('open={fieldMenuState.open}');
		expect(enterprise).not.toContain('menuSheetOpen');
		expect(playerShell).not.toContain('menuSheetOpen');
	});

	it('MobilePinBar showMenuSlot defaults off; shells show fixed Menu when no menu pin', () => {
		expect(pinBar).toMatch(/showMenuSlot\s*=\s*false/);
		expect(enterprise).toContain('showMenuSlot={showMenuSlot}');
		expect(playerShell).toContain('showMenuSlot={showMenuSlot}');
		expect(enterprise).toContain('MENU_PIN_HREF');
	});

	it('MobilePinBar portals to modal host and sits above dashboard overlays', () => {
		expect(pinBar).toContain("import { portal } from '$lib/actions/portal.js'");
		expect(pinBar).toMatch(/use:portal[\s\S]*mobile-pin-bar/);
		expect(pinBar).toMatch(/z-index:\s*10001/);
	});

	it('Menu pin uses ontouchstart + stopPropagation iOS tap fix', () => {
		expect(pinBar).toContain('ontouchstart={openMenuFromPin}');
		expect(pinBar).toMatch(/openMenuFromPin[\s\S]*stopPropagation/);
		expect(pinBar).toContain('MENU_PIN_HREF');
	});

	it('pin bar does not stopPropagation at nav root (swipe + tap reach handlers)', () => {
		expect(pinBar).not.toMatch(
			/<nav[\s\S]*?aria-label="Main navigation"[\s\S]*?ontouchstart=\{\(e\) => e\.stopPropagation\(\)\}/,
		);
	});

	it('AppMenuSheet portals open state via use:portal', () => {
		expect(menuSheet).toContain("import { portal } from '$lib/actions/portal.js'");
		expect(menuSheet).toMatch(/\{#if open\}[\s\S]*use:portal/);
		expect(menuSheet).toMatch(/use:portal[\s\S]*app-menu-backdrop/);
		expect(menuSheet).toMatch(/z-index:\s*10002/);
		expect(menuSheet).toMatch(/z-index:\s*10003/);
		expect(menuSheet).toContain('dismissSheet');
	});

	it('enterprise sidebar collapse is not gated by isDesktop', () => {
		expect(enterprise).toMatch(
			/class:ec-sidebar--collapsed-desktop=\{!workspaceContextStore\.isSidebarOpen\}/,
		);
		expect(enterprise).not.toMatch(
			/sidebarCollapsedDesktop = \$derived\(!workspaceContextStore\.isSidebarOpen && isDesktop\)/,
		);
		expect(enterprise).toMatch(/const showFieldChrome = \$derived\(FIELD_CHROME_ROLES\.has/);
		expect(enterprise).not.toMatch(/showFieldChrome = \$derived\(\s*!isDesktop/);
	});

	it('AppMenuSheet dismissSheet respects 400ms guard after synchronous openedAt', () => {
		expect(menuSheet).toContain('function dismissSheet()');
		expect(menuSheet).toContain('fieldMenuDismissBlocked()');
		expect(menuSheet).toContain('FIELD_MENU_DISMISS_GUARD_MS');
		expect(menuSheet).toMatch(/app-menu-backdrop--inert/);
		expect(menuSheet).toMatch(/onpointerdown=\{onBackdropPointerDown\}/);
	});

	it('AppMenuSheet swipe-dismiss requires touchstart on sheet (pin-bar open retarget guard)', () => {
		expect(menuSheet).toContain('sheetTouchEngaged');
		expect(menuSheet).toMatch(/onSheetTouchStart[\s\S]*sheetTouchEngaged\s*=\s*true/);
		expect(menuSheet).toMatch(/onSheetTouchEnd[\s\S]*if\s*\(!sheetTouchEngaged\)\s*return/);
		expect(menuSheet).toContain('ontouchcancel={onSheetTouchCancel}');
	});

	it('AppMenuSheet has no desk-only display:none (field-only mount)', () => {
		expect(menuSheet).not.toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)[\s\S]*display:\s*none/);
	});

	it('signOut closes field menu before navigation (signOutFlow + AppMenuSheet)', () => {
		const signOutFlow = readFileSync(join(ROOT, 'lib/auth/signOutFlow.js'), 'utf-8');
		expect(signOutFlow).toMatch(/fieldMenu\.close\(\)/);
		expect(signOutFlow).toMatch(/fieldMenu\.close\(\)[\s\S]*goto\(loginPath/);
		expect(menuSheet).toMatch(/async function disconnect\(\)[\s\S]*fieldMenu\.close\(\)/);
	});

	it('browse mode exposes Pin to bar / Unpin wired to navPinsStore', () => {
		expect(menuSheet).toContain('navPinsStore');
		expect(menuSheet).toMatch(/Pin to bar/);
		expect(menuSheet).toMatch(/Unpin/);
		expect(menuSheet).toMatch(/navPinsStore\.setPin/);
	});
});
