/**
 * @vitest-environment jsdom
 *
 * playerHudSprint241.test.ts — Wave A Player OS rubric redesign (Foundation + shell)
 *
 * Void contract thresholds (PLAYER_OS_FOUNDATION §3 / PLAYER_OS_VISUAL_ACCEPTANCE):
 *   • Black canvas ≥ 40%  • Matte panel ≤ 35%  • Emissive ≥ 15%
 *   • Largest Z2 panel ≤ 60% viewport width (layout — Wave F Playwright)
 *   • Hero identity ≥ 280px ring (DOM — Wave F Playwright)
 *
 * VA checkboxes remain ☐ until Wave F sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { render, cleanup } from '@testing-library/svelte';
import {
	VOID_CONTRACT_THRESHOLDS,
	VOID_CONTRACT_HQ_VIEWPORT,
	sampleVoidContractRatios,
	evaluateVoidContract,
} from '$lib/player/visual/voidContract.js';
import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const OVERLAY = join(ROOT, 'lib/components/player/PlayerDiegeticOverlay.svelte');
const VOID_MODULE = join(ROOT, 'lib/player/visual/voidContract.ts');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const SETTINGS = join(ROOT, 'routes/(app)/player/settings/+page.svelte');
const TRACKER = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const GAP_MATRIX = join(ROOT, '..', 'docs/vision/PLAYER_OS_RUBRIC_GAP_MATRIX.md');

const shellCss = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const overlaySrc = existsSync(OVERLAY) ? readFileSync(OVERLAY, 'utf-8') : '';
const voidModuleSrc = existsSync(VOID_MODULE) ? readFileSync(VOID_MODULE, 'utf-8') : '';
const dashboardSrc = existsSync(DASHBOARD) ? readFileSync(DASHBOARD, 'utf-8') : '';
const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const settingsSrc = existsSync(SETTINGS) ? readFileSync(SETTINGS, 'utf-8') : '';
const trackerSrc = existsSync(TRACKER) ? readFileSync(TRACKER, 'utf-8') : '';

/** Routes that must use canonical strap grammar (PlayerOsPageStrap or HQ pd-strap). */
const CANONICAL_STRAP_ROUTES: Record<string, string> = {
	workout: workoutSrc,
	settings: settingsSrc,
	tracker: trackerSrc,
	stats: statsSrc,
	armory: armorySrc,
};

describe('Wave A — void contract measurement (HQ baseline)', () => {
	it('voidContract.ts exports FOUNDATION §3 thresholds documented in module header', () => {
		expect(voidModuleSrc).toMatch(/Black canvas pixels at viewport rest\s*\|\s*≥ 40%/);
		expect(voidModuleSrc).toMatch(/Visible matte panel fill ratio\s*\|\s*≤ 35%/);
		expect(voidModuleSrc).toMatch(/Emissive edges \+ bloom \+ light\s*\|\s*≥ 15%/);
	});

	it('VOID_CONTRACT_THRESHOLDS match PLAYER_OS_VISUAL_ACCEPTANCE void table', () => {
		expect(VOID_CONTRACT_THRESHOLDS.blackCanvasMinRatio).toBe(0.4);
		expect(VOID_CONTRACT_THRESHOLDS.mattePanelMaxRatio).toBe(0.35);
		expect(VOID_CONTRACT_THRESHOLDS.emissiveMinRatio).toBe(0.15);
		expect(VOID_CONTRACT_HQ_VIEWPORT).toEqual({ width: 1280, height: 900 });
	});

	it('sampleVoidContractRatios + evaluateVoidContract pass synthetic void-heavy HQ sample', () => {
		const w = 32;
		const h = 32;
		const data = new Uint8ClampedArray(w * h * 4);
		for (let i = 0; i < w * h; i++) {
			const o = i * 4;
			// 70% black void, 10% matte, 20% emissive teal
			const roll = i % 10;
			if (roll < 7) {
				data[o] = 0;
				data[o + 1] = 0;
				data[o + 2] = 0;
			} else if (roll < 8) {
				data[o] = 5;
				data[o + 1] = 5;
				data[o + 2] = 10;
			} else {
				data[o] = 20;
				data[o + 1] = 184;
				data[o + 2] = 166;
			}
			data[o + 3] = 255;
		}
		const sample = sampleVoidContractRatios({ data, width: w, height: h });
		const result = evaluateVoidContract(sample);
		expect(result.blackCanvasPass).toBe(true);
		expect(result.mattePanelPass).toBe(true);
		expect(result.emissivePass).toBe(true);
		expect(result.allPixelRatiosPass).toBe(true);
	});

	it('evaluateVoidContract fails when matte panel exceeds ≤35% threshold', () => {
		const result = evaluateVoidContract({
			blackCanvasRatio: 0.5,
			mattePanelRatio: 0.42,
			emissiveRatio: 0.2,
		});
		expect(result.mattePanelPass).toBe(false);
		expect(result.allPixelRatiosPass).toBe(false);
	});
});

describe('Wave A — shared material consistency (player-dossier.css)', () => {
	it('pd-os-deck kit remains canonical Z2/Z3 stack', () => {
		expect(dossierCss).toMatch(/\.player-dossier-root \.pd-os-deck,/);
		expect(dossierCss).toMatch(/\.pd-os-deck--hero/);
		expect(dossierCss).toMatch(/\.pd-os-deck--recessed/);
		expect(dossierCss).toMatch(/\.pd-os-deck__well/);
		expect(dossierCss).not.toMatch(/\.pd-os-deck::before/);
	});

	it('player-dossier.css has no stray #00d4ff cyan accent literals', () => {
		expect(dossierCss).not.toMatch(/#00d4ff/i);
		expect(dossierCss).not.toMatch(/0,\s*212,\s*255/);
	});

	it('--pd-accent-data-bright derives from canonical --pd-accent-data teal', () => {
		expect(dossierCss).toMatch(
			/--pd-accent-data-bright:\s*color-mix\(in srgb,\s*var\(--pd-accent-data\)/,
		);
		expect(dossierCss).toMatch(/--pd-accent-data:\s*#14b8a6/);
		expect(dossierCss).toMatch(/--pd-accent-action:\s*#fbbf24/);
	});
});

describe('Wave A — shell scroll contract + rail instant feedback', () => {
	it('player-shell.css .ps-root uses native document scroll (overflow-y: visible)', () => {
		expect(shellCss).toMatch(/\.ps-root\s*\{[^}]*overflow-y:\s*visible/s);
		expect(shellCss).not.toMatch(/\.ps-scroll-shell\s*\{[^}]*overflow-y:\s*auto/s);
		expect(shellCss).not.toMatch(/\.ps-canvas\s*\{[^}]*overflow-y:\s*auto/s);
	});

	it('PlayerShell.svelte ps-scroll-shell avoids inner scroll flex traps', () => {
		expect(shellSrc).not.toMatch(/class="[^"]*ps-scroll-shell[^"]*tw-overflow-y-auto/);
		expect(shellSrc).not.toMatch(/class="[^"]*ps-scroll-shell[^"]*tw-flex-1/);
	});

	it('player-shell.css rail links have :active press feedback (rubric §1.4)', () => {
		expect(shellCss).toMatch(/\.ps-rail__link:active\s*\{[^}]*transform:\s*scale\(0\.94\)/s);
		expect(shellCss).toMatch(/\.ps-rail__link--hub-active:active/);
		expect(shellCss).toMatch(/\.ps-rail__link--active:active/);
	});

	it('dossier rail :active press includes inset shadow for instant feedback', () => {
		expect(shellCss).toMatch(
			/\.ps-root\.ps-root--dossier \.ps-rail__link:active[\s\S]*?box-shadow:\s*inset/s,
		);
	});

	it('generic pp-card chrome scoped off dossier routes (void-friendly)', () => {
		expect(shellCss).toMatch(
			/\.ps-root:not\(\.ps-root--dossier\):not\(:has\(\.player-dossier-root\)\)\s+:global\(\.bento-card\)/,
		);
	});

	it('billing banner compact styling under dossier shell preserves hierarchy', () => {
		expect(shellCss).toMatch(/\.ps-root\.ps-root--dossier \.prob-banner/);
		expect(shellCss).toMatch(/\.ps-root\.ps-root--dossier \.prob-banner__strip/);
	});
});

describe('Wave A — header grammar guard (Wave E resolved Armory strap debt)', () => {
	it('HQ dashboard uses canonical pd-strap (not qa-strap)', () => {
		expect(dashboardSrc).toMatch(/class="pd-strap/);
		expect(dashboardSrc).not.toMatch(/qa-strap/);
	});

	it('player routes use PlayerOsPageStrap or pd-strap — no qa-strap', () => {
		for (const [route, src] of Object.entries(CANONICAL_STRAP_ROUTES)) {
			expect(src, `${route} must not use qa-strap`).not.toMatch(/\bqa-strap\b/);
		}
	});

	it('Armory uses PlayerOsPageStrap (Wave E — no qa-strap)', () => {
		expect(armorySrc).toMatch(/import PlayerOsPageStrap/);
		expect(armorySrc).toMatch(/<PlayerOsPageStrap/);
		expect(armorySrc).not.toMatch(/\bqa-strap\b/);
	});
});

describe('Wave A — diegetic overlay primitive (Wave D stub)', () => {
	it('PlayerDiegeticOverlay.svelte exists with ProvingGrounds terminal grammar', () => {
		expect(existsSync(OVERLAY)).toBe(true);
		expect(overlaySrc).not.toMatch(/pg-bracket|pg-scanline/);
		expect(overlaySrc).toMatch(/pd-diegetic-overlay/);
		expect(overlaySrc).toMatch(/role="alertdialog"/);
		expect(overlaySrc).not.toMatch(/Swal|sweetalert/i);
	});

	it('PlayerDiegeticOverlay renders confirm panel with diegetic copy when open', () => {
		const { getByRole, getByText } = render(PlayerDiegeticOverlay, {
			props: {
				open: true,
				variant: 'confirm',
				title: 'LOG SESSION',
				message: 'Commit telemetry to operative record?',
				onConfirm: () => {},
				onCancel: () => {},
			},
		});
		expect(getByRole('alertdialog')).toBeTruthy();
		expect(getByText('LOG SESSION')).toBeTruthy();
		expect(getByText(/AWAITING CONFIRMATION/)).toBeTruthy();
		cleanup();
	});

	it('PlayerDiegeticOverlay error variant uses operative alert grammar', () => {
		const { getByText } = render(PlayerDiegeticOverlay, {
			props: {
				open: true,
				variant: 'error',
				title: 'INVALID INPUT',
				message: 'CHECK RANGE',
				onConfirm: () => {},
			},
		});
		expect(getByText(/SYSTEM ALERT/)).toBeTruthy();
		cleanup();
	});
});

describe('Wave A — gap matrix doc hook', () => {
	it('PLAYER_OS_RUBRIC_GAP_MATRIX.md documents Wave A foundation outcomes', () => {
		const gapSrc = existsSync(GAP_MATRIX) ? readFileSync(GAP_MATRIX, 'utf-8') : '';
		expect(gapSrc).toMatch(/Wave A|Session A — Foundation/);
	});
});
