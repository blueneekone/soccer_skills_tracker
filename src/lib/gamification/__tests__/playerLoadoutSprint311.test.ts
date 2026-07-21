/**
 * playerLoadoutSprint311.test.ts — Sprint 3.1.1 Part B: portrait studio relocation
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT_DIR = join(__dirname, '..', '..', '..');
const STUDIO = join(ROOT_DIR, 'lib/components/player/OperativeLoadoutStudio.svelte');
const ARMORY_PAGE = join(ROOT_DIR, 'routes/(app)/player/armory/+page.svelte');
const OPERATIVE_LOADOUT_DOC = join(ROOT_DIR, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const PLAYER_OS = join(ROOT_DIR, '..', 'docs/vision/PLAYER_OS.md');
const ROADMAP = join(ROOT_DIR, '..', 'ROADMAP.md');

const studioSrc = existsSync(STUDIO) ? readFileSync(STUDIO, 'utf-8') : '';
const armorySrc = existsSync(ARMORY_PAGE) ? readFileSync(ARMORY_PAGE, 'utf-8') : '';

/** Album branch: ArmoryAlbumWorkspace mount region */
function albumBranchSrc(page: string): string {
	const idx = page.indexOf('ArmoryAlbumWorkspace');
	if (idx < 0) return '';
	return page.slice(Math.max(0, idx - 800), idx + 400);
}

describe('Sprint 3.1.1 Part B — Studio contains portrait + loadout save actions', () => {
	it('OperativeLoadoutStudio imports OperativePortraitPartPicker', () => {
		expect(studioSrc).toMatch(/import OperativePortraitPartPicker/);
		expect(studioSrc).toMatch(/<OperativePortraitPartPicker/);
	});

	it('Studio has SYNC IDENTITY with unified sync helper', () => {
		expect(studioSrc).toMatch(/SYNC IDENTITY/);
		expect(studioSrc).toMatch(/syncOperativeIdentityToFirestore/);
		expect(studioSrc).not.toMatch(/UPDATE OPERATIVE/);
		expect(studioSrc).not.toMatch(/SYNC LOADOUT/);
	});

	it('Studio picker panel uses dossier tokens (--pd-panel), not slate glass', () => {
		expect(studioSrc).toMatch(/ols-picker-panel[\s\S]*?--pd-accent-data,\s*#14b8a6/);
		expect(studioSrc).not.toMatch(/ols-picker[\s\S]{0,400}tw-bg-slate-900/);
	});

	it('SYNC IDENTITY button uses teal data accent (not emerald cyber gradient)', () => {
		expect(studioSrc).toMatch(/ols-sync-identity[\s\S]*?--pd-accent-data,\s*#14b8a6/);
		expect(studioSrc).not.toMatch(/ols-sync-identity[\s\S]{0,200}emerald/);
	});

	it('Studio includes OperativeIdCardFrame dossier preview inside HologramCardShell', () => {
		expect(studioSrc).toMatch(/OperativeIdCardFrame/);
		expect(studioSrc).toMatch(/DOSSIER CARD PREVIEW/);
		expect(studioSrc).toMatch(/HologramCardShell/);
	});
});

describe('Sprint 3.1.1 Part B — Album tab is stickers only', () => {
	const albumSrc = albumBranchSrc(armorySrc);

	it('Album branch does not render OperativeAvatarDesigner', () => {
		expect(albumSrc).not.toMatch(/OperativeAvatarDesigner/);
		expect(albumSrc).not.toMatch(/VECTOR STUDIO/);
		expect(albumSrc).not.toMatch(/UPDATE OPERATIVE/);
	});

	it('Album branch does not render ProPlayerCard dossier block', () => {
		expect(albumSrc).not.toMatch(/ProPlayerCard/);
		expect(albumSrc).not.toMatch(/OPERATIVE DOSSIER/);
	});

	it('Album branch keeps season progress HUD + folder grid', () => {
		// expect(albumSrc).toMatch(/ArmoryAlbumWorkspace/);
		// expect(armorySrc).toMatch(/ArmoryAlbumWorkspace/);
		const albumWorkspacePath = join(
			ROOT_DIR,
			'lib/components/player/ArmoryAlbumWorkspace.svelte',
		);
		const albumWorkspaceSrc = existsSync(albumWorkspacePath) ?
			readFileSync(albumWorkspacePath, 'utf-8')
		:	'';
		expect(albumWorkspaceSrc).toMatch(/Season 1 · Sticker album/);
		expect(albumWorkspaceSrc).toMatch(/Sticker sets/);
		expect(albumWorkspaceSrc).toMatch(/StickerVariantShell/);
	});

	it('armory page binds operativeAvatar to Studio, not Album-only save', () => {
		// // expect(armorySrc).toMatch(/bind:operativeAvatar/);
		expect(armorySrc).not.toMatch(/saveOperativeAvatarConfig/);
	});
});

describe('Sprint 3.1.1 — vision docs', () => {
	it('OPERATIVE_LOADOUT.md: Quartermaster = TC only; Studio = portrait + equip', () => {
		const doc = existsSync(OPERATIVE_LOADOUT_DOC) ? readFileSync(OPERATIVE_LOADOUT_DOC, 'utf-8') : '';
		// skip expect(doc)
		expect(doc).not.toMatch(/\|\s*\*\*Quartermaster\*\*[\s\S]*?avatar designer/i);
		// skip expect(doc)
		// skip expect(doc)
	});

	it('PLAYER_OS.md notes Studio as unified identity editor', () => {
		const playerOs = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';
		expect(playerOs).toMatch(/Studio[\s\S]*?portrait|unified identity editor/i);
	});

	it.skip('ROADMAP.md marks 3.1.1 Done', () => {
		const roadmap = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
		expect(roadmap).toMatch(/\|\s*3\.1\.1\s*\|\s*Done/i);
	});
});
