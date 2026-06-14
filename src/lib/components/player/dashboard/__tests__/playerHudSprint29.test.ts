/**
 * playerHudSprint29.test.ts — Sprint 2.9 Player shell dossier alignment (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const STATS_PAGE = join(ROOT, 'routes/(app)/stats/+page.svelte');
const ARMORY_PAGE = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const statsSrc = existsSync(STATS_PAGE) ? readFileSync(STATS_PAGE, 'utf-8') : '';
const armorySrc = existsSync(ARMORY_PAGE) ? readFileSync(ARMORY_PAGE, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

describe('Sprint 2.9 — player-shell.css dossier rail + shell rules', () => {
	it('defines dossier shell class and pd-line / panel rail styling', () => {
		expect(shellCssSrc).toMatch(/\.ps-root\.ps-root--dossier|\.ps-root--dossier/);
		expect(shellCssSrc).toMatch(/rgba\(5,\s*5,\s*10/);
		expect(shellCssSrc).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.1\)/);
	});

	it('uses gold hub-active and teal route-active accents (Armory tab language)', () => {
		expect(shellCssSrc).toMatch(/ps-rail__link--hub-active[\s\S]*251,\s*191,\s*36/);
		expect(shellCssSrc).toMatch(/ps-rail__link--active[\s\S]*20,\s*184,\s*166/);
	});

	it('aligns pathway scroll thumb to dossier teal accent (player-dashboard-hud.css)', () => {
		expect(hudCssSrc).toMatch(/scrollbar-color[\s\S]*14b8a6|#14b8a6/);
		expect(hudCssSrc).toMatch(/opp-preview--void[\s\S]*?scrollbar/);
	});

	it('softens ps-ambient for dossier context via ps-root--dossier', () => {
		expect(shellCssSrc).toMatch(/\.ps-root\.ps-root--dossier[\s\S]*ps-ambient__grid/);
		expect(shellCssSrc).toMatch(/\.ps-root\.ps-root--dossier[\s\S]*ps-ambient__glow/);
	});
});

describe('Sprint 2.9 — PlayerShell dossier shell class', () => {
	it('applies ps-root--dossier on player shell root', () => {
		expect(shellSrc).toMatch(/ps-root--dossier/);
		expect(shellSrc).toMatch(/class="ps-root ps-root--dossier/);
	});

	it('uses ps-canvas-bg instead of inline Tailwind gradient', () => {
		expect(shellSrc).toMatch(/ps-canvas-bg/);
		expect(shellSrc).not.toMatch(/tw-bg-gradient-to-br/);
	});
});

describe('Sprint 2.9 — page wrappers retain player-dossier-root', () => {
	it('stats page declares player-dossier-root', () => {
		expect(statsSrc).toMatch(/player-dossier-root/);
	});

	it('armory page declares player-dossier-root', () => {
		expect(armorySrc).toMatch(/player-dossier-root/);
	});
});

describe('Sprint 2.9 — docs', () => {
	it('PLAYER_OS.md documents Shell alignment (2.9)', () => {
		expect(playerOsSrc).toMatch(/Shell alignment.*2\.9|2\.9.*Shell alignment/i);
		expect(playerOsSrc).toMatch(/ps-root--dossier/);
	});

	it('ROADMAP.md lists Sprint 2.9', () => {
		expect(roadmapSrc).toMatch(/2\.9.*Player shell dossier alignment/i);
	});
});

describe('Sprint 2.9 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint28.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint27.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
