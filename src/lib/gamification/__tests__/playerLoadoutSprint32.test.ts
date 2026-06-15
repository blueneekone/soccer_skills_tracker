/**
 * playerLoadoutSprint32.test.ts — Sprint 3.2 Art pipeline (manifest + asset ingestion)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	LOADOUT_SLOTS,
	getLoadoutCatalog,
	resolveEquippedForRender,
	parseOperativeLoadout,
} from '../loadoutSchema.js';
import cosmeticsManifest from '../cosmetics.manifest.json';
import { renderLoadoutBorderLayer, getLoadoutFrameClass } from '../renderOperativeLoadout.js';

const ROOT_DIR = join(__dirname, '..', '..', '..');
const MANIFEST_PATH = join(ROOT_DIR, 'lib/gamification/cosmetics.manifest.json');
const GENERATOR = join(ROOT_DIR, '..', 'scripts/generate-cosmetics-manifest.mjs');
const RENDER = join(ROOT_DIR, 'lib/gamification/renderOperativeLoadout.js');
const SCHEMA = join(ROOT_DIR, 'lib/gamification/loadoutSchema.ts');
const COSMETICS_DIR = join(ROOT_DIR, '..', 'static/cosmetics');
const OPERATIVE_LOADOUT_DOC = join(ROOT_DIR, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const ROADMAP = join(ROOT_DIR, '..', 'ROADMAP.md');
const PACKAGE_JSON = join(ROOT_DIR, '..', 'package.json');

describe('Sprint 3.2 — deliverable files exist', () => {
	it('static cosmetics assets + generator + manifest', () => {
		expect(existsSync(COSMETICS_DIR)).toBe(true);
		expect(existsSync(join(COSMETICS_DIR, 'border-neon.svg'))).toBe(true);
		expect(existsSync(join(COSMETICS_DIR, 'border-holo.svg'))).toBe(true);
		expect(existsSync(join(COSMETICS_DIR, 'badge-street-kings.svg'))).toBe(true);
		expect(existsSync(GENERATOR)).toBe(true);
		expect(existsSync(MANIFEST_PATH)).toBe(true);
	});

	it('package.json wires generate:cosmetics npm script', () => {
		const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8'));
		expect(pkg.scripts['generate:cosmetics']).toMatch(/generate-cosmetics-manifest/);
	});
});

describe('Sprint 3.2 — cosmetics manifest integrity', () => {
	it('every manifest row has valid slot, renderKey, assetPath, and contentHash', () => {
		expect(cosmeticsManifest.length).toBeGreaterThan(0);
		for (const row of cosmeticsManifest) {
			expect(row.id).toBeTruthy();
			expect(LOADOUT_SLOTS).toContain(row.slot);
			expect(row.renderKey).toBeTruthy();
			expect(row.assetPath).toMatch(/^\/cosmetics\/.+\.svg$/);
			expect(row.contentHash).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	it('manifest ids are unique', () => {
		const ids = cosmeticsManifest.map((row) => row.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('preserves stable album + QM ids for ownedCosmetics compatibility', () => {
		const ids = new Set(getLoadoutCatalog().map((row) => row.id));
		expect(ids.has('digi_border_neon')).toBe(true);
		expect(ids.has('album_badge_street_kings')).toBe(true);
		expect(ids.has('album_banner_vanguard')).toBe(true);
		expect(ids.has('title_rank_operative')).toBe(true);
		expect(ids.has('album_border_street_kings_holo')).toBe(true);
	});
});

describe('Sprint 3.2 — catalog ingestion + renderer', () => {
	it('getLoadoutCatalog merges manifest assetPath into catalog rows', () => {
		const neon = getLoadoutCatalog().find((row) => row.id === 'digi_border_neon');
		expect(neon).toMatchObject({
			slot: 'border',
			renderKey: 'border-neon',
			assetPath: '/cosmetics/border-neon.svg',
		});
		expect(neon?.contentHash).toMatch(/^[a-f0-9]{64}$/);
	});

	it('resolveEquippedForRender works with manifest border ids', () => {
		const loadout = parseOperativeLoadout({
			v: 1,
			equipped: { border: 'album_border_street_kings_holo', badge: 'album_badge_street_kings' },
		});
		expect(
			resolveEquippedForRender(loadout, [
				'album_border_street_kings_holo',
				'album_badge_street_kings',
			]),
		).toEqual({
			border: 'album_border_street_kings_holo',
			badge: 'album_badge_street_kings',
		});
	});

	it('renderLoadoutBorderLayer uses manifest asset img tags with content hash', () => {
		const html = renderLoadoutBorderLayer('digi_border_neon', 128);
		expect(html).toMatch(/<img[\s\S]*?\/cosmetics\/border-neon\.svg\?v=/);
		expect(html).toMatch(/class="loadout-border/);
	});

	it('getLoadoutFrameClass returns holo for album holo border', () => {
		expect(getLoadoutFrameClass('album_border_street_kings_holo')).toBe('loadout-frame--holo');
		expect(getLoadoutFrameClass('digi_border_neon')).toBe('loadout-frame--neon');
	});
});

describe('Sprint 3.2 — source scan guards', () => {
	it('loadoutSchema imports cosmetics manifest (no PLACEHOLDER_CATALOG)', () => {
		const schemaSrc = readFileSync(SCHEMA, 'utf-8');
		expect(schemaSrc).toMatch(/cosmetics\.manifest\.json/);
		expect(schemaSrc).not.toMatch(/PLACEHOLDER_CATALOG/);
		expect(schemaSrc).toMatch(/assetPath/);
	});

	it('renderOperativeLoadout maps manifest assetPath layers', () => {
		const renderSrc = readFileSync(RENDER, 'utf-8');
		expect(renderSrc).toMatch(/renderManifestAsset/);
		expect(renderSrc).toMatch(/border-holo/);
		expect(renderSrc).toMatch(/loadout-frame--holo/);
	});
});

describe('Sprint 3.2 — vision docs', () => {
	it('OPERATIVE_LOADOUT.md marks 3.2 Done', () => {
		const doc = existsSync(OPERATIVE_LOADOUT_DOC) ? readFileSync(OPERATIVE_LOADOUT_DOC, 'utf-8') : '';
		expect(doc).toMatch(/\|\s*\*\*3\.2\*\*[\s\S]*?\|\s*\*\*Done\*\*/i);
	});

	it('ROADMAP.md marks 3.2 Done in Epic 3 sprint table', () => {
		const roadmap = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
		expect(roadmap).toMatch(/\|\s*3\.2\s*\|\s*Done/i);
		expect(roadmap).toMatch(/playerLoadoutSprint32\.test\.ts/);
		expect(roadmap).not.toMatch(/\|\s*3\.2\s*\|\s*Planned[\s\S]*?blocked until 2\.11\.1/i);
	});
});
