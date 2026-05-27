/**
 * armoryCommandDeck.test.ts — Sprint 2.22 slice 4f Armory command deck
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PAGE = join(ROOT, '+page.svelte');
const DECK = join(
	ROOT,
	'..',
	'..',
	'..',
	'..',
	'lib',
	'components',
	'player',
	'ArmoryCommandDeck.svelte',
);

const pageSrc = readFileSync(PAGE, 'utf-8');
const deckExists = existsSync(DECK);
const deckSrc = deckExists ? readFileSync(DECK, 'utf-8') : '';

describe('/player/armory — Sprint 2.22 slice 4f Armory command deck', () => {
	it('ArmoryCommandDeck.svelte exists', () => {
		expect(deckExists).toBe(true);
	});

	it('+page.svelte imports and renders ArmoryCommandDeck after workspace tabs', () => {
		expect(pageSrc).toMatch(/import ArmoryCommandDeck from '\$lib\/components\/player\/ArmoryCommandDeck\.svelte'/);
		expect(pageSrc).toMatch(/<ArmoryCommandDeck/);

		const tabRailIdx = pageSrc.indexOf('PlayerOsTabRail');
		const deckIdx = pageSrc.indexOf('<ArmoryCommandDeck');
		expect(tabRailIdx).toBeGreaterThan(-1);
		expect(deckIdx).toBeGreaterThan(tabRailIdx);
	});

	it('+page.svelte does NOT contain OperativePathway or qa-pathway-shell', () => {
		expect(pageSrc).not.toMatch(/OperativePathway/);
		expect(pageSrc).not.toMatch(/qa-pathway-shell/);
	});

	it('ArmoryCommandDeck links to ?tab=studio and ?tab=album', () => {
		expect(deckSrc).toMatch(/\?tab=studio/);
		expect(deckSrc).toMatch(/\?tab=album/);
		expect(deckSrc).toMatch(/Open studio/);
		expect(deckSrc).toMatch(/View album/);
	});

	it('ArmoryCommandDeck uses OperativeLoadoutPreview', () => {
		expect(deckSrc).toMatch(/import OperativeLoadoutPreview/);
		expect(deckSrc).toMatch(/<OperativeLoadoutPreview/);
	});

	it('ArmoryCommandDeck exposes armory-command-deck region', () => {
		expect(deckSrc).toMatch(/data-region="armory-command-deck"/);
		expect(deckSrc).toMatch(/aria-label="Armory command deck"/);
	});

	it('+page.svelte uses denser quartermaster card spans', () => {
		expect(pageSrc).toMatch(/qaCardSpanClass/);
		expect(pageSrc).toMatch(/bento-span-6/);
	});
});
