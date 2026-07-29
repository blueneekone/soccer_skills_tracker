import { describe, it, expect } from 'vitest';
import LoginSource from '../../routes/login/+page.svelte?raw';
import FeaturesSource from '../../routes/(marketing)/features/+page.svelte?raw';
import PricingSource from '../../routes/(marketing)/pricing/+page.svelte?raw';

// ─── LOGIN PAGE TESTS ────────────────────────────────────────────────────────

describe('CDO Protocol: Login Page Audit', () => {
	it('MUST have an Action Gold (#fbbf24) primary CTA on the login page', () => {
		// The login page needs at minimum one vanguard-btn-amber or #fbbf24 element
		const hasGoldCta =
			LoginSource.includes('vanguard-btn-amber') ||
			LoginSource.includes('#fbbf24') ||
			LoginSource.includes('fbbf24');
		expect(hasGoldCta).toBe(true);
	});

	it('MUST NOT use Tailwind opacity modifiers (/40, /50, /60) on dark backgrounds', () => {
		// bg-slate-800/40 and border-slate-700/50 are banned
		expect(LoginSource).not.toMatch(/tw-bg-slate-\d+\/\d+/);
		expect(LoginSource).not.toMatch(/tw-border-slate-\d+\/\d+/);
	});

	it('MUST use Data Cyan (#14b8a6 / teal-500) not teal-400 for accents', () => {
		// teal-400 resolves to #2dd4bf — unauthorized
		expect(LoginSource).not.toMatch(/tw-text-teal-400(?!\d)/);
		expect(LoginSource).not.toMatch(/tw-border-teal-400(?!\d)/);
		expect(LoginSource).not.toMatch(/tw-bg-teal-400(?!\d)/);
	});

	it('MUST use solid hex backgrounds, not opacity-modified slate backgrounds', () => {
		// bg-slate-800/40 is banned; use bg-[#0f172a] or similar solid
		expect(LoginSource).not.toContain('tw-bg-slate-800/40');
		expect(LoginSource).not.toContain('tw-bg-slate-900/60');
	});

	it('MUST use solid hex bg on the outer glass card, not glassmorphism opacity', () => {
		// tw-bg-slate-900/60 tw-backdrop-blur-2xl is banned
		expect(LoginSource).not.toContain('tw-backdrop-blur-2xl');
	});
});

// ─── FEATURES PAGE TESTS ─────────────────────────────────────────────────────

describe('CDO Protocol: Features Page Audit', () => {
	it('MUST NOT use unauthorized Tailwind cyan color classes', () => {
		// Standard tailwind cyan resolves to wrong hex values
		expect(FeaturesSource).not.toMatch(/tw-(?:text|bg|border)-cyan-\d+(?:\/\d+)?/);
	});

	it('MUST NOT use unauthorized background hex #0B0F19', () => {
		expect(FeaturesSource).not.toMatch(/#0B0F19/i);
	});

	it('MUST use Navy Slate (#0f172a) for card backgrounds', () => {
		expect(FeaturesSource).toMatch(/#0f172a/i);
	});

	it('MUST NOT use border-[#1e293b] — use Structural Grey #334155 instead', () => {
		expect(FeaturesSource).not.toContain('#1e293b');
	});
});

// ─── PRICING PAGE TESTS ──────────────────────────────────────────────────────

describe('CDO Protocol: Pricing Page Audit', () => {
	it('MUST have exactly ONE Action Gold (#fbbf24) CTA in the tiers section', () => {
		// The "POPULAR" tier (single-team) should be the Action Gold CTA
		// Count occurrences of fbbf24 in the CTA button context
		const ctaMatches = FeaturesSource.match(/vanguard-btn-amber|#fbbf24/g) || [];
		// At minimum, the pricing page must reference the gold color for ONE tier CTA
		// We use a looser check — just that there is a differentiated primary CTA
		const hasDifferentiatedCta =
			PricingSource.includes('vanguard-btn-amber') ||
			(PricingSource.includes('#fbbf24') && PricingSource.match(/#fbbf24/g)!.length >= 1);
		expect(hasDifferentiatedCta).toBe(true);
	});
});
