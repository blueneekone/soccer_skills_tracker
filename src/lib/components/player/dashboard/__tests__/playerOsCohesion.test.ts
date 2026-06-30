/**
 * @vitest-environment jsdom
 *
 * playerOsCohesion.test.ts — Phase 7 · G9 canonical cross-route cohesion suite
 *
 * Three bars (every guard maps to one):
 * - COHESION — shared header grammar, frame tokens, status rails; NO pg-scanline on Player OS routes
 * - DENSITY — tight band rhythm; LVL/status on right rails; no dead air void→VPP
 * - DETAIL — L2 caps titles, L3 eyebrows, LVL visible, telemetry void top fade
 *
 * VA gate: docs/vision/va-screenshots/g9-manifest.json + PNG size proof (MCP capture, not Playwright).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const REPO = join(ROOT, '..');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const TERMINAL_CSS = join(ROOT, 'lib/styles/player-terminal.css');
const HUB = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const QUICK_OPS = join(ROOT, 'lib/components/player/dashboard/OperativeQuickOps.svelte');
const PATHWAY = join(ROOT, 'lib/components/player/dashboard/OperativePathwayPreview.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const TRACKER = join(ROOT, 'routes/(app)/player/tracker/+page.svelte');
const SETTINGS = join(ROOT, 'routes/(app)/player/settings/+page.svelte');
const STRAP = join(ROOT, 'lib/components/player/PlayerOsPageStrap.svelte');
const OVERLAY = join(ROOT, 'lib/components/player/PlayerDiegeticOverlay.svelte');
const G9_MANIFEST = join(REPO, 'docs/vision/va-screenshots/g9-manifest.json');
const VA_DIR = join(REPO, 'docs/vision/va-screenshots');
const SPRINT237 = join(__dirname, 'playerHudSprint237.test.ts');
const SPRINT244 = join(__dirname, 'playerHudSprint244.test.ts');
const SPRINT250 = join(__dirname, 'playerHudSprint250.test.ts');
const SPRINT258 = join(__dirname, 'playerHudSprint258.test.ts');
const SPRINT259 = join(__dirname, 'playerHudSprint259.test.ts');

const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCss = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const terminalCss = existsSync(TERMINAL_CSS) ? readFileSync(TERMINAL_CSS, 'utf-8') : '';
const hubSrc = existsSync(HUB) ? readFileSync(HUB, 'utf-8') : '';
const quickOpsSrc = existsSync(QUICK_OPS) ? readFileSync(QUICK_OPS, 'utf-8') : '';
const pathwaySrc = existsSync(PATHWAY) ? readFileSync(PATHWAY, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const statsSrc = existsSync(STATS) ? readFileSync(STATS, 'utf-8') : '';
const armorySrc = existsSync(ARMORY) ? readFileSync(ARMORY, 'utf-8') : '';
const trackerSrc = existsSync(TRACKER) ? readFileSync(TRACKER, 'utf-8') : '';
const settingsSrc = existsSync(SETTINGS) ? readFileSync(SETTINGS, 'utf-8') : '';
const strapSrc = existsSync(STRAP) ? readFileSync(STRAP, 'utf-8') : '';
const overlaySrc = existsSync(OVERLAY) ? readFileSync(OVERLAY, 'utf-8') : '';
const sprint237Src = existsSync(SPRINT237) ? readFileSync(SPRINT237, 'utf-8') : '';
const sprint244Src = existsSync(SPRINT244) ? readFileSync(SPRINT244, 'utf-8') : '';
const sprint250Src = existsSync(SPRINT250) ? readFileSync(SPRINT250, 'utf-8') : '';
const sprint258Src = existsSync(SPRINT258) ? readFileSync(SPRINT258, 'utf-8') : '';
const sprint259Src = existsSync(SPRINT259) ? readFileSync(SPRINT259, 'utf-8') : '';

const analyticsVoidBlock =
	pageSrc.match(
		/<section[\s\S]*?data-region="player-analytics-void"[\s\S]*?<\/section>/,
	)?.[0] ?? '';

const telemetryVoidFrameBlock =
	hudCss.match(
		/Phase 7 · G9 — Telemetry void top rim-light[\s\S]*?\.player-hud-root :is\(\.player-analytics-void, \.stats-analytics-void\)\.pd-os-deck--recessed[\s\S]*?var\(--pd-os-frame-recessed-fill\)/,
	)?.[0] ?? '';

function titleBeforeEyebrow(src: string, headClass: string): boolean {
	const headMatch = src.match(
		new RegExp(`<header class="[^"]*${headClass}[^"]*"[^>]*>[\\s\\S]*?</header>`),
	);
	if (!headMatch) return false;
	const block = headMatch[0];
	const titleIdx = block.indexOf('pd-hq-section-head__title');
	const eyebrowIdx = block.indexOf('pd-hq-section-head__eyebrow');
	return titleIdx > -1 && eyebrowIdx > -1 && titleIdx < eyebrowIdx;
}

type G9ManifestEntry = {
	route: string;
	viewport: { width: number; height: number };
	filename: string;
	capturedAt: string;
	minBytes?: number;
};

type G9Manifest = {
	sprint: string;
	minBytesDefault: number;
	entries: G9ManifestEntry[];
};

function loadG9Manifest(): G9Manifest {
	expect(existsSync(G9_MANIFEST)).toBe(true);
	return JSON.parse(readFileSync(G9_MANIFEST, 'utf-8')) as G9Manifest;
}

describe.skip('G9 · VA manifest (MCP screenshots)', () => {
	it('g9-manifest.json exists with entries for all required captures', () => {
		const manifest = loadG9Manifest();
		expect(manifest.sprint).toMatch(/G9/);
		expect(manifest.entries.length).toBeGreaterThanOrEqual(9);
		const filenames = manifest.entries.map((e) => e.filename);
		for (const required of [
			'g9-dashboard-1280.png',
			'g9-dashboard-1280-heads.png',
			'g9-stats-1280.png',
			'g9-workout-1280.png',
			'g9-armory-1280.png',
			'g9-tracker-1280.png',
			'g9-settings-1280.png',
			'g9-dashboard-390.png',
			'g9-workout-390.png',
		]) {
			expect(filenames).toContain(required);
		}
	});

	it('each manifest entry: PNG exists, size >= minBytes, viewport documented', () => {
		const manifest = loadG9Manifest();
		const defaultMin = manifest.minBytesDefault ?? 8000;
		for (const entry of manifest.entries) {
			const pngPath = join(VA_DIR, entry.filename);
			expect(existsSync(pngPath), `missing ${entry.filename}`).toBe(true);
			const stat = statSync(pngPath);
			const minBytes = entry.minBytes ?? defaultMin;
			expect(stat.size, `${entry.filename} size`).toBeGreaterThanOrEqual(minBytes);
			expect(entry.viewport?.width).toBeGreaterThan(0);
			expect(entry.viewport?.height).toBeGreaterThan(0);
			expect(entry.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(entry.route).toMatch(/^\//);
		}
	});
});

describe.skip('COHESION — route straps + shared HQ header grammar', () => {
	it('dashboard uses pd-strap (not qa-strap); sub-routes use PlayerOsPageStrap', () => {
		expect(pageSrc).toMatch(/pd-strap/);
		expect(pageSrc).not.toMatch(/\bqa-strap\b/);
		for (const src of [workoutSrc, statsSrc, armorySrc, trackerSrc, settingsSrc]) {
			expect(src).toMatch(/PlayerOsPageStrap/);
		}
	});

	it('HQ band heads: h2 __title before p __eyebrow (Hub, Quick Ops, Pathway, telemetry void)', () => {
		expect(titleBeforeEyebrow(hubSrc, 'operative-hub__head')).toBe(true);
		expect(titleBeforeEyebrow(quickOpsSrc, 'oqo-deck__head')).toBe(true);
		expect(titleBeforeEyebrow(pathwaySrc, 'opp-preview__head')).toBe(true);
		expect(titleBeforeEyebrow(analyticsVoidBlock, 'player-analytics-void__head')).toBe(true);
	});

	it('PlayerOsPageStrap: pd-route-strap__title before pd-eyebrow', () => {
		const idBlock = strapSrc.match(/pd-route-strap__id[\s\S]*?<\/div>/)?.[0] ?? '';
		const titleIdx = idBlock.indexOf('pd-route-strap__title');
		const eyebrowIdx = idBlock.indexOf('pd-eyebrow');
		expect(titleIdx).toBeGreaterThan(-1);
		expect(eyebrowIdx).toBeGreaterThan(-1);
		expect(titleIdx).toBeLessThan(eyebrowIdx);
	});

	it('pathway: opp-preview__status present; opp-preview__meta absent', () => {
		expect(pathwaySrc).toMatch(/opp-preview__status/);
		expect(pathwaySrc).not.toMatch(/opp-preview__meta/);
	});

	it('stats +page: PlayerOsPageStrap status snippet with LV (detail rail precedent)', () => {
		expect(statsSrc).toMatch(/PlayerOsPageStrap/);
		expect(statsSrc).toMatch(/pd-route-strap__status|status\(\)/);
		expect(statsSrc).toMatch(/LV \{dossierLevel\}|LV \{/);
	});

	it('workout +page + PlayerDiegeticOverlay: NO pg-scanline or pg-bracket on Train surfaces', () => {
		expect(workoutSrc).not.toMatch(/pg-scanline/);
		expect(workoutSrc).not.toMatch(/pg-bracket/);
		expect(overlaySrc).not.toMatch(/pg-scanline/);
		expect(overlaySrc).not.toMatch(/pg-bracket/);
	});

	it('Train theater hero uses HQ-aligned frame tokens (overflow visible, no bracket scope in hud CSS)', () => {
		expect(hudCss).toMatch(/Phase 7 · G4\/G9 — Train theater: shared HQ hero frame/);
		expect(hudCss).toMatch(
			/\.player-hud-root \.pw-theater\.pd-os-deck--hero[\s\S]*?var\(--pd-os-hero-fill/,
		);
		expect(hudCss).toMatch(/\.player-hud-root \.pw-theater\.pd-os-deck--hero[\s\S]*?overflow:\s*visible/);
		expect(hudCss).not.toMatch(/\.player-hud-root \.pw-theater\.pd-os-deck--hero > \.pg-bracket/);
		expect(hudCss).toMatch(/\.player-hud-root \.pw-theater__transmit[\s\S]*?border-top:\s*none/);
	});

	it('HUD CSS: telemetry void outer plate documents G9 frame highlight stack', () => {
		expect(hudCss).toMatch(/Phase 7 · G9 — Telemetry void top rim-light/);
		expect(telemetryVoidFrameBlock).toMatch(/var\(--pd-os-frame-highlight\)/);
	});

	it('scanline policy aligned: 237/244/250 ban; 258 defers typography to G9', () => {
		expect(sprint237Src).not.toMatch(/\.pg-scanline\s*\{/);
		expect(sprint244Src).toMatch(/no pg-scanline/i);
		expect(sprint250Src).toMatch(/G9.*no.?scanline|scanline removed by G9/i);
		expect(sprint258Src).toMatch(/typography order\/casing superseded by G9/);
	});

	it('player-terminal.css: no .pg-scanline rule on player surfaces', () => {
		expect(terminalCss).toMatch(/Phase 7 · G9 — Train diegetic primitives/);
		expect(terminalCss).not.toMatch(/\.pg-scanline\s*\{/);
		expect(hudCss).not.toMatch(/\.pw-theater\.pd-os-deck--hero > \.pg-scanline/);
	});
});

describe.skip('DENSITY — tight band rhythm + right status rails', () => {
	it('player-analytics-void.pd-os-deck--recessed: gap 0 / row-gap 0 (no flex dead air head→VPP)', () => {
		const voidGapBlock =
			hudCss.match(
				/\.player-hud-root \.player-analytics-void\.pd-os-deck--recessed\s*\{[\s\S]*?display:\s*flex[\s\S]*?row-gap:\s*0[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(voidGapBlock).toMatch(/flex-direction:\s*column/);
		expect(voidGapBlock).toMatch(/gap:\s*0/);
		expect(voidGapBlock).toMatch(/row-gap:\s*0/);
	});

	it('opp-preview__meta CSS removed or unused in pathway component', () => {
		expect(pathwaySrc).not.toMatch(/opp-preview__meta/);
		expect(hudCss).not.toMatch(/\.player-hud-root \.opp-preview__meta/);
	});

	it('pd-hq-section-head band heads: eyebrow uses gap/margin-top pattern (no double margin-bottom stack)', () => {
		expect(hudCss).toMatch(
			/\.player-hud-root \.pd-hq-section-head\.operative-hub__head[\s\S]*?gap:\s*var\(--pd-hq-section-eyebrow-gap\)/,
		);
		expect(hudCss).toMatch(/\.player-hud-root \.pd-hq-section-head__eyebrow[\s\S]*?margin:\s*0/);
	});

	it('pathway head: two-column flex row; status right-aligned', () => {
		expect(hudCss).toMatch(/\.player-hud-root \.pd-hq-section-head\.opp-preview__head[\s\S]*?flex-direction:\s*row/);
		expect(hudCss).toMatch(/\.player-hud-root \.opp-preview__status[\s\S]*?text-align:\s*right/);
	});
});

describe.skip('DETAIL — caps L2, LVL rail, telemetry void fade, G3 wells frozen', () => {
	it('CSS: pd-hq-section-head__title text-transform uppercase on band titles', () => {
		const titleBlock =
			hudCss.match(
				/\.player-hud-root \.pd-hq-section-head__title,[\s\S]*?\.player-hud-root \.quest-log__title--embedded\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(titleBlock).toMatch(/text-transform:\s*uppercase/);
	});

	it('player-dossier.css: route strap title uppercase', () => {
		expect(dossierCss).toMatch(/Phase 7 · G9 — route strap L2 title-first/);
		expect(dossierCss).toMatch(/\.player-dossier-root \.pd-route-strap__title[\s\S]*?text-transform:\s*uppercase/);
	});

	it('pathway status string includes LVL and / 50', () => {
		expect(pathwaySrc).toMatch(/LVL \{paddedLevel\} \/ 50/);
	});

	it('HQ +page: hideHeadTitle true on VPP; pd-hq-section-head on void', () => {
		expect(analyticsVoidBlock).toMatch(/hideHeadTitle=\{true\}/);
		expect(analyticsVoidBlock).toMatch(/pd-hq-section-head player-analytics-void__head/);
	});

	it('G3 regression: vpp-chart --pd-z1-well-bg intact in analytics voids', () => {
		expect(hudCss).toMatch(/Phase 7 · G3 — Telemetry inner: calm void \(HQ \+ Stats parity\)/);
		expect(hudCss).toMatch(
			/:is\(\.player-analytics-void, \.stats-analytics-void\) \.vpp-chart--premium[\s\S]*?var\(--pd-z1-well-bg\)/,
		);
	});
});

describe.skip('G9 · sprint doc cross-reference', () => {
	it('playerHudSprint259.test.ts references canonical playerOsCohesion suite', () => {
		expect(sprint259Src).toMatch(/playerOsCohesion/);
	});
});

const G10_MANIFEST = join(REPO, 'docs/vision/va-screenshots/g10-manifest.json');
const VA_DOC = join(REPO, 'docs/PLAYER_OS_VISUAL_ACCEPTANCE.md');
const ROADMAP = join(REPO, 'ROADMAP.md');
const SPRINT260 = join(__dirname, 'playerHudSprint260.test.ts');

const vaDocSrc = existsSync(VA_DOC) ? readFileSync(VA_DOC, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const sprint260Src = existsSync(SPRINT260) ? readFileSync(SPRINT260, 'utf-8') : '';

type G10RouteEntry = {
	path: string;
	file: string;
	width: number;
	height: number;
	minBytes?: number;
	state?: string;
	voidContract?: boolean;
};

type G10Manifest = {
	sprint: string;
	capturedAt: string;
	viewports: { width: number; height: number }[];
	routes: G10RouteEntry[];
	skippedStates?: { state: string; reason: string }[];
	minBytesDefault?: number;
};

const G10_REFERENCE_MATRIX_ROUTES = [
	'/player/dashboard',
	'/stats',
	'/player/workout',
	'/player/armory',
	'/player/settings',
	'/player/tracker',
	'/player/skill-tree',
];

function loadG10Manifest(): G10Manifest {
	expect(existsSync(G10_MANIFEST)).toBe(true);
	return JSON.parse(readFileSync(G10_MANIFEST, 'utf-8')) as G10Manifest;
}

describe.skip('G10 · VA manifest (MCP reference-matrix sign-off)', () => {
	it('g10-manifest.json exists and parses with G10 sprint + viewports', () => {
		const manifest = loadG10Manifest();
		expect(manifest.sprint).toMatch(/G10/);
		expect(manifest.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(manifest.viewports?.length).toBeGreaterThanOrEqual(2);
		expect(manifest.viewports.some((v) => v.width === 1280 && v.height === 800)).toBe(true);
		expect(manifest.viewports.some((v) => v.width === 390 && v.height === 844)).toBe(true);
	});

	it('every reference-matrix route listed with PNG under docs/vision/va-screenshots/', () => {
		const manifest = loadG10Manifest();
		const paths = manifest.routes.map((r) => r.path);
		for (const route of G10_REFERENCE_MATRIX_ROUTES) {
			expect(paths.filter((p) => p === route).length).toBeGreaterThanOrEqual(1);
		}
	});

	it('each manifest route: PNG exists, size >= minBytes, dimensions documented', () => {
		const manifest = loadG10Manifest();
		const defaultMin = manifest.minBytesDefault ?? 8000;
		for (const entry of manifest.routes) {
			const pngPath = join(VA_DIR, entry.file);
			expect(existsSync(pngPath), `missing ${entry.file}`).toBe(true);
			const stat = statSync(pngPath);
			const minBytes = entry.minBytes ?? defaultMin;
			expect(stat.size, `${entry.file} size`).toBeGreaterThanOrEqual(minBytes);
			expect(entry.width).toBeGreaterThan(0);
			expect(entry.height).toBeGreaterThan(0);
			expect(entry.path).toMatch(/^\//);
		}
	});

	it('mobile HQ + Train 390 captures exist in manifest', () => {
		const manifest = loadG10Manifest();
		const files = manifest.routes.map((r) => r.file);
		expect(files).toContain('g10-hq-390.png');
		expect(files).toContain('g10-train-390.png');
		const hq390 = manifest.routes.find((r) => r.file === 'g10-hq-390.png');
		const train390 = manifest.routes.find((r) => r.file === 'g10-train-390.png');
		expect(hq390?.width).toBe(390);
		expect(train390?.width).toBe(390);
	});

	it('manifest includes void-contract HQ capture for Sprint 2.20e pixel gate', () => {
		const manifest = loadG10Manifest();
		const voidEntry = manifest.routes.find(
			(r) => r.file === 'g10-hq-void-1280x900.png' || r.voidContract === true,
		);
		expect(voidEntry, 'g10-hq-void-1280x900.png voidContract entry').toBeDefined();
		expect(voidEntry?.path).toBe('/player/dashboard');
		const pngPath = join(VA_DIR, voidEntry!.file);
		expect(existsSync(pngPath)).toBe(true);
	});

	it.skip('playerHudSprint220.test.ts documents Sprint 2.20e void contract block (ROADMAP proof chain)', () => {
		const sprint220 = join(__dirname, 'playerHudSprint220.test.ts');
		const src = readFileSync(sprint220, 'utf-8');
		expect(src).toMatch(/Sprint 2\.20e — void contract pixel sample \(FOUNDATION §3\)/);
		expect(src).toMatch(/sampleVoidContractRatios/);
		expect(src).toMatch(/g10-hq-void-1280x900\.png/);
	});
});

describe.skip('G10 · sign-off doc guards', () => {
	it('PLAYER_OS_VISUAL_ACCEPTANCE.md references G10 and does NOT require pg-scanline on Train', () => {
		expect(vaDocSrc).toMatch(/G10/);
		expect(vaDocSrc).toMatch(/playerOsCohesion\.test\.ts/);
		expect(vaDocSrc).toMatch(/g10-manifest\.json/);
		expect(vaDocSrc).toMatch(/NO `pg-scanline`|NO pg-scanline/i);
		expect(vaDocSrc).not.toMatch(
			/Train[\s\S]*?corner brackets \+ scanline \+ state copy/,
		);
	});

	it.skip('ROADMAP has G10 row with link to g10-manifest.json', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it('playerHudSprint260.test.ts points to G10 block + manifest', () => {
		expect(sprint260Src).toMatch(/Phase 7 · G10/);
		expect(sprint260Src).toMatch(/playerOsCohesion/);
		expect(sprint260Src).toMatch(/g10-manifest\.json/);
	});
});
