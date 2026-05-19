// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	applySixtyThirtyTenPalette,
	DEFAULT_PALETTE,
	paletteFromTeamBranding,
	paletteFromClubBranding,
} from '../brandingPalette.js';

describe('brandingPalette — 60-30-10 CSS variables', () => {
	beforeEach(() => {
		document.documentElement.style.cssText = '';
	});

	afterEach(() => {
		document.documentElement.style.cssText = '';
	});

	it('maps team primary/secondary to dominant and accent', () => {
		const p = paletteFromTeamBranding('#112233', '#aabb00');
		expect(p.dominant).toBe('#112233');
		expect(p.accent).toBe('#aabb00');
		expect(p.structural).toBe(DEFAULT_PALETTE.structural);
	});

	it('maps club hex pair through paletteFromClubBranding', () => {
		const p = paletteFromClubBranding('#0f172a', '#fbbf24');
		expect(p.dominant).toBe('#0f172a');
		expect(p.accent).toBe('#fbbf24');
	});

	it('applySixtyThirtyTenPalette stamps --brand-dominant, --brand-structural, --brand-accent', () => {
		applySixtyThirtyTenPalette({
			dominant: '#111111',
			structural: '#2222ff',
			accent: '#ffcc00',
		});
		const root = document.documentElement;
		expect(root.style.getPropertyValue('--brand-dominant').trim()).toBe('#111111');
		expect(root.style.getPropertyValue('--brand-structural').trim()).toBe('#2222ff');
		expect(root.style.getPropertyValue('--brand-accent').trim()).toBe('#ffcc00');
	});
});
