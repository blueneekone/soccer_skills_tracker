import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', 'CommandPalette.svelte');
const src = readFileSync(PAGE, 'utf-8');

describe('CommandPalette.svelte', () => {
	it('defines the command palette panel and backdrop', () => {
		expect(src).toMatch(/class="cp-backdrop"/);
		expect(src).toMatch(/class="cp-panel"/);
	});

	it('contains a search input with appropriate ARIA attributes', () => {
		expect(src).toMatch(/class="cp-search__input"/);
		expect(src).toMatch(/aria-label="Command palette search"/);
		expect(src).toMatch(/aria-autocomplete="list"/);
	});

	it('renders a results listbox', () => {
		expect(src).toMatch(/class="cp-results"/);
		expect(src).toMatch(/role="listbox"/);
	});

	it('provides a keyboard escape hint', () => {
		expect(src).toMatch(/<kbd class="cp-search__esc">esc<\/kbd>/);
	});
});
