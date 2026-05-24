/**
 * playerHudSprint2101.test.ts — Sprint 2.10.1 inline world context + embedded CTA colors (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HQ_WORLD = join(ROOT, 'lib/player/dashboard/hqWorldContext.ts');
const HQ_WORLD_TEST = join(ROOT, 'lib/player/dashboard/__tests__/hqWorldContext.test.ts');
const STRIP = join(ROOT, 'lib/components/player/dashboard/HqWorldContextStrip.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const DOSSIER_CSS = join(ROOT, 'lib/styles/player-dossier.css');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const hqWorldSrc = existsSync(HQ_WORLD) ? readFileSync(HQ_WORLD, 'utf-8') : '';
const hqWorldTestSrc = existsSync(HQ_WORLD_TEST) ? readFileSync(HQ_WORLD_TEST, 'utf-8') : '';
const stripSrc = existsSync(STRIP) ? readFileSync(STRIP, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const dossierCssSrc = existsSync(DOSSIER_CSS) ? readFileSync(DOSSIER_CSS, 'utf-8') : '';
const playerOsSrc = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';

describe('Sprint 2.10.1 — inline world context in pd-strap', () => {
	it('places HqWorldContextStrip inside pd-strap__context with inline prop', () => {
		expect(pageSrc).toMatch(/pd-strap__context/);
		expect(pageSrc).toMatch(/<HqWorldContextStrip[\s\S]*inline/);
		expect(pageSrc).not.toMatch(
			/<\/header>\s*\n\s*<HqWorldContextStrip/,
		);
	});

	it('HqWorldContextStrip supports inline variant and hides when empty', () => {
		expect(stripSrc).toMatch(/hq-world-context--inline/);
		expect(stripSrc).toMatch(/hasContent/);
		expect(stripSrc).toMatch(/\{#if hasContent\}/);
	});

	it('does not use standalone full-width bordered panel for inline dashboard', () => {
		expect(hudCssSrc).toMatch(/\.hq-world-context--inline/);
		expect(hudCssSrc).toMatch(/\.pd-strap__context/);
		const inlineBlock = hudCssSrc.match(
			/\.hq-world-context--inline[\s\S]*?\}/,
		)?.[0] ?? '';
		expect(inlineBlock).toMatch(/border:\s*none/);
		expect(inlineBlock).toMatch(/margin-block:\s*0|margin-bottom:\s*0/);
	});
});

describe('Sprint 2.10.1 — badge dedupe (hqWorldContext.ts)', () => {
	it('exports heroQuestId and suppress badge params', () => {
		expect(hqWorldSrc).toMatch(/heroQuestId/);
		expect(hqWorldSrc).toMatch(/suppressTrainTodayBadge/);
		expect(hqWorldSrc).toMatch(/suppressProfileIncompleteBadge/);
		expect(hqWorldSrc).toMatch(/daily-training-log/);
	});

	it('has unit tests for badge dedupe cases', () => {
		expect(hqWorldTestSrc).toMatch(/heroQuestId.*daily-training-log|daily-training-log.*heroQuestId/);
		expect(hqWorldTestSrc).toMatch(/suppressProfileIncompleteBadge/);
		expect(hqWorldTestSrc).toMatch(/suppressTrainTodayBadge/);
	});

	it('page passes heroQuestId and suppressProfileIncompleteBadge', () => {
		expect(pageSrc).toMatch(/heroQuestId/);
		expect(pageSrc).toMatch(/suppressProfileIncompleteBadge/);
		expect(pageSrc).toMatch(/onHeroQuestId/);
	});
});

describe('Sprint 2.10.1 — embedded mission CTA colors', () => {
	it('player-dashboard-hud.css overrides embedded accept to dossier gold', () => {
		expect(hudCssSrc).toMatch(
			/\.player-hud-root\s+\.quest-row__cmd--embedded\.quest-row__cmd--accept/,
		);
		expect(hudCssSrc).toMatch(
			/\.player-hud-root\s+\.quest-row__cmd--embedded\.quest-row__cmd--accept[\s\S]*--pd-accent-action|#fbbf24/,
		);
		const acceptRule =
			hudCssSrc.match(
				/\.player-hud-root\s+\.quest-row__cmd--embedded\.quest-row__cmd--accept[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(acceptRule).not.toMatch(/#22d3ee/);
	});

	it('embedded claim/complete use gold not legacy cyan/green under player-hud-root', () => {
		const embeddedComplete =
			hudCssSrc.match(
				/\.player-hud-root\s+\.quest-row__cmd--embedded\.quest-row__cmd--complete[\s\S]*?\}/,
			)?.[0] ?? '';
		const embeddedClaim =
			hudCssSrc.match(
				/\.player-hud-root\s+\.quest-row__cmd--embedded\.quest-row__cmd--claim[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(embeddedComplete).not.toMatch(/#22d3ee/);
		expect(embeddedClaim).not.toMatch(/#2dff9a/);
		expect(embeddedComplete).toMatch(/--pd-accent-action|#fbbf24/);
		expect(embeddedClaim).toMatch(/--pd-accent-action|#fbbf24/);
	});

	it('hero CTA remains gold chamfer (unchanged)', () => {
		expect(hudCssSrc).toMatch(/\.player-hud-root\s+\.quest-hero__cta/);
		expect(hudCssSrc).toMatch(/\.quest-hero__cta[\s\S]*#fbbf24/);
	});
});

describe('Sprint 2.10.1 — ActiveBounties hero callback', () => {
	it('exposes onHeroQuestId for badge dedupe wiring', () => {
		expect(bountiesSrc).toMatch(/onHeroQuestId/);
		expect(bountiesSrc).toMatch(/onHeroQuestId\?\.\(heroQuest\?\.id/);
	});
});

describe('Sprint 2.10.1 — PLAYER_OS.md', () => {
	it('documents inline world context in strap (2.10.1 supersedes full panel)', () => {
		expect(playerOsSrc).toMatch(/2\.10\.1/);
		expect(playerOsSrc).toMatch(/pd-strap__context|inline inside `pd-strap`/i);
		expect(playerOsSrc).toMatch(/hq-world-context--inline/);
	});
});

describe('Sprint 2.10.1 — prior sprint tests preserved', () => {
	const priorTests = [
		join(ROOT, 'lib/components/player/dashboard/__tests__/playerHudSprint210.test.ts'),
		join(ROOT, 'lib/player/dashboard/__tests__/hqWorldContext.test.ts'),
	];

	for (const path of priorTests) {
		it(`prior test file exists: ${path.split(/[/\\]/).pop()}`, () => {
			expect(existsSync(path)).toBe(true);
		});
	}
});
