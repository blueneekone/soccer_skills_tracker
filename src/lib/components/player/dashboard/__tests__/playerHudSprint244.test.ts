/**
 * @vitest-environment jsdom
 *
 * playerHudSprint244.test.ts — Player OS rubric redesign Wave D (Train + Settings)
 *
 * Guards: diegetic overlay replaces SweetAlert2 / native confirm on Player Train + Settings;
 * verified-commit celebration; diegetic range sliders; layout regressions from 6j-b / 6h.
 *
 * VA checkboxes remain ☐ until Wave F sign-off.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { render, cleanup } from '@testing-library/svelte';
import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const SETTINGS_PANEL = join(ROOT, 'lib/components/player/PlayerSettingsPanel.svelte');
const OVERLAY = join(ROOT, 'lib/components/player/PlayerDiegeticOverlay.svelte');
const TERMINAL_CSS = join(ROOT, 'lib/styles/player-terminal.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const settingsPanelSrc = existsSync(SETTINGS_PANEL) ? readFileSync(SETTINGS_PANEL, 'utf-8') : '';
const overlaySrc = existsSync(OVERLAY) ? readFileSync(OVERLAY, 'utf-8') : '';
const terminalCss = existsSync(TERMINAL_CSS) ? readFileSync(TERMINAL_CSS, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

const WAVE_D_NEW_CONTENT = [workoutSrc, settingsPanelSrc, overlaySrc, terminalCss].join('\n');
const waveDHudDelta =
	hudCss.match(
		/\.player-hud-root \.pw-theater \.pw-exec\.pw-exec--transmit:active:not\(:disabled\)[\s\S]*?\n\}/,
	)?.[0] ?? '';

describe('Wave D — Train Swal removal + diegetic overlay', () => {
	it('workout/+page.svelte has no sweetalert2 / Swal import or usage', () => {
		expect(workoutSrc).not.toMatch(/\bsweetalert2\b/i);
		expect(workoutSrc).not.toMatch(/\bSwal\b/);
		expect(workoutSrc).not.toMatch(/Swal\.fire/);
	});

	it('workout page imports and uses PlayerDiegeticOverlay', () => {
		expect(workoutSrc).toMatch(/import PlayerDiegeticOverlay/);
		expect(workoutSrc).toMatch(/<PlayerDiegeticOverlay/);
		expect(workoutSrc).toMatch(/overlayOpen|overlayVariant|overlayTitle/);
	});

	it('workout success path references dopamineOnCommit and celebration after commit', () => {
		expect(workoutSrc).toMatch(/dopamineOnCommit/);
		expect(workoutSrc).toMatch(/dopamineOnCallable/);
		expect(workoutSrc).toMatch(/showDiegeticSuccess|variant:\s*'success'/);
	});

	it('workout validation and error paths use diegetic overlay (not Swal)', () => {
		expect(workoutSrc).toMatch(/showDiegeticError/);
		expect(workoutSrc).toMatch(/workoutLogErrorMessage/);
		expect(workoutSrc).toMatch(/validatePlayerWorkoutLog/);
	});
});

describe('Wave D — Settings phone unlink diegetic confirm', () => {
	it('PlayerSettingsPanel.svelte has no native confirm() call', () => {
		expect(settingsPanelSrc).not.toMatch(/\bconfirm\s*\(/);
	});

	it('settings panel imports and uses PlayerDiegeticOverlay for unlink', () => {
		expect(settingsPanelSrc).toMatch(/import PlayerDiegeticOverlay/);
		expect(settingsPanelSrc).toMatch(/<PlayerDiegeticOverlay/);
		expect(settingsPanelSrc).toMatch(/unlinkConfirmOpen|confirmUnlinkPhone/);
		expect(settingsPanelSrc).toMatch(/Unlink verified phone/);
	});

	it('settings panel retains PlayerOsToggle / PlayerOsInput / PlayerOsTabRail controls', () => {
		expect(settingsPanelSrc).toMatch(/PlayerOsTabRail/);
		expect(settingsPanelSrc).toMatch(/PlayerOsInput/);
		expect(settingsPanelSrc).toMatch(/PlayerOsToggle/);
		expect(settingsPanelSrc).not.toMatch(/<input[^>]*type="checkbox"/);
	});
});

describe('Wave D — diegetic range sliders + commit press states', () => {
	it('.pw-range diegetic track + thumb rules in player-terminal.css (not appearance-only)', () => {
		expect(terminalCss).toMatch(/Wave D — Train diegetic range sliders/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-range::-webkit-slider-runnable-track/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-range::-webkit-slider-thumb/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-range::-moz-range-track/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-range::-moz-range-thumb/);
		expect(terminalCss).toMatch(/\.player-hud-root \.pw-range:active/);
	});

	it('Train commit button has :active press feedback in hud CSS', () => {
		expect(hudCss).toMatch(/\.player-hud-root \.pw-theater \.pw-exec\.pw-exec--transmit:active:not\(:disabled\)/);
	});
});

describe('Wave D — Train layout regressions (6j-b / 6h)', () => {
	it('workout hero deck preserves pw-theater pd-os-deck--hero', () => {
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
	});

	it('workout page has no pg-scanline anywhere (G9 — Train Execute surface)', () => {
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
		expect(workoutSrc).not.toMatch(/pg-scanline/);
	});

	it('workout page uses native document scroll (no inner overflow traps)', () => {
		expect(hudCss).toMatch(/\.player-hud-root\.pw-page[\s\S]*?overflow:\s*visible/);
		expect(workoutSrc).not.toMatch(/overflow-y:\s*auto/);
	});
});

describe('Wave D — accent canon guard', () => {
	it('Wave D new content has no #00d4ff cyan literals', () => {
		const scoped = WAVE_D_NEW_CONTENT + waveDHudDelta;
		expect(scoped).not.toMatch(/#00d4ff/i);
		expect(scoped).not.toMatch(/0,\s*212,\s*255/);
	});
});

describe('Wave D — overlay component variants', () => {
	it('PlayerDiegeticOverlay success variant renders mission-complete grammar', () => {
		const { getByText } = render(PlayerDiegeticOverlay, {
			props: {
				open: true,
				variant: 'success',
				title: 'Command executed',
				message: '+120 XP · Level 4',
				onConfirm: () => {},
			},
		});
		expect(getByText(/MISSION COMPLETE/)).toBeTruthy();
		expect(getByText('Command executed')).toBeTruthy();
		cleanup();
	});

	it('PlayerDiegeticOverlay error variant renders system alert grammar', () => {
		const { getByText } = render(PlayerDiegeticOverlay, {
			props: {
				open: true,
				variant: 'error',
				title: 'Execution failed',
				message: 'Profile incomplete.',
				onConfirm: () => {},
			},
		});
		expect(getByText(/SYSTEM ALERT/)).toBeTruthy();
		cleanup();
	});
});

describe('Wave D — ROADMAP status', () => {
	it('ROADMAP marks Wave D Done; Wave E Done or planned (superseded by Wave E/F sprints)', () => {
		expect(roadmapSrc).toMatch(/\|\s*D\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/\|\s*E\s*\|\s*\*\*Done\*\*|\|\s*E\s*\|\s*Planned/);
		expect(roadmapSrc).toMatch(/Wave D.*Done|Wave D′.*Done|Wave B′|Wave E|Wave F/i);
	});
});
