/**
 * playerLoadoutSprint35b.test.ts — Sprint 3.5b Portrait part catalog (manifest + starter set)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	PORTRAIT_PART_SLOTS,
	defaultPortraitV2,
	normalizePortraitParts,
	getPortraitPartsForSlot,
	defaultOwnedPortraitParts,
	STARTER_PORTRAIT_PART_IDS,
} from '../../avatars/portraitV2Schema.js';
import {
	parseOperativeAvatar,
	renderOperativeAvatarSvg,
} from '../../avatars/operativeAvatar.js';
import {
	getPortraitPartCatalog,
	renderLayeredPortraitSvg,
} from '../../avatars/renderLayeredPortrait.js';
import { composeOperativePortrait } from '../renderOperativeLoadout.js';
import portraitPartsManifest from '../../avatars/portraitParts.manifest.json';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const PORTRAIT_DIR = join(ROOT, '..', 'static/portrait');
const CONFIG_PATH = join(PORTRAIT_DIR, 'catalog.config.json');
const GENERATOR = join(ROOT, '..', 'scripts/generate-portrait-manifest.mjs');
const PACKAGE_JSON = join(ROOT, '..', 'package.json');

const STARTER_FACE_IDS = [
	'portrait_face_default',
	'portrait_face_round',
	'portrait_face_angular',
];
const STARTER_HAIR_IDS = [
	'portrait_hair_default',
	'portrait_hair_crop',
	'portrait_hair_long',
];
const STARTER_KIT_IDS = [
	'portrait_kit_default',
	'portrait_kit_home',
	'portrait_kit_away',
];

describe('Sprint 3.5b — manifest pipeline', () => {
	it('static/portrait/catalog.config.json exists with ≥3 rows per slot', () => {
		expect(existsSync(CONFIG_PATH)).toBe(true);
		/** @type {Array<{ id: string; slot: string }>} */
		const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
		for (const slot of PORTRAIT_PART_SLOTS) {
			const rows = config.filter((row) => row.slot === slot);
			expect(rows.length).toBeGreaterThanOrEqual(3);
		}
	});

	it('every catalog asset file exists under static/portrait/', () => {
		const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
		for (const row of config) {
			expect(existsSync(join(PORTRAIT_DIR, row.file))).toBe(true);
		}
	});

	it('portraitParts.manifest.json has unique ids, valid slots, paths, and hashes', () => {
		expect(portraitPartsManifest.length).toBe(16);
		const ids = portraitPartsManifest.map((row) => row.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const row of portraitPartsManifest) {
			expect(PORTRAIT_PART_SLOTS).toContain(row.slot);
			expect(row.assetPath).toMatch(/^\/portrait\/.+\.svg$/);
			expect(row.contentHash).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	it('generator script and package.json generate:portraits script exist', () => {
		expect(existsSync(GENERATOR)).toBe(true);
		const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8'));
		expect(pkg.scripts['generate:portraits']).toMatch(/generate-portrait-manifest/);
	});
});

describe('Sprint 3.5b — catalog helpers', () => {
	it('getPortraitPartsForSlot(face) returns ≥3 starter options', () => {
		const faces = getPortraitPartsForSlot('face');
		expect(faces.length).toBeGreaterThanOrEqual(3);
		for (const id of STARTER_FACE_IDS) {
			expect(faces.some((row) => row.id === id)).toBe(true);
		}
	});

	it('normalizePortraitParts strips id not in ownedIds when ownedIds provided', () => {
		const catalog = getPortraitPartCatalog();
		const owned = ['portrait_face_default', 'portrait_hair_default', 'portrait_kit_default'];
		const normalized = normalizePortraitParts(
			{
				face: 'portrait_face_round',
				hair: 'portrait_hair_default',
				kit: 'portrait_kit_away',
			},
			catalog,
			owned,
		);
		expect(normalized.face).toBeNull();
		expect(normalized.hair).toBe('portrait_hair_default');
		expect(normalized.kit).toBeNull();
	});

	it('defaultOwnedPortraitParts includes portrait_face_default and all starter ids', () => {
		const owned = defaultOwnedPortraitParts();
		expect(owned).toContain('portrait_face_default');
		expect(owned).toContain('portrait_hair_default');
		expect(owned).toContain('portrait_kit_default');
		for (const id of [...STARTER_FACE_IDS, ...STARTER_HAIR_IDS, ...STARTER_KIT_IDS]) {
			expect(owned).toContain(id);
		}
		expect(owned.length).toBe(STARTER_PORTRAIT_PART_IDS.length);
	});
});

describe('Sprint 3.5b — layered renderer', () => {
	it('renderLayeredPortraitSvg with alternate parts differs from defaultPortraitV2', () => {
		const defaultSvg = renderLayeredPortraitSvg(defaultPortraitV2(), 128);
		const alternate = renderLayeredPortraitSvg(
			{
				v: 2,
				parts: {
					face: 'portrait_face_round',
					hair: 'portrait_hair_crop',
					kit: 'portrait_kit_away',
				},
			},
			128,
		);
		expect(alternate).not.toBe(defaultSvg);
		expect(alternate).toMatch(/data-portrait-layer="kit"/);
		expect(alternate).toMatch(/data-portrait-layer="face"/);
		expect(alternate).toMatch(/data-portrait-layer="hair"/);
		expect(alternate).toMatch(/kit-away\.svg/);
		expect(alternate).toMatch(/face-round\.svg/);
		expect(alternate).toMatch(/hair-crop\.svg/);
	});

	it('renderOperativeAvatarSvg v1 seed upgrades to v2 layered SVG', () => {
		const v1 = { v: 1, seed: 'deterministic-seed-35b' };
		const a = renderOperativeAvatarSvg(v1, 128);
		const b = renderOperativeAvatarSvg(v1, 128);
		expect(a).toBe(b);
		expect(a).toMatch(/data-portrait-version="2"/);
		expect(parseOperativeAvatar(v1)).toEqual(v1);
	});

	it('composeOperativePortrait with v2 mixed part ids yields portraitSvg + layers', () => {
		const composed = composeOperativePortrait({
			operativeAvatar: {
				v: 2,
				parts: {
					face: 'portrait_face_angular',
					hair: 'portrait_hair_long',
					kit: 'portrait_kit_home',
				},
			},
			size: 96,
		});
		expect(composed.portraitSvg.length).toBeGreaterThan(0);
		expect(composed.portraitSvg).toMatch(/data-portrait-version="2"/);
		expect(composed.portraitSvg).toMatch(/data-portrait-layer="face"/);
	});
});

describe('Sprint 3.5b — 3.5a regression (default ids unchanged)', () => {
	it('defaultPortraitV2 still uses stable 3.5a stub ids', () => {
		expect(defaultPortraitV2()).toEqual({
			v: 2,
			parts: {
				face: 'portrait_face_default',
				hair: 'portrait_hair_default',
				kit: 'portrait_kit_default',
			},
		});
	});

	it('getPortraitPartCatalog still exposes default ids', () => {
		const ids = new Set(getPortraitPartCatalog().map((row) => row.id));
		expect(ids.has('portrait_face_default')).toBe(true);
		expect(ids.has('portrait_hair_default')).toBe(true);
		expect(ids.has('portrait_kit_default')).toBe(true);
	});
});

describe('Sprint 3.5b — ROADMAP + vision', () => {
	it('ROADMAP marks 3.5b Done and points to 3.5c next', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*3\.5b\s*\|\s*\*\*Done\*\*/i);
		expect(doc).toMatch(/playerLoadoutSprint35b\.test\.ts/);
		expect(doc).toMatch(/\|\s*3\.5c\s*\|\s*(Planned|\*\*Done\*\*)/i);
		expect(doc).toMatch(/3\.5c.*Armory Studio|Armory Studio.*3\.5c/i);
	});

	it('OPERATIVE_LOADOUT.md documents starter catalog + generate:portraits + ownedPortraitParts', () => {
		const doc = readFileSync(VISION, 'utf-8');
		expect(doc).toMatch(/generate:portraits/);
		expect(doc).toMatch(/ownedPortraitParts/);
		expect(doc).toMatch(/portrait_face_default/);
		expect(doc).toMatch(/portrait_face_round/);
		expect(doc).toMatch(/\*\*3\.5b\*\*/);
	});
});
