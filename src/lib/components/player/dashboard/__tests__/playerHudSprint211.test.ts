/**
 * playerHudSprint211.test.ts — Sprint 2.11 Player OS route parity (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT_PAGE = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const SETTINGS_PAGE = join(ROOT, 'routes/(app)/player/settings/+page.svelte');
const LEGACY_SETTINGS_PAGE = join(ROOT, 'routes/(app)/settings/+page.svelte');
const TRACKER_PAGE = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const SKILL_TREE_PAGE = join(ROOT, 'routes/(app)/player/skill-tree/+page.svelte');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const workoutSrc = existsSync(WORKOUT_PAGE) ? readFileSync(WORKOUT_PAGE, 'utf-8') : '';
const settingsSrc = existsSync(SETTINGS_PAGE) ? readFileSync(SETTINGS_PAGE, 'utf-8') : '';
const legacySettingsSrc = existsSync(LEGACY_SETTINGS_PAGE)
	? readFileSync(LEGACY_SETTINGS_PAGE, 'utf-8')
	: '';
const trackerSrc = existsSync(TRACKER_PAGE) ? readFileSync(TRACKER_PAGE, 'utf-8') : '';
const skillTreeSrc = existsSync(SKILL_TREE_PAGE) ? readFileSync(SKILL_TREE_PAGE, 'utf-8') : '';
const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.11 — secondary player routes declare player-dossier-root', () => {
	it('workout page uses player-dossier-root (shell + page)', () => {
		expect(workoutSrc).toMatch(/player-dossier-root/);
	});

	it('tracker page uses player-dossier-root', () => {
		expect(trackerSrc).toMatch(/player-dossier-root/);
		expect(trackerSrc).not.toMatch(/import '\$lib\/styles\/player-dossier\.css'/);
	});

	it('skill-tree page uses player-dossier-root', () => {
		expect(skillTreeSrc).toMatch(/player-dossier-root/);
	});

	it('player settings route uses player-dossier-root', () => {
		expect(settingsSrc).toMatch(/player-dossier-root/);
		expect(settingsSrc).toMatch(/ps-settings-root/);
	});
});

describe('Sprint 2.11 — workout dossier remap (no SIEM canvas)', () => {
	it('does not use --vanguard-bg #0B0F19 as page canvas', () => {
		expect(workoutSrc).not.toMatch(/--vanguard-bg,\s*#0B0F19/);
		expect(workoutSrc).not.toMatch(/background:\s*var\(--vanguard-bg,\s*#0B0F19\)/);
	});

	it('uses route strap with Train / Log session eyebrow', () => {
		expect(workoutSrc).toMatch(/pd-route-strap|PlayerOsPageStrap/);
		expect(workoutSrc).toMatch(/Train \/ Log session/);
	});

	it('maps surfaces to player-hud-root + pd-os-deck hero theater', () => {
		expect(workoutSrc).toMatch(/player-hud-root/);
		expect(workoutSrc).toMatch(/pd-os-deck--hero|pd-os-deck/);
	});

	it('execute well uses pw-theater execute band (supersedes qa-btn--ready)', () => {
		expect(workoutSrc).toMatch(/pw-theater__execute/);
	});
});

describe('Sprint 2.11 — settings player dossier tone', () => {
	it('player settings route uses PlayerOsPageStrap instead of VANGUARD SETTINGS TERMINAL', () => {
		expect(settingsSrc).toMatch(/PlayerOsPageStrap/);
		expect(settingsSrc).not.toMatch(/VANGUARD SETTINGS TERMINAL/);
	});

	it('legacy /settings redirects players to /player/settings', () => {
		expect(legacySettingsSrc).toMatch(/goto\(['"]\/player\/settings['"]/);
	});
});

describe('Sprint 2.11 — tracker stat cells', () => {
	it('replaces gw-hud with pd-stat-row and hud-stat-cell', () => {
		expect(trackerSrc).not.toMatch(/gw-hud/);
		expect(trackerSrc).toMatch(/pd-stat-row/);
		expect(trackerSrc).toMatch(/HudStatCell|hud-stat-cell/);
	});

	it('does not use purple gradient level text', () => {
		expect(trackerSrc).not.toMatch(/gw-hud__value--level/);
		expect(trackerSrc).not.toMatch(/#a855f7/);
	});
});

describe('Sprint 2.11 — skill-tree dossier panels', () => {
	it('replaces st-shell with player-dossier-root', () => {
		expect(skillTreeSrc).not.toMatch(/class="st-shell/);
		expect(skillTreeSrc).toMatch(/player-dossier-root/);
	});

	it('secondary cells use premium panel class not slate glass stacks', () => {
		expect(skillTreeSrc).toMatch(/pd-page-panel|pd-panel/);
		expect(skillTreeSrc).not.toMatch(/tw-bg-slate-900\/50 tw-backdrop-blur-md/);
	});
});

describe('Sprint 2.11 — shared pd-stat-row utility', () => {
	it('player-dossier.css defines pd-stat-row', () => {
		expect(dossierCssSrc).toMatch(/\.pd-stat-row/);
	});
});

describe('Sprint 2.11 — docs', () => {
	it('PLAYER_OS.md lists all player route roots and marks route parity complete', () => {
		expect(playerOsSrc).toMatch(/2\.11|Route parity/i);
		expect(playerOsSrc).toMatch(/\/player\/workout/);
		expect(playerOsSrc).toMatch(/\/player\/tracker/);
		expect(playerOsSrc).toMatch(/\/player\/skill-tree/);
		expect(playerOsSrc).toMatch(/\/player\/settings/);
	});
});

describe('Sprint 2.11 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint29.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint2102.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
