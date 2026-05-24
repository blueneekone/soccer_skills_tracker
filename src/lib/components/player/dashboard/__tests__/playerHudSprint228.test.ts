/**
 * playerHudSprint228.test.ts — Sprint 2.22 slice 6b-revise HQ mission rail (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const ACTIVE_BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const activeBountiesTsSrc = existsSync(ACTIVE_BOUNTIES_TS)
	? readFileSync(ACTIVE_BOUNTIES_TS, 'utf-8')
	: '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';

/** Embedded hub template branch (header + feed, not loading ternary). */
const embeddedTemplateBlock = (() => {
	const anchor = bountiesSrc.indexOf('{:else if sortedQuests.length > 0}');
	const start = bountiesSrc.indexOf('{#if embedded}', anchor);
	const end = bountiesSrc.indexOf('{:else}', start);
	return start >= 0 && end > start ? bountiesSrc.slice(start, end) : '';
})();

/** questRowEmbedded snippet only. */
const embeddedSnippet = (() => {
	const start = bountiesSrc.indexOf('{#snippet questRowEmbedded');
	const end = bountiesSrc.indexOf('{#snippet questRow(quest', start);
	return start >= 0 && end > start ? bountiesSrc.slice(start, end) : '';
})();

describe('Sprint 2.22 slice 6b-revise — HQ mission rail overview (no hero cards)', () => {
	it('embedded block uses visibleQuests feed with questRowEmbedded only', () => {
		expect(embeddedTemplateBlock).toMatch(/\{#each visibleQuests as quest/);
		expect(embeddedTemplateBlock).toMatch(/\{@render questRowEmbedded\(quest\)/);
		expect(embeddedTemplateBlock).toMatch(/quest-log__feed--embedded/);
	});

	it('embedded block does NOT render questHeroCard or questSecondaryCard', () => {
		expect(embeddedTemplateBlock).not.toMatch(/\{@render questHeroCard/);
		expect(embeddedTemplateBlock).not.toMatch(/\{@render questSecondaryCard/);
		expect(embeddedTemplateBlock).not.toMatch(/\{#if primaryHeroQuest\}/);
		expect(embeddedTemplateBlock).not.toMatch(/secondaryQuests/);
	});

	it('questRowEmbedded applies quest-row--promoted via isPromotedQuest', () => {
		expect(bountiesSrc).toMatch(/isPromotedQuest/);
		expect(activeBountiesTsSrc).toMatch(/export function isPromotedQuest/);
		expect(embeddedSnippet).toMatch(/quest-row--promoted=\{isPromotedQuest\(quest\)\}/);
	});

	it('questRowEmbedded shows inline xp on compact widths and lede for wide desktop', () => {
		expect(embeddedSnippet).toMatch(/formatQuestRewardLabel\(quest\)/);
		expect(embeddedSnippet).toMatch(/quest-row__xp--inline/);
		expect(embeddedSnippet).toMatch(/quest-row__lede--rail-wide/);
		expect(missionsCssSrc).toMatch(/@media \(min-width: 1280px\)[\s\S]*?quest-row__lede--rail-wide/);
	});

	it('onHeroQuestId falls back to first visibleQuest when no heroQuest', () => {
		expect(bountiesSrc).toMatch(/onHeroQuestId\?\.\(heroQuest\?\.id \?\? visibleQuests\[0\]\?\.id/);
	});

	it('player-missions.css contains Sprint 2.22 slice 6b-revise rail styles', () => {
		expect(missionsCssSrc).toMatch(/Sprint 2\.22 slice 6b-revise/);
		expect(missionsCssSrc).toMatch(/\.quest-row--rail\.quest-row--embedded\.quest-row--promoted/);
		expect(missionsCssSrc).toMatch(/\.quest-row__xp--inline/);
	});

	it('player-dashboard-hud.css retains hub missions column + pd-os-deck lighting', () => {
		expect(hudCssSrc).toMatch(/Sprint 2\.22 slice 6b/);
		expect(hudCssSrc).toMatch(/operative-hub__missions[\s\S]*?background:\s*transparent/);
	});

	it('ROADMAP.md marks 6b-revise Done and 6b superseded', () => {
		expect(roadmapSrc).toMatch(/\|\s*\*\*6b-revise\*\*\s*\|[^|]*\|\s*\*\*Done\*\*\s*\|/);
		expect(roadmapSrc).toMatch(/Sprint 2\.22 slice 6b-revise scope/);
		expect(roadmapSrc).toMatch(/6b.*Superseded by 6b-revise/);
	});
});
