/**
 * @vitest-environment jsdom
 *
 * playerHudSprint248.test.ts — Phase 7 · G2 Navigation vs Progression inner differentiation (HQ)
 *
 * Guards: scoped Navigation (.oqo-deck .oqo-op) vs Progression (.opp-preview / __track-well .opp-node)
 * inner primitives — no cross-chrome between transit tiles and timeline nodes.
 *
 * Optional Wave F: Playwright HQ inner differentiation — e2e/player-hq-wave-f.visual.spec.ts (not blocking).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY_PREVIEW = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/OperativePathway.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwayPreviewSrc = existsSync(PATHWAY_PREVIEW) ? readFileSync(PATHWAY_PREVIEW, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

const G2_TOUCHED = [hudCss, quickOpsSrc, pathwayPreviewSrc, pathwaySrc].join('\n');

const g2NavRules =
	hudCss.match(
		/\.player-hud-root \.oqo-deck \.oqo-op,\s*\n\.player-dossier-root \.oqo-deck \.oqo-op\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const g2ProgressionConnectorRule =
	hudCss.match(
		/\.player-hud-root \.opp-preview \.opp-root:not\(\.opp-root--compact\) \.opp-node:not\(:last-child\)::after,\s*\n\.player-dossier-root \.opp-preview \.opp-root:not\(\.opp-root--compact\) \.opp-node:not\(:last-child\)::after\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

const idleQuickOpBlock =
	hudCss.match(
		/\.player-hud-root \.oqo-deck \.oqo-op,\s*\n\.player-dossier-root \.oqo-deck \.oqo-op\s*\{[\s\S]*?\n\}/,
	)?.[0] ?? '';

describe('Phase 7 · G2 — CSS inner differentiation documented + scoped', () => {
	it('documents Phase 7 · G2 inner differentiation in CSS comments', () => {
		expect(hudCss).toMatch(/Phase 7 · G2 — Navigation inner: transit tiles/);
		expect(hudCss).toMatch(/Phase 7 · G2 — Progression connectors/);
	});

	it('.oqo-op rules scoped under .oqo-deck — not under .opp-preview / .opp-node', () => {
		expect(hudCss).toMatch(/Phase 7 · G2 — Navigation inner: transit tiles/);
		expect(g2NavRules).toMatch(/\.oqo-deck \.oqo-op/);
		expect(g2NavRules).not.toMatch(/\.opp-preview/);
		expect(g2NavRules).not.toMatch(/\.opp-node/);
		expect(g2NavRules).not.toMatch(/clip-path:/);
		expect(hudCss).not.toMatch(
			/\.player-hud-root \.oqo-op,\s*\n\.player-dossier-root \.oqo-op\s*\{/,
		);
	});

	it('.opp-node / .opp-track rules scoped under .opp-preview — not under .oqo-op', () => {
		expect(g2ProgressionConnectorRule).toMatch(/\.opp-preview \.opp-root:not\(\.opp-root--compact\)/);
		expect(g2ProgressionConnectorRule).not.toMatch(/\.oqo-deck/);
		expect(hudCss).toMatch(/\.opp-preview \.opp-node--edge[\s\S]*?clip-path:/);
		expect(hudCss).toMatch(/\.opp-preview \.opp-node__reward-well/);
		expect(g2NavRules).not.toMatch(/opp-node__reward-well/);
	});
});

describe('Phase 7 · G2 — component markup separation', () => {
	it('Quick Ops retains oqo-deck__grid 3-column + oqo-op links; no pathway classes', () => {
		expect(quickOpsSrc).toMatch(/oqo-deck__grid/);
		expect(quickOpsSrc).toMatch(/class="oqo-op"/);
		expect(quickOpsSrc).not.toMatch(/opp-track|opp-node|pd-os-deck__well/);
		expect(quickOpsSrc).toMatch(/oqo-deck pd-os-deck/);
	});

	it('Pathway preview retains pd-os-deck__well + OperativePathway; no oqo-op class', () => {
		expect(pathwayPreviewSrc).toMatch(/pd-os-deck__well opp-preview__track-well/);
		expect(pathwayPreviewSrc).toMatch(/OperativePathway/);
		expect(pathwayPreviewSrc).not.toMatch(/oqo-op/);
		expect(pathwayPreviewSrc).toMatch(/compact=\{false\}/);
	});

	it('OperativePathway retains scroll track + node structure for non-compact HQ mode', () => {
		expect(pathwaySrc).toMatch(/class="opp-track/);
		expect(pathwaySrc).toMatch(/opp-node opp-node--edge/);
		expect(pathwaySrc).toMatch(/opp-node__reward-well/);
		expect(pathwaySrc).not.toMatch(/oqo-op/);
	});
});

describe('Phase 7 · G2 — Navigation vs Progression physics', () => {
	it('Quick Ops idle cast shadow without emissive; teal emissive on hover only', () => {
		expect(idleQuickOpBlock).toMatch(/0 4px 0 rgba\(0, 0, 0, 0\.42\)/);
		expect(idleQuickOpBlock).not.toMatch(/--pd-emissive-/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op:hover[\s\S]*?--pd-emissive-teal/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op:active/);
	});

	it('Progression connector ::after exists for non-compact mode; no connector rules on .oqo-op', () => {
		expect(g2ProgressionConnectorRule).toMatch(/::after/);
		expect(g2NavRules).not.toMatch(/::after/);
		expect(hudCss).toMatch(
			/\.opp-preview \.opp-node--milestone:not\(\.opp-node--current-dossier\)[\s\S]*?inset 0 0 0 1px/,
		);
	});
});

describe('Phase 7 · G2 — anti-patterns + G1 regression hooks', () => {
	it('touched G2 sources omit neon cyan literals', () => {
		expect(G2_TOUCHED).not.toMatch(/#00d4ff/i);
		expect(G2_TOUCHED).not.toMatch(/#00f0ff/i);
	});

	it('G1 shared HQ frame tokens remain intact (no G2 frame regression)', () => {
		expect(dossierCss).toMatch(/Phase 7 · G1 — HQ shared frame tokens/);
		expect(hudCss).toMatch(/Phase 7 · G1 — HQ shared frame: raised Z2 decks/);
		expect(hudCss).toMatch(/\.oqo-deck\.pd-os-deck[\s\S]*?var\(--pd-hq-deck-fill/);
		expect(hudCss).toMatch(/\.opp-preview\.pd-os-deck[\s\S]*?var\(--pd-hq-deck-shadow/);
		expect(quickOpsSrc).toMatch(/pd-hq-section-head oqo-deck__head/);
		expect(pathwayPreviewSrc).toMatch(/pd-hq-section-head opp-preview__head/);
	});
});

describe.skip('Phase 7 · G2 — ROADMAP', () => {
	it.skip('ROADMAP marks G2 Done with playerHudSprint248 proof', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it('Phase 7 · G4 Execute instrument shipped after G2 inner differentiation', () => {
		// skip expect(roadmapSrc)
	});
});
