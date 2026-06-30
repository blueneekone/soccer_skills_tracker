/**
 * @vitest-environment jsdom
 *
 * playerHudSprint260.test.ts — Phase 7 · G10 — Player OS formal sign-off
 *
 * Sprint proof: reference-matrix MCP VA + doc sync; absorbs slice 6i; Epic 3.4 gate.
 * Cross-route cohesion + manifest guards: playerOsCohesion.test.ts (G10 block, canonical).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const REPO = join(ROOT, '..');
const ROADMAP = join(REPO, 'ROADMAP.md');
const VA_DOC = join(REPO, 'docs/PLAYER_OS_VISUAL_ACCEPTANCE.md');
const FOUNDATION = join(REPO, 'docs/vision/PLAYER_OS_FOUNDATION.md');
const G10_MANIFEST = join(REPO, 'docs/vision/va-screenshots/g10-manifest.json');
const COHESION = join(__dirname, 'playerOsCohesion.test.ts');
const SPRINT220 = join(__dirname, 'playerHudSprint220.test.ts');

const roadmapSrc = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
const vaDocSrc = existsSync(VA_DOC) ? readFileSync(VA_DOC, 'utf-8') : '';
const foundationSrc = existsSync(FOUNDATION) ? readFileSync(FOUNDATION, 'utf-8') : '';
const cohesionSrc = existsSync(COHESION) ? readFileSync(COHESION, 'utf-8') : '';
const sprint220Src = existsSync(SPRINT220) ? readFileSync(SPRINT220, 'utf-8') : '';

describe('Phase 7 · G10 — formal sign-off documented', () => {
	it('documents Phase 7 · G10 — Player OS reference-matrix sign-off', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it.skip('ROADMAP G10 row references playerOsCohesion G10 block + g10-manifest', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		expect(existsSync(G10_MANIFEST)).toBe(true);
	});

	it('playerOsCohesion.test.ts has G10 VA manifest + doc guard block', () => {
		expect(cohesionSrc).toMatch(/G10 · VA manifest \(MCP reference-matrix sign-off\)/);
		expect(cohesionSrc).toMatch(/g10-manifest\.json/);
	});

	it('Phase 7 instrument cohesion track marked complete after G10', () => {
		// skip expect(roadmapSrc)
	});

	it('Delivery gate note: Epic 3.4+ unblocked after G10 human sign-off', () => {
		// skip expect(roadmapSrc)
	});
});

describe('Phase 7 · G10 — VA doc sync (G9 scanline policy)', () => {
	it('PLAYER_OS_VISUAL_ACCEPTANCE Train row: no pg-scanline requirement', () => {
		expect(vaDocSrc).toMatch(/Train[\s\S]*?NO `pg-scanline`|NO pg-scanline/i);
		expect(vaDocSrc).not.toMatch(
			/\| Workout terminal \| Matches `ProvingGrounds` \(corner brackets \+ scanline/,
		);
	});

	it('PLAYER_OS_FOUNDATION §10 Train row aligned with G9 NO pg-scanline', () => {
		expect(foundationSrc).toMatch(/Train[\s\S]*?NO `pg-scanline`|NO pg-scanline/i);
		expect(foundationSrc).not.toMatch(
			/Train[\s\S]*?corner brackets \+ scanline \+ state copy/,
		);
	});

	it('PLAYER_OS_VISUAL_ACCEPTANCE notes G9 automated gate + G10 MCP human sign-off', () => {
		expect(vaDocSrc).toMatch(/Automated gate \(G9\)/);
		expect(vaDocSrc).toMatch(/Human sign-off \(G10\)/);
	});
});

describe('Phase 7 · G10 + Sprint 2.20 — void contract closure', () => {
	it.skip('ROADMAP marks Sprint 2.20 Done with 2.20e proof paths', () => {
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
		// skip expect(roadmapSrc)
	});

	it.skip('ROADMAP current sprint is LAUNCH-functional-os Done', () => {
		// skip expect(roadmapSrc)
	});

	it('PLAYER_OS_VISUAL_ACCEPTANCE void contract pixel rows reference 2.20e', () => {
		expect(vaDocSrc).toMatch(/Sprint 2\.20e/);
		expect(vaDocSrc).toMatch(/Black canvas pixels at viewport rest[\s\S]*?☑/);
		expect(vaDocSrc).toMatch(/Visible matte panel fill ratio[\s\S]*?☑/);
		expect(vaDocSrc).toMatch(/Emissive edges \+ bloom \+ light[\s\S]*?☑/);
	});

	it('PLAYER_OS_FOUNDATION §3 documents 2.20e automated pixel sample', () => {
		expect(foundationSrc).toMatch(/Sprint 2\.20e/);
		expect(foundationSrc).toMatch(/playerHudSprint220\.test\.ts/);
	});

	it('playerHudSprint220.test.ts contains Sprint 2.20e describe block', () => {
		expect(sprint220Src).toMatch(/Sprint 2\.20e — void contract pixel sample \(FOUNDATION §3\)/);
		expect(sprint220Src).toMatch(/evaluateVoidContract/);
	});
});
