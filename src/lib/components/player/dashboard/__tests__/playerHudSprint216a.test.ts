/**
 * playerHudSprint216a.test.ts — Sprint 2.16a HQ bento grid hotfix (Option B)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const HQ_PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const STATS_PAGE = join(ROOT, 'routes/(app)/stats/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const MATERIAL_SPATIAL = join(ROOT, '..', 'docs/vision/PLAYER_OS_MATERIAL_SPATIAL.md');

const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const hqPageSrc = existsSync(HQ_PAGE) ? readFileSync(HQ_PAGE, 'utf-8') : '';
const statsPageSrc = existsSync(STATS_PAGE) ? readFileSync(STATS_PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const materialSpatialSrc = existsSync(MATERIAL_SPATIAL)
	? readFileSync(MATERIAL_SPATIAL, 'utf-8')
	: '';

function hudContainerBlock(src: string): string {
	const match = src.match(/<HUDContainer[\s\S]*?<\/HUDContainer>/);
	return match?.[0] ?? '';
}

function embeddedBountiesBlock(src: string): string {
	const match = src.match(/\{#if embedded\}[\s\S]*?\{:else\}/);
	return match?.[0] ?? '';
}

describe('Sprint 2.16a — HQ structure (Option B)', () => {
	it('pd-content-wrap wraps HUDContainer (outer), not the reverse', () => {
		expect(hqPageSrc).toMatch(/<div class="pd-content-wrap"[\s\S]*?<HUDContainer/);
		expect(hqPageSrc).toMatch(/<HUDContainer[\s\S]*?<\/HUDContainer>[\s\S]*?<\/div>/);
	});

	it('does not nest pd-content-wrap inside HUDContainer (broken 2.16 pattern)', () => {
		expect(hqPageSrc).not.toMatch(/<HUDContainer[\s\S]*?<div class="pd-content-wrap"/);
	});
});

describe('Sprint 2.16a — HUDContainer direct grid children', () => {
	const hudBlock = hudContainerBlock(hqPageSrc);

	it('pd-strap, OperativeHub, and analytics void are direct HUDContainer children', () => {
		expect(hudBlock).toMatch(
			/<header class="[^"]*pd-strap[^"]*bento-span-12[^"]*"/,
		);
		expect(hudBlock).toMatch(/<OperativeHub/);
		expect(hudBlock).toMatch(
			/<section[\s\S]*?class="[^"]*bento-span-12[^"]*player-analytics-void/,
		);
	});

	it('HUDContainer does not have pd-content-wrap as a direct child', () => {
		expect(hudBlock).not.toMatch(/<HUDContainer[^>]*>[\s\S]*?<div class="pd-content-wrap"/);
	});
});

describe('Sprint 2.16a — CSS width reconciliation', () => {
	it('neutralizes .hud-container max-width when nested in .pd-content-wrap', () => {
		const css = `${dossierCssSrc}\n${hudCssSrc}`;
		expect(css).toMatch(
			/\.pd-content-wrap\s*>\s*\.hud-container[\s\S]*?max-width:\s*none/,
		);
		expect(css).toMatch(
			/\.pd-content-wrap\s*>\s*\.hud-container[\s\S]*?margin-inline:\s*0/,
		);
	});
});

describe('Sprint 2.16a — no regression on 2.16 deliverables', () => {
	it('ActiveBounties embedded rail still uses embeddedFeed', () => {
		const embedded = embeddedBountiesBlock(bountiesSrc);
		expect(embedded).toMatch(/\{#each embeddedFeed as quest/);
	});

	it('stats player path still uses VanguardProtocolPanel', () => {
		expect(statsPageSrc).toMatch(/import VanguardProtocolPanel/);
		expect(statsPageSrc).toMatch(/stats-analytics-void[\s\S]*?VanguardProtocolPanel/);
	});
});

describe('Sprint 2.16a — ROADMAP + MATERIAL_SPATIAL docs', () => {
	it('ROADMAP marks 2.16a Done and documents the hotfix', () => {
		expect(roadmapSrc).toMatch(/\|\s*2\.16a\s*\|\s*Done/i);
		expect(roadmapSrc).toMatch(/playerHudSprint216a\.test\.ts/);
		expect(roadmapSrc).toMatch(/Sprint 2\.16a scope/i);
	});

	it('PLAYER_OS_MATERIAL_SPATIAL layout rule: pd-content-wrap is page-level, not inside grid', () => {
		expect(materialSpatialSrc).toMatch(/pd-content-wrap[`\s]*is page-level/i);
		expect(materialSpatialSrc).toMatch(/never wrap grid children inside [`\s]*pd-content-wrap/i);
	});
});
