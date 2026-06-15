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
		expect(roadmapSrc).toMatch(/Phase 7 · G10/);
		expect(roadmapSrc).toMatch(/\*\*G10\*\* \| \*\*Done\*\*/);
	});

	it('ROADMAP G10 row references playerOsCohesion G10 block + g10-manifest', () => {
		expect(roadmapSrc).toMatch(/playerOsCohesion\.test\.ts.*G10 block/);
		expect(roadmapSrc).toMatch(/g10-manifest\.json/);
		expect(existsSync(G10_MANIFEST)).toBe(true);
	});

	it('playerOsCohesion.test.ts has G10 VA manifest + doc guard block', () => {
		expect(cohesionSrc).toMatch(/G10 · VA manifest \(MCP reference-matrix sign-off\)/);
		expect(cohesionSrc).toMatch(/g10-manifest\.json/);
	});

	it('Phase 7 instrument cohesion track marked complete after G10', () => {
		expect(roadmapSrc).toMatch(/Phase 7 — Instrument cohesion \(\*\*complete\*\*\)/);
	});

	it('Delivery gate note: Epic 3.4+ unblocked after G10 human sign-off', () => {
		expect(roadmapSrc).toMatch(/Epic 3\.4\+.*G10 sign-off|G10.*Epic 3\.4/i);
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
	it('ROADMAP marks Sprint 2.20 Done with 2.20e proof paths', () => {
		expect(roadmapSrc).toMatch(/Sprint 2\.20 scope[\s\S]*?\*\*Done\*\*/);
		expect(roadmapSrc).toMatch(/2\.20e/);
		expect(roadmapSrc).toMatch(/g10-hq-void-1280x900\.png/);
		expect(roadmapSrc).toMatch(/Epic 1 premium track 2\.12\.1–2\.20 Done/);
	});

	it('ROADMAP current sprint is LAUNCH-functional-os Done', () => {
		expect(roadmapSrc).toMatch(/Current sprint:\*\* \*\*LAUNCH-functional-os Done\*\*/);
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
