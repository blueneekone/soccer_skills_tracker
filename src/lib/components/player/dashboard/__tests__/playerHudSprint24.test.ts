/**
 * playerHudSprint24.test.ts — Sprint 2.4 Gold Command palette + analytics deck (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const RADAR = join(ROOT, 'lib/components/player/dashboard/AttributeRadar.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const HMP = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const radarSrc = existsSync(RADAR) ? readFileSync(RADAR, 'utf-8') : '';
const vppSrc = existsSync(VPP) ? readFileSync(VPP, 'utf-8') : '';
const hmpSrc = existsSync(HMP) ? readFileSync(HMP, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.4 — player-hud-root structural token remap', () => {
	it('.player-hud-root sets --color-structural to slate (not global #3b82f6)', () => {
		const rootBlock = hudCssSrc.match(/\.player-hud-root\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(rootBlock).toMatch(/--color-structural:\s*#64748b/);
		expect(rootBlock).not.toMatch(/--color-structural:\s*#3b82f6/);
	});

	it('.player-hud-root .bento-card uses dossier panel border (superseded by 2.8 Player Dossier)', () => {
		expect(hudCssSrc).toMatch(/\.player-hud-root\s+\.bento-card[\s\S]*?var\(--pd-panel|--player-hud-surface/);
		expect(hudCssSrc).toMatch(/\.player-hud-root\s+\.bento-card[\s\S]*?var\(--pd-line|--player-hud-border/);
		expect(hudCssSrc).toMatch(/\.player-hud-root\s+\.bento-card[\s\S]*?border-radius:\s*0/);
	});
});

describe('Sprint 2.4 — AttributeRadar data polygon (teal in 2.8 Player Dossier)', () => {
	it('skill polygon does NOT use #3b82f6 or structural blue fallback for fill/stroke', () => {
		const skillPoly = radarSrc.match(/points=\{skillPolygonPoints\}[\s\S]*?\/\>/)?.[0] ?? radarSrc;
		expect(skillPoly).not.toMatch(/#3b82f6/);
		expect(skillPoly).not.toMatch(/var\(--color-structural,\s*#3b82f6\)/);
		// superseded by 2.8 Player Dossier — teal data accent
		expect(skillPoly).toMatch(/var\(--pd-accent-data|#14b8a6/);
	});

	it('vertex circles use teal data accent (superseded by 2.8 Player Dossier)', () => {
		const vtxBlock = radarSrc.match(/\{#each skillVertices[\s\S]*?\{\/each\}/)?.[0] ?? '';
		expect(vtxBlock).toMatch(/var\(--pd-accent-data|#14b8a6/);
		expect(vtxBlock).not.toMatch(/#3b82f6/);
	});
});

describe('Sprint 2.4 — VanguardProtocolPanel palette', () => {
	it('.vpp-eyebrow does NOT use #3b82f6', () => {
		const eyebrow = vppSrc.match(/\.vpp-eyebrow\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(eyebrow).not.toMatch(/#3b82f6/);
		expect(eyebrow).not.toMatch(/var\(--color-structural,\s*#3b82f6\)/);
	});

	it('.vpp-inspector__bar::after uses teal data accent, not structural blue (superseded by 2.8 Player Dossier)', () => {
		const barAfter = vppSrc.match(/\.vpp-inspector__bar::after\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(barAfter).toMatch(/var\(--pd-accent-data|#14b8a6/);
		expect(barAfter).not.toMatch(/#3b82f6/);
		expect(barAfter).not.toMatch(/var\(--color-structural,\s*#3b82f6\)/);
	});
});

describe('Sprint 2.4 — HudMetricsPanel embedded empty state', () => {
	it('when embedded, does NOT render AWAITING TELEMETRY without !embedded guard', () => {
		expect(hmpSrc).toMatch(/!telemetryReady[\s\S]*?!embedded|!embedded[\s\S]*?!telemetryReady/);
		expect(hmpSrc).toMatch(/hmp-awaiting/);
		const awaitingBlock = hmpSrc.match(/\{#if[^}]*telemetryReady[^}]*\}[\s\S]*?hmp-awaiting[\s\S]*?\{\/if\}/)?.[0] ?? '';
		expect(awaitingBlock).toMatch(/!embedded/);
	});
});

describe('Sprint 2.4 — +page.svelte two-band analytics deck', () => {
	it('has player-analytics-deck wrapper combining VPP + capsules', () => {
		expect(pageSrc).toMatch(/player-analytics-deck/);
		expect(pageSrc).toMatch(/<VanguardProtocolPanel[\s\S]*?player-capsules-strip|player-analytics-deck[\s\S]*?<VanguardProtocolPanel/);
	});

	it('does NOT have two separate top-level bento-card sections for telemetry AND capsules', () => {
		const telemetryOnly = pageSrc.match(
			/<section[^>]*bento-card[^>]*aria-label="Vanguard Protocol telemetry"/,
		);
		const capsulesOnly = pageSrc.match(
			/<section[^>]*bento-card[^>]*lobby-capsules-section/,
		);
		expect(telemetryOnly).toBeNull();
		expect(capsulesOnly).toBeNull();
	});

	it('does NOT import PlayerCommandCenter (2.1.1 guard)', () => {
		expect(pageSrc).not.toMatch(/PlayerCommandCenter/);
	});
});

describe('Sprint 2.4 — PLAYER_OS design system docs', () => {
	it('PLAYER_OS.md documents structural slate remap under .player-hud-root', () => {
		expect(playerOsSrc).toMatch(/\.player-hud-root/);
		expect(playerOsSrc).toMatch(/#64748b|#334155/);
		expect(playerOsSrc).toMatch(/structural|slate/i);
	});

	it('PLAYER_OS.md documents two-band layout (command + analytics)', () => {
		expect(playerOsSrc).toMatch(/two-band|Two-band|analytics deck|Analytics band/i);
		expect(playerOsSrc).toMatch(/OperativeHub|analytics/i);
	});

	it('PLAYER_OS.md documents dossier radar data accent (superseded by 2.8 Player Dossier)', () => {
		expect(playerOsSrc).toMatch(/teal.*radar|radar.*teal|--pd-accent-data/i);
	});
});

describe('Sprint 2.4 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint14.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint15.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint16.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint17.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint18.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint19.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint20.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint21.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint22.test.ts'),
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint23.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
