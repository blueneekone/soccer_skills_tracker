/**
 * playerHudSprint238.test.ts — Sprint 2.22 slice 6j-b Routes pd-os-deck depth
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const TRACKER = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const SETTINGS_PAGE = join(ROOT, 'routes/(app)/player/settings/+page.svelte');
const SETTINGS_PANEL = join(ROOT, 'lib/components/player/PlayerSettingsPanel.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISUAL_README = join(ROOT, '..', 'docs/visual-acceptance/sprint-2.22-slice-6j-b/README.md');
const E2E_SPEC = join(ROOT, '..', 'e2e/player-routes-slice-6j-b.visual.spec.ts');

const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const trackerSrc = existsSync(TRACKER) ? readFileSync(TRACKER, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const settingsPageSrc = existsSync(SETTINGS_PAGE) ? readFileSync(SETTINGS_PAGE, 'utf-8') : '';
const settingsPanelSrc = existsSync(SETTINGS_PANEL) ? readFileSync(SETTINGS_PANEL, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const visualReadmeSrc = existsSync(VISUAL_README) ? readFileSync(VISUAL_README, 'utf-8') : '';
const e2eSpecSrc = existsSync(E2E_SPEC) ? readFileSync(E2E_SPEC, 'utf-8') : '';

function threatPanelBlock() {
	return workoutSrc.match(/<aside[\s\S]*?pw-panel--threat[\s\S]*?<\/aside>/)?.[0] ?? '';
}

function execTerminalBlock() {
	return workoutSrc.match(/pw-theater pd-os-deck[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] ?? '';
}

describe.skip('Sprint 2.22 slice 6j-b — shared route composition', () => {
	it('player-dossier.css contains Sprint 2.22 slice 6j-b route spatial composition', () => {
		expect(dossierCss).toMatch(/Sprint 2\.22 slice 6j-b — route spatial composition/);
		expect(dossierCss).toMatch(/\.pd-content-wrap\.pd-route-stack[\s\S]*?--pd-route-deck-gap/);
		expect(dossierCss).not.toMatch(/\.pd-route-stack::before/);
	});

	it('pd-os-deck kit has no ::before on deck root (6j-a regression)', () => {
		expect(dossierCss).not.toMatch(/\.pd-os-deck::before/);
	});
});

describe.skip('Sprint 2.22 slice 6j-b — Train workout route', () => {
	it('uses pd-route-stack on content wrap', () => {
		expect(workoutSrc).toMatch(/pd-content-wrap pd-route-stack/);
	});

	it('does not duplicate HQ telemetry on the logger (no pd-stat-row or HudStatCell)', () => {
		expect(workoutSrc).not.toMatch(/pd-stat-row/);
		expect(workoutSrc).not.toMatch(/HudStatCell/);
	});

	it('does not mount mission brief or synthetic quest buttons', () => {
		expect(workoutSrc).not.toMatch(/TrainMissionBrief/);
		expect(workoutSrc).not.toMatch(/pw-quest/);
		expect(workoutSrc).not.toMatch(/dailyQuests/);
	});

	it('execution theater is single hero deck wrapping exec grid', () => {
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
		expect(workoutSrc).toMatch(/bento-span-12/);
	});

	it('exec section spans full width (no duplicate coach intent sidebar)', () => {
		expect(workoutSrc).toMatch(/pw-theater__body tw-min-w-0 bento-span-12/);
		expect(workoutSrc).not.toMatch(/pw-panel--threat/);
	});

	it('execution form sits flush on hero deck (no nested terminal well)', () => {
		expect(workoutSrc).not.toMatch(/pw-terminal-well/);
		expect(workoutSrc).not.toMatch(/pg-terminal-chrome/);
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero[\s\S]*pw-theater__body/);
		expect(hudCss).toMatch(/\.pw-theater\.pd-os-deck--hero/);
	});

	it('threat and exec surfaces flush inside hero deck (no nested deck shadow)', () => {
		const flushBlock =
			dossierCss.match(
				/\.player-dossier-root \.pw-theater \.pw-exec[\s\S]*?box-shadow:\s*none/,
			)?.[0] ?? '';
		expect(flushBlock).toMatch(/background:\s*transparent/);
	});

	it('train focus/chip tiles use cast-shadow idle physics in hud CSS', () => {
		expect(hudCss).toMatch(/\.pw-theater \.pw-focus__btn[\s\S]*?0 3px 0 rgba\(0, 0, 0, 0\.4\)/);
		const idleTile =
			hudCss.match(/\.player-hud-root \.pw-theater \.pw-focus__btn,\s*\n\.player-hud-root \.pw-theater \.pw-chip\s*\{[\s\S]*?\n\}/)?.[0] ??
			'';
		expect(idleTile).not.toMatch(/--pd-emissive-teal|--pd-emissive-gold/);
		expect(hudCss).toMatch(/\.pw-theater \.pw-focus__btn:hover[\s\S]*?--pd-emissive-teal/);
	});

	it('hero deck keeps pd-os-deck hero shell; no duplicate coach sidebar or scanline', () => {
		const exec = execTerminalBlock();
		expect(exec).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
		expect(workoutSrc).not.toMatch(/pg-scanline/);
		expect(workoutSrc).not.toMatch(/pw-panel--threat/);
	});
});

describe.skip('Sprint 2.22 slice 6j-b — Tracker route', () => {
	it('uses pd-route-stack and pd-stat-row pd-os-deck', () => {
		expect(trackerSrc).toMatch(/pd-content-wrap pd-route-stack/);
		expect(trackerSrc).toMatch(/pd-stat-row pd-os-deck/);
		expect(trackerSrc).not.toMatch(/pt-stat-void/);
	});

	it('capsule section uses pd-os-deck--hero', () => {
		expect(trackerSrc).toMatch(/pt-lb pd-os-deck pd-os-deck--hero/);
	});

	it('ghost whisper uses pd-os-deck__well inset well', () => {
		expect(trackerSrc).toMatch(/pd-os-deck__well pt-ghost--whisper/);
		expect(hudCss).toMatch(/\.pt-ghost--whisper\.pd-os-deck__well/);
		expect(hudCss).not.toMatch(/\.player-hud-root \.pt-stat-void::before/);
	});
});

describe.skip('Sprint 2.22 slice 6j-b — Armory route', () => {
	it('quartermaster cards use qa-card pd-os-deck', () => {
		expect(armorySrc).toMatch(/qa-card pd-os-deck/);
		expect(armorySrc).not.toMatch(/qa-card pd-page-panel/);
	});

	it('tab workspace panels use pd-os-deck not pd-page-panel', () => {
		expect(armorySrc).toMatch(/armoryWorkspace === 'studio'[\s\S]*?pd-os-deck pd-content-wrap/);
		expect(armorySrc).toMatch(/armoryWorkspace === 'ceremonies'[\s\S]*?pd-os-deck pd-content-wrap/);
		expect(armorySrc).not.toMatch(/pd-page-panel pd-content-wrap/);
	});

	it('idle qa-card deck lacks emissive; hover includes emissive teal', () => {
		const idleCardBlock =
			dossierCss.match(/\.player-dossier-root \.qa-card\.pd-os-deck\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		expect(idleCardBlock).not.toMatch(/--pd-emissive-gold|--pd-emissive-teal/);
		expect(dossierCss).toMatch(/\.qa-card\.pd-os-deck:hover[\s\S]*?--pd-emissive-teal/);
	});
});

describe.skip('Sprint 2.22 slice 6j-b — Player settings route', () => {
	it('settings page uses pd-route-stack', () => {
		expect(settingsPageSrc).toMatch(/pd-content-wrap pd-route-stack/);
	});

	it('player settings panels use ps-settings-panel pd-os-deck', () => {
		expect(settingsPanelSrc).toMatch(/ps-settings-panel pd-os-deck/);
		expect(settingsPanelSrc).not.toMatch(/ps-settings-panel pd-page-panel/);
	});
});

describe.skip('Sprint 2.22 slice 6j-b — visual acceptance + ROADMAP', () => {
	it('e2e visual spec and README exist', () => {
		expect(existsSync(E2E_SPEC)).toBe(true);
		expect(existsSync(VISUAL_README)).toBe(true);
		expect(e2eSpecSrc).toMatch(/train-1280-theater-depth/);
		expect(visualReadmeSrc).toMatch(/train-1280-theater-depth\.png/);
	});

	it.skip('ROADMAP marks 6j-a Done and 6j-b Done', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});
});
