/**
 * @vitest-environment jsdom
 *
 * playerHudSprint246.test.ts — Player OS rubric redesign Wave B′ (HQ cohesion)
 *
 * Guards: unified HQ material stack, pathway Z1 well parity with analytics void,
 * shared --pd-os-deck-fill on Quick Ops + pathway, section rhythm via --pd-hq-deck-gap.
 *
 * Optional Wave F: Playwright void pixel sample on HQ — e2e/player-hq-wave-f.visual.spec.ts (not blocking).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT242 = join(__dirname, 'playerHudSprint242.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCss = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint242Src = existsSync(SPRINT242) ? readFileSync(SPRINT242, 'utf-8') : '';

const HQ_TOUCHED_CSS = [hudCss, missionsCss].join('\n');

const pathwayTrackWellBlock =
	hudCss.match(
		/\.player-hud-root \.opp-preview\.pd-os-deck \.pd-os-deck__well\.opp-preview__track-well[\s\S]*?\n\}/,
	)?.[0] ?? '';

const hqZ2DeckBlock =
	hudCss.match(
		/Player OS Wave B′ — HQ Z2 deck parity[\s\S]*?\.player-dossier-root \.opp-preview\.pd-os-deck\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? hudCss.match(
		/\.player-hud-root \.oqo-deck\.pd-os-deck,\s*\n\.player-hud-root \.opp-preview\.pd-os-deck[\s\S]*?\n\}/,
	)?.[0] ?? '';

describe('Wave B′ — pathway Z1 well parity (analytics void benchmark)', () => {
	it('pathway track well uses shared --pd-z1-well-bg + --pd-z1-inset-shadow tokens', () => {
		expect(hudCss).toMatch(/Player OS Wave B′ — pathway track well uses shared Z1 tokens/);
		expect(pathwayTrackWellBlock).toMatch(/background:\s*var\(--pd-z1-well-bg\)/);
		expect(pathwayTrackWellBlock).toMatch(/box-shadow:\s*var\(--pd-z1-inset-shadow\)/);
	});

	it('no pathway-only #020204 or heavy custom gradient on opp-preview__track-well', () => {
		expect(pathwayTrackWellBlock).not.toMatch(/#020204/);
		expect(pathwayTrackWellBlock).not.toMatch(/#0c0c14/);
		expect(pathwayTrackWellBlock).not.toMatch(/#050508/);
		expect(pathwayTrackWellBlock).not.toMatch(/::after/);
	});

	it('pathway track well matches analytics vpp-chart Z1 well pattern', () => {
		expect(hudCss).toMatch(
			/\.player-analytics-void \.vpp-chart--premium|:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*--pd-z1-well-bg/,
		);
		expect(pathwayTrackWellBlock).toMatch(/var\(--pd-z1-well-bg\)/);
		expect(pathwayTrackWellBlock).toMatch(/var\(--pd-z1-inset-shadow\)/);
	});
});

describe('Wave B′ — HQ Z2 deck material parity (Quick Ops + pathway)', () => {
	it('Quick Ops and pathway outer decks share --pd-os-deck-fill material stack', () => {
		expect(hudCss).toMatch(/Player OS Wave B′ — HQ Z2 deck parity/);
		expect(hqZ2DeckBlock).toMatch(/\.oqo-deck\.pd-os-deck/);
		expect(hqZ2DeckBlock).toMatch(/\.opp-preview\.pd-os-deck/);
		expect(hqZ2DeckBlock).toMatch(/var\(--pd-os-frame-fill|--pd-hq-deck-fill|--pd-os-deck-fill/);
	});

	it('pathway outer deck is not a separate visual skin from Quick Ops', () => {
		expect(pathwaySrc).toMatch(/opp-preview opp-preview--void pd-os-deck/);
		expect(quickOpsSrc).toMatch(/oqo-deck pd-os-deck/);
		expect(hqZ2DeckBlock).toMatch(/\.oqo-deck\.pd-os-deck[\s\S]*\.opp-preview\.pd-os-deck/);
	});
});

describe('Wave B′ — HQ section rhythm + scroll retention', () => {
	it('hud-container uses --pd-hq-deck-gap for HQ band spacing', () => {
		expect(hudCss).toMatch(/\.player-hud-root \.hud-container[\s\S]*--pd-hq-deck-gap/);
		expect(hudCss).toMatch(/gap:\s*var\(--pd-hq-deck-gap\)/);
	});

	it('pathway, quick ops, analytics bands defer margin to deck gap token', () => {
		expect(hudCss).toMatch(/Player OS Wave B′ — HQ section rhythm/);
		expect(hudCss).toMatch(
			/\.hud-container > :is\(\.oqo-deck, \[data-region='operative-pathway-preview'\], \[data-region='player-analytics-void'\]\)/,
		);
		expect(hudCss).toMatch(/\.player-hud-root \.opp-preview[\s\S]*margin-bottom:\s*0/);
	});

	it('pathway retains pd-os-deck__well + horizontal scroll track (6j-a / 6e regression)', () => {
		expect(pathwaySrc).toMatch(/pd-os-deck__well opp-preview__track-well/);
		expect(hudCss).toMatch(/pathway deck frame \+ carved track trench/);
		expect(hudCss).toMatch(/\.opp-preview \.opp-track[\s\S]*overflow-x:\s*auto/);
		expect(pathwaySrc).toMatch(/hideScrollHud=\{true\}/);
		expect(pathwaySrc).toMatch(/scrollToCurrent=\{true\}/);
	});
});

describe('Wave B′ — Wave B 242 regression hooks', () => {
	it('Wave B 242 test file remains intact (not deleted or weakened)', () => {
		expect(sprint242Src).toMatch(/playerHudSprint242\.test\.ts — Player OS rubric redesign Wave B/);
		expect(sprint242Src).toMatch(/Wave B — OperativeHub hero command deck/);
		expect(sprint242Src).toMatch(/Wave B — single gold focal/);
	});

	it('OperativeHub hero deck + single gold focal rules preserved in CSS', () => {
		expect(hudCss).toMatch(/Player OS Wave B — HQ command deck/);
		expect(hudCss).toMatch(/Wave B — single gold focal/);
		expect(hubSrc).toMatch(/pd-os-deck pd-os-deck--hero/);
	});
});

describe('Wave B′ — HQ anti-patterns', () => {
	it('touched HQ CSS has no neon cyan literals', () => {
		expect(HQ_TOUCHED_CSS).not.toMatch(/#00d4ff/i);
		expect(HQ_TOUCHED_CSS).not.toMatch(/#00f0ff/i);
	});

	it('HQ route files omit pg-bracket / pg-scanline / pg-terminal-chrome', () => {
		expect(pageSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(hubSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(quickOpsSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(pathwaySrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
	});
});

describe('Wave B′ — ROADMAP', () => {
	it('ROADMAP marks Wave B′ Done with playerHudSprint246 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*B′\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint246\.test\.ts/);
	});

	it('current sprint advances to Wave E (Armory) after B′', () => {
		expect(roadmapSrc).toMatch(/Wave E.*Armory|Armory.*Wave E/i);
	});
});
