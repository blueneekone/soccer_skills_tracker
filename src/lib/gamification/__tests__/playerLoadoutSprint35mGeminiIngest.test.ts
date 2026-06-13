/**
 * playerLoadoutSprint35mGeminiIngest.test.ts — Sprint 3.5m-gemini-ingest (agent 18 — first bust)
 * Authority: ASSET_INGESTION.md · portrait-gemini-ingest.mdc
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { defaultPortraitV2 } from '../../avatars/portraitV2Schema.js';
import {
	getPrecomposedBustCatalog,
	renderLayeredPortraitSvg,
	renderPrecomposedBustSvg,
	resolvePrecomposedBust,
} from '../../avatars/renderLayeredPortrait.js';
import { renderOperativeAvatarSvg } from '../../avatars/operativeAvatar.js';
import precomposedManifest from '../../avatars/precomposedBusts.manifest.json';

const ROOT = join(__dirname, '..', '..', '..');
const PORTRAIT_DIR = join(ROOT, '..', 'static/portrait');
const APPROVED_BUST = join(PORTRAIT_DIR, 'approved/bust_teen_long_light_away.jpeg');
const PRECOMPOSED_CONFIG = join(PORTRAIT_DIR, 'precomposed.config.json');
const ASSET_LICENSES = join(ROOT, '..', 'docs/vision/references/ASSET_LICENSES.md');
const GENERATOR = join(ROOT, '..', 'scripts/generate-portrait-manifest.mjs');

const FIRST_BUST_ID = 'precomposed_bust_teen_long_light_away';

describe('Sprint 3.5m-gemini-ingest — approved asset on disk', () => {
	it('bust_teen_long_light_away.jpeg exists in static/portrait/approved/', () => {
		expect(existsSync(APPROVED_BUST)).toBe(true);
	});

	it('precomposed.config.json wires first bust with teen default', () => {
		expect(existsSync(PRECOMPOSED_CONFIG)).toBe(true);
		const config = JSON.parse(readFileSync(PRECOMPOSED_CONFIG, 'utf-8'));
		expect(config).toHaveLength(1);
		expect(config[0].id).toBe(FIRST_BUST_ID);
		expect(config[0].file).toBe('approved/bust_teen_long_light_away.jpeg');
		expect(config[0].defaultForBodyScale).toBe('teen');
	});
});

describe('Sprint 3.5m-gemini-ingest — manifest pipeline', () => {
	it('generator emits precomposedBusts.manifest.json with content hash + matchParts', () => {
		expect(readFileSync(GENERATOR, 'utf-8')).toMatch(/precomposedBusts\.manifest\.json/);
		expect(precomposedManifest).toHaveLength(1);
		const row = precomposedManifest[0];
		expect(row.id).toBe(FIRST_BUST_ID);
		expect(row.assetPath).toBe('/portrait/approved/bust_teen_long_light_away.jpeg');
		expect(row.contentHash).toMatch(/^[a-f0-9]{64}$/);
		expect(row.matchParts).toEqual({
			face: 'portrait_face_teen_light_default',
			hair: 'portrait_hair_teen_long',
			kit: 'portrait_kit_away',
		});
		expect(row.defaultForBodyScale).toBe('teen');
	});

	it('ASSET_LICENSES.md has Owner ☑ row for bust_teen_long_light_away.jpeg', () => {
		const doc = readFileSync(ASSET_LICENSES, 'utf-8');
		expect(doc).toMatch(/bust_teen_long_light_away\.jpeg/);
		expect(doc).toMatch(/Owner verifies Gemini commercial terms.*☑|☑.*Owner verifies/i);
	});
});

describe('Sprint 3.5m-gemini-ingest — teen default holo path', () => {
	it("defaultPortraitV2('teen') parts match first precomposed bust", () => {
		const teen = defaultPortraitV2('teen');
		expect(teen.parts.face).toBe('portrait_face_teen_light_default');
		expect(teen.parts.hair).toBe('portrait_hair_teen_long');
		expect(teen.parts.kit).toBe('portrait_kit_away');
	});

	it('resolvePrecomposedBust matches teen default to ingested bust', () => {
		const bust = resolvePrecomposedBust(defaultPortraitV2('teen'));
		expect(bust?.id).toBe(FIRST_BUST_ID);
	});

	it('renderLayeredPortraitSvg(teen default) emits precomposed raster SVG', () => {
		const svg = renderLayeredPortraitSvg(defaultPortraitV2('teen'), 128);
		expect(svg).toMatch(/data-precomposed-bust="precomposed_bust_teen_long_light_away"/);
		expect(svg).toMatch(/<image\b/);
		expect(svg).toMatch(/\/portrait\/approved\/bust_teen_long_light_away\.jpeg/);
		expect(svg).toMatch(/xMidYMid meet/);
		expect(svg).not.toMatch(/data-portrait-layer="face"/);
	});

	it('renderOperativeAvatarSvg routes teen default through precomposed bust', () => {
		const svg = renderOperativeAvatarSvg(defaultPortraitV2('teen'), 128);
		expect(svg).toMatch(/data-precomposed-bust=/);
		expect(svg).toMatch(/bust_teen_long_light_away\.jpeg/);
	});

	it('non-matching teen parts still compose layered SVG', () => {
		const svg = renderLayeredPortraitSvg(
			{
				v: 2,
				bodyScale: 'teen',
				parts: {
					face: 'portrait_face_teen_medium_default',
					hair: 'portrait_hair_teen_ponytail',
					kit: 'portrait_kit_home',
				},
			},
			128,
		);
		expect(svg).not.toMatch(/data-precomposed-bust=/);
		expect(svg).toMatch(/data-portrait-layer="face"/);
	});

	it('getPrecomposedBustCatalog exposes ingested bust metadata', () => {
		const catalog = getPrecomposedBustCatalog();
		expect(catalog.some((row) => row.id === FIRST_BUST_ID)).toBe(true);
	});

	it('renderPrecomposedBustSvg is deterministic for same bust + size', () => {
		const bust = getPrecomposedBustCatalog()[0];
		expect(renderPrecomposedBustSvg(bust, 96)).toBe(renderPrecomposedBustSvg(bust, 96));
	});
});
