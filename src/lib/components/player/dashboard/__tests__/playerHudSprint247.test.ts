/**
 * @vitest-environment jsdom
 *
 * playerHudSprint247.test.ts — Phase 7 · G1 Instrument frame parity (HQ)
 *
 * Guards: shared HQ frame tokens, unified section headers, outer deck parity across bands,
 * inner primitives preserved (pathway track, Quick Ops tiles, holo, hero mission).
 *
 * Optional Wave F: Playwright HQ frame screenshot — e2e/player-hq-wave-f.visual.spec.ts (not blocking).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const SPRINT241 = join(__dirname, 'playerHudSprint241.test.ts');
const SPRINT242 = join(__dirname, 'playerHudSprint242.test.ts');
const SPRINT246 = join(__dirname, 'playerHudSprint246.test.ts');

const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCss = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint241Src = existsSync(SPRINT241) ? readFileSync(SPRINT241, 'utf-8') : '';
const sprint242Src = existsSync(SPRINT242) ? readFileSync(SPRINT242, 'utf-8') : '';
const sprint246Src = existsSync(SPRINT246) ? readFileSync(SPRINT246, 'utf-8') : '';

const HQ_TOUCHED = [dossierCss, hudCss, missionsCss, quickOpsSrc, pathwaySrc, hubSrc, pageSrc].join(
	'\n',
);

const g1FrameBlock =
	hudCss.match(
		/Phase 7 · G1 — HQ shared frame: raised Z2 decks[\s\S]*?\.player-dossier-root \.opp-preview\.pd-os-deck\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

describe('Phase 7 · G1 — shared HQ frame tokens (player-dossier.css)', () => {
	it('documents Phase 7 · G1 HQ shared frame tokens', () => {
		expect(dossierCss).toMatch(/Phase 7 · G1 — HQ shared frame tokens/);
		expect(dossierCss).toMatch(/--pd-hq-deck-gap:/);
		expect(dossierCss).toMatch(/--pd-hq-deck-fill:/);
		expect(dossierCss).toMatch(/--pd-hq-deck-shadow:/);
		expect(dossierCss).toMatch(/--pd-hq-section-head-gap:/);
	});

	it('pd-os-deck kit consumes HQ frame token aliases', () => {
		expect(dossierCss).toMatch(
			/\.player-hud-root \.pd-os-deck[\s\S]*?var\(--pd-hq-deck-fill/,
		);
		expect(dossierCss).toMatch(
			/\.player-hud-root \.pd-os-deck[\s\S]*?var\(--pd-hq-deck-shadow/,
		);
	});

	it('pd-hq-section-head kit defines eyebrow + title parity classes', () => {
		expect(dossierCss).toMatch(/Phase 7 · G1 — HQ section header/);
		expect(dossierCss).toMatch(/\.pd-hq-section-head__eyebrow/);
		expect(dossierCss).toMatch(/\.pd-hq-section-head__title/);
	});
});

describe('Phase 7 · G1 — HQ bands reference shared frame', () => {
	it('hud CSS applies --pd-hq-deck-* on Quick Ops + pathway outer decks', () => {
		expect(hudCss).toMatch(/Phase 7 · G1 — HQ shared frame: raised Z2 decks/);
		expect(g1FrameBlock).toMatch(/\.oqo-deck\.pd-os-deck/);
		expect(g1FrameBlock).toMatch(/\.opp-preview\.pd-os-deck/);
		expect(g1FrameBlock).toMatch(/var\(--pd-hq-deck-fill/);
		expect(g1FrameBlock).toMatch(/var\(--pd-hq-deck-shadow/);
	});

	it('hud-container rhythm uses --pd-hq-deck-gap from dossier tokens', () => {
		expect(hudCss).toMatch(/Phase 7 · G1 — HQ band rhythm uses dossier --pd-hq-deck-gap/);
		expect(hudCss).toMatch(/\.player-hud-root \.hud-container[\s\S]*gap:\s*var\(--pd-hq-deck-gap\)/);
	});

	it('analytics void retains pd-os-deck--recessed with G1 rim family', () => {
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
		expect(hudCss).toMatch(
			/\.player-analytics-void\.pd-os-deck--recessed[\s\S]*?var\(--pd-hq-deck-rim\)/,
		);
		expect(hudCss).toMatch(/Phase 7 · G1 — recessed analytics shares HQ rim/);
	});

	it('OperativeHub retains hero deck variant', () => {
		expect(hubSrc).toMatch(/pd-os-deck pd-os-deck--hero/);
	});
});

describe('Phase 7 · G1 — unified section headers (frame only)', () => {
	it('OperativeQuickOps uses shared pd-hq-section-head pattern', () => {
		expect(quickOpsSrc).toMatch(/pd-hq-section-head oqo-deck__head/);
		expect(quickOpsSrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(quickOpsSrc).toMatch(/pd-hq-section-head__title/);
		expect(quickOpsSrc).toMatch(/oqo-deck pd-os-deck/);
	});

	it('OperativePathwayPreview uses shared pd-hq-section-head pattern', () => {
		expect(pathwaySrc).toMatch(/pd-hq-section-head opp-preview__head/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head__eyebrow/);
		expect(pathwaySrc).toMatch(/pd-hq-section-head__title/);
		expect(pathwaySrc).toMatch(/opp-preview opp-preview--void pd-os-deck/);
	});

	it('HQ band spacing defers to deck gap (no oqo-deck-only margin-bottom on HUD)', () => {
		expect(hudCss).toMatch(/\.player-hud-root \.oqo-deck,\s*\n\.player-hud-root \.opp-preview[\s\S]*margin-bottom:\s*0/);
		expect(hudCss).toMatch(
			/\.hud-container > :is\(\.oqo-deck, \[data-region='operative-pathway-preview'\], \[data-region='player-analytics-void'\]\)/,
		);
	});
});

describe('Phase 7 · G1 — inner primitives preserved (no G2/G3 gut)', () => {
	it('pathway track + Quick Ops tiles + identity holo + hero mission markup intact', () => {
		expect(pathwaySrc).toMatch(/pd-os-deck__well opp-preview__track-well/);
		expect(hudCss).toMatch(/\.opp-preview \.opp-track[\s\S]*overflow-x:\s*auto/);
		expect(quickOpsSrc).toMatch(/oqo-op/);
		expect(ibmSrc).toMatch(/HologramCardShell/);
		expect(bountiesSrc).toMatch(/quest-row--hero/);
	});
});

describe('Phase 7 · G1 — anti-patterns + prior sprint hooks', () => {
	it('touched HQ sources omit neon cyan literals', () => {
		expect(HQ_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(HQ_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('HQ dashboard route files omit pg-bracket / pg-scanline / pg-terminal-chrome', () => {
		expect(pageSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(hubSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(quickOpsSrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
		expect(pathwaySrc).not.toMatch(/pg-bracket|pg-scanline|pg-terminal-chrome/);
	});

	it('prior regression test files remain intact', () => {
		expect(sprint241Src).toMatch(/playerHudSprint241\.test\.ts — Wave A/);
		expect(sprint242Src).toMatch(/playerHudSprint242\.test\.ts — Player OS rubric redesign Wave B/);
		expect(sprint246Src).toMatch(/playerHudSprint246\.test\.ts — Player OS rubric redesign Wave B′/);
	});
});

describe('Phase 7 · G1 — ROADMAP', () => {
	it('ROADMAP marks G1 Done with playerHudSprint247 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*G1\*\*\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint247\.test\.ts/);
	});

	it('Phase 7 · G4 Execute instrument shipped (G1 frame guards remain valid)', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*G4\*\*\s*\|\s*\*\*Done\*\*/);
	});
});
