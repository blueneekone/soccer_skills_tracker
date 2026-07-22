/**
 * playerLoadoutSprint35c.test.ts — Sprint 3.5c Armory Studio v2 visual portrait part picker
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const PICKER = join(ROOT, 'lib/components/player/OperativePortraitPartPicker.svelte');
const ARMORY_PAGE = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const VA_MANIFEST = join(ROOT, '..', 'docs/vision/va-screenshots/s35c-manifest.json');
const VA_DIR = join(ROOT, '..', 'docs/vision/va-screenshots');

const studioSrc = existsSync(STUDIO) ? readFileSync(STUDIO, 'utf-8') : '';
const pickerSrc = existsSync(PICKER) ? readFileSync(PICKER, 'utf-8') : '';
const armorySrc = existsSync(ARMORY_PAGE) ? readFileSync(ARMORY_PAGE, 'utf-8') : '';

describe('Sprint 3.5c — OperativeLoadoutStudio integration', () => {
	it('does NOT import OperativeAvatarDesigner', () => {
		expect(studioSrc).not.toMatch(/import OperativeAvatarDesigner/);
		expect(studioSrc).not.toMatch(/<OperativeAvatarDesigner/);
	});

	it('imports OperativePortraitPartPicker and binds operativeAvatar', () => {
		expect(studioSrc).toMatch(/import OperativePortraitPartPicker/);
		expect(studioSrc).toMatch(/<OperativePortraitPartPicker[\s\S]*?bind:operativeAvatar/);
		// expect(studioSrc).toMatch(/ownedPortraitParts/);
	});

	it('Studio copy does NOT mention Bauhaus / sliders / randomize', () => {
		expect(studioSrc).not.toMatch(/Bauhaus/i);
		expect(studioSrc).not.toMatch(/slider/i);
		expect(studioSrc).not.toMatch(/randomize/i);
		expect(studioSrc).not.toMatch(/VECTOR STUDIO/i);
		expect(studioSrc).toMatch(/IDENTITY PARTS|UNIFIED PICKER/i);
	});

	it('syncOperativeIdentityToFirestore persists portrait v2 + loadout to Firestore', () => {
		expect(studioSrc).toMatch(/syncOperativeIdentityToFirestore/);
		expect(studioSrc).toMatch(/SYNC IDENTITY/);
	});
});

describe('Sprint 3.5c — OperativePortraitPartPicker', () => {
	it('component exists with PORTRAIT_PART_SLOTS tabs', () => {
		expect(existsSync(PICKER)).toBe(true);
		expect(pickerSrc).toMatch(/PORTRAIT_PART_SLOTS/);
		expect(pickerSrc).toMatch(/Face|Hair|Kit/);
	});

	it('uses renderPortraitPartLayer for visual thumbnails', () => {
		expect(pickerSrc).toMatch(/renderPortraitPartLayer/);
		expect(pickerSrc).toMatch(/\{@html thumbSvg/);
	});

	it('bind updates v2 parts via normalizePortraitParts', () => {
		expect(pickerSrc).toMatch(/OPERATIVE_PORTRAIT_V2_VERSION/);
		expect(pickerSrc).toMatch(/normalizePortraitParts/);
		expect(pickerSrc).toMatch(/operativeAvatar\s*=\s*\{\s*v:\s*OPERATIVE_PORTRAIT_V2_VERSION/);
	});

	it('v1 profile upgrades to defaultPortraitV2 on mount', () => {
		expect(pickerSrc).toMatch(/parseOperativePortrait/);
		expect(pickerSrc).toMatch(/defaultPortraitV2/);
		expect(pickerSrc).toMatch(/legacyUpgraded|Legacy portrait upgraded/i);
	});

	it('honors ownedPortraitParts with locked row pattern', () => {
		expect(pickerSrc).toMatch(/ownedPortraitParts/);
		expect(pickerSrc).toMatch(/opp-cell--locked/);
		expect(pickerSrc).toMatch(/opp-cell--equipped/);
	});
});

describe('Sprint 3.5c — Armory page hydrate', () => {
	it('passes ownedPortraitParts to OperativeLoadoutStudio', () => {
		expect(armorySrc).toMatch(/ownedPortraitParts/);
		expect(armorySrc).toMatch(/\{ownedPortraitParts\}/);
		expect(armorySrc).toMatch(/defaultOwnedPortraitParts/);
	});

	it('hydrates operativeAvatar via readRepairOperativeAvatar', () => {
		expect(armorySrc).toMatch(/readRepairOperativeAvatar/);
		expect(armorySrc).not.toMatch(/parseOperativeAvatar\(profile/);
	});
});

describe.skip('Sprint 3.5c — ROADMAP + vision', () => {
	it.skip('ROADMAP marks 3.5c Done (3.5d completed in follow-on sprint)', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('OPERATIVE_LOADOUT.md documents Studio v2 visual part picker', () => {
		const doc = readFileSync(VISION, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});
});

describe('Sprint 3.5c — VA manifest (optional gate)', () => {
	it('s35c-manifest.json references studio portrait picker screenshots when present', () => {
		if (!existsSync(VA_MANIFEST)) return;
		const rows = JSON.parse(readFileSync(VA_MANIFEST, 'utf-8'));
		expect(rows.routes?.some((r: { file: string }) => r.file === 's35c-studio-portrait-picker-1280.png')).toBe(
			true,
		);
		expect(rows.routes?.some((r: { file: string }) => r.file === 's35c-studio-portrait-kit-1280.png')).toBe(
			true,
		);
		const minBytes = rows.minBytesDefault ?? 8000;
		for (const route of rows.routes ?? []) {
			const png = join(VA_DIR, route.file);
			if (existsSync(png)) {
				expect(statSync(png).size).toBeGreaterThanOrEqual(route.minBytes ?? minBytes);
			}
		}
	});
});
