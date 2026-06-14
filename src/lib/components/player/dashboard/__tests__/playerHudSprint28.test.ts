/**
 * playerHudSprint28.test.ts — Sprint 2.8 Player Dossier unification (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const RADAR = join(ROOT, 'lib/components/player/dashboard/AttributeRadar.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const radarSrc = existsSync(RADAR) ? readFileSync(RADAR, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const identitySrc = existsSync(IDENTITY) ? readFileSync(IDENTITY, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.8 — player-dossier.css canonical tokens', () => {
	it('defines --pd-bg, --pd-panel, --pd-accent-action, --pd-accent-data under .player-dossier-root', () => {
		expect(dossierCssSrc).toMatch(/\.player-dossier-root/);
		expect(dossierCssSrc).toMatch(/--pd-bg:\s*#000000/);
		expect(dossierCssSrc).toMatch(/--pd-panel:\s*#05050a/);
		expect(dossierCssSrc).toMatch(/--pd-accent-action:\s*#fbbf24/);
		expect(dossierCssSrc).toMatch(/--pd-accent-data:\s*#14b8a6/);
	});

	it('includes utility classes pd-strap, pd-eyebrow, pd-panel, pd-mono, pd-label', () => {
		expect(dossierCssSrc).toMatch(/\.pd-strap/);
		expect(dossierCssSrc).toMatch(/\.pd-eyebrow/);
		expect(dossierCssSrc).toMatch(/\.pd-panel/);
		expect(dossierCssSrc).toMatch(/\.pd-mono/);
		expect(dossierCssSrc).toMatch(/\.pd-label/);
	});
});

describe('Sprint 2.8 — dashboard +page dossier shell', () => {
	it('uses player-hud-root pd-page-root dossier shell (CSS via shell/components)', () => {
		expect(pageSrc).toMatch(/player-hud-root/);
		expect(pageSrc).toMatch(/pd-page-root/);
		expect(pageSrc).toMatch(/var\(--pd-bg/);
	});

	it('uses black dossier page background (not bare #0f172a)', () => {
		expect(pageSrc).toMatch(/var\(--pd-bg/);
		expect(pageSrc).not.toMatch(/background:\s*var\(--color-dominant,\s*#0f172a\)/);
	});

	it('has pd-strap dossier header above OperativeHub', () => {
		expect(pageSrc).toMatch(/pd-strap/);
		expect(pageSrc).toMatch(/Command \/ HQ/);
		expect(pageSrc).toMatch(/<OperativeHub/);
		const strapIdx = pageSrc.indexOf('pd-strap');
		const hubIdx = pageSrc.indexOf('<OperativeHub');
		expect(strapIdx).toBeGreaterThan(-1);
		expect(hubIdx).toBeGreaterThan(strapIdx);
	});
});

describe('Sprint 2.8 — player-dashboard-hud.css dossier surfaces', () => {
	it('maps HUD surfaces to dossier tokens', () => {
		expect(hudCssSrc).toMatch(/--player-hud-surface:\s*var\(--pd-panel/);
		expect(hudCssSrc).toMatch(/--player-hud-border:\s*var\(--pd-line/);
		expect(hudCssSrc).toMatch(/\.operative-hub[\s\S]*?var\(--pd-panel/);
	});

	it('disables operative-hub scanlines decoration', () => {
		expect(hudCssSrc).toMatch(/\.operative-hub__scanlines[\s\S]*display:\s*none/);
	});
});

describe('Sprint 2.8 — OperativeHub scanlines removed from markup', () => {
	it('does NOT render operative-hub__scanlines element', () => {
		expect(hubSrc).not.toMatch(/operative-hub__scanlines/);
	});
});

describe('Sprint 2.8 — teal data accent on radar / VPP', () => {
	it('AttributeRadar polygon uses --pd-accent-data or #14b8a6', () => {
		const skillPoly = radarSrc.match(/points=\{skillPolygonPoints\}[\s\S]*?\/>/)?.[0] ?? radarSrc;
		expect(skillPoly).toMatch(/--pd-accent-data|#14b8a6/);
		expect(skillPoly).not.toMatch(/var\(--color-accent,\s*#fbbf24\)/);
	});

	it('VanguardProtocolPanel inspector bar uses teal data accent', () => {
		const barAfter = vppSrc.match(/\.vpp-inspector__bar::after\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(barAfter).toMatch(/--pd-accent-data|#14b8a6/);
	});
});

describe('Sprint 2.8 — gold action accent preserved on hero CTA', () => {
	it('quest-hero__cta remains gold (#fbbf24)', () => {
		const ctaBlock = hudCssSrc.match(/\.player-hud-root \.quest-hero__cta[\s\S]*?\}/)?.[0] ?? '';
		expect(ctaBlock).toMatch(/#fbbf24/);
	});
});

describe('Sprint 2.8 — IdentityBentoModule inset panel', () => {
	it('embedded identity uses HologramCardShell holo primitive (supersedes ibm-root--inset)', () => {
		expect(identitySrc).toMatch(/HologramCardShell/);
		expect(identitySrc).toMatch(/ibm-root--premium|ibm-root--embedded/);
	});
});

describe('Sprint 2.8 — player shell ambient soften on dashboard', () => {
	it('player-shell.css reduces ambient when dossier root present', () => {
		expect(shellCssSrc).toMatch(/:has\(\.player-dossier-root\)/);
	});
});

describe('Sprint 2.8 — PLAYER_OS.md Player Dossier docs', () => {
	it('documents Player Dossier + dual accent (gold action / teal data)', () => {
		expect(playerOsSrc).toMatch(/Player Dossier/i);
		expect(playerOsSrc).toMatch(/dual accent|gold.*teal|teal.*gold/i);
		expect(playerOsSrc).toMatch(/--pd-accent-action|--pd-accent-data|pd-accent/);
		expect(playerOsSrc).toMatch(/2\.8/);
	});
});

describe('Sprint 2.8 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint14.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint15.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint16.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint17.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint20.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint21.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint22.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint23.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint24.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint25.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint26.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint27.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
