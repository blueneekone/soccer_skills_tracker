/**
 * workout.layout.test.ts — Sprint 1.1+: Player workout train theater regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '../../../../../lib/player/workout/PlayerWorkoutPageView.svelte');
const HUD_CSS = join(__dirname, '../../../../../lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(__dirname, '../../../../../lib/styles/player-dossier.css');
const src = readFileSync(PAGE, 'utf-8');
const hudCss = readFileSync(HUD_CSS, 'utf-8');
const dossierCss = readFileSync(DOSSIER_CSS, 'utf-8');

describe('/player/workout — Train theater (Sprint 1.1+)', () => {
	it('execution workspace uses pw-theater hero deck with configure/execute wells', () => {
		expect(src).toMatch(/pw-theater pd-os-deck/);
		expect(src).toMatch(/pw-theater__configure/);
		expect(src).toMatch(/pw-theater__execute/);
	});

	it('theater grid splits configure vs execute columns at md+', () => {
		expect(hudCss).toMatch(/pw-theater__grid/);
		expect(hudCss).toMatch(/grid-template-columns: minmax\(0, 7fr\) minmax\(0, 5fr\)/);
	});

	it('shell padding uses --bento-pad-liquid via dossier page root', () => {
		expect(src).toMatch(/pd-page-root player-dossier-root/);
		expect(dossierCss).toMatch(/--bento-pad-liquid/);
	});
});
