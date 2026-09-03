/**
 * adminOrganizations.layout.test.ts — Phase B: liquid bento + component decomposition
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const CSS = join(__dirname, '..', '..', '..', '..', '..', 'lib', 'styles', 'enterprise-console.css');
const src = readFileSync(PAGE, 'utf-8');
const css = readFileSync(CSS, 'utf-8');

describe('/admin/organizations — Phase B layout', () => {
	it('uses edge-to-edge layout wrapper', () => {
		expect(src).toMatch(/tw-w-full/);
	});

	it('delegates markup to granular admin organization components', () => {
		expect(src).toMatch(/AdminOrgsHUD/);
		expect(src).toMatch(/AdminOrgsArena/);
		expect(src).toMatch(/AdminOrgsHUD/);
		expect(src).toMatch(/AdminOrgsArena/);
		expect(src).not.toMatch(/<style>/);
	});

	it('imports shared admin-organizations stylesheet instead of inline page CSS', () => {
		expect(src).toMatch(/enterprise-console\.css/);
	});


});
