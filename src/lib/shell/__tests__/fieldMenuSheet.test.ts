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
			['enterprise', enterprise, 'class="ec-root"', '{#if showMobileChrome}'],
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
		expect(pinBar).toMatch(/mobile-pin-bar__slot--menu[\s\S]*onclick=\{onMenuOpen\}/);
		expect(pinBar).toContain('stopPropagation');
	});

	it('AppMenuSheet has no desk-only display:none (field-only mount)', () => {
		expect(menuSheet).not.toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)[\s\S]*display:\s*none/);
	});
});
