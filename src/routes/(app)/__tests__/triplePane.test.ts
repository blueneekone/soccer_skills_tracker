import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT_SVELTE_PATH = join(__dirname, '../+layout.svelte');

describe('Triple-Pane SIEM Command Architecture', () => {
	describe('App Layout (+layout.svelte)', () => {
		let layoutContent = '';
		try {
			layoutContent = readFileSync(LAYOUT_SVELTE_PATH, 'utf-8');
		} catch (err) {
			console.error('Could not read +layout.svelte:', err);
		}

		it('must wrap the app with a 100dvh flex shell', () => {
			expect(layoutContent).toContain('class="tw-flex tw-w-full tw-h-screen tw-overflow-hidden tw-bg-[#0B0F19]"');
		});

		it('must import and use NexusSidebar for the left rail structural lock', () => {
			expect(layoutContent).toContain("import NexusSidebar from '$lib/components/layout/NexusSidebar.svelte'");
			expect(layoutContent).toContain('<NexusSidebar />');
		});

		it('must import and use AlertMatrix for the telemetry rail', () => {
			expect(layoutContent).toContain("import AlertMatrix from '$lib/components/layout/AlertMatrix.svelte'");
			expect(layoutContent).toContain('<AlertMatrix />');
		});

		it('must declare Svelte 5 $props() for route children', () => {
			expect(layoutContent).toContain('let { children } = $props()');
		});

		it('must render children() inside the primary canvas for Svelte 5 routing', () => {
			expect(layoutContent).toContain('{@render children()}');
		});

		it('must contain the primary canvas with tw-min-w-0 and tw-min-h-0 to prevent flex blowout', () => {
			expect(layoutContent).toMatch(/class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0 tw-min-h-0 tw-overflow-y-auto tw-p-6"/);
		});

		it('must include the global-alert-matrix telemetry rail with tw-w-96', () => {
			// The aside was extracted to AlertMatrix.svelte — assert the component file directly.
			const alertMatrixPath = join(__dirname, '../../../lib/components/layout/AlertMatrix.svelte');
			let alertMatrixContent = '';
			try {
				alertMatrixContent = readFileSync(alertMatrixPath, 'utf-8');
			} catch (err) {
				console.error('Could not read AlertMatrix.svelte:', err);
			}
			expect(alertMatrixContent).toMatch(/class="tw-hidden 2xl:tw-flex 2xl:tw-flex-col tw-w-96 tw-flex-shrink-0 tw-border-l tw-border-slate-800 tw-bg-\[#0B0F19\] tw-p-4"/);
			expect(alertMatrixContent).toMatch(/tw-font-mono/);
			expect(alertMatrixContent).toContain('SafeSport');
			expect(alertMatrixContent).toContain('Tomorrow.io');
			expect(alertMatrixContent).toContain('Stripe');
		});
	});
});
