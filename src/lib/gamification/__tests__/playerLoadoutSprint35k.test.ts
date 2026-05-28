/**
 * playerLoadoutSprint35k.test.ts — Sprint 3.5k collectible ID card metadata
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	formatCollectorNumber,
	resolveFlavorText,
	resolveOperativeCardMetadata,
	stickerVariantFromCardRarity,
} from '../cardCollectibleMetadata.js';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_ID_CARD.md');
const VA_MANIFEST = join(ROOT, '..', 'docs/vision/va-screenshots/s35k-manifest.json');
const FRAME = join(ROOT, 'lib/components/stats/OperativeIdCardFrame.svelte');
const PRO_CARD = join(ROOT, 'lib/components/stats/ProPlayerCard.svelte');
const PRO_BACK = join(ROOT, 'lib/components/stats/ProPlayerCardBack.svelte');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const RECRUIT = join(ROOT, 'routes/recruit/[playerKey]/+page.svelte');

describe('Sprint 3.5k — resolveOperativeCardMetadata', () => {
	it('returns S1 setId + collectorNumber NNN/198 pattern', () => {
		const meta = resolveOperativeCardMetadata({ emailKey: 'alpha@test.dev' });
		expect(meta.setId).toBe('S1');
		expect(meta.collectorNumber).toMatch(/^\d{3}\/198$/);
	});

	it('formatCollectorNumber is deterministic for same emailKey', () => {
		expect(formatCollectorNumber('ragingginger@operative.local')).toBe(
			formatCollectorNumber('ragingginger@operative.local'),
		);
	});

	it('owned alt-art album card elevates to illustration_rare', () => {
		const meta = resolveOperativeCardMetadata({
			ownedSeasonOneCards: ['card_015_alt_art'],
			emailKey: 'vault@test.dev',
		});
		expect(meta.rarity).toBe('illustration_rare');
	});

	it('equipped neon border floors rarity to rare', () => {
		const meta = resolveOperativeCardMetadata({
			operativeLoadout: { v: 1, equipped: { border: 'digi_border_neon' } },
			emailKey: 'border@test.dev',
		});
		expect(meta.rarity).toBe('rare');
	});

	it('public recruit flavor avoids rank-tier PII copy', () => {
		const recruit = resolveFlavorText('Legend Vanguard', true);
		const privateTier = resolveFlavorText('Legend Vanguard', false);
		expect(recruit).not.toBe(privateTier);
		expect(recruit).toMatch(/coach-verified/i);
		expect(recruit).not.toMatch(/legend|vanguard/i);
	});

	it('stickerVariantFromCardRarity maps illustration_rare → alt-art', () => {
		expect(stickerVariantFromCardRarity('illustration_rare')).toBe('alt-art');
		expect(stickerVariantFromCardRarity('common')).toBe('base');
	});
});

describe('Sprint 3.5k — OperativeIdCardFrame chrome', () => {
	const frameSrc = readFileSync(FRAME, 'utf-8');

	it('has oicf-set-line and oicf-rarity-chip', () => {
		expect(frameSrc).toMatch(/oicf-set-line/);
		expect(frameSrc).toMatch(/oicf-rarity-chip/);
		expect(frameSrc).toMatch(/cardMetadata/);
	});

	it('showArcFlourish active only for illustration_rare via cardMetadata', () => {
		expect(frameSrc).toMatch(/arcFlourishActive/);
		expect(frameSrc).toMatch(/cardMetadata\?\.rarity\s*===\s*'illustration_rare'/);
		expect(frameSrc).not.toMatch(/showArcFlourish\s*=\s*\{?\s*true/);
	});
});

describe('Sprint 3.5k — ProPlayerCard back + budget', () => {
	const proCardSrc = readFileSync(PRO_CARD, 'utf-8');
	const backSrc = readFileSync(PRO_BACK, 'utf-8');

	it('ProPlayerCard imports metadata resolver + ProPlayerCardBack', () => {
		expect(proCardSrc).toMatch(/resolveOperativeCardMetadata/);
		expect(proCardSrc).toMatch(/ProPlayerCardBack/);
		expect(proCardSrc).toMatch(/stickerVariantFromCardRarity/);
		expect(proCardSrc).toMatch(/printVariant/);
	});

	it('ProPlayerCard back includes flavor and collector guards', () => {
		expect(backSrc).toMatch(/ppc-back-flavor/);
		expect(backSrc).toMatch(/ppc-back-collector/);
		expect(backSrc).toMatch(/flavorText/);
		expect(backSrc).toMatch(/Illus\. SSTracker/);
	});

	it('ProPlayerCard.svelte stays within file budget (≤700 lines)', () => {
		const lineCount = proCardSrc.split('\n').length;
		expect(lineCount).toBeLessThanOrEqual(700);
	});
});

describe('Sprint 3.5k — wiring guards', () => {
	it('IdentityBentoModule + dashboard pass cardMetadata', () => {
		const ibmSrc = readFileSync(IBM, 'utf-8');
		const dashboardSrc = readFileSync(DASHBOARD, 'utf-8');
		expect(ibmSrc).toMatch(/cardMetadata/);
		expect(dashboardSrc).toMatch(/resolveOperativeCardMetadata/);
		expect(dashboardSrc).toMatch(/cardMetadata=\{hqCardMetadata\}/);
	});

	it('Studio dossier resolves metadata from album + loadout', () => {
		const studioSrc = readFileSync(STUDIO, 'utf-8');
		expect(studioSrc).toMatch(/resolveOperativeCardMetadata/);
		expect(studioSrc).toMatch(/ownedSeasonOneCards/);
		expect(studioSrc).toMatch(/cardMetadata=\{dossierCardMetadata\}/);
	});

	it('recruit ProPlayerCard uses publicRecruit flag', () => {
		const recruitSrc = readFileSync(RECRUIT, 'utf-8');
		expect(recruitSrc).toMatch(/publicRecruit=\{true\}/);
	});
});

describe('Sprint 3.5k — ROADMAP + vision + VA manifest', () => {
	it('ROADMAP tracks 3.5k collectible metadata sprint', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*\*\*3\.5k\*\*\s*\|\s*\*\*(?:Done|In progress)\*\*/i);
		expect(doc).toMatch(/playerLoadoutSprint35k\.test\.ts/);
		expect(doc).toMatch(/Collectible metadata|3\.5k/i);
	});

	it('OPERATIVE_ID_CARD.md §9 marks 3.5k implemented', () => {
		const doc = readFileSync(VISION, 'utf-8');
		expect(doc).toMatch(/3\.5k.*implemented|implemented.*3\.5k/i);
	});

	it('s35k-manifest.json lists HQ + ProPlayerCard + recruit routes', () => {
		expect(existsSync(VA_MANIFEST)).toBe(true);
		const rows = JSON.parse(readFileSync(VA_MANIFEST, 'utf-8'));
		const files = (rows.routes ?? []).map((r: { file: string }) => r.file);
		expect(files).toContain('s35k-hq-holo-1280.png');
		expect(files).toContain('s35k-pro-card-front-1280.png');
		expect(files).toContain('s35k-pro-card-back-1280.png');
		expect(files).toContain('s35k-recruit-front-1280.png');
	});
});
