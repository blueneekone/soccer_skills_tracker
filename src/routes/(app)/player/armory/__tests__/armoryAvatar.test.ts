/**
 * armoryAvatar.test.ts — Sprint 2.7.1: vector operativeAvatar studio (no 3D)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PAGE = join(ROOT, '+page.svelte');
const AVATAR_3D = join(
	ROOT,
	'..',
	'..',
	'..',
	'..',
	'lib',
	'components',
	'player',
	'OperativeAvatar3D.svelte',
);
const PACKAGE_JSON = join(ROOT, '..', '..', '..', '..', '..', 'package.json');
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

const src = readFileSync(PAGE, 'utf-8');
const studioSrc = existsSync(STUDIO) ? readFileSync(STUDIO, 'utf-8') : '';
const pkg = readFileSync(PACKAGE_JSON, 'utf-8');

describe('/player/armory — Sprint 2.7.1 vector avatar studio', () => {
	it('does not import OperativeAvatar3D', () => {
		expect(existsSync(AVATAR_3D)).toBe(false);
		expect(src).not.toMatch(/OperativeAvatar3D/);
	});

	it('does not reference three.js', () => {
		expect(pkg).not.toMatch(/"three"\s*:/);
		expect(src).not.toMatch(/from ['"]three['"]|import\(['"]three/);
	});

	it('uses OperativePortraitPartPicker via Studio (not Album-only)', () => {
		expect(src).toMatch(/OperativeLoadoutStudio/);
		expect(src).toMatch(/bind:operativeAvatar/);
		expect(src).toMatch(/operativeAvatar/);
		expect(src).toMatch(/ownedPortraitParts/);
		const albumBranch = src.slice(src.indexOf("{:else}"));
		expect(albumBranch).not.toMatch(/OperativeAvatarDesigner/);
		expect(albumBranch).not.toMatch(/OperativePortraitPartPicker/);
		expect(albumBranch).not.toMatch(/UPDATE OPERATIVE/);
	});

	it('does not write avatarConfig on UPDATE OPERATIVE', () => {
		expect(src).not.toMatch(/avatarConfig/);
	});

	it('persists operativeAvatar to Firestore on save (via Studio)', () => {
		expect(studioSrc).toMatch(/updateDoc[\s\S]*operativeAvatar/);
		expect(studioSrc).toMatch(/UPDATE OPERATIVE/);
	});

	it('copy describes layered portrait part picker studio (no 3D / GLB)', () => {
		expect(studioSrc).toMatch(/PART PICKER|part picker/i);
		expect(studioSrc).not.toMatch(/3D PREVIEW|base_alpha\.glb|base_bravo\.glb|Drag to orbit/i);
	});
});
