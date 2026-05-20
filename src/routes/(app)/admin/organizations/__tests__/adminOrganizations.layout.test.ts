/**
 * adminOrganizations.layout.test.ts — Phase B: liquid bento + component decomposition
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const CSS = join(__dirname, '..', '..', '..', '..', '..', 'lib', 'styles', 'admin-organizations.css');
const src = readFileSync(PAGE, 'utf-8');
const css = readFileSync(CSS, 'utf-8');

describe('/admin/organizations — Phase B layout', () => {
	it('uses 12-column liquid bento grid wrapper', () => {
		expect(src).toMatch(/bento-grid--12col bento-grid--liquid|bento-grid--liquid.*bento-grid--12col/);
		expect(src).toMatch(/bento-span-12/);
	});

	it('delegates markup to granular admin organization components', () => {
		expect(src).toMatch(/OrganizationsToolbar/);
		expect(src).toMatch(/OrganizationsDataTable/);
		expect(src).toMatch(/OrganizationsSportTabs/);
		expect(src).toMatch(/OrganizationsAddForm/);
		expect(src).not.toMatch(/<style>/);
	});

	it('imports shared admin-organizations stylesheet instead of inline page CSS', () => {
		expect(src).toMatch(/admin-organizations\.css/);
	});

	it('bento root and panel use clamp() spacing tokens', () => {
		expect(css).toMatch(/\.orgs-bento-root[\s\S]*var\(--bento-pad-liquid,\s*clamp\(/);
		expect(css).toMatch(/\.orgs-bento-root[\s\S]*var\(--bento-gap-liquid,\s*clamp\(/);
		expect(css).toMatch(/\.orgs-panel[\s\S]*var\(--bento-pad-liquid,\s*clamp\(/);
	});
});
