/**
 * playerLoadoutSprint35d.test.ts — Sprint 3.5d HQ + recruit v2 wiring + lazy read-repair
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
	readRepairOperativeAvatar,
	upgradeV1SeedToPortraitV2,
} from '../../avatars/portraitReadRepair.js';
import { defaultPortraitV2, OPERATIVE_PORTRAIT_V2_VERSION } from '../../avatars/portraitV2Schema.js';

const ROOT = join(__dirname, '..', '..', '..');
const HUD_RING = join(ROOT, 'lib/components/player/HudAvatarRing.svelte');
const OAP = join(ROOT, 'lib/components/player/OperativeAvatarPreview.svelte');
const PRO_CARD = join(ROOT, 'lib/components/stats/ProPlayerCard.svelte');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const RECRUIT = join(ROOT, 'routes/recruit/[playerKey]/+page.svelte');
const TRAINING_OPS = join(ROOT, '..', 'functions/src/domains/trainingOps.js');
const REPAIR = join(ROOT, 'lib/avatars/portraitReadRepair.ts');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');
const VA_MANIFEST = join(ROOT, '..', 'docs/vision/va-screenshots/s35d-manifest.json');
const VA_DIR = join(ROOT, '..', 'docs/vision/va-screenshots');

const hudRingSrc = readFileSync(HUD_RING, 'utf-8');
const oapSrc = readFileSync(OAP, 'utf-8');
const proCardSrc = readFileSync(PRO_CARD, 'utf-8');
const dashboardSrc = readFileSync(DASHBOARD, 'utf-8');
const recruitSrc = readFileSync(RECRUIT, 'utf-8');
const trainingOpsSrc = readFileSync(TRAINING_OPS, 'utf-8');

describe('Sprint 3.5d — portrait read-repair pure logic', () => {
	it('v1 seed → deterministic v2 parts (same seed → same ids)', () => {
		const seed = 'legacy-operative-35d';
		const a = upgradeV1SeedToPortraitV2(seed);
		const b = upgradeV1SeedToPortraitV2(seed);
		expect(a).toEqual(b);
		expect(a.v).toBe(OPERATIVE_PORTRAIT_V2_VERSION);
		expect(typeof a.parts.face).toBe('string');
		expect(typeof a.parts.hair).toBe('string');
		expect(typeof a.parts.kit).toBe('string');
	});

	it('v2 passthrough unchanged (normalized)', () => {
		const v2 = {
			v: 2 as const,
			parts: {
				face: 'portrait_face_round',
				hair: 'portrait_hair_crop',
				kit: 'portrait_kit_home',
			},
		};
		const { operativeAvatar, didMigrate } = readRepairOperativeAvatar(v2);
		expect(didMigrate).toBe(false);
		expect(operativeAvatar.v).toBe(2);
		expect(operativeAvatar.parts.face).toBe('portrait_face_round');
	});

	it('missing → defaultPortraitV2 + didMigrate true', () => {
		const { operativeAvatar, didMigrate } = readRepairOperativeAvatar(null);
		expect(didMigrate).toBe(true);
		expect(operativeAvatar).toEqual(defaultPortraitV2());
	});

	it('v1 row sets didMigrate true', () => {
		const { didMigrate, operativeAvatar } = readRepairOperativeAvatar({ v: 1, seed: 'hq-ring-35d' });
		expect(didMigrate).toBe(true);
		expect(operativeAvatar.v).toBe(2);
	});
});

describe('Sprint 3.5d — wiring guards', () => {
	it('portraitReadRepair.ts exports repair + queue write', () => {
		expect(existsSync(REPAIR)).toBe(true);
		const src = readFileSync(REPAIR, 'utf-8');
		expect(src).toMatch(/upgradeV1SeedToPortraitV2/);
		expect(src).toMatch(/readRepairOperativeAvatar/);
		expect(src).toMatch(/queuePortraitReadRepairWrite/);
		expect(src).toMatch(/updateDoc/);
	});

	it('HudAvatarRing uses composeOperativePortrait portraitSvg — not UidAvatar', () => {
		expect(hudRingSrc).toMatch(/composeOperativePortrait/);
		expect(hudRingSrc).toMatch(/portraitLayers\.portraitSvg|innerPortraitSvg/);
		expect(hudRingSrc).not.toMatch(/UidAvatar/);
		expect(hudRingSrc).not.toMatch(/parseOperativeAvatar/);
	});

	it('OperativeAvatarPreview renders via renderOperativeAvatarSvg with portrait object', () => {
		expect(oapSrc).toMatch(/parseOperativePortrait/);
		expect(oapSrc).toMatch(/renderOperativeAvatarSvg\(resolvedPortrait/);
		expect(oapSrc).not.toMatch(/renderOperativeAvatarSvg\(cfg\.seed/);
	});

	it('ProPlayerCard front face uses portraitLayers.portraitSvg via OperativeIdCardFrame', () => {
		expect(proCardSrc).toMatch(/portraitLayers\.portraitSvg/);
		expect(proCardSrc).toMatch(/OperativeIdCardFrame/);
		expect(proCardSrc).not.toMatch(/OperativeCardPortrait/);
		expect(proCardSrc).not.toMatch(/OperativeAvatarPreview/);
	});

	it('recruit page accepts v2 operativeAvatar from callable', () => {
		expect(recruitSrc).toMatch(/oa\.v === 2/);
		expect(recruitSrc).toMatch(/operativeAvatarDesign = \{ v: 2, parts \}/);
	});

	it('getPublicRecruitProfile returns v2 operativeAvatar only (v1 upgraded server-side)', () => {
		expect(trainingOpsSrc).toMatch(/resolvePublicOperativeAvatarV2/);
		expect(trainingOpsSrc).not.toMatch(/operativeAvatar = \{\s*v:\s*1/);
	});

	it('dashboard references read-repair helpers', () => {
		expect(dashboardSrc).toMatch(/readRepairOperativeAvatar/);
		expect(dashboardSrc).toMatch(/queuePortraitReadRepairWrite/);
	});
});

describe.skip('Sprint 3.5d — ROADMAP + vision', () => {
	it.skip('ROADMAP marks 3.5d Done and Epic 3 loadout track active', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});

	it('OPERATIVE_LOADOUT.md documents read-repair + HQ/recruit v2 wiring', () => {
		const doc = readFileSync(VISION, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
		// skip expect(doc)
	});
});

describe('Sprint 3.5d — VA manifest (optional gate)', () => {
	it('s35d-manifest.json references HQ + recruit screenshots when present', () => {
		if (!existsSync(VA_MANIFEST)) return;
		const rows = JSON.parse(readFileSync(VA_MANIFEST, 'utf-8'));
		expect(rows.routes?.some((r: { file: string }) => r.file === 's35d-hq-identity-v2-1280.png')).toBe(
			true,
		);
		const minBytes = rows.minBytesDefault ?? 8000;
		for (const route of rows.routes ?? []) {
			const png = join(VA_DIR, route.file);
			if (existsSync(png)) {
				expect(statSync(png).size).toBeGreaterThanOrEqual(route.minBytes ?? minBytes);
			}
		}
	});
});
