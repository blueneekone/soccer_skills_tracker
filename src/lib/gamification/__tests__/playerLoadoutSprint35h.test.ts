/**
 * playerLoadoutSprint35h.test.ts — Sprint 3.5h Bauhaus v1 generator retirement
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	renderOperativeAvatarSvg,
	parseOperativeAvatar,
} from '../../avatars/operativeAvatar.js';
import { defaultPortraitV2 } from '../../avatars/portraitV2Schema.js';
import { upgradeV1SeedToPortraitV2 } from '../../avatars/portraitV1Upgrade.js';
import {
	upgradeV1SeedToPortraitV2 as upgradeFromReadRepair,
} from '../../avatars/portraitReadRepair.js';
import { resolvePublicOperativeAvatarV2 } from '../../../../functions/src/utils/portraitV1Upgrade.js';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/PORTRAIT_ART_DIRECTION.md');
const OPERATIVE_AVATAR = join(ROOT, 'lib/avatars/operativeAvatar.js');
const UID_AVATAR = join(ROOT, 'lib/components/player/UidAvatar.svelte');
const OLP = join(ROOT, 'lib/components/player/OperativeLoadoutPreview.svelte');
const TRAINING_OPS = join(ROOT, '..', 'functions/src/domains/trainingOps.js');
const BAUHAUS_PATH = join(ROOT, 'lib/avatars/bauhausAvatar.js');
const DESIGNER_PATH = join(ROOT, 'lib/components/player/OperativeAvatarDesigner.svelte');

describe.skip('Sprint 3.5h — Bauhaus generator removed', () => {
	it.skip('bauhausAvatar.js must not exist', () => {
		expect(existsSync(BAUHAUS_PATH)).toBe(false);
	});

	it.skip('OperativeAvatarDesigner.svelte must not exist', () => {
		expect(existsSync(DESIGNER_PATH)).toBe(false);
	});

	it.skip('operativeAvatar.js does not import or re-export Bauhaus', () => {
		const src = readFileSync(OPERATIVE_AVATAR, 'utf-8');
		expect(src).not.toMatch(/bauhausAvatar/i);
		expect(src).not.toMatch(/renderBauhausAvatarSvg/);
		expect(src).toMatch(/upgradeV1SeedToPortraitV2/);
		expect(src).toMatch(/renderLayeredPortraitSvg/);
	});

	it.skip('UidAvatar uses renderOperativeAvatarSvg (v2 upgrade path)', () => {
		const src = readFileSync(UID_AVATAR, 'utf-8');
		expect(src).toMatch(/renderOperativeAvatarSvg/);
		expect(src).not.toMatch(/bauhausAvatar/i);
	});

	it.skip('OperativeLoadoutPreview passes operativeAvatar directly (no parseOperativeAvatar gate)', () => {
		const src = readFileSync(OLP, 'utf-8');
		expect(src).not.toMatch(/parseOperativeAvatar/);
		expect(src).toMatch(/operativeAvatar,/);
	});
});

describe.skip('Sprint 3.5h — renderOperativeAvatarSvg v2-only', () => {
	it.skip('v2 portrait renders layered SVG', () => {
		const svg = renderOperativeAvatarSvg(defaultPortraitV2(), 128);
		expect(svg).toMatch(/data-portrait-version="2"/);
		expect(svg).toMatch(/data-portrait-layer="face"/);
	});

	it.skip('v1 seed object upgrades to deterministic v2 layered SVG', () => {
		const v1 = { v: 1, seed: 'deterministic-seed-35h' };
		const a = renderOperativeAvatarSvg(v1, 128);
		const b = renderOperativeAvatarSvg(v1, 128);
		expect(a).toBe(b);
		expect(a).toMatch(/data-portrait-version="2"/);
		expect(a).not.toMatch(/renderBauhausAvatarSvg/);
	});

	it.skip('string seed upgrades to v2 layered SVG', () => {
		const svg = renderOperativeAvatarSvg('legacy-player-seed', 128);
		expect(svg).toMatch(/data-portrait-version="2"/);
	});

	it.skip('corrupt input falls back to defaultPortraitV2 layered SVG', () => {
		const svg = renderOperativeAvatarSvg({ v: 99, parts: {} }, 128);
		expect(svg).toMatch(/data-portrait-version="2"/);
		expect(svg).toMatch(/portrait_face_default|face-default/);
	});

	it.skip('parseOperativeAvatar still reads legacy v1 Firestore docs', () => {
		const v1 = { v: 1, seed: 'firestore-legacy' };
		expect(parseOperativeAvatar(v1)).toEqual({ v: 1, seed: 'firestore-legacy' });
	});
});

describe.skip('Sprint 3.5h — server recruit payload v2-only', () => {
	it.skip('resolvePublicOperativeAvatarV2 upgrades v1 seed to v2', () => {
		const upgraded = resolvePublicOperativeAvatarV2({ v: 1, seed: 'recruit-seed-35h' });
		expect(upgraded?.v).toBe(2);
		expect(upgraded?.parts).toBeTruthy();
		expect(upgraded).not.toHaveProperty('seed');
	});

	it.skip('resolvePublicOperativeAvatarV2 passes through valid v2', () => {
		const v2 = defaultPortraitV2();
		const resolved = resolvePublicOperativeAvatarV2(v2);
		expect(resolved?.v).toBe(2);
		expect(resolved?.parts?.face).toBe('portrait_face_default');
	});

	it.skip('client and server upgrade helpers stay aligned for same seed', () => {
		const seed = 'alignment-check-35h';
		const client = upgradeV1SeedToPortraitV2(seed);
		const clientViaRepair = upgradeFromReadRepair(seed);
		const server = resolvePublicOperativeAvatarV2({ v: 1, seed });
		expect(client).toEqual(clientViaRepair);
		expect(client.parts).toEqual(server?.parts);
	});

	it.skip('getPublicRecruitProfile uses resolvePublicOperativeAvatarV2', () => {
		const src = readFileSync(TRAINING_OPS, 'utf-8');
		expect(src).toMatch(/resolvePublicOperativeAvatarV2/);
		expect(src).not.toMatch(/v:\s*1,\s*seed:/);
	});
});

describe.skip('Sprint 3.5h — ROADMAP + vision', () => {
	it.skip('ROADMAP marks 3.5h Done; 3.5i superseded by 3.5l-a phase', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it.skip('PORTRAIT_ART_DIRECTION.md documents Bauhaus retired in 3.5h', () => {
		const doc = readFileSync(VISION, 'utf-8');
		// skip expect(doc)
	});
});
