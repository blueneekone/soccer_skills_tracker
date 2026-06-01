/**
 * playerLoadoutSprint35mDocsGemini.test.ts — Sprint 3.5m-docs-gemini
 * Owner Gemini art brief + Composer ingest playbook (docs & rules only)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const VISION = join(ROOT, '..', 'docs/vision');
const REF = join(VISION, 'references');
const APPROVED_README = join(ROOT, '..', 'static/portrait/approved/README.md');
const CURSOR_RULE = join(ROOT, '..', '.cursor/rules/portrait-gemini-ingest.mdc');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');

const COMPOSER_PLAYBOOK = join(VISION, 'COMPOSER_PLAYBOOK.md');
const GEMINI_ART_BRIEF = join(VISION, 'GEMINI_ART_BRIEF.md');
const ASSET_INGESTION = join(VISION, 'ASSET_INGESTION.md');
const ASSET_LICENSES = join(REF, 'ASSET_LICENSES.md');
const PORTRAIT_BOARD = join(REF, 'PORTRAIT_REFERENCE_BOARD.md');
const ART_DIRECTION = join(VISION, 'PORTRAIT_ART_DIRECTION.md');

describe('Sprint 3.5m-docs-gemini — deliverable files exist', () => {
	const files = [
		COMPOSER_PLAYBOOK,
		GEMINI_ART_BRIEF,
		ASSET_INGESTION,
		ASSET_LICENSES,
		APPROVED_README,
		CURSOR_RULE,
	];

	for (const file of files) {
		it(`${file.split(/[/\\]/).slice(-2).join('/')} exists`, () => {
			expect(existsSync(file)).toBe(true);
		});
	}
});

describe('Sprint 3.5m-docs-gemini — COMPOSER_PLAYBOOK.md', () => {
	const doc = readFileSync(COMPOSER_PLAYBOOK, 'utf-8');

	it('defines owner vs Composer role split', () => {
		expect(doc).toMatch(/Owner.*Gemini|Gemini.*Owner/i);
		expect(doc).toMatch(/Composer.*never illustrate|never illustrate/i);
	});

	it('documents ingest loop and agent commands', () => {
		expect(doc).toMatch(/static\/portrait\/approved/);
		expect(doc).toMatch(/npm run generate:portraits/);
		expect(doc).toMatch(/npm run check/);
		expect(doc).toMatch(/npm run build/);
		expect(doc).toMatch(/firebase use sports-skill-tracker-dev/);
		expect(doc).toMatch(/firebase deploy --only hosting/);
		expect(doc).toMatch(/holo approved ☑|approve ☑/i);
	});
});

describe('Sprint 3.5m-docs-gemini — GEMINI_ART_BRIEF.md', () => {
	const doc = readFileSync(GEMINI_ART_BRIEF, 'utf-8');

	it('links Avatar Studio reference paths (3.6a — legacy mood JPEGs removed)', () => {
		expect(doc).toMatch(/AVATAR_REFERENCE_INDEX\.md/);
		expect(doc).toMatch(/ref-female-meg-concept-jumpsuit\.jpeg/);
		expect(doc).toMatch(/Phoenixes_Logo_2026\.png/);
		expect(doc).not.toMatch(/vault-girl-tone\.jpg/);
	});

	it('contains master prompt block and variation lines', () => {
		expect(doc).toMatch(/1950s flat cel propaganda cartoon bust/i);
		expect(doc).toMatch(/transparent PNG 1024×1024|1024×1024/i);
		expect(doc).toMatch(/NOT helmet|NOT flame/i);
		expect(doc).toMatch(/bust_teen_\{hair\}_\{tone\}_\{kit\}/);
	});

	it('includes owner checklist and ASSET_LICENSES log requirement', () => {
		expect(doc).toMatch(/Owner checklist/i);
		expect(doc).toMatch(/one person|One person/i);
		expect(doc).toMatch(/Hair reads as hair/i);
		expect(doc).toMatch(/ASSET_LICENSES\.md/);
		expect(doc).toMatch(/Gemini.*commercial|commercial terms/i);
	});
});

describe('Sprint 3.5m-docs-gemini — ASSET_INGESTION.md', () => {
	const doc = readFileSync(ASSET_INGESTION, 'utf-8');

	it('documents approved PNG → license → ingest → deploy flow', () => {
		expect(doc).toMatch(/static\/portrait\/approved/);
		expect(doc).toMatch(/ASSET_LICENSES/);
		expect(doc).toMatch(/3\.5m-gemini-ingest/);
		expect(doc).toMatch(/npm run generate:portraits/);
		expect(doc).toMatch(/owner holo approve ☑|holo approved ☑/i);
	});

	it('embeds copy-paste stub for next ingest sprint (one bust at a time)', () => {
		expect(doc).toMatch(/Sprint 3\.5m-gemini-ingest/);
		expect(doc).toMatch(/one bust|ONE bust|one file per sprint/i);
	});
});

describe('Sprint 3.5m-docs-gemini — ASSET_LICENSES.md', () => {
	const doc = readFileSync(ASSET_LICENSES, 'utf-8');

	it('has license table with required columns and placeholder row', () => {
		expect(doc).toMatch(/\|\s*File\s*\|\s*Source\s*\|\s*Date\s*\|\s*License\s*\|\s*Owner ☑\s*\|\s*Notes\s*\|/);
		expect(doc).toMatch(/placeholder|Google Gemini Pro Art/i);
	});
});

describe('Sprint 3.5m-docs-gemini — portrait reference patches', () => {
	it('PORTRAIT_REFERENCE_BOARD links GEMINI_ART_BRIEF and notes 3.5m-art superseded', () => {
		const board = readFileSync(PORTRAIT_BOARD, 'utf-8');
		expect(board).toMatch(/Art creation.*GEMINI_ART_BRIEF\.md/i);
		expect(board).toMatch(/3\.5m-art.*superseded|superseded.*3\.5m-art/i);
	});

	it('PORTRAIT_ART_DIRECTION documents Gemini precomposed bust shipping path', () => {
		const art = readFileSync(ART_DIRECTION, 'utf-8');
		expect(art).toMatch(/Gemini precomposed bust|precomposed teen bust PNGs/i);
		expect(art).toMatch(/3\.5m-art.*deprecated|deprecated.*3\.5m-art|Superseded/i);
	});
});

describe('Sprint 3.5m-docs-gemini — cursor rule portrait-gemini-ingest.mdc', () => {
	const rule = readFileSync(CURSOR_RULE, 'utf-8');

	it('declares globs and never-draw policy', () => {
		expect(rule).toMatch(/static\/portrait/);
		expect(rule).toMatch(/src\/lib\/avatars/);
		expect(rule).toMatch(/docs\/vision/);
		expect(rule).toMatch(/NEVER.*draw|never illustrate/i);
		expect(rule).toMatch(/approved\//);
		expect(rule).toMatch(/PORTRAIT_REFERENCE_BOARD/);
		expect(rule).toMatch(/GEMINI_ART_BRIEF/);
		expect(rule).toMatch(/holo approved ☑|ROADMAP.*Done only after owner/i);
	});
});

describe('Sprint 3.5m-docs-gemini — ROADMAP wiring', () => {
	const roadmap = readFileSync(ROADMAP, 'utf-8');

	it('marks 3.5m-docs-gemini Done and next 3.5m-gemini-ingest', () => {
		expect(roadmap).toMatch(/\|\s*\*\*3\.5m-docs-gemini\*\*\s*\|\s*\*\*Done\*\*/i);
		expect(roadmap).toMatch(/3\.5m-gemini-ingest/);
		expect(roadmap).toMatch(/owner Gemini art|Gemini art/i);
	});

	it('marks 3.5m-art Superseded and 3.5m-gemini-ingest deferred post-launch', () => {
		expect(roadmap).toMatch(/\|\s*\*\*3\.5m-art\*\*\s*\|\s*\*\*Superseded\*\*/i);
		expect(roadmap).toMatch(/3\.5m-gemini-ingest.*Deferred\s*\(post-launch/i);
		expect(roadmap).toMatch(/Epic\s*4\.1\+?\s*unblocked/i);
	});

	it('documents playerLoadoutSprint35mDocsGemini test and portrait-gemini-ingest rule', () => {
		expect(roadmap).toMatch(/playerLoadoutSprint35mDocsGemini\.test\.ts/);
		expect(roadmap).toMatch(/portrait-gemini-ingest\.mdc/);
	});
});
