/**
 * playerHudSprint213.test.ts — Sprint 2.13 Player OS Chrome (shell-level premium)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const STRAP = join(ROOT, 'lib/components/player/PlayerOsPageStrap.svelte');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const TRACKER = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const SKILL_TREE = join(ROOT, 'routes/(app)/player/skill-tree/+page.svelte');
const SETTINGS = join(ROOT, 'routes/(app)/player/settings/+page.svelte');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const strapSrc = existsSync(STRAP) ? readFileSync(STRAP, 'utf-8') : '';
const dashboardSrc = existsSync(DASHBOARD) ? readFileSync(DASHBOARD, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const trackerSrc = existsSync(TRACKER) ? readFileSync(TRACKER, 'utf-8') : '';
const skillTreeSrc = existsSync(SKILL_TREE) ? readFileSync(SKILL_TREE, 'utf-8') : '';
const settingsSrc = existsSync(SETTINGS) ? readFileSync(SETTINGS, 'utf-8') : '';
const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

const PLAYER_ROUTES = [
	{ name: 'dashboard', src: () => dashboardSrc },
	{ name: 'armory', src: () => armorySrc },
	{ name: 'workout', src: () => workoutSrc },
	{ name: 'tracker', src: () => trackerSrc },
	{ name: 'skill-tree', src: () => skillTreeSrc },
	{ name: 'settings', src: () => settingsSrc },
	{ name: 'stats', src: () => statsSrc },
];

describe('Sprint 2.13 — PlayerShell chrome root', () => {
	it('imports player-dossier.css once at shell level', () => {
		expect(shellSrc).toMatch(/player-dossier\.css/);
	});

	it('applies player-dossier-root pd-grain pd-chrome-root on scroll canvas', () => {
		expect(shellSrc).toMatch(/player-dossier-root/);
		expect(shellSrc).toMatch(/pd-grain/);
		expect(shellSrc).toMatch(/pd-chrome-root/);
		expect(shellSrc).toMatch(/ps-canvas[\s\S]*?pd-chrome-root/);
	});
});

describe('Sprint 2.13 — player-dossier.css route utilities', () => {
	it('defines pd-page-root, pd-page-panel, pd-route-strap, pd-chrome-root', () => {
		expect(dossierCssSrc).toMatch(/\.pd-chrome-root/);
		expect(dossierCssSrc).toMatch(/\.pd-page-root/);
		expect(dossierCssSrc).toMatch(/\.pd-page-panel/);
		expect(dossierCssSrc).toMatch(/\.pd-route-strap/);
	});

	it('pd-page-panel shares premium surface stack with pd-surface-premium', () => {
		expect(dossierCssSrc).toMatch(
			/\.pd-surface-premium[\s\S]*?\.pd-page-panel[\s\S]*?--pd-depth-panel-gradient/,
		);
	});

	it('grain applies on shell canvas (.player-dossier-root.pd-grain)', () => {
		expect(dossierCssSrc).toMatch(/\.player-dossier-root\.pd-grain::before/);
	});
});

describe('Sprint 2.13 — PlayerOsPageStrap (optional reusable strap)', () => {
	it('uses pd-route-strap and dossier typography tokens only', () => {
		expect(strapSrc).toMatch(/pd-route-strap/);
		expect(strapSrc).toMatch(/pd-eyebrow/);
		expect(strapSrc).not.toMatch(/VANGUARD SETTINGS TERMINAL/);
	});
});

describe('Sprint 2.13 — player routes use page root + premium panels', () => {
	it.each(PLAYER_ROUTES)('$name references pd-page-root or premium panel class', ({ src }) => {
		const code = src();
		expect(code).toMatch(/pd-page-root|pd-surface-premium|pd-page-panel/);
	});

	it('workout uses pw-theater pd-os-deck hero on primary log panels', () => {
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero/);
	});

	it('armory tab panels use pd-os-deck', () => {
		expect(armorySrc).toMatch(/qa-card[\s\S]*?pd-os-deck/);
		expect(armorySrc).toMatch(/armoryWorkspace === 'studio'[\s\S]*?pd-os-deck/);
	});

	it('player settings route uses pd-page-panel', () => {
		expect(settingsSrc).toMatch(/pd-page-panel|PlayerSettingsPanel/);
		expect(settingsSrc).toMatch(/pd-page-root/);
	});
});

describe('Sprint 2.13 — HQ grain dedupe', () => {
	it('shell canvas owns primary pd-grain (page may add lobby-page grain)', () => {
		expect(shellSrc).toMatch(/pd-grain/);
		expect(dashboardSrc).toMatch(/player-hud-root/);
	});
});

describe('Sprint 2.13 — docs + ROADMAP', () => {
	it('ROADMAP marks 2.13 Done', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.13\s*\|\s*Done/i);
	});

	it('PLAYER_OS.md marks 2.13 shipped', () => {
		expect(playerOsSrc).toMatch(/2\.13[\s\S]*?(shipped|Player OS Chrome)/i);
	});
});

describe('Sprint 2.13 — prior sprint tests preserved', () => {
	const priorTests = [
		'playerHudSprint2121.test.ts',
		'playerHudSprint212.test.ts',
		'playerHudSprint2111.test.ts',
		'playerHudSprint211.test.ts',
		'playerHudSprint29.test.ts',
	];

	it.each(priorTests)('%s still on disk', (file) => {
		expect(existsSync(join(__dirname, file))).toBe(true);
	});
});
