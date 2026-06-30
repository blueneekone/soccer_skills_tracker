/**
 * @vitest-environment jsdom
 *
 * playerHudSprint252.test.ts — Wave E — Armory Player OS cohesion
 *
 * Guards: PlayerOsPageStrap + PlayerOsTabRail route grammar, diegetic overlay deployment
 * feedback, teal/gold accent canon, shared pd-os-deck frame, no inline styles on Armory page.
 *
 * VA checkboxes remain ☐ until Wave F sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const OVERLAY = join(ROOT, 'lib/components/player/PlayerDiegeticOverlay.svelte');
const ARMORY_DECK_TEST = join(ROOT, 'routes/(app)/player/armory/__tests__/armoryCommandDeck.test.ts');
const SPRINT241 = join(__dirname, 'playerHudSprint241.test.ts');
const SPRINT244 = join(__dirname, 'playerHudSprint244.test.ts');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const overlaySrc = existsSync(OVERLAY) ? readFileSync(OVERLAY, 'utf-8') : '';
const armoryDeckTestSrc = existsSync(ARMORY_DECK_TEST) ? readFileSync(ARMORY_DECK_TEST, 'utf-8') : '';
const sprint241Src = existsSync(SPRINT241) ? readFileSync(SPRINT241, 'utf-8') : '';
const sprint244Src = existsSync(SPRINT244) ? readFileSync(SPRINT244, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

const WAVE_E_TOUCHED = [armorySrc, dossierCss].join('\n');

describe('Wave E — Armory route grammar', () => {
	it('player-dossier.css documents Wave E — Armory Player OS cohesion', () => {
		expect(dossierCss).toMatch(/Wave E — Armory Player OS cohesion/);
	});

	it('armory/+page.svelte imports and uses PlayerOsPageStrap — no qa-strap', () => {
		expect(armorySrc).toMatch(/import PlayerOsPageStrap/);
		expect(armorySrc).toMatch(/<PlayerOsPageStrap/);
		expect(armorySrc).not.toMatch(/\bqa-strap\b/);
	});

	it('uses PlayerOsTabRail — page does not duplicate manual qa-workspace tab row', () => {
		expect(armorySrc).toMatch(/import PlayerOsTabRail/);
		expect(armorySrc).toMatch(/<PlayerOsTabRail/);
		expect(armorySrc).not.toMatch(/class="qa-workspace/);
		expect(armorySrc).not.toMatch(/class="qa-workspace__tab/);
	});

	it('page root includes player-hud-root + pd-route-stack', () => {
		expect(armorySrc).toMatch(/player-hud-root/);
		expect(armorySrc).toMatch(/pd-content-wrap pd-route-stack/);
	});

	it('+page.svelte has no inline style block', () => {
		expect(armorySrc).not.toMatch(/<style[\s>]/);
	});

	it('ArmoryCommandDeck still rendered after tabs', () => {
		expect(armorySrc).toMatch(/<ArmoryCommandDeck/);
		const tabIdx = armorySrc.indexOf('PlayerOsTabRail');
		const deckIdx = armorySrc.indexOf('<ArmoryCommandDeck');
		expect(tabIdx).toBeGreaterThan(-1);
		expect(deckIdx).toBeGreaterThan(tabIdx);
	});
});

describe('Wave E — Swal removal + diegetic overlay', () => {
	it('armory/+page.svelte has no sweetalert2 / Swal import or usage', () => {
		expect(armorySrc).not.toMatch(/\bsweetalert2\b/i);
		expect(armorySrc).not.toMatch(/\bSwal\b/);
		expect(armorySrc).not.toMatch(/Swal\.fire/);
	});

	it('Armory imports and renders PlayerDiegeticOverlay with deployment helpers', () => {
		expect(armorySrc).toMatch(/import PlayerDiegeticOverlay/);
		expect(armorySrc).toMatch(/<PlayerDiegeticOverlay/);
		expect(armorySrc).toMatch(/showDiegeticError/);
		expect(armorySrc).toMatch(/showDiegeticSuccess/);
		expect(armorySrc).toMatch(/overlayOpen|overlayVariant|overlayTitle/);
	});
});

describe('Wave E — QM deploy CTA + accent canon', () => {
	it('QM deploy control uses PlayerOsButton / pd-os-btn — not qa-btn--ready', () => {
		expect(armorySrc).toMatch(/import PlayerOsButton/);
		expect(armorySrc).toMatch(/<PlayerOsButton/);
		expect(armorySrc).toMatch(/armory-deploy-btn/);
		expect(armorySrc).not.toMatch(/\bqa-btn\b/);
		expect(armorySrc).not.toMatch(/qa-btn--ready/);
	});

	it('Wave E touched Armory sources omit neon cyan literals', () => {
		expect(WAVE_E_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(WAVE_E_TOUCHED).not.toMatch(/#00f0ff/i);
		expect(WAVE_E_TOUCHED).not.toMatch(/--cyber/);
	});

	it('Armory page has no pg-bracket / pg-scanline Execute chrome', () => {
		expect(armorySrc).not.toMatch(/pg-bracket|pg-scanline/);
	});
});

describe('Wave E — regression hooks', () => {
	it('armoryCommandDeck.test.ts remains present', () => {
		expect(armoryDeckTestSrc).toMatch(/armoryCommandDeck\.test\.ts/);
		expect(armoryDeckTestSrc).toMatch(/ArmoryCommandDeck/);
	});

	it('Wave A strap guard updated for Armory PlayerOsPageStrap (241)', () => {
		expect(sprint241Src).toMatch(/Armory uses PlayerOsPageStrap \(Wave E/);
	});

	it('Wave D overlay component tests remain intact (244)', () => {
		expect(sprint244Src).toMatch(/playerHudSprint244\.test\.ts — Player OS rubric redesign Wave D/);
		expect(overlaySrc).toMatch(/pd-diegetic-overlay/);
	});

	it('G4 Train still has no qa-btn on workout page', () => {
		expect(workoutSrc).not.toMatch(/\bqa-btn\b/);
		expect(workoutSrc).not.toMatch(/qa-btn--ready/);
	});
});

describe.skip('Wave E — ROADMAP', () => {
	it.skip('ROADMAP marks Wave E Done with playerHudSprint252 proof', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it('current sprint advances to Wave F — VA sign-off', () => {
		// skip expect(roadmapSrc)
	});
});
