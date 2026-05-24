/**
 * armoryLoadoutStudio.test.ts — Sprint 3.1 / 3.1.1 Armory Studio tab wiring
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = join(__dirname, '..');
const PAGE = join(ROOT, '+page.svelte');
const STUDIO = join(
	ROOT,
	'..',
	'..',
	'..',
	'..',
	'lib',
	'components',
	'player',
	'OperativeLoadoutStudio.svelte',
);
const pageSrc = readFileSync(PAGE, 'utf-8');
const studioExists = existsSync(STUDIO);
const studioSrc = studioExists ? readFileSync(STUDIO, 'utf-8') : '';
describe('/player/armory — Sprint 3.1 Loadout Studio tab', () => {
	it('lazy-loads OperativeLoadoutStudio when studio workspace active', () => {
		expect(pageSrc).toMatch(
			/import\s*\(\s*['"]\$lib\/components\/player\/OperativeLoadoutStudio\.svelte['"]\s*\)/,
		);
		expect(pageSrc).toMatch(/armoryWorkspace === 'studio'/);
		expect(pageSrc).toMatch(/OperativeLoadoutStudio/);
	});
	it('workspace union includes studio alongside quartermaster and album', () => {
		expect(pageSrc).toMatch(/'quartermaster'\s*\|\s*'album'\s*\|\s*'studio'/);
	});
	it('Sprint 3.3 — ceremonies workspace tab + deep links', () => {
		expect(pageSrc).toMatch(/ceremonies/);
		expect(pageSrc).toMatch(/searchParams\.get\('tab'\)/);
		expect(pageSrc).toMatch(/searchParams\.get\('slot'\)/);
		expect(pageSrc).toMatch(/OperativeCeremoniesPanel/);
	});
	it('OperativeLoadoutStudio component file exists', () => {
		expect(studioExists).toBe(true);
		expect(studioSrc).toMatch(/SYNC LOADOUT/);
	});
});
describe('/player/armory — Sprint 3.1.1 portrait in Studio', () => {
	it('OperativeLoadoutStudio imports OperativeAvatarDesigner', () => {
		expect(studioSrc).toMatch(/import OperativeAvatarDesigner/);
		expect(studioSrc).toMatch(/UPDATE OPERATIVE/);
	});
	it('Album branch on armory page does not import OperativeAvatarDesigner', () => {
		const albumBranch = pageSrc.slice(pageSrc.indexOf("{:else}"));
		expect(albumBranch).not.toMatch(/OperativeAvatarDesigner/);
	});
});
describe('/player/armory — Sprint 3.1.2 Studio + Album layout guards', () => {
	const albumWorkspacePath = join(
		ROOT,
		'..',
		'..',
		'..',
		'..',
		'lib',
		'components',
		'player',
		'ArmoryAlbumWorkspace.svelte',
	);
	const albumSrc = existsSync(albumWorkspacePath) ? readFileSync(albumWorkspacePath, 'utf-8') : '';
	it('OperativeLoadoutStudio uses dossier hero row 1 then portrait+workshop row 2', () => {
		expect(studioSrc).toMatch(/ols-dossier-panel bento-span-12/);
		expect(studioSrc).toMatch(/ols-portrait-panel bento-span-6/);
		expect(studioSrc).toMatch(/ols-workshop-panel bento-span-6/);
		expect(studioSrc).not.toMatch(/ols-dossier-panel bento-span-3/);
		const gridBlock = studioSrc.slice(
			studioSrc.indexOf('class="ols-grid'),
			studioSrc.indexOf('</section>', studioSrc.indexOf('class="ols-grid')),
		);
		expect(gridBlock.indexOf('ols-dossier-panel')).toBeGreaterThan(-1);
		expect(gridBlock.indexOf('ols-portrait-panel')).toBeGreaterThan(-1);
		expect(gridBlock.indexOf('ols-dossier-panel')).toBeLessThan(
			gridBlock.indexOf('ols-portrait-panel'),
		);
	});
	it('OperativeLoadoutStudio ols-grid enforces min-width on panels', () => {
		expect(studioSrc).toMatch(/\.ols-grid\s*>\s*:global\(\*\)[\s\S]*?min-width:\s*0/);
	});
	it('ArmoryAlbumWorkspace album-folder stack has flex-shrink guard and sticker aspect ratio', () => {
		expect(albumSrc).toMatch(/\.album-folder__stack[\s\S]*?flex-shrink:\s*0/);
		expect(albumSrc).toMatch(/\.album-folder__stack[\s\S]*?aspect-ratio:\s*280\s*\/\s*380/);
	});
});
describe('/player/armory — Sprint 3.1.3 OperativeLoadoutStudio file budget', () => {
	it('OperativeLoadoutStudio.svelte line count ≤ 700 after normalize', () => {
		const lineCount = studioSrc.split('\n').length;
		expect(lineCount).toBeLessThanOrEqual(700);
	});
});
