/**
 * playerHudSprint2161.test.ts — Sprint 2.16.1 Player Settings cohesion shell
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const PLAYER_SETTINGS_PAGE = join(ROOT, 'routes/(app)/player/settings/+page.svelte');
const SETTINGS_PAGE = join(ROOT, 'routes/(app)/settings/+page.svelte');
const PANEL = join(ROOT, 'lib/components/player/PlayerSettingsPanel.svelte');
const HANDLERS = join(ROOT, 'lib/settings/playerSettingsHandlers.ts');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const MATERIAL_SPATIAL = join(ROOT, '..', 'docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md');

const playerSettingsPageSrc = existsSync(PLAYER_SETTINGS_PAGE)
	? readFileSync(PLAYER_SETTINGS_PAGE, 'utf-8')
	: '';
const settingsPageSrc = existsSync(SETTINGS_PAGE) ? readFileSync(SETTINGS_PAGE, 'utf-8') : '';
const panelSrc = existsSync(PANEL) ? readFileSync(PANEL, 'utf-8') : '';
const handlersSrc = existsSync(HANDLERS) ? readFileSync(HANDLERS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const materialSpatialSrc = existsSync(MATERIAL_SPATIAL)
	? readFileSync(MATERIAL_SPATIAL, 'utf-8')
	: '';

describe('Sprint 2.16.1 — /player/settings route shell', () => {
	it('route exists and uses PlayerOsPageStrap + PlayerSettingsPanel + pd-content-wrap', () => {
		expect(existsSync(PLAYER_SETTINGS_PAGE)).toBe(true);
		expect(playerSettingsPageSrc).toMatch(/PlayerOsPageStrap/);
		expect(playerSettingsPageSrc).toMatch(/PlayerSettingsPanel/);
		expect(playerSettingsPageSrc).toMatch(/pd-content-wrap/);
		expect(playerSettingsPageSrc).toMatch(/ps-settings-root/);
	});
});

describe('Sprint 2.16.1 — PlayerSettingsPanel', () => {
	it('exists and does not import OperativeAvatarDesigner', () => {
		expect(existsSync(PANEL)).toBe(true);
		expect(panelSrc).not.toMatch(/OperativeAvatarDesigner/);
		expect(panelSrc).toMatch(/OperativeAvatarPreview/);
		expect(panelSrc).toMatch(/\/player\/armory\?tab=studio|tab=studio/);
	});

	it('uses pd-panel-section (not st-section-label)', () => {
		expect(panelSrc).toMatch(/pd-panel-section/);
		expect(panelSrc).not.toMatch(/st-section-label/);
	});
});

describe('Sprint 2.16.1 — legacy /settings player redirect', () => {
	it('redirects players to /player/settings', () => {
		expect(settingsPageSrc).toMatch(/goto\(['"]\/player\/settings['"][\s\S]*?replaceState:\s*true/);
		expect(settingsPageSrc).toMatch(/role === 'player'/);
	});

	it('still contains VANGUARD SETTINGS TERMINAL for non-player path', () => {
		expect(settingsPageSrc).toMatch(/VANGUARD SETTINGS TERMINAL/);
		expect(settingsPageSrc).toMatch(/st-header/);
	});
});

describe('Sprint 2.16.1 — PlayerShell nav + billing gate', () => {
	it('playerPrimaryNav includes /player/settings', () => {
		expect(shellSrc).toMatch(/playerPrimaryNav/);
		const navSrc = readFileSync(
			join(ROOT, 'lib/player/shell/playerPrimaryNav.ts'),
			'utf-8',
		);
		expect(navSrc).toMatch(/href:\s*['"]\/player\/settings['"]/);
		expect(navSrc).not.toMatch(/href:\s*['"]\/settings['"][\s\S]*?label:\s*['"]Settings['"]/);
	});

	it('billing gate redirects to /player/settings when Train blocked', () => {
		expect(shellSrc).toMatch(/goto\(['"]\/player\/settings['"]\)/);
	});
});

describe('Sprint 2.16.1 — ps-settings CSS (no 740px cap)', () => {
	it('ps-settings-root has no max-width: 740px', () => {
		const settingsBlock =
			dossierCssSrc.match(/\.player-dossier-root\.ps-settings-root[\s\S]*?(?=\/\* Sprint 2\.16 — mobile|$)/)?.[0] ??
			'';
		expect(settingsBlock).toMatch(/max-width:\s*none/);
		expect(settingsBlock).not.toMatch(/740px/);
		expect(dossierCssSrc).toMatch(/\.ps-settings-tabs/);
		expect(dossierCssSrc).toMatch(/\.ps-settings-btn/);
	});
});

describe('Sprint 2.16.1 — shared handlers module', () => {
	it('playerSettingsHandlers exports saveProfile', () => {
		expect(existsSync(HANDLERS)).toBe(true);
		expect(handlersSrc).toMatch(/export async function saveProfile/);
	});
});

describe('Sprint 2.16.1 — ROADMAP + MATERIAL_SPATIAL docs', () => {
	it('ROADMAP marks 2.16.1 Done with proof test path', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.16\.1\s*\|\s*Done/i);
		expect(roadmapSrc).toMatch(/playerHudSprint2161\.test\.ts/);
	});

	it('PLAYER_OS_MATERIAL_SPATIAL header grammar references /player/settings', () => {
		expect(materialSpatialSrc).toMatch(/\/player\/settings|Settings \(player\)/i);
	});
});
