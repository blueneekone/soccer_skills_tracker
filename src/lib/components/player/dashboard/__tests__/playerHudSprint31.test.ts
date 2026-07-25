/**
 * playerHudSprint31.test.ts — Sprint 3.1 Part A: dossier token sweep on HQ HUD
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const HUD_RING = join(ROOT, 'lib/components/player/HudAvatarRing.svelte');

const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const ringSrc = existsSync(HUD_RING) ? readFileSync(HUD_RING, 'utf-8') : '';

describe('Sprint 3.1 Part A — hud-stat-cell dossier tokens', () => {
	it('uses --pd-panel background (not bare #0f172a on stat cells)', () => {
		expect(hudCssSrc).toMatch(/\.hud-stat-cell[\s\S]*?background:\s*var\(--pd-panel,\s*#05050a\)/);
		expect(hudCssSrc).not.toMatch(
			/\.hud-stat-cell[\s\S]{0,200}background:\s*color-mix\(in srgb,\s*var\(--color-dominant,\s*#0f172a\)/,
		);
	});

	it('uses --pd-line border; stat values use neutral --pd-text (gold harmonized in 3.1.1)', () => {
		expect(hudCssSrc).toMatch(/\.hud-stat-cell[\s\S]*?border:\s*1px solid var\(--pd-line/);
		expect(hudCssSrc).toMatch(/\.hud-stat-cell__value[\s\S]*?var\(--pd-text,\s*#f4f4f5\)/);
		expect(hudCssSrc).not.toMatch(
			/\.hud-stat-cell__value[\s\S]{0,120}var\(--pd-accent-action,\s*#fbbf24\)/,
		);
	});

	it('ibm-cta uses pd-panel/line; setup variant keeps gold border', () => {
		expect(hudCssSrc).toMatch(/\.ibm-cta[\s\S]*?background:\s*var\(--pd-panel,\s*#05050a\)/);
		expect(hudCssSrc).toMatch(/\.ibm-cta--setup[\s\S]*?border-color:\s*var\(--pd-accent-action,\s*#fbbf24\)/);
	});
});

describe('Sprint 3.1 Part A — init modal dossier remap', () => {
	it('init modal shell does not use tw-bg-slate-900', () => {
		expect(pageSrc).not.toMatch(/init-modal[\s\S]{0,120}tw-bg-slate-900/);
		expect(pageSrc).toMatch(/init-modal[\s\S]{0,120}pd-panel/);
	});

	it('init modal primary CTA uses gold action accent classes (not teal cyber)', () => {
		expect(pageSrc).toMatch(/init-modal__cta--primary/);
		expect(pageSrc).not.toMatch(/init-modal[\s\S]{0,800}tw-border-teal-600/);
	});

	it('init modal styles target global overlay or player-dossier-root in hud css', () => {
		const hasGlobalInit = /\.init-modal\s*\{/.test(hudCssSrc);
		const hasDossierScoped = /\.player-dossier-root \.init-modal/.test(hudCssSrc);
		expect(hasGlobalInit || hasDossierScoped).toBe(true);
		expect(hudCssSrc).toMatch(/\.init-modal__cta--primary[\s\S]*?var\(--pd-accent-action/);
	});
});

describe('Sprint 3.1 Part B — HQ loadout wiring', () => {
	it('IdentityBentoModule accepts operativeLoadout + ownedCosmetics', () => {
		expect(identitySrc).toMatch(/operativeLoadout/);
		expect(identitySrc).toMatch(/ownedCosmetics/);
	});

	it('HudAvatarRing renders loadout border overlay', () => {
		expect(ringSrc).toMatch(/operativeLoadout/);
		expect(ringSrc).toMatch(/composeOperativePortrait|loadoutBorder/);
	});

	it('dashboard passes operativeLoadout to IdentityBentoModule', () => {
		expect(pageSrc).toMatch(/operativeLoadout=\{activePlayer\?\.operativeLoadout\}/);
		expect(pageSrc).toMatch(/ownedCosmetics/);
	});
});
