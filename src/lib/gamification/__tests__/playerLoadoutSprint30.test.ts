/**
 * playerLoadoutSprint30.test.ts — Sprint 3.0 Operative Loadout v2 (source-scan + guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const LOADOUT_SCHEMA = join(ROOT, 'lib/gamification/loadoutSchema.ts');
const RENDER = join(ROOT, 'lib/gamification/renderOperativeLoadout.js');
const PREVIEW = join(ROOT, 'lib/components/player/OperativeLoadoutPreview.svelte');
const OPERATIVE_LOADOUT_DOC = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const PLAYER_OS = join(ROOT, '..', 'docs/vision/PLAYER_OS.md');

const schemaSrc = existsSync(LOADOUT_SCHEMA) ? readFileSync(LOADOUT_SCHEMA, 'utf-8') : '';
const renderSrc = existsSync(RENDER) ? readFileSync(RENDER, 'utf-8') : '';
const previewSrc = existsSync(PREVIEW) ? readFileSync(PREVIEW, 'utf-8') : '';

describe('Sprint 3.0 — deliverable files exist', () => {
	it('loadoutSchema.ts + renderOperativeLoadout.js + OperativeLoadoutPreview.svelte', () => {
		expect(existsSync(LOADOUT_SCHEMA)).toBe(true);
		expect(existsSync(RENDER)).toBe(true);
		expect(existsSync(PREVIEW)).toBe(true);
	});

	it('exports OPERATIVE_LOADOUT_VERSION from schema', () => {
		expect(schemaSrc).toMatch(/export const OPERATIVE_LOADOUT_VERSION = 1/);
		expect(schemaSrc).toMatch(/export const LOADOUT_SLOTS/);
	});
});

describe('Sprint 3.0 — OperativeLoadoutPreview wiring', () => {
	it('imports parse + compose helpers (read-only preview)', () => {
		expect(previewSrc).toMatch(/parseOperativeLoadout/);
		expect(previewSrc).toMatch(/composeOperativePortrait/);
		expect(previewSrc).toMatch(/player-dossier-root/);
		expect(previewSrc).not.toMatch(/updateDoc|setDoc/);
	});
});

describe('Sprint 3.0 — renderer is SSR-safe pure JS', () => {
	it('composeOperativePortrait reuses operativeAvatar renderer', () => {
		expect(renderSrc).toMatch(/renderOperativeAvatarSvg/);
		expect(renderSrc).toMatch(/composeOperativePortrait/);
		expect(renderSrc).not.toMatch(/window\.|document\.|fetch\(/);
	});
});

describe('Sprint 3.0 — OperativeLoadoutPreview remains read-only', () => {
	it('preview component does not write Firestore directly', () => {
		expect(previewSrc).not.toMatch(/updateDoc|setDoc/);
	});
});

describe('Sprint 3.0 — Armory studio equip UX (superseded by 3.1)', () => {
	it('3.0 regression: schema + preview deliverables still exported', () => {
		expect(schemaSrc).toMatch(/export function parseOperativeLoadout/);
		expect(schemaSrc).toMatch(/export function canEquipItem/);
		expect(previewSrc).toMatch(/operative-loadout-preview/);
	});
});

describe('Sprint 3.0 — vision docs', () => {
	it('OPERATIVE_LOADOUT.md marks 3.0 schema + preview done', () => {
		const doc = existsSync(OPERATIVE_LOADOUT_DOC) ? readFileSync(OPERATIVE_LOADOUT_DOC, 'utf-8') : '';
		expect(doc).toMatch(/3\.0.*Done|Done.*3\.0/i);
	});

	it('ROADMAP.md marks 3.0 Done', () => {
		const roadmap = existsSync(ROADMAP) ? readFileSync(ROADMAP, 'utf-8') : '';
		expect(roadmap).toMatch(/\|\s*3\.0\s*\|\s*Done/i);
	});

	it('PLAYER_OS.md notes loadout preview; HQ ring wiring in 3.1+', () => {
		const playerOs = existsSync(PLAYER_OS) ? readFileSync(PLAYER_OS, 'utf-8') : '';
		expect(playerOs).toMatch(/OperativeLoadoutPreview|loadout preview/i);
		expect(playerOs).toMatch(/3\.1/i);
	});
});
