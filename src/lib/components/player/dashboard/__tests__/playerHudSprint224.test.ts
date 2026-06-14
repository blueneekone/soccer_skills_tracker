/**
 * playerHudSprint224.test.ts — Sprint 2.22 slice 4d quick ops + 4d-fix dual hero (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const ACTIVE_BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');

const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const ibmSrc = existsSync(IBM) ? readFileSync(IBM, 'utf-8') : '';
const activeBountiesTsSrc = existsSync(ACTIVE_BOUNTIES_TS)
	? readFileSync(ACTIVE_BOUNTIES_TS, 'utf-8')
	: '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCssSrc = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';

/** Embedded hub template branch (header + feed, not loading ternary). */
const embeddedTemplateBlock = (() => {
	const anchor = bountiesSrc.indexOf('{:else if sortedQuests.length > 0}');
	const start = bountiesSrc.indexOf('{#if embedded}', anchor);
	const end = bountiesSrc.indexOf('{:else}', start);
	return start >= 0 && end > start ? bountiesSrc.slice(start, end) : '';
})();

describe('Sprint 2.22 slice 4d — Quick ops three-column grid', () => {
	it('player-dashboard-hud.css .oqo-deck__grid uses repeat(3 at all breakpoints', () => {
		expect(hudCssSrc).toMatch(/\.oqo-deck__grid[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
		const slice4dBlock = hudCssSrc.match(/Sprint 2\.22 slice 4d[\s\S]*?\.oqo-deck__grid[\s\S]*?}/)?.[0] ?? '';
		expect(slice4dBlock).toMatch(/repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
		expect(slice4dBlock).not.toMatch(/repeat\(2,\s*1fr\)/);
	});

	it('mobile quick ops keeps min-height 44px touch targets', () => {
		expect(hudCssSrc).toMatch(/@media \(max-width: 479px\)[\s\S]*?\.oqo-op[\s\S]*?min-height:\s*44px/);
	});
});

describe('Sprint 2.22 slice 4d-fix — rail-only embedded mission deck + identity + XP copy', () => {
	it('embedded deck renders rail rows only — no hero cards in embedded path', () => {
		expect(bountiesSrc).toMatch(/\{#snippet questHeroCard/);
		expect(embeddedTemplateBlock).toMatch(/\{#each (visibleQuests|embeddedFeed) as quest/);
		expect(embeddedTemplateBlock).toMatch(/\{@render questRowEmbedded\(quest\)/);
		expect(embeddedTemplateBlock).not.toMatch(/\{@render questHeroCard/);
		expect(embeddedTemplateBlock).not.toMatch(/\{@render questSecondaryCard/);
		expect(embeddedTemplateBlock).not.toMatch(/\{#if primaryHeroQuest\}/);
		expect(embeddedTemplateBlock).not.toMatch(/\{#each heroCardQuests as quest/);
	});

	it('quest-row--promoted class applied for coach/parent bounties', () => {
		expect(bountiesSrc).toMatch(/isPromotedQuest/);
		expect(bountiesSrc).toMatch(/quest-row--promoted/);
		expect(activeBountiesTsSrc).toMatch(/export function isPromotedQuest/);
	});

	it('accept lifecycle uses earn-on-completion reward copy', () => {
		expect(activeBountiesTsSrc).toMatch(/export function formatQuestRewardLabel/);
		expect(activeBountiesTsSrc).toMatch(/Earn \+\$\{xp\} XP on completion/);
		expect(bountiesSrc).toMatch(/formatQuestRewardLabel\(quest\)/);
		expect(bountiesSrc).not.toMatch(
			/quest-hero__reward">\+\{heroQuest\.xpReward/,
		);
	});

	it('IdentityBentoModule has ibm-body--hub-span when embedded', () => {
		expect(ibmSrc).toMatch(/ibm-body--hub-span/);
		expect(ibmSrc).toMatch(/\{#if embedded\}[\s\S]*?ibm-body--hub-span/);
	});

	it('player-dashboard-hud.css lays out ibm-body--hub-span full width', () => {
		expect(hudCssSrc).toMatch(/ibm-body--hub-span/);
		expect(hudCssSrc).toMatch(/grid-column:\s*1\s*\/\s*-1/);
	});

	it('player-missions.css defines quest-hero--gold and quest-hero--teal accents', () => {
		expect(missionsCssSrc).toMatch(/\.quest-hero--gold/);
		expect(missionsCssSrc).toMatch(/\.quest-hero--teal/);
	});
});

describe('Sprint 2.22 slice 4d-fix-b — teal hover + identity metrics row + typography', () => {
	it('player-dashboard-hud.css scopes quest-hero__cta:hover to gold hero only', () => {
		expect(hudCssSrc).toMatch(/\.quest-hero--gold \.quest-hero__cta:hover/);
		expect(hudCssSrc).not.toMatch(
			/\.player-hud-root \.quest-hero__cta:hover[\s\S]*?--pd-accent-action/,
		);
	});

	it('player-dashboard-hud.css contains teal hero CTA hover rule', () => {
		expect(hudCssSrc).toMatch(/\.quest-hero--teal \.quest-hero__cta:hover/);
		expect(hudCssSrc).toMatch(/--pd-accent-data,\s*#14b8a6/);
	});

	it('ibm-body--hub-span stacks metrics below identity with border-top', () => {
		const block =
			hudCssSrc.match(/ibm-body--hub-span \.ibm-rings[\s\S]*?\.ibm-metrics[\s\S]*?}/)?.[0] ?? '';
		expect(block).toMatch(/flex-direction:\s*column/);
		expect(hudCssSrc).toMatch(/ibm-body--hub-span \.ibm-metrics[\s\S]*?border-top:/);
		expect(hudCssSrc).toMatch(/ibm-body--hub-span \.ibm-metrics[\s\S]*?margin-top:/);
	});

	it('HQ eyebrow font-size is strictly smaller than section title', () => {
		const typoBlock =
			hudCssSrc.match(
				/Sprint 2\.22 slice 4d-fix-b — HUD eyebrow\/title hierarchy[\s\S]*?\.player-hud-root \.quest-log__title--embedded[\s\S]*?\}/,
			)?.[0] ?? '';
		expect(typoBlock).toMatch(/\.oqo-deck__eyebrow[\s\S]*?var\(--pd-hud-eyebrow-l3\)/);
		expect(typoBlock).toMatch(/\.oqo-deck__title[\s\S]*?var\(--pd-hud-title-l2\)/);
		expect(typoBlock).toMatch(/\.pd-hq-section-head__title[\s\S]*?var\(--pd-hud-title-l2\)/);
	});
});
