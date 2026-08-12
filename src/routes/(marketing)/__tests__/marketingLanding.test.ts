import { describe, it, expect } from 'vitest';
import PageSource from '../+page.svelte?raw';

describe('CDO Protocol: Marketing Landing Page Audit', () => {
	it('MUST enforce the strict 12-column asymmetric Bento Grid (5/4/3)', () => {
		// The `features` array should define the asymmetric col-spans.
		expect(PageSource).toContain("cols: 'md:tw-col-span-5'");
		expect(PageSource).toContain("cols: 'md:tw-col-span-4'");
		expect(PageSource).toContain("cols: 'md:tw-col-span-3'");
	});

	it('MUST absolutely eradicate unauthorized dark hex codes (#0B0F19, #1e293b)', () => {
		expect(PageSource).not.toMatch(/#0B0F19/i);
		expect(PageSource).not.toMatch(/#1e293b/i);
	});

	it('MUST explicitly utilize Navy Slate (#0f172a) and Structural Grey (#334155) for Z2 panels', () => {
		expect(PageSource).toMatch(/#0f172a/i);
		expect(PageSource).toMatch(/#334155/i);
	});

	it('MUST completely abandon all Tailwind opacity modifiers (/60, -[0.03]) on dark backgrounds', () => {
		expect(PageSource).not.toMatch(/\/60/);
		expect(PageSource).not.toMatch(/-\[0\.03\]/);
	});
});
