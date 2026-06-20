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

	it('AppMenuSheet is not nested inside ec-root or ps-root', () => {
		for (const [label, src, rootMarker, chromeGuard] of [
			['enterprise', enterprise, 'class="ec-root"', '{#if showFieldChrome}'],
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

	it('Menu button wires onMenuOpen and pin bar stops event propagation', () => {
		expect(pinBar).toMatch(
			/mobile-pin-bar__slot--menu[\s\S]*stopPropagation[\s\S]*onMenuOpen/,
		);
		expect(pinBar).toContain('stopPropagation');
	});

	it('AppMenuSheet portals open state via use:portal', () => {
		expect(menuSheet).toContain("import { portal } from '$lib/actions/portal.js'");
		expect(menuSheet).toMatch(/\{#if open\}[\s\S]*use:portal/);
		expect(menuSheet).toMatch(/use:portal[\s\S]*app-menu-backdrop/);
		expect(menuSheet).toMatch(/z-index:\s*9998/);
		expect(menuSheet).toMatch(/z-index:\s*9999/);
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

	it('AppMenuSheet has no desk-only display:none (field-only mount)', () => {
		expect(menuSheet).not.toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)[\s\S]*display:\s*none/);
	});
});
