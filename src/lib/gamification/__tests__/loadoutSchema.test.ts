import { describe, it, expect } from 'vitest';
import {
	OPERATIVE_LOADOUT_VERSION,
	LOADOUT_SLOTS,
	parseOperativeLoadout,
	defaultOperativeLoadout,
	normalizeEquipped,
	canEquipItem,
	resolveEquippedForRender,
	getLoadoutCatalog,
	LOADOUT_CATALOG,
	getOwnedCatalogForSlot,
} from '../loadoutSchema.js';

describe('loadoutSchema — parseOperativeLoadout', () => {
	it('accepts a valid v1 loadout with equipped slots', () => {
		const parsed = parseOperativeLoadout({
			v: 1,
			equipped: { border: 'digi_border_neon', badge: null },
		});
		expect(parsed).toEqual({
			v: 1,
			equipped: { border: 'digi_border_neon', badge: null },
		});
	});

	it('rejects wrong version', () => {
		expect(parseOperativeLoadout({ v: 2, equipped: {} })).toBeNull();
		expect(parseOperativeLoadout({ v: 0, equipped: {} })).toBeNull();
	});

	it('rejects unknown slot keys', () => {
		expect(parseOperativeLoadout({ v: 1, equipped: { patch: 'patch_sniper' } })).toBeNull();
		expect(parseOperativeLoadout({ v: 1, equipped: { portrait: 'seed' } })).toBeNull();
	});

	it('rejects non-object equipped or invalid slot values', () => {
		expect(parseOperativeLoadout({ v: 1, equipped: 'nope' })).toBeNull();
		expect(parseOperativeLoadout({ v: 1, equipped: { border: 42 } })).toBeNull();
	});
});

describe('loadoutSchema — defaultOperativeLoadout', () => {
	it('returns empty equipped with canonical version', () => {
		expect(defaultOperativeLoadout()).toEqual({ v: OPERATIVE_LOADOUT_VERSION, equipped: {} });
	});
});

describe('loadoutSchema — normalizeEquipped', () => {
	it('nulls ids not in owned set', () => {
		const loadout = defaultOperativeLoadout();
		loadout.equipped.border = 'digi_border_neon';
		expect(normalizeEquipped(loadout, [])).toEqual({ border: null });
		expect(normalizeEquipped(loadout, ['digi_border_neon'])).toEqual({
			border: 'digi_border_neon',
		});
	});

	it('nulls unknown catalog ids and wrong-slot assignments', () => {
		const loadout = {
			v: OPERATIVE_LOADOUT_VERSION as const,
			equipped: { border: 'album_badge_street_kings', badge: 'not-in-catalog' },
		};
		expect(normalizeEquipped(loadout)).toEqual({ border: null, badge: null });
	});

	it('strips slots outside LOADOUT_SLOTS via parse guard', () => {
		expect(LOADOUT_SLOTS).toEqual(['border', 'badge', 'banner', 'title']);
	});
});

describe('loadoutSchema — canEquipItem', () => {
	it('respects owned set and slot mapping', () => {
		const owned = ['digi_border_neon', 'album_badge_street_kings'];
		expect(canEquipItem('border', 'digi_border_neon', owned)).toBe(true);
		expect(canEquipItem('badge', 'digi_border_neon', owned)).toBe(false);
		expect(canEquipItem('border', 'album_badge_street_kings', owned)).toBe(false);
		expect(canEquipItem('badge', 'album_badge_street_kings', owned)).toBe(true);
		expect(canEquipItem('border', 'digi_border_neon', [])).toBe(false);
	});
});

describe('loadoutSchema — resolveEquippedForRender', () => {
	it('returns empty object for null loadout', () => {
		expect(resolveEquippedForRender(null)).toEqual({});
	});

	it('normalizes through owned filter', () => {
		const loadout = parseOperativeLoadout({
			v: 1,
			equipped: { border: 'digi_border_neon' },
		});
		expect(resolveEquippedForRender(loadout, ['digi_border_neon'])).toEqual({
			border: 'digi_border_neon',
		});
	});
});

describe('loadoutSchema — catalog bridge', () => {
	it('maps digi_border_neon to border slot with manifest asset', () => {
		const border = getLoadoutCatalog().find((row) => row.id === 'digi_border_neon');
		expect(border).toMatchObject({ slot: 'border', renderKey: 'border-neon' });
		expect(border?.assetPath).toBe('/cosmetics/border-neon.svg');
	});

	it('exports frozen LOADOUT_CATALOG with manifest-driven badge/banner rows', () => {
		expect(LOADOUT_CATALOG.some((row) => row.id === 'album_badge_street_kings')).toBe(true);
		expect(LOADOUT_CATALOG.some((row) => row.id === 'album_banner_vanguard')).toBe(true);
		const badge = LOADOUT_CATALOG.find((row) => row.id === 'album_badge_street_kings');
		expect(badge?.assetPath).toMatch(/^\/cosmetics\//);
		expect(badge?.contentHash).toMatch(/^[a-f0-9]{64}$/);
	});
});

describe('loadoutSchema — getOwnedCatalogForSlot', () => {
	it('returns only owned catalog rows for the requested slot', () => {
		const owned = ['digi_border_neon', 'album_badge_street_kings'];
		const borderOwned = getOwnedCatalogForSlot('border', owned);
		expect(borderOwned.map((row) => row.id)).toEqual(['digi_border_neon']);
		const badgeOwned = getOwnedCatalogForSlot('badge', owned);
		expect(badgeOwned.map((row) => row.id)).toEqual(['album_badge_street_kings']);
	});

	it('returns empty when slot has no owned ids', () => {
		expect(getOwnedCatalogForSlot('title', ['digi_border_neon'])).toEqual([]);
	});
});
