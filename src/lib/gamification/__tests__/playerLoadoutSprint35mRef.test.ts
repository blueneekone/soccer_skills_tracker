/**
 * playerLoadoutSprint35mRef.test.ts — Sprint 3.5m-ref Portrait reference image kit (doc guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const REF_DIR = join(ROOT, '..', 'docs/vision/references');
const BOARD = join(REF_DIR, 'PORTRAIT_REFERENCE_BOARD.md');
const SOURCES = join(REF_DIR, 'REFERENCE_SOURCES.md');
const IMAGES_README = join(REF_DIR, 'images/README.md');
const IMAGES_DIR = join(REF_DIR, 'images');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const IMAGE_EXT = /\.(jpe?g|png)$/i;

describe('Sprint 3.5m-ref — reference docs exist', () => {
	it('PORTRAIT_REFERENCE_BOARD.md exists', () => {
		expect(existsSync(BOARD)).toBe(true);
	});

	it('REFERENCE_SOURCES.md exists', () => {
		expect(existsSync(SOURCES)).toBe(true);
	});

	it('images/README.md exists', () => {
		expect(existsSync(IMAGES_README)).toBe(true);
	});
});

describe('Sprint 3.5m-ref — mood-board images', () => {
	const files = readdirSync(IMAGES_DIR).filter((f) => IMAGE_EXT.test(f));

	it('has at least 5 image files (vault-boy, bert, phoenix, +2)', () => {
		expect(files.length).toBeGreaterThanOrEqual(5);
	});

	it('includes vault-boy-tone, bert-turtle, and phoenix-palette', () => {
		expect(files).toContain('vault-boy-tone.jpg');
		expect(files).toContain('bert-turtle-duck-and-cover.jpg');
		expect(files).toContain('phoenix-palette.png');
	});

	it('image files are non-empty binaries (not placeholder text)', () => {
		for (const f of files) {
			const buf = readFileSync(join(IMAGES_DIR, f));
			expect(buf.length).toBeGreaterThan(1000);
			const head = buf.subarray(0, 4);
			const isJpeg = head[0] === 0xff && head[1] === 0xd8;
			const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
			expect(isJpeg || isPng).toBe(true);
		}
	});
});

describe('Sprint 3.5m-ref — board and ROADMAP wiring', () => {
	const board = readFileSync(BOARD, 'utf-8');
	const roadmap = readFileSync(ROADMAP, 'utf-8');

	it('PORTRAIT_REFERENCE_BOARD embeds ./images/vault-boy-tone', () => {
		expect(board).toMatch(/\.\/images\/vault-boy-tone/);
	});

	it('board links visual gallery and mandatory agent read', () => {
		expect(board).toMatch(/Visual reference gallery/i);
		expect(board).toMatch(/Agent mandatory read/i);
		expect(board).toMatch(/3\.5m-art|3\.5m-hair/);
	});

	it('ROADMAP marks 3.5m-ref Done and 3.5m-frame as next', () => {
		expect(roadmap).toMatch(/\|\s*\*\*3\.5m-ref\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/3\.5m-ref Done/i);
		expect(roadmap).toMatch(/next\s*3\.5m-frame/i);
	});

	it('ROADMAP documents playerLoadoutSprint35mRef test', () => {
		expect(roadmap).toMatch(/playerLoadoutSprint35mRef\.test\.ts/);
	});
});
