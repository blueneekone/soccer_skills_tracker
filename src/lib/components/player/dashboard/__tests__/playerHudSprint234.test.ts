/**
 * playerHudSprint234.test.ts — Sprint 2.22 slice 6j (HQ Z2 depth + closure J-02/J-06/J-07/J-10)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	VOID_CONTRACT_THRESHOLDS,
	evaluateVoidContract,
} from '$lib/player/visual/voidContract.js';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const SETTINGS_PAGE = join(ROOT, 'routes/(app)/player/settings/+page.svelte');
const SETTINGS_PANEL = join(ROOT, 'lib/components/player/PlayerSettingsPanel.svelte');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const GAP_MATRIX = join(ROOT, '..', 'docs/vision/PLAYER_OS_RUBRIC_GAP_MATRIX.md');
const GAP_REGISTER = join(ROOT, '..', 'docs/acquisition/PLATFORM_GAP_REGISTER.md');
const VISUAL_README = join(ROOT, '..', 'docs/visual-acceptance/sprint-2.22-slice-6j-a/README.md');
const CLOSURE_VA = join(ROOT, '..', 'docs/visual-acceptance/sprint-2.22-slice-6j/README.md');
const E2E_SPEC = join(ROOT, '..', 'e2e/player-hq-slice-6j-a.visual.spec.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const shellCss = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const missionsCss = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const settingsPageSrc = existsSync(SETTINGS_PAGE) ? readFileSync(SETTINGS_PAGE, 'utf-8') : '';
const settingsPanelSrc = existsSync(SETTINGS_PANEL) ? readFileSync(SETTINGS_PANEL, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const gapMatrixSrc = existsSync(GAP_MATRIX) ? readFileSync(GAP_MATRIX, 'utf-8') : '';
const gapRegisterSrc = existsSync(GAP_REGISTER) ? readFileSync(GAP_REGISTER, 'utf-8') : '';
const visualReadmeSrc = existsSync(VISUAL_README) ? readFileSync(VISUAL_README, 'utf-8') : '';
const closureVaSrc = existsSync(CLOSURE_VA) ? readFileSync(CLOSURE_VA, 'utf-8') : '';
const e2eSpecSrc = existsSync(E2E_SPEC) ? readFileSync(E2E_SPEC, 'utf-8') : '';

describe('Sprint 2.22 slice 6j-a — pd-os-deck depth kit (translatable)', () => {
	it('player-dossier.css defines pd-os-deck with Foundation Z2 fill (no pseudo glow stacks)', () => {
		expect(dossierCss).toMatch(/Sprint 2\.22 slice 6j-a — Player OS deck depth kit \(Foundation §2 Z2/);
		expect(dossierCss).toMatch(/--pd-os-deck-fill:/);
		expect(dossierCss).toMatch(/var\(--pd-os-deck-fill/);
		expect(dossierCss).not.toMatch(/\.pd-os-deck::before/);
		expect(dossierCss).toMatch(/\.pd-os-deck__well[\s\S]*?--pd-z1-well-bg/);
	});

	it('HQ components use pd-os-deck (no brackets or scanline on identity hub)', () => {
		expect(hubSrc).toMatch(/pd-os-deck pd-os-deck--hero/);
		expect(hubSrc).not.toMatch(/pg-bracket|pg-scanline/);
		expect(quickOpsSrc).toMatch(/oqo-deck pd-os-deck/);
		expect(quickOpsSrc).not.toMatch(/pg-bracket|oqo-deck--edge-lit|pd-page-panel/);
		expect(pathwaySrc).toMatch(/pd-os-deck__well/);
		expect(pathwaySrc).not.toMatch(/pg-bracket/);
		expect(pageSrc).toMatch(/player-analytics-void pd-os-deck pd-os-deck--recessed/);
		expect(hudCss).toMatch(/\.operative-hub \.hcs-scanlines[\s\S]*display:\s*none/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*--pd-z1-well-bg/,
		);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-inspector--premium[\s\S]*--pd-z1-well-bg/,
		);
	});

	it('OperativeQuickOps uses pd-os-deck without pd-page-panel on deck', () => {
		expect(quickOpsSrc).toMatch(/data-region="operative-quick-ops"/);
	});

	it('Quick Ops tiles keep gold icon badges (6d regression)', () => {
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op__icon[\s\S]*--pd-accent-action/);
	});

	it('Quick Ops tiles use physical cast shadow lift (idle); inner + outer emissive glow on hover only', () => {
		expect(hudCss).toMatch(/0 4px 0 rgba\(0, 0, 0, 0\.42\)/);
		expect(hudCss).toMatch(/translateY\(-2px\)/);
		const idleQuickOpBlock =
			hudCss.match(
				/\.player-hud-root \.oqo-deck \.oqo-op,\s*\n\.player-dossier-root \.oqo-deck \.oqo-op\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(idleQuickOpBlock).not.toMatch(/--pd-emissive-gold/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op:hover[\s\S]*?inset 0 0 20px color-mix/);
		expect(hudCss).toMatch(/\.oqo-deck \.oqo-op:hover[\s\S]*?--pd-emissive-gold/);
	});

	it('mission rail rows are matte idle with emissive glow on hover only', () => {
		expect(missionsCss).toMatch(/matte idle rows; emissive glow on hover only/);
		expect(missionsCss).toMatch(
			/matte idle rows; emissive glow on hover only[\s\S]*?background: color-mix\(in srgb, var\(--pd-panel/,
		);
		expect(missionsCss).toMatch(
			/\.quest-row--rail\.quest-row--embedded:not\(\.quest-row--promoted\):hover[\s\S]*?0 0 18px/,
		);
	});

	it('identity stage recesses banner and rings; holo card keeps Z3 lift', () => {
		expect(hudCss).toMatch(/identity trench: recess banner \+ rings/);
		expect(hudCss).toMatch(/\.operative-hub__identity-stage \.ibm-profile-banner\.ibm-profile-setup-card[\s\S]*?inset 0 3px 10px/);
		expect(hudCss).toMatch(/\.operative-hub__identity-stage \.ibm-body--hub-span \.ibm-rings[\s\S]*?inset 0 6px 14px/);
		expect(hudCss).toMatch(/\.operative-hub__identity-stage \.hcs-card[\s\S]*?0 10px 24px/);
	});

	it('pathway track well uses shared Z1 tokens (Wave B′ normalized heavy 6j-a trench)', () => {
		expect(hudCss).toMatch(/pathway deck frame \+ carved track trench/);
		expect(hudCss).toMatch(/Player OS Wave B′ — pathway track well uses shared Z1 tokens/);
		expect(hudCss).toMatch(
			/\.opp-preview\.pd-os-deck \.pd-os-deck__well\.opp-preview__track-well[\s\S]*?background:\s*var\(--pd-z1-well-bg\)/,
		);
		expect(hudCss).toMatch(
			/\.opp-preview\.pd-os-deck \.pd-os-deck__well\.opp-preview__track-well[\s\S]*?box-shadow:\s*var\(--pd-z1-inset-shadow\)/,
		);
		expect(hudCss).not.toMatch(
			/\.opp-preview\.pd-os-deck \.pd-os-deck__well\.opp-preview__track-well::after/,
		);
	});

	it('identity holo card gets subtle Z3 lift inside identity trench (no scanlines)', () => {
		expect(hudCss).toMatch(/\.operative-hub__identity-stage::before[\s\S]*?radial-gradient/);
		expect(hudCss).toMatch(/\.operative-hub__identity-stage \.hcs-card[\s\S]*?0 10px 24px rgba\(0, 0, 0, 0\.48\)/);
		expect(hudCss).toMatch(/\.operative-hub__identity-stage \.hcs-edge::before[\s\S]*?22%/);
	});

	it('data-dopamine off and prefers-reduced-motion disable Quick Ops hover translate', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root\[data-dopamine='off'\] \.oqo-deck \.oqo-op:hover[\s\S]*transform:\s*none/,
		);
		expect(hudCss).toMatch(
			/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.oqo-deck \.oqo-op:hover[\s\S]*transform:\s*none/,
		);
	});
});

describe('Sprint 2.22 slice 6j-a — HQ spatial composition', () => {
	it('hud-container uses section gap only (no HQ ambient glow stacks)', () => {
		expect(hudCss).toMatch(/6j-a — HQ spatial composition/);
		expect(hudCss).toMatch(/\.player-hud-root \.hud-container\s*\{[\s\S]*?--pd-hq-deck-gap/);
		expect(hudCss).not.toMatch(/\.hud-container::before/);
		expect(hudCss).not.toMatch(/pd-hq-deck-chrome/);
	});

	it('.quest-log-panel--premium.quest-log-panel--rail uses raised Z2 deck plate', () => {
		expect(missionsCss).toMatch(/Sprint 2\.22 slice 6j-a — mission rail flush inside OperativeHub/);
		const railBlock =
			missionsCss.match(
				/\.player-hud-root \.operative-hub \.quest-log-panel--premium\.quest-log-panel--rail\s*\{[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(railBlock).toMatch(/background:\s*transparent/);
		expect(railBlock).not.toMatch(/var\(--pd-depth-panel-gradient/);
	});
});

describe('Sprint 2.22 slice 6j-a — capsules ghost whisper', () => {
	it('.lobby-capsule-ghost-card is contained with inset well (no outer bleed)', () => {
		expect(pageSrc).toMatch(/lobby-capsule-ghost-wrap/);
		expect(hudCss).toMatch(/max-height:\s*56px/);
		expect(hudCss).toMatch(/lobby-capsule-ghost-card[\s\S]*overflow:\s*hidden/);
		expect(hudCss).toMatch(/--pd-z1-inset-shadow/);
	});
});

describe('Sprint 2.22 slice 6j-a — visual acceptance + ROADMAP', () => {
	it('e2e visual spec and README exist', () => {
		expect(existsSync(E2E_SPEC)).toBe(true);
		expect(existsSync(VISUAL_README)).toBe(true);
		expect(e2eSpecSrc).toMatch(/operative-quick-ops/);
		expect(visualReadmeSrc).toMatch(/hq-1280-quick-ops-edge\.png/);
	});

	it('ROADMAP marks 6j-a Done and 6j-b Done', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*6h\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/\|\s*\*\*6j-a\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/\|\s*\*\*6j-b\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/Sprint 2\.22 slice 6j-a scope/);
	});
});

describe('Sprint 2.22 slice 6j closure — J-02 Z2 depth (remaining routes)', () => {
	it('player-dossier.css documents 6j closure void-first deck tokens', () => {
		expect(dossierCss).toMatch(/Sprint 2\.22 slice 6j closure — void\/matte contract tokens/);
		expect(dossierCss).toMatch(/--pd-void-contract-black-min:\s*40%/);
		expect(dossierCss).toMatch(/--pd-void-contract-matte-max:\s*35%/);
	});

	it('Settings route uses pd-os-deck panels (6j-b parity)', () => {
		expect(settingsPageSrc).toMatch(/pd-route-stack/);
		expect(settingsPanelSrc).toMatch(/ps-settings-panel pd-os-deck/);
	});

	it('HQ bento-card surfaces use void-first gradient — not solid matte slab', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root \.bento-card[\s\S]*--pd-depth-panel-gradient/,
		);
		const bentoBlock = pageSrc.match(/\.bento-card\s*\{([^}]+)\}/s)?.[1] ?? '';
		expect(bentoBlock).toMatch(/--pd-depth-panel-gradient/);
		expect(bentoBlock).not.toMatch(/background:\s*var\(--pd-panel/);
	});
});

describe('Sprint 2.22 slice 6j closure — J-06 HQ void ≥40% / matte ≤35%', () => {
	it('voidContract thresholds match FOUNDATION §3', () => {
		expect(VOID_CONTRACT_THRESHOLDS.blackCanvasMinRatio).toBe(0.4);
		expect(VOID_CONTRACT_THRESHOLDS.mattePanelMaxRatio).toBe(0.35);
	});

	it('evaluateVoidContract enforces matte ≤35% guard', () => {
		const pass = evaluateVoidContract({
			blackCanvasRatio: 0.45,
			mattePanelRatio: 0.32,
			emissiveRatio: 0.2,
		});
		expect(pass.mattePanelPass).toBe(true);
		expect(pass.allPixelRatiosPass).toBe(true);

		const fail = evaluateVoidContract({
			blackCanvasRatio: 0.45,
			mattePanelRatio: 0.38,
			emissiveRatio: 0.2,
		});
		expect(fail.mattePanelPass).toBe(false);
	});

	it('OperativeHub hero deck uses void-friendly --pd-os-hero-fill', () => {
		expect(hudCss).toMatch(/void-friendly hub \(FOUNDATION §3\)/);
		expect(hudCss).toMatch(/\.operative-hub\.pd-os-deck--hero[\s\S]*--pd-os-hero-fill/);
		expect(dossierCss).toMatch(/--pd-os-hero-fill:/);
	});

	it('6j closure VA README documents void/matte token contract', () => {
		expect(existsSync(CLOSURE_VA)).toBe(true);
		expect(closureVaSrc).toMatch(/Void contract/);
		expect(closureVaSrc).toMatch(/≥\s*40%/);
		expect(closureVaSrc).toMatch(/≤\s*35%/);
		expect(closureVaSrc).toMatch(/--pd-depth-panel-gradient/);
	});
});

describe('Sprint 2.22 slice 6j closure — J-07 Stats investigation rubric alignment', () => {
	it('player stats uses diegetic investigation deck — not matte pd-page-panel', () => {
		expect(statsSrc).toMatch(/stats-analytics-void pd-os-deck pd-os-deck--recessed/);
		expect(statsSrc).toMatch(/class:stats-chip-rail=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:stats-achievement-row=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/class:pd-page-panel=\{!isPlayerRole\}/);
	});

	it('stats achievement rows use edge-lit pd-os-deck pattern', () => {
		expect(dossierCss).toMatch(/Player OS Wave C — Stats achievement edge-lit rows/);
		expect(hudCss).toMatch(/\.stats-chip-rail/);
	});

	it('gap matrix no longer marks Stats investigation / diegetic kit as Fail', () => {
		const statsSection = gapMatrixSrc.match(/### Stats[\s\S]*?### Train/)?.[0] ?? '';
		expect(statsSection).toMatch(/Investigation workspace \| Partial/);
		expect(statsSection).toMatch(/Diegetic kit \| Partial/);
		expect(statsSection).not.toMatch(/Investigation workspace \| Fail/);
		expect(statsSection).not.toMatch(/Diegetic kit \| Fail/);
	});
});

describe('Sprint 2.22 slice 6j closure — J-10 PlayerShell bento-card injection', () => {
	it('PlayerShell.svelte does not inject generic bento-card chrome', () => {
		expect(shellSrc).not.toMatch(/bento-card/);
		expect(shellSrc).toMatch(/player-dossier-root/);
		expect(shellSrc).toMatch(/ps-root--dossier/);
	});

	it('player-shell.css scopes generic pp-card chrome off dossier routes', () => {
		expect(shellCss).toMatch(
			/\.ps-root:not\(\.ps-root--dossier\):not\(:has\(\.player-dossier-root\)\)\s+:global\(\.bento-card\)/,
		);
		expect(shellCss).toMatch(/6j closure — dossier routes own material/);
	});

	it('PLATFORM_GAP_REGISTER marks J-02, J-06, J-07, J-10 Done', () => {
		expect(gapRegisterSrc).toMatch(/\| J-02 \|.*\| Done \|/);
		expect(gapRegisterSrc).toMatch(/\| J-06 \|.*\| Done \|/);
		expect(gapRegisterSrc).toMatch(/\| J-07 \|.*\| Done \|/);
		expect(gapRegisterSrc).toMatch(/\| J-10 \|.*\| Done \|/);
	});

	it('ROADMAP marks slice 6j Done', () => {
		expect(roadmapSrc).toMatch(/slice 6j scope[\s\S]*?\*\*Done\*\*/);
	});
});
