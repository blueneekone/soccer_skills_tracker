/**
 * playerHudSprint220.test.ts — Sprint 2.20a/b/c/d/e Player OS scroll, VPP material, composition hotfix, void contract
 *
 * 2.20a — PLAYER_OS_FOUNDATION.md §4: One native document scroll on all Player OS routes.
 * 2.20b — VPP material lift: Z1 well bg, remove ::before circle-glow, XP emissive border.
 * 2.20c — Composition hotfix: HQ overflow, identity centering, mission rail, stats chart, Train parity.
 * 2.20d — Armory composition.
 * 2.20e — FOUNDATION §3 void contract pixel sample on G10 HQ MCP capture.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import {
	VOID_CONTRACT_HQ_VIEWPORT,
	sampleVoidContractRatios,
	evaluateVoidContract,
} from '$lib/player/visual/voidContract.js';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const REPO = join(ROOT, '..');
const VA_DIR = join(REPO, 'docs/vision/va-screenshots');
const VOID_CAPTURE_PRIMARY = join(VA_DIR, 'g10-hq-void-1280x900.png');
const VOID_CAPTURE_FALLBACK = join(VA_DIR, 'g10-hq-1280.png');
const SHELL_CSS = join(ROOT, 'lib/styles/player-shell.css');
const SHELL = join(ROOT, 'lib/components/shell/PlayerShell.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const FOUNDATION = join(ROOT, '..', 'docs/vision/PLAYER_OS_FOUNDATION.md');

const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const RADAR = join(ROOT, 'lib/components/player/dashboard/AttributeRadar.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');

const OPERATIVE_HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');

const PATHWAY = join(ROOT, 'lib/components/player/OperativePathway.svelte');
const ALBUM = join(ROOT, 'lib/components/player/ArmoryAlbumWorkspace.svelte');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');

const shellCssSrc = existsSync(SHELL_CSS) ? readFileSync(SHELL_CSS, 'utf-8') : '';
const shellSrc = existsSync(SHELL) ? readFileSync(SHELL, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const foundationSrc = existsSync(FOUNDATION) ? readFileSync(FOUNDATION, 'utf-8') : '';

const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const radarSrc = existsSync(RADAR) ? readFileSync(RADAR, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';

const operativeHubSrc = existsSync(OPERATIVE_HUB) ? readFileSync(OPERATIVE_HUB, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';

const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const albumSrc = existsSync(ALBUM) ? readFileSync(ALBUM, 'utf-8') : '';
const studioSrc = existsSync(STUDIO) ? readFileSync(STUDIO, 'utf-8') : '';
const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';

describe.skip('Sprint 2.20a — scroll & physics contract (PLAYER_OS_FOUNDATION.md §4)', () => {
	it('PLAYER_OS_FOUNDATION.md §4 defines the one-document-scroll contract', () => {
		expect(foundationSrc).toMatch(/One document scroll/);
		expect(foundationSrc).toMatch(/ps-root.*min-height.*overflow.*visible/s);
		expect(foundationSrc).toMatch(/ps-ambient.*fixed/);
	});

	it('player-shell.css .ps-root does NOT set overflow-y: hidden (scroll trap removed)', () => {
		// Foundation §4: root must use overflow: visible, not hidden
		expect(shellCssSrc).not.toMatch(/\.ps-root\s*\{[^}]*overflow-y:\s*hidden/s);
	});

	it('player-shell.css .ps-root uses min-height: 100dvh (not fixed height trap)', () => {
		// Native document scroll requires root to grow with content
		expect(shellCssSrc).toMatch(/\.ps-root\s*\{[^}]*min-height:\s*100dvh/s);
		// Bare 'height: 100dvh' (not min-height/max-height) would trap scroll — must be absent.
		// Negative lookbehind excludes 'min-height' and 'max-height' variants.
		expect(shellCssSrc).not.toMatch(/\.ps-root\s*\{[^}]*(?<![a-z-])height:\s*100dvh/s);
		expect(shellCssSrc).not.toMatch(/\.ps-root\s*\{[^}]*max-height:\s*100dvh/s);
	});

	it('player-shell.css .ps-root overflow-y is visible (document scroll owns vertical)', () => {
		expect(shellCssSrc).toMatch(/\.ps-root\s*\{[^}]*overflow-y:\s*visible/s);
	});

	it('player-shell.css .ps-scroll-shell does NOT own overflow-y: auto', () => {
		// ps-scroll-shell must be a layout wrapper only — not a scroll container
		expect(shellCssSrc).not.toMatch(/\.ps-scroll-shell\s*\{[^}]*overflow-y:\s*auto/s);
		expect(shellCssSrc).not.toMatch(/ps-scroll-shell[^}]*overflow-y:\s*auto/s);
	});

	it('player-shell.css .ps-canvas does NOT set overflow-y: auto', () => {
		// Canvas flows naturally; document scroll handles pagination
		expect(shellCssSrc).not.toMatch(/\.ps-canvas\s*\{[^}]*overflow-y:\s*auto/s);
	});

	it('player-shell.css .ps-ambient uses position: fixed (viewport backdrop after root height change)', () => {
		// Fixed so ambient covers viewport even when content exceeds 100dvh
		expect(shellCssSrc).toMatch(/\.ps-ambient\s*\{[^}]*position:\s*fixed/s);
	});

	it('PlayerShell.svelte ps-scroll-shell element does NOT use tw-overflow-y-auto or tw-flex-1', () => {
		// Checks are scoped to class attribute values (stops at quote boundary) to avoid
		// false positives from comments that mention both terms.
		// tw-overflow-y-auto created an inner scroll container — must be absent from class attr
		expect(shellSrc).not.toMatch(/class="[^"]*ps-scroll-shell[^"]*tw-overflow-y-auto/);
		expect(shellSrc).not.toMatch(/class="[^"]*tw-overflow-y-auto[^"]*ps-scroll-shell/);
		// tw-flex-1 sets flex-basis: 0% which locks the element's intrinsic height contribution
		// to zero, preventing the document from growing taller than 100dvh for native scroll
		expect(shellSrc).not.toMatch(/class="[^"]*ps-scroll-shell[^"]*tw-flex-1/);
		expect(shellSrc).not.toMatch(/class="[^"]*tw-flex-1[^"]*ps-scroll-shell/);
	});

	it('workout page .pw-panel--threat does NOT create inner vertical scroll trap', () => {
		// Foundation §4 Train route must-feel: equal-height columns, no inner panel scroll
		// The desktop media-query block must not combine sticky with overflow-y: auto
		expect(workoutSrc).not.toMatch(/\.pw-panel--threat\s*\{[^}]*overflow-y:\s*auto/s);
	});

	it('workout page .pw-panel--threat does NOT set max-height trap at desktop breakpoint', () => {
		// max-height + overflow-y was the sticky ingest scroll container
		expect(workoutSrc).not.toMatch(
			/@media[^{]*min-width:\s*768px[^{]*\{[\s\S]*?\.pw-panel--threat\s*\{[^}]*max-height:\s*calc\(100vh/
		);
	});
});

describe.skip('Sprint 2.20b — VPP material lift (PLAYER_OS_FOUNDATION.md §2, §9)', () => {
	it('player-dashboard-hud.css .vpp-chart--premium does NOT contain a ::before pseudo rule', () => {
		// Foundation §9: extra frames around pdDataBloom are an anti-pattern
		// ::before circle-glow was the decorative layer removed in 2.20b
		expect(hudCssSrc).not.toMatch(/\.vpp-chart--premium\s*::before\s*\{/);
	});

	it('player-dashboard-hud.css .vpp-root--premium .vpp-chart--premium does NOT contain a ::after pseudo rule', () => {
		// Foundation §2 lock: chart surface = Z1 well + SVG bloom; ::after circle ring was the third decorative layer
		expect(hudCssSrc).not.toMatch(/\.vpp-root--premium\s+\.vpp-chart--premium\s*::after\s*\{/);
	});

	it('player-dashboard-hud.css .vpp-chart--premium uses --pd-z1-well-bg for background', () => {
		// Z1 recessed well uses canonical token from Z-depth matrix
		expect(hudCssSrc).toMatch(/\.vpp-chart--premium\s*\{[^}]*--pd-z1-well-bg/s);
	});

	it('AttributeRadar.svelte still references url(#pdDataBloom) — intrinsic bloom must not be removed', () => {
		// Foundation §1: bloom is intrinsic to AttributeRadar SVG; removing it is an anti-pattern
		expect(radarSrc).toMatch(/url\(#pdDataBloom\)/);
	});

	it('VanguardProtocolPanel.svelte .vpp-chart does NOT set background: var(--pd-panel) AND border: 1px solid together', () => {
		// Material properties delegated to hud CSS; component owns layout only
		// Matches the pattern where both properties appear inside the same .vpp-chart rule block
		const vppChartBlock = vppSrc.match(/\.vpp-chart\s*\{([^}]*)\}/s)?.[1] ?? '';
		const hasPdPanel = /background:\s*var\(--pd-panel/.test(vppChartBlock);
		const hasBorderSolid = /border:\s*1px\s+solid/.test(vppChartBlock);
		expect(hasPdPanel && hasBorderSolid).toBe(false);
	});

	it('player-dashboard-hud.css .hud-stat-cell--xp has border-color referencing --pd-accent-data or --player-hud-data', () => {
		// Sprint 2.20b: XP cell must have visible data-accent emissive border, not only label color
		expect(hudCssSrc).toMatch(
			/\.hud-stat-cell--xp\s*\{[^}]*(--pd-accent-data|--player-hud-data)/s
		);
		// Confirm the rule includes border-color, not just a label selector
		expect(hudCssSrc).toMatch(/\.hud-stat-cell--xp\s*\{[^}]*border-color/s);
	});
});

describe.skip('Sprint 2.20c — composition hotfix (HQ / Stats / Train)', () => {
	it('OperativeHub.svelte .operative-hub does NOT use overflow: hidden', () => {
		// Bug 1: overflow:hidden was clipping identity stage and mission rail content
		// Scoped rule block for .operative-hub must use visible (or omit overflow altogether)
		const hubBlock = operativeHubSrc.match(/\.operative-hub\s*\{([^}]*)\}/s)?.[1] ?? '';
		expect(hubBlock).not.toMatch(/overflow:\s*hidden/);
	});

	it('OperativeHub.svelte .operative-hub__missions does NOT use align-self: start as its only value', () => {
		// Bug 2: missions column must stretch to match main identity column height on desktop
		// The scoped block for .operative-hub__missions must not set align-self: start
		const missionsBlock = operativeHubSrc.match(/\.operative-hub__missions\s*\{([^}]*)\}/s)?.[1] ?? '';
		expect(missionsBlock).not.toMatch(/align-self:\s*start/);
	});

	it('player-dashboard-hud.css operative-hub__missions align-self is NOT start without stretch override', () => {
		// Bug 2: global HUD CSS must also not pin missions column to start-only
		const ruleBlock = hudCssSrc.match(
			/\.operative-hub\s+\.operative-hub__missions\s*\{([^}]*)\}/s
		)?.[1] ?? hudCssSrc.match(/operative-hub__missions\s*\{([^}]*)\}/s)?.[1] ?? '';
		expect(ruleBlock).not.toMatch(/align-self:\s*start(?!\s*[;}].*stretch)/s);
	});

	it('player-dashboard-hud.css .operative-hub__identity-stage gets flex centering via display: flex', () => {
		// Bug 1: identity-stage must use flex layout to center IdentityBentoModule within the Z1 well
		expect(hudCssSrc).toMatch(
			/operative-hub__identity-stage[^}]*display:\s*flex/s
		);
	});

	it('player-missions.css .quest-log__head--embedded includes text-align: center', () => {
		// Bug 3: "ACTIVE MISSIONS" header must be centered over the mission deck
		expect(missionsCssSrc).toMatch(/quest-log__head--embedded[^}]*text-align:\s*center/s);
	});

	it('player-missions.css embedded habit rows have min-width: 0 to prevent horizontal overflow', () => {
		// Bug 4: quest-terminal-row--habit rows must be constrained within the rail width
		expect(missionsCssSrc).toMatch(/quest-terminal-row--habit[^}]*min-width:\s*0/s);
	});

	it('stats/+page.svelte .dossier-workout has grid-column: 1 / -1 at desktop breakpoint', () => {
		// Bug 5: workout chart band must span full dossier-grid width below VPP radar at 2-col layout
		expect(statsSrc).toMatch(/dossier-workout[^}]*grid-column:\s*1\s*\/\s*-1/s);
	});

	it('stats/+page.svelte workout chart $effect uses .update("none") for data-only changes', () => {
		// Bug 6: Firestore snapshot updates must patch chart data without re-animating
		expect(statsSrc).toMatch(/\.update\(\s*['"]none['"]\s*\)/);
	});

	it('stats/+page.svelte workout chart does NOT unconditionally destroy before new Chart without a guard', () => {
		// Bug 6: destroy+recreate on every reactive pass causes loop animation;
		// assert that update('none') is present (proves data-path exists without destroy)
		expect(statsSrc).toMatch(/\.update\(\s*['"]none['"]\s*\)/);
		// destroy must be inside the creation effect only (structural change), not the data effect
		// Verify the data effect block does NOT contain 'destroy'
		const dataEffectMatch = statsSrc.match(
			/Effect 2[\s\S]*?workoutChartInst\.update\('none'\)/
		);
		if (dataEffectMatch) {
			expect(dataEffectMatch[0]).not.toMatch(/\.destroy\(\)/);
		}
	});

	it('workout/+page.svelte uses full-width exec theater (no duplicate coach sidebar grid)', () => {
		expect(workoutSrc).toMatch(/pw-theater pd-os-deck pd-os-deck--hero bento-span-12/);
		expect(workoutSrc).toMatch(/pw-theater__body tw-min-w-0 bento-span-12/);
		expect(workoutSrc).not.toMatch(/pw-panel--threat/);
		expect(workoutSrc).not.toMatch(/class:bento-span-8=\{hasCoachIntents\}/);
	});

	it('workout/+page.svelte does not duplicate HQ stat telemetry (streak/xp row removed from logger)', () => {
		expect(workoutSrc).not.toMatch(/HudStatCell/);
		expect(workoutSrc).not.toMatch(/pw-hud__cell--load/);
	});
});

describe.skip('Sprint 2.20d — Armory composition', () => {
	it('OperativePathway.svelte current tier class string does NOT include scale-110', () => {
		expect(pathwaySrc).not.toMatch(/opp-node--current-dossier[\s\S]*?tw-scale-110/);
		expect(pathwaySrc).not.toMatch(/state === 'current'[\s\S]*?tw-scale-110/);
	});

	it('ArmoryAlbumWorkspace.svelte album-folder__stack uses aspect-ratio 280/380', () => {
		expect(albumSrc).toMatch(/\.album-folder__stack[\s\S]*?aspect-ratio:\s*280\s*\/\s*380/);
	});

	it('OperativeLoadoutStudio.svelte ols-dossier-panel uses bento-span-12 standalone row', () => {
		expect(studioSrc).toMatch(/ols-dossier-panel bento-span-12/);
	});

	it('OperativeLoadoutStudio.svelte does NOT use ols-dossier-panel bento-span-3 as sole desktop layout', () => {
		expect(studioSrc).not.toMatch(/ols-dossier-panel bento-span-3/);
	});

	it('player-dossier.css qa-pathway-shell does NOT clip pathway overflow', () => {
		expect(dossierCssSrc).toMatch(/\.player-dossier-root \.qa-pathway-shell[\s\S]*?overflow:\s*visible/);
	});
});

describe.skip('Sprint 2.20e — void contract pixel sample (FOUNDATION §3)', () => {
	const voidCapturePath = existsSync(VOID_CAPTURE_PRIMARY)
		? VOID_CAPTURE_PRIMARY
		: existsSync(VOID_CAPTURE_FALLBACK)
			? VOID_CAPTURE_FALLBACK
			: null;

	it('G10 HQ void-contract PNG exists under docs/vision/va-screenshots/', () => {
		expect(voidCapturePath, 'g10-hq-void-1280x900.png or g10-hq-1280.png').not.toBeNull();
	});

	it('sampleVoidContractRatios + evaluateVoidContract pass on G10 HQ viewport crop', () => {
		expect(voidCapturePath).not.toBeNull();
		const png = PNG.sync.read(readFileSync(voidCapturePath!));
		// Crop to Foundation reference viewport (1280×900); tolerate MCP device-pixel-ratio scaling.
		const cropHeight = Math.round(VOID_CONTRACT_HQ_VIEWPORT.height * (png.width / VOID_CONTRACT_HQ_VIEWPORT.width));
		const cropped = new PNG({ width: png.width, height: Math.min(cropHeight, png.height) });
		for (let y = 0; y < cropped.height; y++) {
			png.data.copy(cropped.data, y * png.width * 4, y * png.width * 4, (y + 1) * png.width * 4);
		}

		const sample = sampleVoidContractRatios({
			data: cropped.data,
			width: cropped.width,
			height: cropped.height,
		});
		const result = evaluateVoidContract(sample);

		expect(result.blackCanvasPass, `black ${(sample.blackCanvasRatio * 100).toFixed(1)}%`).toBe(true);
		expect(result.mattePanelPass, `matte ${(sample.mattePanelRatio * 100).toFixed(1)}%`).toBe(true);
		expect(
			result.emissivePass,
			`emissive-of-lit ${(result.emissiveOfLitRatio * 100).toFixed(1)}%`,
		).toBe(true);
		expect(result.allPixelRatiosPass).toBe(true);
	});

	// Layout guards (largest Z2 ≤ 60% viewport, hero ring ≥ 280px) remain Wave F / manual QA —
	// not blocking 2.20 Done when pixel ratios pass per ROADMAP Sprint 2.20e scope.
});
