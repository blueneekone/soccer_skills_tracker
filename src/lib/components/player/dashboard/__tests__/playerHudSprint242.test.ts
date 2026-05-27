/**
 * @vitest-environment jsdom
 *
 * playerHudSprint242.test.ts — Player OS rubric redesign Wave B (HQ command deck)
 *
 * Guards: OperativeHub hero deck, mission rail flush, analytics void, single-gold discipline,
 * Quick Ops cast-shadow idle / emissive hover, no terminal chrome on HQ route files.
 *
 * Optional Wave F: Playwright screenshot hook — e2e/player-hq-wave-b.visual.spec.ts (not blocking).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const GAP_MATRIX = join(ROOT, '..', 'docs/vision/PLAYER_OS_RUBRIC_GAP_MATRIX.md');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCss = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const gapMatrixSrc = existsSync(GAP_MATRIX) ? readFileSync(GAP_MATRIX, 'utf-8') : '';

/** HQ route files touched in Wave B — must not ship Train terminal chrome or cyan accent. */
const HQ_TOUCHED_CSS = [hudCss, missionsCss].join('\n');

describe('Wave B — OperativeHub hero command deck', () => {
	it('OperativeHub uses pd-os-deck pd-os-deck--hero', () => {
		expect(hubSrc).toMatch(/pd-os-deck pd-os-deck--hero/);
	});

	it('OperativeHub avoids inner overflow clip on hub shell', () => {
		expect(hubSrc).toMatch(/overflow:\s*visible/);
		expect(hubSrc).not.toMatch(/overflow:\s*hidden/);
	});

	it('player-dashboard-hud.css demotes matte hero slab + documents Wave B void deck', () => {
		expect(hudCss).toMatch(/Player OS Wave B — HQ command deck/);
		expect(hudCss).toMatch(/\.operative-hub\.pd-os-deck--hero[\s\S]*?--pd-os-deck-fill/);
		expect(hudCss).toMatch(/\.operative-hub\.pd-os-deck--hero[\s\S]*?overflow:\s*visible/);
	});

	it('mission rail panel is flush inside hero deck (no nested pd-os-deck shadow stack)', () => {
		expect(missionsCss).toMatch(/mission rail flush inside OperativeHub/);
		const railBlock =
			missionsCss.match(
				/\.player-hud-root \.operative-hub \.quest-log-panel--premium\.quest-log-panel--rail\s*\{[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(railBlock).toMatch(/background:\s*transparent/);
		expect(railBlock).not.toMatch(/var\(--pd-z2-panel-shadow/);
		expect(railBlock).not.toMatch(/var\(--pd-depth-panel-gradient/);
	});

	it('ActiveBounties renders hero mission row separately from rail feed', () => {
		expect(bountiesSrc).toMatch(/quest-row--hero=\{heroQuest\?\.id === quest\.id\}/);
		expect(bountiesSrc).toMatch(/embeddedFeed/);
		expect(bountiesSrc).toMatch(/q\.id !== heroQuest\.id/);
	});
});

describe('Wave B — identity void + single gold focal', () => {
	it('IdentityBentoModule drops ibm-root--inset well on embedded HQ path', () => {
		expect(ibmSrc).not.toMatch(/ibm-root--inset=\{embedded\}/);
		expect(ibmSrc).toMatch(/HologramCardShell/);
	});

	it('identity stage trench lightened for Z3 holo visibility', () => {
		expect(hudCss).toMatch(/Wave B — lighter void trench/);
		expect(hudCss).toMatch(/rgba\(0, 0, 0, 0\.1\) 0%, rgba\(0, 0, 0, 0\.34\)/);
	});

	it('single-gold discipline: hero mission demotes rank bar full-saturation gold', () => {
		expect(hudCss).toMatch(/Wave B — single gold focal/);
		expect(hudCss).toMatch(
			/\.operative-hub:has\(\.quest-row--hero\) \.ibm-rank-bar--premium \.ibm-rank-progress__fill[\s\S]*?box-shadow:\s*none/,
		);
		expect(hudCss).toMatch(
			/\.operative-hub:has\(\.quest-row--hero\) \.ibm-rank-bar--has-xp \.ibm-rank-progress__fill::after[\s\S]*?display:\s*none/,
		);
	});

	it('player-missions.css defines quest-row--hero gold focal row', () => {
		expect(missionsCss).toMatch(/Wave B — single gold hero mission row/);
		expect(missionsCss).toMatch(/\.quest-row--rail\.quest-row--embedded\.quest-row--hero/);
		expect(missionsCss).toMatch(
			/\.quest-row--hero \.quest-row__cmd--rail-chip[\s\S]*?--pd-emissive-gold/,
		);
	});
});

describe('Wave B — analytics void + Quick Ops pathway kit', () => {
	it('HQ analytics section uses pd-os-deck--recessed void island', () => {
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
		expect(hudCss).toMatch(/\.player-analytics-void\.pd-os-deck--recessed/);
	});

	it('VPP chart well uses Z1 inset without extra ::before/::after frame stacks', () => {
		expect(dossierCss).not.toMatch(/\.pd-os-deck::before/);
		expect(hudCss).toMatch(/player-analytics-void \.vpp-chart--premium[\s\S]*--pd-z1-well-bg/);
		expect(hudCss).not.toMatch(/\.player-analytics-void \.vpp-chart--premium::before/);
	});

	it('Quick Ops idle cast shadow; emissive gold on hover only (6j-b parity)', () => {
		expect(hudCss).toMatch(/0 4px 0 rgba\(0, 0, 0, 0\.42\)/);
		const idleQuickOpBlock =
			hudCss.match(
				/\.player-hud-root \.oqo-deck \.oqo-op,\s*\n\.player-dossier-root \.oqo-deck \.oqo-op\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(idleQuickOpBlock).not.toMatch(/--pd-emissive-gold/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op:hover[\s\S]*?--pd-emissive-gold/);
		expect(quickOpsSrc).toMatch(/oqo-deck pd-os-deck/);
	});

	it('pathway preview retains pd-os-deck__well trench kit from 6j-a', () => {
		expect(pathwaySrc).toMatch(/pd-os-deck__well/);
		expect(hudCss).toMatch(/pathway deck frame \+ carved track trench/);
	});
});

describe('Wave B — HQ anti-patterns + strap grammar', () => {
	it('dashboard route files omit pg-terminal-chrome / pg-scanline', () => {
		expect(pageSrc).not.toMatch(/pg-terminal-chrome|pg-scanline|pg-bracket/);
		expect(hubSrc).not.toMatch(/pg-terminal-chrome|pg-scanline|pg-bracket/);
		expect(quickOpsSrc).not.toMatch(/pg-terminal-chrome|pg-scanline|pg-bracket/);
		expect(pathwaySrc).not.toMatch(/pg-terminal-chrome|pg-scanline|pg-bracket/);
	});

	it('touched HQ CSS has no neon cyan literals', () => {
		expect(HQ_TOUCHED_CSS).not.toMatch(/#00d4ff/i);
		expect(HQ_TOUCHED_CSS).not.toMatch(/#00f0ff/i);
	});

	it('HQ page uses canonical pd-strap (not qa-strap)', () => {
		expect(pageSrc).toMatch(/class="pd-strap/);
		expect(pageSrc).not.toMatch(/qa-strap/);
	});
});

describe('Wave B — ROADMAP + gap matrix hooks', () => {
	it('ROADMAP marks Wave A Done with playerHudSprint241 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*A\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint241\.test\.ts/);
		expect(roadmapSrc).not.toMatch(/playerHudSprint238\.test\.ts \(create in Wave A build\)/);
	});

	it('ROADMAP marks Wave B Done with playerHudSprint242 proof', () => {
		expect(roadmapSrc).toMatch(/\|\s*B\s*\|\s*\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/playerHudSprint242\.test\.ts/);
	});

	it('gap matrix documents Wave B HQ outcomes', () => {
		expect(gapMatrixSrc).toMatch(/Wave B|Session B — HQ/);
	});
});
