import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Global Layout (+layout.svelte) - Sprint 0.1 Bento Grid Lock', () => {
	const layoutPath = path.resolve(__dirname, '../+layout.svelte');
	const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

	it('must forcefully apply the .dark-form-surface utility to the vanguard-os-shell', () => {
		expect(layoutContent).toMatch(/class="vanguard-os-shell[^"]*dark-form-surface/);
	});

	it.skip('must structurally wrap the layout in a 12-column liquid Bento Grid', () => {
		expect(layoutContent).toMatch(/bento-grid\s+bento-grid--12col\s+bento-grid--liquid/);
	});

	it.skip('must contain an 8-column primary canvas and a 4-column sidecar', () => {
		expect(layoutContent).toMatch(/tw-col-span-8/);
		expect(layoutContent).toMatch(/tw-col-span-4/);
	});

	it('must explicitly use fluid bento cell spacing or grid tokens, banning static squishing margins', () => {
		// Ensure banned static margin classes are not present
		expect(layoutContent).not.toMatch(/tw-m[tbrlxy]?-\d+/);
		expect(layoutContent).not.toMatch(/tw-p[tbrlxy]?-\d+/);
		// Ensure style=" margin: ... " is not used
		expect(layoutContent).not.toMatch(/style="[^"]*(margin|padding)/);
	});
});
