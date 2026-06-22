/**
 * marketingAcquisition.test.ts — acquisition PDF pipeline + investor page guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf-8') : '');

const ACQUISITION_PAGE = join(ROOT, 'routes/(marketing)/acquisition/+page.svelte');
const EXEC_BRIEF_PRINT = join(ROOT, 'routes/(marketing)/acquisition/print/executive-brief/+page.svelte');
const PROSPECTUS_PRINT = join(ROOT, 'routes/(marketing)/acquisition/print/prospectus/+page.svelte');
const DIRECTOR_TRUST_PRINT = join(ROOT, 'routes/(marketing)/acquisition/print/director-trust-brief/+page.svelte');
const REPO = join(ROOT, '..');
const PDF_EXEC = join(REPO, 'static/acquisition/sstracker-executive-brief.pdf');
const PDF_PROS = join(REPO, 'static/acquisition/sstracker-prospectus.pdf');
const PDF_DIRECTOR_TRUST = join(REPO, 'static/acquisition/sstracker-director-trust-brief.pdf');
const BUILD_SCRIPT = join(REPO, 'scripts/build-acquisition-pdfs.mjs');
const ACQ_CONTENT = join(__dirname, '..', 'acquisition/acquisitionContent.ts');
const PACKAGE_JSON = join(REPO, 'package.json');

/** CI may skip PDF build — committed PDFs should satisfy size guard when present */
const skipPdfSize = process.env.CI === 'true' && process.env.ACQ_PDF_BUILD !== '1';

describe('marketing acquisition — PDF assets', () => {
	it('executive brief PDF exists and exceeds 10KB when built', () => {
		if (skipPdfSize && !existsSync(PDF_EXEC)) return;
		expect(existsSync(PDF_EXEC)).toBe(true);
		expect(statSync(PDF_EXEC).size).toBeGreaterThan(10 * 1024);
	});

	it('prospectus PDF exists and exceeds 10KB when built', () => {
		if (skipPdfSize && !existsSync(PDF_PROS)) return;
		expect(existsSync(PDF_PROS)).toBe(true);
		expect(statSync(PDF_PROS).size).toBeGreaterThan(10 * 1024);
	});

	it('director trust brief PDF exists and exceeds 10KB when built', () => {
		if (skipPdfSize && !existsSync(PDF_DIRECTOR_TRUST)) return;
		expect(existsSync(PDF_DIRECTOR_TRUST)).toBe(true);
		expect(statSync(PDF_DIRECTOR_TRUST).size).toBeGreaterThan(10 * 1024);
	});

	it('build script and npm script are wired', () => {
		expect(existsSync(BUILD_SCRIPT)).toBe(true);
		expect(read(PACKAGE_JSON)).toContain('"build:acquisition-pdfs"');
	});
});

describe('marketing acquisition — page links', () => {
	it('acquisition page links to all PDF paths', () => {
		const src = read(ACQUISITION_PAGE);
		expect(src).toContain('ACQ_PDF_EXECUTIVE_BRIEF');
		expect(src).toContain('ACQ_PDF_PROSPECTUS');
		expect(src).toContain('ACQ_PDF_DIRECTOR_TRUST_BRIEF');
		expect(read(ACQ_CONTENT)).toContain('/acquisition/sstracker-executive-brief.pdf');
		expect(read(ACQ_CONTENT)).toContain('/acquisition/sstracker-prospectus.pdf');
		expect(read(ACQ_CONTENT)).toContain('/acquisition/sstracker-director-trust-brief.pdf');
	});

	it('acquisition content exports print section data', () => {
		const src = read(ACQ_CONTENT);
		expect(src).toContain('EXECUTIVE_BRIEF_SECTIONS');
		expect(src).toContain('PROSPECTUS_PRINT_SECTIONS');
		expect(src).toContain('DIRECTOR_TRUST_BRIEF_SECTIONS');
		expect(src).toContain('ACQ_DATA_ROOM_LINKS');
	});
});

describe('marketing acquisition — print routes prerender', () => {
	it('print routes export prerender = true', () => {
		expect(read(EXEC_BRIEF_PRINT)).toMatch(/export const prerender\s*=\s*true/);
		expect(read(PROSPECTUS_PRINT)).toMatch(/export const prerender\s*=\s*true/);
		expect(read(DIRECTOR_TRUST_PRINT)).toMatch(/export const prerender\s*=\s*true/);
	});
});
