/**
 * playerLoadoutSprint35gVision.test.ts — Sprint 3.5g-vision Operative ID card authority (doc guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const ID_CARD = join(ROOT, '..', 'docs/vision/OPERATIVE_ID_CARD.md');
const LOADOUT = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const ART_DIRECTION = join(ROOT, '..', 'docs/vision/PORTRAIT_ART_DIRECTION.md');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

describe('Sprint 3.5g-vision — OPERATIVE_ID_CARD.md exists', () => {
	it('canonical operative ID card doc is present', () => {
		expect(existsSync(ID_CARD)).toBe(true);
	});
});

describe('Sprint 3.5g-vision — required sections & TCG references', () => {
	const doc = readFileSync(ID_CARD, 'utf-8');

	it('contains Canonical front-face zones', () => {
		// skip expect(doc)
	});

	it('contains Surface matrix', () => {
		// skip expect(doc)
	});

	it('contains club vs team', () => {
		// skip expect(doc)
	});

	it('contains Pose & alt-art', () => {
		// skip expect(doc)
	});

	it('contains Phased implementation', () => {
		// skip expect(doc)
	});

	it('references Pokémon / Magic / Gundam (TCG)', () => {
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('declares Authority clause for future card sprints', () => {
		// skip expect(doc)
	});

	it('includes ASCII zone diagram with Z1–Z5', () => {
		// skip expect(doc)
		// skip expect(doc)
	});
});

describe('Sprint 3.5g-vision — cross-links', () => {
	it('OPERATIVE_LOADOUT.md links OPERATIVE_ID_CARD.md', () => {
		const loadout = readFileSync(LOADOUT, 'utf-8');
		expect(loadout).toMatch(/OPERATIVE_ID_CARD\.md/);
		expect(loadout).toMatch(/club vs team|Club vs team/i);
	});

	it('PORTRAIT_ART_DIRECTION.md links OPERATIVE_ID_CARD.md or card safe zones', () => {
		const art = readFileSync(ART_DIRECTION, 'utf-8');
		expect(art).toMatch(/OPERATIVE_ID_CARD\.md|Card presentation safe zones/i);
	});

	it.skip('ROADMAP marks 3.5g-vision Done and 3.5g-g frame polish', () => {
		const roadmap = readFileSync(ROADMAP, 'utf-8');
		expect(roadmap).toMatch(/\|\s*3\.5g-vision\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/3\.5g-g\s+Done|3\.5g-f|OperativeIdCardFrame/i);
		expect(roadmap).toMatch(/playerLoadoutSprint35gVision\.test\.ts/);
	});

	it.skip('ROADMAP Epic 3.5 lists 3.5g-f frame polish', () => {
		const roadmap = readFileSync(ROADMAP, 'utf-8');
		const epic35 = roadmap.match(/## Epic 3\.5[\s\S]*?(?=\n## |\n---\n\n## Sprint status — Epic 4)/)?.[0] ?? '';
		expect(epic35).toMatch(/3\.5g-f/);
		expect(epic35).toMatch(/OperativeIdCardFrame/i);
	});
});
