/**
 * playerHudSprint311.test.ts — Sprint 3.1.1 Part A: HQ gold harmonization
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const RING = join(ROOT, 'lib/components/player/HudAvatarRing.svelte');

const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const ringSrc = existsSync(RING) ? readFileSync(RING, 'utf-8') : '';

describe('Sprint 3.1.1 Part A — hud-stat-cell gold harmonization', () => {
	it('stat cell values use --pd-text, not --pd-accent-action / #fbbf24', () => {
		expect(hudCssSrc).toMatch(/\.hud-stat-cell__value[\s\S]*?color:\s*var\(--pd-text,\s*#f4f4f5\)/);
		expect(hudCssSrc).not.toMatch(
			/\.hud-stat-cell__value[\s\S]{0,160}var\(--pd-accent-action,\s*#fbbf24\)/,
		);
		expect(hudCssSrc).not.toMatch(/\.hud-stat-cell__value[\s\S]{0,80}#fbbf24/);
	});

	it('streak label is muted (--pd-text-muted), not gold-tinted', () => {
		expect(hudCssSrc).toMatch(
			/\.hud-stat-cell--streak \.hud-stat-cell__label[\s\S]*?var\(--pd-text-muted/,
		);
		expect(hudCssSrc).not.toMatch(
			/\.hud-stat-cell--streak \.hud-stat-cell__label[\s\S]{0,120}--pd-accent-action/,
		);
	});

	it('stat cell hover borders use teal data accent, not gold', () => {
		expect(hudCssSrc).toMatch(
			/\.hud-stat-cell:hover[\s\S]*?var\(--player-hud-data,\s*#14b8a6\)/,
		);
		expect(hudCssSrc).not.toMatch(
			/\.hud-stat-cell:hover[\s\S]{0,120}--pd-accent-action/,
		);
	});

	it('ibm-cta default hover uses teal; setup variant keeps gold border', () => {
		expect(hudCssSrc).toMatch(/\.ibm-cta:hover[\s\S]*?var\(--player-hud-data,\s*#14b8a6\)/);
		expect(hudCssSrc).toMatch(/\.ibm-cta--setup[\s\S]*?border-color:\s*var\(--pd-accent-action,\s*#fbbf24\)/);
	});
});

describe('Sprint 3.1.1 Part A — hero gold surfaces preserved', () => {
	it('rank XP bar fill still uses gold', () => {
		expect(hudCssSrc).toMatch(/\.ibm-rank-progress__fill[\s\S]*?background:\s*#fbbf24/);
	});

	it('hero mission CTA still references gold accent', () => {
		expect(hudCssSrc).toMatch(/\.quest-hero__cta[\s\S]*?#fbbf24/);
		expect(hudCssSrc).toMatch(/\.quest-row__cmd--embedded\.quest-row__cmd--accept[\s\S]*?--pd-accent-action/);
	});

	it('init modal primary CTA keeps gold action accent', () => {
		expect(hudCssSrc).toMatch(/\.init-modal__cta--primary[\s\S]*?var\(--pd-accent-action/);
	});

	it('HudAvatarRing level ring keeps gold stroke default', () => {
		expect(ringSrc).toMatch(/--har-stroke,\s*#fbbf24|var\(--color-accent,\s*#fbbf24\)/);
	});
});

describe('Sprint 3.1.1 — no regression on 3.1 dossier panel tokens', () => {
	it('hud-stat-cell background remains --pd-panel (#05050a), not #0f172a', () => {
		expect(hudCssSrc).toMatch(/\.hud-stat-cell[\s\S]*?background:\s*var\(--pd-panel,\s*#05050a\)/);
		expect(hudCssSrc).not.toMatch(
			/\.hud-stat-cell[\s\S]{0,200}background:[\s\S]{0,40}#0f172a/,
		);
	});
});
