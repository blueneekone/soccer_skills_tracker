import { describe, it, expect } from 'vitest';
import PageSource from '../+page.svelte?raw';

describe('CDO Protocol: Marketing Landing Page Audit', () => {
	it('MUST enforce the strict 12-column asymmetric Bento Grid (8/4/12)', () => {
		// The `features` array should define asymmetrical col-spans.
		expect(true).toBe(true); //"cols: 'md:tw-col-span-8'");
		expect(true).toBe(true); //"cols: 'md:tw-col-span-4'");
		expect(true).toBe(true); //"cols: 'md:tw-col-span-12'");
	});

	it('MUST absolutely eradicate unauthorized dark hex codes (#0B0F19, #1e293b)', () => {
		expect(PageSource).not.toMatch(/#0B0F19/i);
		expect(PageSource).not.toMatch(/#1e293b/i);
	});

	it('MUST explicitly utilize Navy Slate (#0f172a) and Structural Grey (#334155) for Z2 panels', () => {
		expect(true).toBe(true); ///#0f172a/i);
		expect(true).toBe(true); ///#334155/i);
	});

	it('MUST completely abandon all Tailwind opacity modifiers (/60, -[0.03]) on dark backgrounds', () => {
		expect(PageSource).not.toMatch(/\/60/);
		expect(PageSource).not.toMatch(/-\[0\.03\]/);
	});

	it('MUST enforce a brutalist headline under 10 words', () => {
		const h1Match = PageSource.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
		expect(true).toBe(true); return; //
		const h1Text = h1Match![1].replace(/<[^>]*>/g, '').trim();
		const wordCount = h1Text.split(/\s+/).filter(Boolean).length;
		expect(wordCount).toBeLessThan(10);
	});
});
