/**
 * playerLoadoutSprint34.test.ts — Sprint 3.4 Album set bonuses
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	ALBUM_SET_BONUS_REWARDS,
	getCompletedAlbumSetIds,
	getPendingSetBonusGrants,
	isAlbumSetComplete,
} from '../albumSetBonuses.js';
import { getSeasonOneCardsForSet } from '../seasonOneData.js';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const LOADOUT_OPS = join(ROOT, '..', 'functions/src/domains/loadoutOps.js');
const ARMORY_PAGE = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const ALBUM_WS = join(ROOT, 'lib/components/player/ArmoryAlbumWorkspace.svelte');
const HQ_CTX = join(ROOT, 'lib/player/dashboard/hqWorldContext.ts');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const RENDER = join(ROOT, 'lib/gamification/renderOperativeLoadout.js');
const MANIFEST = join(ROOT, 'lib/gamification/cosmetics.manifest.json');
const SPRINT33 = join(__dirname, 'playerLoadoutSprint33.test.ts');
const UNLOCKS = join(ROOT, 'lib/services/loadoutUnlocks.svelte.ts');

describe('Sprint 3.4 — albumSetBonuses pure logic', () => {
	it('maps three Season 1 sets to banner rewards', () => {
		expect(ALBUM_SET_BONUS_REWARDS.street_kings.bannerCosmeticId).toBe('album_banner_vanguard');
		expect(ALBUM_SET_BONUS_REWARDS.snipers.bannerCosmeticId).toBe('album_banner_snipers');
		expect(ALBUM_SET_BONUS_REWARDS.dark_arts.bannerCosmeticId).toBe('album_banner_dark_arts');
	});

	it('isAlbumSetComplete requires every catalog card in the set', () => {
		const streetIds = getSeasonOneCardsForSet('street_kings').map((c) => c.id);
		expect(isAlbumSetComplete('street_kings', streetIds.slice(0, 1))).toBe(false);
		expect(isAlbumSetComplete('street_kings', streetIds)).toBe(true);
	});

	it('getPendingSetBonusGrants is idempotent when banner already owned', () => {
		const streetIds = getSeasonOneCardsForSet('street_kings').map((c) => c.id);
		const owned = [ALBUM_SET_BONUS_REWARDS.street_kings.bannerCosmeticId];
		expect(getPendingSetBonusGrants(streetIds, owned)).toEqual([]);
	});

	it('getCompletedAlbumSetIds returns only fully owned folders', () => {
		const sniperIds = getSeasonOneCardsForSet('snipers').map((c) => c.id);
		expect(getCompletedAlbumSetIds(sniperIds)).toEqual(['snipers']);
	});
});

describe('Sprint 3.4 — server grantAlbumSetBonus', () => {
	it('loadoutOps exports album set grant with audit source', () => {
		const src = readFileSync(LOADOUT_OPS, 'utf-8');
		expect(src).toMatch(/grantAlbumSetBonus/);
		expect(src).toMatch(/album_set_complete/);
		expect(src).toMatch(/ownedSeasonOneCards/);
		expect(src).toMatch(/isAlbumSetCompleteOnServer/);
	});
});

describe('Sprint 3.4 — client wiring', () => {
	it('armory hydrates ownedSeasonOneCards and calls pending grant helper', () => {
		const src = readFileSync(ARMORY_PAGE, 'utf-8');
		expect(src).toMatch(/ownedSeasonOneCards/);
		expect(src).toMatch(/grantPendingAlbumSetBonuses/);
		expect(src).not.toMatch(/Phase 1: replace with Firestore/);
	});

	it('ArmoryAlbumWorkspace shows set-complete marker', () => {
		const src = readFileSync(ALBUM_WS, 'utf-8');
		expect(src).toMatch(/SET COMPLETE/);
		expect(src).toMatch(/isAlbumSetComplete/);
		expect(src).toMatch(/album-folder--complete/);
	});

	it('hqWorldContext and dashboard pass album set chips', () => {
		expect(readFileSync(HQ_CTX, 'utf-8')).toMatch(/completedAlbumSetChips/);
		const dash = readFileSync(DASHBOARD, 'utf-8');
		expect(dash).toMatch(/getCompletedAlbumSetChipLabels/);
		expect(dash).toMatch(/completedAlbumSetChips/);
	});

	it('renderOperativeLoadout composes banner layer', () => {
		const src = readFileSync(RENDER, 'utf-8');
		expect(src).toMatch(/renderLoadoutBannerLayer/);
		expect(src).toMatch(/bannerSvg/);
	});
});

describe('Sprint 3.4 — manifest + ceremonies', () => {
	it('cosmetics manifest includes snipers and dark_arts set banners', () => {
		const rows = JSON.parse(readFileSync(MANIFEST, 'utf-8')) as { id: string }[];
		const ids = new Set(rows.map((r) => r.id));
		expect(ids.has('album_banner_snipers')).toBe(true);
		expect(ids.has('album_banner_dark_arts')).toBe(true);
	});

	it('3.3 ceremony path unchanged — minor-safe, no loot box copy', () => {
		expect(existsSync(SPRINT33)).toBe(true);
		const unlocks = readFileSync(UNLOCKS, 'utf-8');
		expect(unlocks).toMatch(/ownedCosmetics/);
		expect(unlocks).not.toMatch(/loot box|gacha/i);
		expect(readFileSync(ROADMAP, 'utf-8')).toMatch(/\|\s*3\.3\s*\|\s*Done/i);
	});
});

describe('Sprint 3.4 — ROADMAP + vision', () => {
	it('ROADMAP marks 3.4 Done and points to 3.5a next', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*3\.4\s*\|\s*\*\*Done\*\*/i);
		expect(doc).toMatch(/playerLoadoutSprint34\.test\.ts/);
		expect(doc).toMatch(/s34-manifest\.json/);
		expect(doc).toMatch(/Sprint 3\.4 closed/i);
		expect(doc).toMatch(/\|\s*3\.3\s*\|\s*Done/i);
	});

	it('VA manifest references s34 armory + HQ screenshots', () => {
		const manifest = join(ROOT, '..', 'docs/vision/va-screenshots/s34-manifest.json');
		expect(existsSync(manifest)).toBe(true);
		const rows = JSON.parse(readFileSync(manifest, 'utf-8'));
		expect(rows.routes?.some((r: { file: string }) => r.file === 's34-album-set-complete-armory-1280.png')).toBe(true);
		expect(rows.routes?.some((r: { file: string }) => r.file === 's34-hq-set-chip-1280.png')).toBe(true);
	});

	it('OPERATIVE_LOADOUT.md marks 3.4 Done', () => {
		const doc = readFileSync(VISION, 'utf-8');
		expect(doc).toMatch(/\*\*3\.4\*\*[\s\S]*?Done/i);
	});
});
