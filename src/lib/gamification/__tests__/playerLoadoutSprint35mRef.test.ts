/**
 * playerLoadoutSprint35mRef.test.ts — Sprint 3.5m-ref + 3.6a-ref-organize + LAUNCH-defer-avatar
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const REF_DIR = join(ROOT, '..', 'docs/vision/references');
const BOARD = join(REF_DIR, 'PORTRAIT_REFERENCE_BOARD.md');
const SOURCES = join(REF_DIR, 'REFERENCE_SOURCES.md');
const MASTER_README = join(REF_DIR, 'README.md');
const CHARACTER_README = join(REF_DIR, 'character/README.md');
const INDEX = join(REF_DIR, 'character/AVATAR_REFERENCE_INDEX.md');
const CHARACTER_DIR = join(REF_DIR, 'character');
const IMAGES_STUB = join(REF_DIR, 'images/README.md');
const LAYERS_README = join(ROOT, '..', 'static/avatar/layers/README.md');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const IMAGE_EXT = /\.(jpe?g|png)$/i;
const SUBFOLDERS = ['female-meg', 'male-tom'] as const;

const OPTIONAL_SHEETS = {
	megConcept: join(CHARACTER_DIR, 'female-meg/ref-female-meg-concept-jumpsuit.jpeg'),
	megHair: join(CHARACTER_DIR, 'female-meg/ref-catalog-female-meg-hair-18grid.jpeg'),
	tomConcept: join(CHARACTER_DIR, 'male-tom/ref-male-tom-concept-home-kit-9.jpeg')
};

function listImages(dir: string): string[] {
	if (!existsSync(dir)) return [];
	const out: string[] = [];
	for (const ent of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, ent.name);
		if (ent.isDirectory()) out.push(...listImages(p));
		else if (IMAGE_EXT.test(ent.name)) out.push(p);
	}
	return out;
}

function assertBinary(path: string) {
	const buf = readFileSync(path);
	expect(buf.length).toBeGreaterThan(1000);
	const head = buf.subarray(0, 4);
	const isJpeg = head[0] === 0xff && head[1] === 0xd8;
	const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
	expect(isJpeg || isPng).toBe(true);
}

describe('Sprint 3.5m-ref / 3.6a / LAUNCH — reference docs exist', () => {
	it('PORTRAIT_REFERENCE_BOARD.md exists', () => {
		expect(existsSync(BOARD)).toBe(true);
	});

	it('REFERENCE_SOURCES.md and master README exist', () => {
		expect(existsSync(SOURCES)).toBe(true);
		expect(existsSync(MASTER_README)).toBe(true);
	});

	it('character/README.md, AVATAR_REFERENCE_INDEX.md, images stub exist', () => {
		expect(existsSync(CHARACTER_README)).toBe(true);
		expect(existsSync(INDEX)).toBe(true);
		expect(existsSync(IMAGES_STUB)).toBe(true);
		const stub = readFileSync(IMAGES_STUB, 'utf-8');
		expect(stub).toMatch(/character/);
	});

	it('static/avatar/layers/README.md notes post-launch pause', () => {
		expect(existsSync(LAYERS_README)).toBe(true);
		const layers = readFileSync(LAYERS_README, 'utf-8');
		expect(layers).toMatch(/character\/AVATAR_REFERENCE_INDEX/);
		expect(layers).toMatch(/post-launch|paused/i);
	});
});

describe('Sprint 3.6a — organized character reference tree', () => {
	it('character/ has female-meg and male-tom when owner refs are checked in', () => {
		const hasMeg = existsSync(OPTIONAL_SHEETS.megConcept);
		const hasTom = existsSync(OPTIONAL_SHEETS.tomConcept);
		if (!hasMeg && !hasTom) {
			const readme = readFileSync(CHARACTER_README, 'utf-8');
			expect(readme).toMatch(/DEFERRED/i);
			return;
		}
		if (hasMeg) expect(existsSync(OPTIONAL_SHEETS.megHair)).toBe(true);
		if (hasTom) expect(existsSync(OPTIONAL_SHEETS.tomConcept)).toBe(true);
	});

	it('has no SSTracker Avatar Assets subfolder under character/', () => {
		expect(existsSync(join(CHARACTER_DIR, 'SSTracker Avatar Assets'))).toBe(false);
	});

	it('character root has only README, index, and persona subfolders', () => {
		const root = readdirSync(CHARACTER_DIR);
		const allowed = new Set(['README.md', 'AVATAR_REFERENCE_INDEX.md', ...SUBFOLDERS]);
		for (const name of root) {
			expect(allowed.has(name)).toBe(true);
		}
	});

	it('no legacy Gemini_Generated_Image or ellipsis filenames under character/', () => {
		for (const p of listImages(CHARACTER_DIR)) {
			const base = p.split(/[/\\]/).pop() ?? '';
			expect(base).not.toMatch(/Gemini_Generated_Image/);
			expect(base).not.toMatch(/\u2026/);
		}
	});

	it('owner JPEG binaries under character/ are valid when present', () => {
		const files = listImages(CHARACTER_DIR);
		if (files.length === 0) return;
		for (const f of files) {
			assertBinary(f);
		}
	});

	it('mood assets documented in AVATAR_REFERENCE_INDEX when absent', () => {
		const index = readFileSync(INDEX, 'utf-8');
		const moodDir = join(REF_DIR, 'mood');
		const sparky = existsSync(join(moodDir, 'ref-mood-sparky-mascot.png'));
		const gemini = listImages(moodDir).some((p) => p.includes('ref-gemini-exp-'));
		if (!sparky && !gemini) {
			expect(index).toMatch(/Missing|ref-mood-sparky|ref-gemini-exp/i);
		}
	});
});

describe('Sprint 3.6a / LAUNCH — board and ROADMAP wiring', () => {
	const board = readFileSync(BOARD, 'utf-8');
	const sources = readFileSync(SOURCES, 'utf-8');
	const roadmap = readFileSync(ROADMAP, 'utf-8');

	it('PORTRAIT_REFERENCE_BOARD links character AVATAR_REFERENCE_INDEX', () => {
		expect(board).toMatch(/character\/AVATAR_REFERENCE_INDEX\.md/);
		expect(board).not.toMatch(/\.\/images\/vault-boy-tone/);
	});

	it('board documents character sheet subfolders and ui/player', () => {
		expect(board).toMatch(/character\/female-meg/);
		expect(board).toMatch(/character\/male-tom/);
		expect(board).toMatch(/ui\/player/);
	});

	it('REFERENCE_SOURCES documents UI and character sections', () => {
		expect(sources).toMatch(/UI references.*ui\//i);
		expect(sources).toMatch(/Character references.*character\//i);
		expect(sources).toMatch(/female-meg/);
		expect(sources).toMatch(/removed \(3\.6a\)/i);
	});

	it('ROADMAP marks 3.5m-ref Done, 3.6a-ref-organize Done, LAUNCH-defer-avatar Done', () => {
		expect(roadmap).toMatch(/\|\s*\*\*3\.5m-ref\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/\|\s*\*\*3\.6a-ref-organize\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/\|\s*\*\*LAUNCH-defer-avatar\*\*\s*\|\s*\*\*Done\*\*/i);
	});

	it('ROADMAP documents playerLoadoutSprint35mRef test', () => {
		expect(roadmap).toMatch(/playerLoadoutSprint35mRef\.test\.ts/);
	});
});
