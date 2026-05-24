/**
 * playerHudSprint226.test.ts — Sprint 2.22 slice 5 atmosphere / void tokens (Z0 canvas + Z2 fill)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');

const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';

/** Dossier-scoped grid rule block in player-shell.css */
function dossierGridRuleBlock(src: string): string {
	return (
		src.match(
			/\.ps-root:has\(\.player-dossier-root\) \.ps-ambient__grid[\s\S]*?\}/,
		)?.[0] ??
		src.match(/\.ps-root\.ps-root--dossier \.ps-ambient__grid[\s\S]*?\}/)?.[0] ??
		''
	);
}

describe('Sprint 2.22 slice 5 — atmosphere token guards', () => {
	it('player-shell.css contains Sprint 2.22 slice 5 comment block', () => {
		expect(shellCssSrc).toMatch(/Sprint 2\.22 slice 5 — atmosphere \/ void amplification/);
	});

	it('dossier .ps-ambient__grid opacity >= 0.48', () => {
		const block = dossierGridRuleBlock(shellCssSrc);
		expect(block).toMatch(/opacity:\s*0\.(?:5|6|7|8|9)/);
	});

	it('dossier .ps-ambient__glow opacity >= 0.32', () => {
		expect(shellCssSrc).toMatch(
			/ps-root[^\n]*dossier[^\n]*[\s\S]*?ps-ambient__glow[\s\S]*?opacity:\s*0\.3[4-9]/,
		);
	});

	it('scanlines opacity >= 0.08 and <= 0.10 on ps-ambient::after only', () => {
		const scanlineBlock =
			shellCssSrc.match(/ps-ambient::after[\s\S]*?\}/)?.[0] ??
			shellCssSrc.match(/\.ps-ambient::after[\s\S]*?\}/)?.[0] ??
			'';
		expect(scanlineBlock).toMatch(/opacity:\s*0\.0[89]/);
		expect(scanlineBlock).not.toMatch(/opacity:\s*0\.1[1-9]/);
	});

	it('.ps-canvas-bg opacity <= 0.16 under dossier shell', () => {
		const canvasBlock =
			shellCssSrc.match(
				/ps-root[^\n]*dossier[^\n]*[\s\S]*?ps-canvas-bg[\s\S]*?opacity:\s*[\d.]+/,
			)?.[0] ?? '';
		expect(canvasBlock).toMatch(/opacity:\s*0\.1[0-6]/);
	});

	it('player-dossier.css contains Sprint 2.22 slice 5 void-first panel gradient', () => {
		expect(dossierCssSrc).toMatch(/Sprint 2\.22 slice 5 — void-first panel gradient/);
	});

	it('--pd-depth-panel-gradient uses #000 or color-mix toward #000 at outer stops', () => {
		const gradientBlock =
			dossierCssSrc.match(/--pd-depth-panel-gradient:[\s\S]*?\);/)?.[0] ?? '';
		expect(gradientBlock).toMatch(/#000000|color-mix\(in srgb[^)]*#000\)/);
		expect(gradientBlock).toMatch(/color-mix\(in srgb[^)]*#000\)/);
	});
});

describe('Sprint 2.22 slice 5 — regression guards', () => {
	it('playerHudSprint218 spatial canvas rules still pass (scanlines on atmosphere, ps-ambient grid exists)', () => {
		expect(shellCssSrc).toMatch(/repeating-linear-gradient/);
		expect(shellCssSrc).toMatch(/ps-ambient::after/);
		expect(shellCssSrc).toMatch(/\.ps-ambient__grid/);
	});

	it('playerHudSprint220 scroll contract still pass (no overflow-y: hidden on ps-root, ps-ambient position: fixed)', () => {
		expect(shellCssSrc).not.toMatch(/\.ps-root\s*\{[^}]*overflow-y:\s*hidden/s);
		expect(shellCssSrc).toMatch(/\.ps-ambient\s*\{[^}]*position:\s*fixed/s);
	});

	it('no scanline rules added to player-missions.css or readable text selectors', () => {
		expect(missionsCssSrc).not.toMatch(/repeating-linear-gradient[\s\S]*?scanline/i);
		expect(hudCssSrc).not.toMatch(/\.quest-log[\s\S]*?repeating-linear-gradient/);
		expect(hudCssSrc).not.toMatch(/\.operative-hub__missions[\s\S]*?repeating-linear-gradient/);
	});
});
