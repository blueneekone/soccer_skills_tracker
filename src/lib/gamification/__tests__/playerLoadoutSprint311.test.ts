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

/** Album branch: content between `{:else}` after studio and closing `{/if}` */
function albumBranchSrc(page: string): string {
	const studioEnd = page.indexOf("{:else}");
	if (studioEnd < 0) return '';
	return page.slice(studioEnd);
}

describe('Sprint 3.1.1 Part B — Studio contains portrait + loadout save actions', () => {
	it('OperativeLoadoutStudio imports OperativeAvatarDesigner', () => {
		expect(studioSrc).toMatch(/import OperativeAvatarDesigner/);
		expect(studioSrc).toMatch(/<OperativeAvatarDesigner/);
	});

	it('Studio has UPDATE OPERATIVE + SYNC LOADOUT with Firestore writes', () => {
		expect(studioSrc).toMatch(/UPDATE OPERATIVE/);
		expect(studioSrc).toMatch(/SYNC LOADOUT/);
		expect(studioSrc).toMatch(/updateDoc[\s\S]*operativeAvatar/);
		expect(studioSrc).toMatch(/updateDoc[\s\S]*operativeLoadout/);
	});

	it('Studio portrait panel uses dossier tokens (--pd-panel), not slate glass', () => {
		expect(studioSrc).toMatch(/ols-portrait-panel[\s\S]*?var\(--pd-panel,\s*#05050a\)/);
		expect(studioSrc).not.toMatch(/ols-portrait[\s\S]{0,400}tw-bg-slate-900/);
	});

	it('UPDATE OPERATIVE button uses teal data accent (not emerald cyber gradient)', () => {
		expect(studioSrc).toMatch(/ols-save-portrait[\s\S]*?--pd-accent-data,\s*#14b8a6/);
		expect(studioSrc).not.toMatch(/ols-save-portrait[\s\S]{0,200}emerald/);
	});

	it('Studio includes ProPlayerCard dossier preview', () => {
		expect(studioSrc).toMatch(/ProPlayerCard/);
		expect(studioSrc).toMatch(/DOSSIER CARD PREVIEW/);
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
		expect(albumSrc).toMatch(/Season 1 · Sticker album/);
		expect(albumSrc).toMatch(/Sticker sets/);
		expect(albumSrc).toMatch(/StickerVariantShell/);
	});

	it('armory page binds operativeAvatar to Studio, not Album-only save', () => {
		expect(armorySrc).toMatch(/bind:operativeAvatar/);
		expect(armorySrc).not.toMatch(/saveOperativeAvatarConfig/);
	});
});

describe('Sprint 3.1.1 — vision docs', () => {
	it('OPERATIVE_LOADOUT.md: Quartermaster = TC only; Studio = portrait + equip', () => {
		const doc = existsSync(OPERATIVE_LOADOUT_DOC) ? readFileSync(OPERATIVE_LOADOUT_DOC, 'utf-8') : '';
		expect(doc).toMatch(/\|\s*\*\*Quartermaster\*\*[\s\S]*?TC catalog/i);
		expect(doc).not.toMatch(/\|\s*\*\*Quartermaster\*\*[\s\S]*?avatar designer/i);
		expect(doc).toMatch(/\|\s*\*\*Studio\*\*[\s\S]*?portrait/i);
		expect(doc).toMatch(/\|\s*\*\*Album\*\*[\s\S]*?Sticker folders/i);
	});

	it('PLAYER_OS.md notes Studio as unified identity editor', () => {
		const playerOs = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';
		expect(playerOs).toMatch(/Studio[\s\S]*?portrait|unified identity editor/i);
	});

	it('ROADMAP.md marks 3.1.1 Done', () => {
		const roadmap = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
		expect(roadmap).toMatch(/\|\s*3\.1\.1\s*\|\s*Done/i);
	});
});
