/**
 * playerHudSprint17.test.ts — Sprint 1.7 density, mission ellipsis, streak emphasis (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const METRICS = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');
const OPERATIVE = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const metricsSrc = existsSync(METRICS) ? readFileSync(METRICS, 'utf-8') : '';
const operativeSrc = existsSync(OPERATIVE) ? readFileSync(OPERATIVE, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

const ellipsisPattern = /text-overflow:\s*ellipsis[\s\S]{0,120}white-space:\s*nowrap|white-space:\s*nowrap[\s\S]{0,120}text-overflow:\s*ellipsis/s;

describe('Sprint 1.7 — OperativeHub bento spans preserved', () => {
	it('OperativeHub retains bento-span-4 identity column', () => {
		expect(operativeSrc).toMatch(/bento-span-4/);
	});

	it('OperativeHub retains bento-span-8 metrics column', () => {
		expect(operativeSrc).toMatch(/bento-span-8/);
	});

	it('OperativeHub retains bento-span-12 quests row', () => {
		expect(operativeSrc).toMatch(/bento-span-12/);
	});

	it('OperativeHub has no fixed 350px columns', () => {
		expect(operativeSrc).not.toMatch(/350px/);
	});

	it('OperativeHub cells preserve min-width: 0 for flex/grid shrink', () => {
		expect(operativeSrc).toMatch(/min-width:\s*0/);
	});
});

describe('Sprint 1.7 — IdentityBentoModule gold accent & streak emphasis', () => {
	it('IdentityBentoModule uses HudAvatarRing', () => {
		expect(identitySrc).toMatch(/HudAvatarRing/);
	});

	it('IdentityBentoModule uses gold accent (#fbbf24 or var(--color-accent))', () => {
		expect(identitySrc).toMatch(/#fbbf24|var\(--color-accent/);
	});

	/**
	 * Streak-at-risk UX: when currentStreak > 0, IdentityBentoModule sets data-streak-active
	 * and ibm-streak-at-risk class; player-dashboard-hud.css applies a subtle gold avatar pulse.
	 */
	it('IdentityBentoModule exposes streak-active emphasis when streak > 0', () => {
		expect(identitySrc).toMatch(/data-streak-active|ibm-streak-at-risk|ibm-pill--streak-active/);
		expect(identitySrc + hudCssSrc).toMatch(/data-streak-active|ibm-streak-at-risk|ibm-pill--streak-active/);
	});
});

describe('Sprint 1.7 — HudMetricsPanel density styling', () => {
	it('HudMetricsPanel exists', () => {
		expect(existsSync(METRICS)).toBe(true);
	});

	it('HudMetricsPanel uses hmp- density classes', () => {
		expect(metricsSrc).toMatch(/hmp-/);
	});

	it('HudMetricsPanel uses Geist Mono for telemetry readouts', () => {
		expect(metricsSrc).toMatch(/Geist Mono/);
	});
});

describe('Sprint 1.7 — mission row title ellipsis', () => {
	it('ActiveBounties or player-dashboard-hud.css truncates long mission titles', () => {
		const combined = bountiesSrc + hudCssSrc;
		expect(combined).toMatch(/quest-row__title/);
		expect(combined).toMatch(ellipsisPattern);
	});
});

describe('Sprint 1.7 — HUD density tokens', () => {
	it('player-dashboard-hud.css defines tighter player-hud-pad token', () => {
		expect(hudCssSrc).toMatch(/--player-hud-pad/);
	});

	it('OperativeHub keeps bento-grid--12col and bento-grid--liquid', () => {
		expect(operativeSrc).toMatch(/bento-grid--12col/);
		expect(operativeSrc).toMatch(/bento-grid--liquid/);
	});
});
