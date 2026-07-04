import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_CSS_PATH = join(__dirname, '../../../../src/app.css');
const LAYOUT_SVELTE_PATH = join(__dirname, '../+layout.svelte');

describe('Triple-Pane SIEM Command Architecture', () => {
	describe('Global CSS Layout Shell (app.css)', () => {
		let cssContent = '';
		try {
			cssContent = readFileSync(APP_CSS_PATH, 'utf-8');
		} catch (err) {
			console.error('Could not read app.css:', err);
		}

		it('must define the .triple-pane-wrapper and .triple-pane-core utilities', () => {
			expect(cssContent).toMatch(/\.triple-pane-wrapper\s*\{/);
			expect(cssContent).toMatch(/\.triple-pane-core\s*\{/);
		});

		it('must define the .global-alert-matrix with proper typography and border', () => {
			expect(cssContent).toMatch(/\.global-alert-matrix\s*\{/);
			expect(cssContent).toMatch(/border-slate-800/);
		});

		it('must contain a 1920px media query ensuring the layout does not squish the core grid', () => {
			expect(cssContent).toMatch(/@media\s*\(\s*min-width:\s*1920px\s*\)/);
			// Ensures minmax(auto, 72rem) is used inside the 1920px block
			expect(cssContent).toMatch(/minmax\(auto,\s*72rem\)/);
		});

		it('must contain 150-250ms motion tokens for .alert-matrix-item', () => {
			expect(cssContent).toMatch(/\.alert-matrix-item[^{]*\{[^}]*var\(--motion-base\)/);
		});
	});

	describe('App Layout (+layout.svelte)', () => {
		let layoutContent = '';
		try {
			layoutContent = readFileSync(LAYOUT_SVELTE_PATH, 'utf-8');
		} catch (err) {
			console.error('Could not read +layout.svelte:', err);
		}

		it('must wrap the shells in triple-pane-wrapper and triple-pane-core', () => {
			expect(layoutContent).toContain('class="triple-pane-wrapper');
			expect(layoutContent).toContain('class="triple-pane-core');
		});

		it('must include the global-alert-matrix telemetry rail alongside the core', () => {
			expect(layoutContent).toMatch(/class="[^"]*global-alert-matrix[^"]*"/);
			expect(layoutContent).toContain('SafeSport');
			expect(layoutContent).toContain('Tomorrow.io');
			expect(layoutContent).toContain('Stripe');
		});
	});
});
