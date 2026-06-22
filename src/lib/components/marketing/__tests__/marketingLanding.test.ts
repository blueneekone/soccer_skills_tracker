/**
 * marketingLanding.test.ts — LAUNCH-marketing-revamp guards.
 * Source-scan: landing page wires competitive positioning + SSTracker copy.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	WIN_MESSAGE,
	HERO_HEADLINE,
	HERO_TRUST_HEADLINE,
	COMPARE_ROWS,
} from '../landing/landingContent.js';

const ROOT = join(__dirname, '..', '..', '..', '..');
const LANDING_PAGE = join(ROOT, 'routes/(marketing)/+page.svelte');
const COMP_PANEL = join(__dirname, '..', 'landing/CompetitivePositionPanel.svelte');
const LANDING_HERO = join(__dirname, '..', 'landing/LandingHero.svelte');
const MARKETING_NAV = join(__dirname, '..', 'MarketingNav.svelte');
const FINAL_CTA = join(__dirname, '..', 'landing/FinalCtaPanel.svelte');
const MARKETING_FOOTER = join(__dirname, '..', 'MarketingFooter.svelte');
const ACQUISITION_PAGE = join(ROOT, 'routes/(marketing)/acquisition/+page.svelte');
const ACQUISITION_CONTENT = join(__dirname, '..', 'acquisition/acquisitionContent.ts');

const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf-8') : '');

describe('LAUNCH-marketing-revamp — landing wiring', () => {
	it('landing page imports CompetitivePositionPanel and WIN_MESSAGE', () => {
		const src = read(LANDING_PAGE);
		expect(src).toContain('CompetitivePositionPanel');
		expect(src).toContain('WIN_MESSAGE');
		expect(src).not.toContain('ClientLogoBar');
		expect(src).not.toMatch(/Nexus Command/i);
	});

	it('CompetitivePositionPanel renders canonical win message', () => {
		const src = read(COMP_PANEL);
		expect(src).toContain('WIN_MESSAGE');
		expect(WIN_MESSAGE).toContain('TeamSnap runs your season');
		expect(WIN_MESSAGE).toContain('SSTracker runs your athletes');
	});

	it('hero and nav use SSTracker branding — not Nexus Command', () => {
		expect(read(LANDING_HERO)).not.toMatch(/NEXUS COMMAND/i);
		expect(read(MARKETING_NAV)).toContain('SSTRACKER');
		expect(read(MARKETING_NAV)).not.toMatch(/NEXUS COMMAND/i);
	});

	it('nav includes Acquisition link', () => {
		expect(read(MARKETING_NAV)).toContain("href: '/acquisition'");
	});

	it('landingContent has four-way category compare including SSTracker', () => {
		expect(COMPARE_ROWS).toHaveLength(4);
		expect(COMPARE_ROWS.some((r) => r.id === 'sstracker')).toBe(true);
		expect(HERO_HEADLINE).toContain('athlete development');
		expect(HERO_TRUST_HEADLINE).toContain('registration pauses');
	});

	it('LandingHero wires trust campaign hero copy', () => {
		const src = read(LANDING_HERO);
		expect(src).toContain('HERO_TRUST_HEADLINE');
		expect(src).toContain('HERO_TRUST_MICRO_STRIP');
		expect(src).toContain('HERO_TRUST_LEGAL');
	});
});

describe('LAUNCH-marketing-acq — acquisition route + landing link', () => {
	it('acquisition page exists and uses SSTracker acquisition content', () => {
		expect(existsSync(ACQUISITION_PAGE)).toBe(true);
		const src = read(ACQUISITION_PAGE);
		expect(src).toContain('acquisitionContent.js');
		expect(src).toContain('WIN_MESSAGE');
		expect(src).not.toMatch(/Nexus Command/i);
		expect(read(ACQUISITION_CONTENT)).toContain('ACQ_HEADLINE');
	});

	it('landing final CTA and footer link to /acquisition', () => {
		expect(read(FINAL_CTA)).toContain('href="/acquisition"');
		expect(read(MARKETING_FOOTER)).toContain('href="/acquisition"');
	});
});
