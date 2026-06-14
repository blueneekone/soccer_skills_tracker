/**
 * playerHudSprint231.test.ts — Sprint 2.22 slice 6e HQ pathway Tier A edge (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const PREVIEW = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/OperativePathway.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const previewSrc = existsSync(PREVIEW) ? readFileSync(PREVIEW, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';

describe('Sprint 2.22 slice 6e — pathway Tier A edge treatment', () => {
	it('OperativePathwayPreview uses opp-preview--void with pd-os-deck well', () => {
		expect(previewSrc).toMatch(/opp-preview--void/);
		expect(previewSrc).toMatch(/pd-os-deck/);
		expect(previewSrc).toMatch(/pd-os-deck__well/);
		expect(previewSrc).not.toMatch(/pd-page-panel|pg-bracket/);
	});

	it('OperativePathway uses gap connectors in hud css — no through-well rail', () => {
		expect(pathwaySrc).not.toMatch(/opp-track-rail/);
		expect(hudCssSrc).toMatch(/opp-node:not\(:last-child\)::after/);
	});

	it('OperativePathway contains milestone tier helper or class', () => {
		expect(pathwaySrc).toMatch(/function isMilestoneTier|opp-node--milestone/);
	});

	it('OperativePathway uses Z1 reward well class on icon container', () => {
		expect(pathwaySrc).toMatch(/opp-node__reward-well/);
	});

	it('OperativePathway uses chamfer edge class instead of tw-rounded-xl on nodes', () => {
		expect(pathwaySrc).toMatch(/opp-node--edge/);
		expect(pathwaySrc).not.toMatch(/tw-rounded-xl/);
	});

	it('player-dashboard-hud.css contains Sprint 2.22 slice 6e block', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6e — pathway Tier A edge treatment/);
	});

	it('.opp-node__reward-well references --pd-z1-well-bg in hud css', () => {
		expect(hudCssSrc).toMatch(
			/\.opp-node__reward-well[\s\S]*?--pd-z1-well-bg/,
		);
	});

	it('OperativePathwayPreview uses compact status line for level — not display-sized h2', () => {
		expect(previewSrc).toMatch(/opp-preview__status/);
		expect(hudCssSrc).toMatch(/\.opp-preview__status \.pd-label[\s\S]*?Geist Mono/);
		expect(hudCssSrc).toMatch(/\.opp-preview__title[\s\S]*?var\(--pd-hud-title-l2\)/);
	});

	it('expand/collapse toggle remains absent from preview', () => {
		expect(previewSrc).not.toMatch(/opp-preview__toggle/);
		expect(previewSrc).not.toMatch(/Expand pathway/);
		expect(previewSrc).not.toMatch(/Collapse pathway/);
	});
});
