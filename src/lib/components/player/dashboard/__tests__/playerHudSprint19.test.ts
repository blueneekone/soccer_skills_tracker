/**
 * playerHudSprint19.test.ts — Sprint 1.9 embedded mission deck density (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const HUD_TELEMETRY = join(ROOT, 'lib/styles/hud-telemetry.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const ACTIVE_BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');

const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const telemetryCssSrc = existsSync(HUD_TELEMETRY) ? readFileSync(HUD_TELEMETRY, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const activeBountiesTsSrc = existsSync(ACTIVE_BOUNTIES_TS)
	? readFileSync(ACTIVE_BOUNTIES_TS, 'utf-8')
	: '';

/** questRowEmbedded snippet only (excludes legacy questRow). */
const embeddedSnippet = (() => {
	const start = bountiesSrc.indexOf('{#snippet questRowEmbedded');
	const end = bountiesSrc.indexOf('{#snippet questRow(quest', start);
	return start >= 0 && end > start ? bountiesSrc.slice(start, end) : '';
})();

/** Embedded hub template branch (header + feed, not loading ternary). */
const embeddedTemplateBlock = (() => {
	const anchor = bountiesSrc.indexOf('{:else if sortedQuests.length > 0}');
	const start = bountiesSrc.indexOf('{#if embedded}', anchor);
	const end = bountiesSrc.indexOf('{:else}', start);
	return start >= 0 && end > start ? bountiesSrc.slice(start, end) : '';
})();

describe('Sprint 1.9 — ActiveBounties embedded deck mode', () => {
	it('supports embedded deck via quest-log-panel--embedded', () => {
		expect(bountiesSrc).toMatch(/quest-log-panel--embedded/);
		expect(bountiesSrc).toMatch(/embedded\s*=\s*false|embedded\?:/);
	});

	it('embedded path uses questHudCtaShort instead of bracket questTerminalCmd', () => {
		expect(bountiesSrc).toMatch(/questHudCtaShort/);
		expect(embeddedSnippet).not.toMatch(/questTerminalCmd/);
		expect(embeddedSnippet).not.toMatch(/\[ ACCEPT MISSION \]/);
		expect(embeddedSnippet).not.toMatch(/\[ COMPLETE MISSION \]/);
		expect(embeddedSnippet).not.toMatch(/\[ CLAIM REWARD \]/);
		expect(embeddedSnippet).toMatch(/questHudCtaShort/);
	});

	it('embedded row does not render HudSeededRingCanvas at size 48', () => {
		expect(embeddedSnippet).not.toMatch(/HudSeededRingCanvas/);
		expect(embeddedSnippet).not.toMatch(/size=\{48\}/);
		expect(embeddedSnippet).not.toMatch(/hud-bounty-row__ring/);
	});

	it('embedded header is single ACTIVE MISSIONS without duplicate eyebrows/section tags', () => {
		expect(bountiesSrc).toMatch(/ACTIVE MISSIONS<\/h2>/);
		expect(embeddedTemplateBlock).not.toMatch(/Mission queue/i);
		expect(embeddedTemplateBlock).not.toMatch(/\/\/ PRIORITY DIRECTIVES/);
		expect(embeddedTemplateBlock).not.toMatch(/\/\/ ACTIVE DIRECTIVES/);
		expect(embeddedTemplateBlock).not.toMatch(/quest-log__title">Active missions</i);
	});

	it('embedded feed renders continuous visibleQuests list (no tier section tags)', () => {
		expect(bountiesSrc).toMatch(/quest-log__feed--embedded/);
		expect(bountiesSrc).toMatch(/\{#each visibleQuests as quest/);
	});

	it('quest-row__title-text retains ellipsis + nowrap in embedded line', () => {
		expect(embeddedSnippet).toMatch(/quest-row__title-text/);
		expect(bountiesSrc).toMatch(
			/\.quest-row--embedded\s+\.quest-row__title-text[\s\S]*?text-overflow:\s*ellipsis/,
		);
		expect(bountiesSrc).toMatch(
			/\.quest-row--embedded\s+\.quest-row__title-text[\s\S]*?white-space:\s*nowrap/,
		);
	});

	it('embedded view-all uses plain text without brackets', () => {
		expect(bountiesSrc).toMatch(/View all missions/);
		expect(bountiesSrc).toMatch(/\{#if embedded\}[\s\S]*?View all missions/);
	});
});

describe('Sprint 1.9 — embedded mission deck CSS', () => {
	it('hud-telemetry.css defines single-line grid for embedded hud-bounty-row', () => {
		expect(telemetryCssSrc).toMatch(/\.quest-log-panel--embedded\s+\.hud-bounty-row/);
		expect(telemetryCssSrc).toMatch(
			/\.quest-log-panel--embedded\s+\.hud-bounty-row[\s\S]*?grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)\s+auto\s+auto/,
		);
	});

	it('hud-telemetry.css styles embedded CTA without bracket aesthetic', () => {
		expect(telemetryCssSrc).toMatch(/\.quest-log-panel--embedded\s+\.quest-row__cmd/);
		expect(telemetryCssSrc).toMatch(/#fbbf24/);
	});

	it('player-dashboard-hud.css adds operative-hub embedded quest separator', () => {
		expect(hudCssSrc).toMatch(/\.player-hud-root\s+\.operative-hub\s+\.quest-log-panel--embedded/);
		expect(hudCssSrc).toMatch(/border-top:\s*1px\s+solid\s+#334155/);
	});
});

describe('Sprint 1.9 — activeBounties compact CTA helper', () => {
	it('exports questHudCtaShort with arrow labels', () => {
		expect(activeBountiesTsSrc).toMatch(/export function questHudCtaShort/);
		expect(activeBountiesTsSrc).toMatch(/Accept →/);
		expect(activeBountiesTsSrc).toMatch(/Complete →/);
		expect(activeBountiesTsSrc).toMatch(/Claim →/);
	});
});
