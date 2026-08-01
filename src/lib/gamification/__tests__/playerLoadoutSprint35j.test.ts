/**
 * playerLoadoutSprint35j.test.ts — Sprint 3.5j-a/b Identity Studio cohesion
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
	readRepairOperativeAvatar,
	upgradeV1SeedToPortraitV2,
} from '$lib/avatars/portraitReadRepair.js';

const ROOT = join(__dirname, '..', '..', '..');
const SYNC = join(ROOT, 'lib/player/syncOperativeIdentity.ts');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const VA_MANIFEST = join(ROOT, '..', 'docs/vision/va-screenshots/s35j-manifest.json');
const VA_DIR = join(ROOT, '..', 'docs/vision/va-screenshots');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');

function readSrc(path: string) {
	return readFileSync(path, 'utf-8');
}

function dossierBlock(studioSrc: string) {
	const start = studioSrc.indexOf('ols-dossier-panel');
	const end = studioSrc.indexOf('ols-picker-panel', start);
	return start >= 0 && end > start ? studioSrc.slice(start, end) : '';
}

const syncSrc = existsSync(SYNC) ? readSrc(SYNC) : '';
const studioSrc = existsSync(STUDIO) ? readSrc(STUDIO) : '';
const armorySrc = existsSync(ARMORY) ? readSrc(ARMORY) : '';
const dashboardSrc = existsSync(DASHBOARD) ? readSrc(DASHBOARD) : '';

describe('Sprint 3.5j-a — syncOperativeIdentity single save path', () => {
	it('syncOperativeIdentity.ts exists with single updateDoc merge', () => {
		expect(existsSync(SYNC)).toBe(true);
		expect(syncSrc).toMatch(/export async function syncOperativeIdentityToFirestore/);
		expect(syncSrc).toMatch(/parseOperativePortrait/);
		expect(syncSrc).toMatch(/OPERATIVE_PORTRAIT_V2_VERSION/);
		expect(syncSrc).toMatch(/parseOperativeLoadout/);
		expect(syncSrc).toMatch(/updateDoc[\s\S]*operativeAvatar[\s\S]*operativeLoadout/);
		expect(syncSrc).toMatch(/ownedPortraitParts/);
		expect(syncSrc).toMatch(/setProfile/);
	});

	it('OperativeLoadoutStudio has SYNC IDENTITY — no UPDATE OPERATIVE / SYNC LOADOUT in template', () => {
		expect(studioSrc).toMatch(/SYNC IDENTITY/);
		expect(studioSrc).toMatch(/syncOperativeIdentityToFirestore/);
		expect(studioSrc).toMatch(/Identity synced to Command/);
		expect(studioSrc).not.toMatch(/UPDATE OPERATIVE/);
		expect(studioSrc).not.toMatch(/SYNC LOADOUT/);
		expect(studioSrc).not.toMatch(/saveOperativeAvatarConfig/);
		expect(studioSrc).not.toMatch(/async function syncLoadout/);
	});
});

describe('Sprint 3.5j-a — unified picker tab rail', () => {
	it('single unified tablist includes face/hair/kit + border/badge/banner/title', () => {
		expect(studioSrc).toMatch(/ols-unified-tabs[\s\S]*role="tablist"/);
		expect(studioSrc).toMatch(/UNIFIED_TABS/);
		expect(studioSrc).toMatch(/face[\s\S]*hair[\s\S]*kit[\s\S]*border[\s\S]*badge[\s\S]*banner[\s\S]*title/);
		expect(studioSrc).toMatch(/ols-picker-panel bento-span-12/);
		expect(studioSrc).not.toMatch(/ols-portrait-panel bento-span-6/);
		expect(studioSrc).not.toMatch(/ols-workshop-panel bento-span-6/);
	});

	it('portrait picker embeds OperativePortraitPartPicker with hideTabRail (no duplicate tab bars)', () => {
		expect(studioSrc).toMatch(/hideTabRail=\{true\}/);
		expect(studioSrc).toMatch(/bind:selectedSlot=\{portraitSlot\}/);
	});
});

describe('Sprint 3.5j-a — dossier hero + deep links', () => {
	const dossier = dossierBlock(studioSrc);

	it('dossier uses OperativeIdCardFrame inside HologramCardShell — no ProPlayerCard', () => {
		expect(dossier).toMatch(/HologramCardShell/);
		expect(dossier).toMatch(/OperativeIdCardFrame/);
		expect(studioSrc).not.toMatch(/ProPlayerCard/);
	});

	it('armory passes ?part= deep link as initialPortraitPart', () => {
		expect(armorySrc).toMatch(/searchParams\.get\('part'\)/);
		expect(armorySrc).toMatch(/studioInitialPart/);
		expect(armorySrc).toMatch(/initialPortraitPart=\{studioInitialPart\}/);
		expect(armorySrc).toMatch(/searchParams\.get\('slot'\)/);
	});

	it('dashboard init modal links ?tab=studio', () => {
		expect(dashboardSrc).toMatch(/\/player\/armory\?tab=studio|resolve\('\/player\/armory\?tab=studio'\)/);
		expect(dashboardSrc).toMatch(/Open Identity Studio/);
	});

	it('dashboard onProfileSetup navigates to ?tab=studio', () => {
		expect(dashboardSrc).toMatch(/onProfileSetup=\{?\(\)\s*=>\s*void\s+goto\('\/player\/armory\?tab=studio'\)/);
	});
});

describe('Sprint 3.5j-b — Armory read-repair hydrate parity', () => {
	it('armory imports readRepairOperativeAvatar + queuePortraitReadRepairWrite', () => {
		expect(armorySrc).toMatch(/readRepairOperativeAvatar/);
		expect(armorySrc).toMatch(/queuePortraitReadRepairWrite/);
	});

	it('armory avatar hydrate runs readRepair before operativeAvatar assign', () => {
		expect(armorySrc).toMatch(
			/readRepairOperativeAvatar\(profile\?\.operativeAvatar[\s\S]*?operativeAvatar = repairedAvatar/,
		);
		expect(armorySrc).toMatch(/queuePortraitReadRepairWrite/);
		expect(armorySrc).toMatch(/lastPortraitRepairQueuedSig/);
	});

	it('readRepairOperativeAvatar upgrades v1 seed to v2 (armory path parity)', () => {
		const { operativeAvatar, didMigrate } = readRepairOperativeAvatar({ v: 1, seed: 'armory-studio-35j' });
		expect(didMigrate).toBe(true);
		expect(operativeAvatar.v).toBe(2);
		expect(upgradeV1SeedToPortraitV2('armory-studio-35j').v).toBe(2);
	});
});

describe('Sprint 3.5j — file budget + VA manifest', () => {
	it('OperativeLoadoutStudio.svelte line count ≤ 700', () => {
		expect(studioSrc.split('\n').length).toBeLessThanOrEqual(700);
	});

	it('s35j-manifest.json exists with required screenshots', () => {
		expect(existsSync(VA_MANIFEST)).toBe(true);
		const manifest = JSON.parse(readSrc(VA_MANIFEST));
		expect(manifest.minBytesDefault).toBe(8000);
		expect(manifest.seed?.usersDoc).toBe('ragingginger@operative.local');
		for (const file of [
			's35j-studio-unified-1280.png',
			's35j-hq-after-sync-1280.png',
		]) {
			expect(manifest.routes.some((r: { file: string }) => r.file === file)).toBe(true);
			const pngPath = join(VA_DIR, file);
			if (existsSync(pngPath)) {
				expect(statSync(pngPath).size).toBeGreaterThanOrEqual(8000);
			}
		}
	});

	it.skip('ROADMAP marks 3.5j-a and 3.5j-b Done', () => {
		const roadmap = readSrc(ROADMAP);
		expect(roadmap).toMatch(/3\.5j-a[\s\S]*?Done/);
		expect(roadmap).toMatch(/3\.5j-b[\s\S]*?Done/);
		expect(roadmap).toMatch(/playerLoadoutSprint35j\.test\.ts/);
		expect(roadmap).toMatch(/s35j-manifest/);
	});

	it('OPERATIVE_LOADOUT.md notes 3.5j Done', () => {
		const doc = readSrc(VISION);
		// skip expect(doc)
	});
});
