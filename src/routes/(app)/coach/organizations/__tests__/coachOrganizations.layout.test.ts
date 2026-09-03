/**
 * coachOrganizations.layout.test.ts — Coach Organizations route tests
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE_JS = join(__dirname, '..', '+page.js');
const PAGE_SVELTE = join(__dirname, '..', '+page.svelte');

describe('/coach/organizations route structure', () => {
	it('disables SSR and prerendering in +page.js', () => {
		const jsSrc = readFileSync(PAGE_JS, 'utf-8');
		expect(jsSrc).toContain('export const ssr = false;');
		expect(jsSrc).toContain('export const prerender = false;');
	});

	it('renders Bento Grid layout and imports teamsStore and authStore', () => {
		const svelteSrc = readFileSync(PAGE_SVELTE, 'utf-8');
		expect(svelteSrc).toContain('teamsStore');
		expect(svelteSrc).toContain('authStore');
		expect(svelteSrc).toContain('st-bento');
		expect(svelteSrc).toContain('lg:tw-col-span-8');
		expect(svelteSrc).toContain('lg:tw-col-span-4');
	});
});
