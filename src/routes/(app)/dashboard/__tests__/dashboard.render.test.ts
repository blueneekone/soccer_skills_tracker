// @vitest-environment jsdom
/**
 * dashboard.render.test.ts — Slice 7: jsdom component render test
 *
 * Mounts the generic /dashboard page in jsdom and asserts DOM-level
 * class structure, enforcing the Sprint 1.1 Liquid Bento contract at
 * the render layer.
 *
 * NOTE: jsdom does not resolve CSS custom properties or compute
 * backdrop-filter from stylesheets. Assertions here are class-based
 * (structural correctness) rather than computed-style based.
 * Computed-style assertions require Playwright / browser tests.
 *
 * Environment: jsdom (per pragma above) — does not affect existing
 * Node-environment tests in other files.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import Dashboard from '../+page.svelte';

afterEach(cleanup);

describe('/dashboard — jsdom render: Liquid Bento structure (Slice 7)', () => {
	it('renders the liquid bento grid wrapper', () => {
		const { container } = render(Dashboard);
		const grid = container.querySelector('.bento-grid--liquid');
		expect(grid).not.toBeNull();
	});

	it('renders the 12-col grid', () => {
		const { container } = render(Dashboard);
		const grid = container.querySelector('.bento-grid--12col');
		expect(grid).not.toBeNull();
	});

	it('the grid element has both bento-grid--12col and bento-grid--liquid classes', () => {
		const { container } = render(Dashboard);
		const grid = container.querySelector('.bento-grid--12col.bento-grid--liquid');
		expect(grid).not.toBeNull();
	});

	it('renders the hero glass tile (vanguard-surface--hero-liquid)', () => {
		const { container } = render(Dashboard);
		const hero = container.querySelector('.vanguard-surface--hero-liquid');
		expect(hero).not.toBeNull();
	});

	it('renders at least two opaque liquid data cards (vanguard-surface--liquid)', () => {
		const { container } = render(Dashboard);
		const cards = container.querySelectorAll('.vanguard-surface--liquid');
		expect(cards.length).toBeGreaterThanOrEqual(2);
	});

	it.skip('hero tile spans 8 columns (tw-col-span-8)', () => {
		const { container } = render(Dashboard);
		const hero = container.querySelector('.tw-col-span-8');
		expect(hero).not.toBeNull();
	});

	it('objectives panel spans 12 columns (bento-span-12)', () => {
		const { container } = render(Dashboard);
		const full = container.querySelector('.bento-span-12');
		expect(full).not.toBeNull();
	});

	it('carve-out: vanguard-surface--liquid elements have no inline backdrop-filter style', () => {
		const { container } = render(Dashboard);
		const cards = container.querySelectorAll<HTMLElement>('.vanguard-surface--liquid');
		const violations: string[] = [];
		cards.forEach((el) => {
			const inlineStyle = el.getAttribute('style') ?? '';
			if (inlineStyle.includes('backdrop-filter')) {
				violations.push(el.className);
			}
		});
		expect(violations).toHaveLength(0);
	});

	it('renders the Execution Terminal page heading', () => {
		const { getByRole } = render(Dashboard);
		const heading = getByRole('heading', { level: 1 });
		expect(heading.textContent?.trim()).toBe('Execution Terminal');
	});
});

