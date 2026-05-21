/**
 * playerHudSprint16.test.ts — Sprint 1.6 baseline guards (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const IDENTITY = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const METRICS = join(ROOT, 'lib/components/player/dashboard/HudMetricsPanel.svelte');
const OPERATIVE = join(ROOT, 'lib/components/player/dashboard/OperativeHub.svelte');
const HUD_CONTAINER = join(ROOT, 'lib/components/hud/HUDContainer.svelte');
const DEDUP = join(ROOT, 'lib/utils/deduplicateMissions.ts');
const UID_AVATAR = join(ROOT, 'lib/components/player/UidAvatar.svelte');

const operativeSrc = existsSync(OPERATIVE) ? readFileSync(OPERATIVE, 'utf-8') : '';
const dedupSrc = existsSync(DEDUP) ? readFileSync(DEDUP, 'utf-8') : '';
const uidSrc = existsSync(UID_AVATAR) ? readFileSync(UID_AVATAR, 'utf-8') : '';
const containerSrc = existsSync(HUD_CONTAINER) ? readFileSync(HUD_CONTAINER, 'utf-8') : '';

describe('Sprint 1.6 — new component files exist', () => {
	it('IdentityBentoModule.svelte exists', () => {
		expect(existsSync(IDENTITY)).toBe(true);
	});

	it('HudMetricsPanel.svelte exists', () => {
		expect(existsSync(METRICS)).toBe(true);
	});
});

describe('Sprint 1.6 — OperativeHub is bento-clean', () => {
	it('OperativeHub does not contain fixed 350px column', () => {
		expect(operativeSrc).not.toMatch(/350px/);
	});

	it('OperativeHub renders identity snippet', () => {
		expect(operativeSrc).toMatch(/identity/);
	});

	it('OperativeHub renders metrics snippet', () => {
		expect(operativeSrc).toMatch(/metrics/);
	});
});

describe('Sprint 1.6 — deduplication warning', () => {
	it('deduplicateMissions warns on duplicate ids', () => {
		expect(dedupSrc).toMatch(/console\.warn/);
	});
});

describe('Sprint 1.6 — UidAvatar skeleton mode', () => {
	it('UidAvatar accepts a skeleton prop', () => {
		expect(uidSrc).toMatch(/skeleton/);
	});

	it('UidAvatar renders initials in skeleton mode', () => {
		expect(uidSrc).toMatch(/uid-avatar--skeleton/);
	});

	it('UidAvatar uses brand gold #fbbf24 for skeleton initials (Sprint 1.6 refinement)', () => {
		expect(uidSrc).toMatch(/#fbbf24|rgba\(251,\s*191,\s*36/);
	});

	it('UidAvatar skeleton initials are 50% opacity', () => {
		expect(uidSrc).toMatch(/opacity:\s*0\.5/);
	});
});

describe('Sprint 1.6 — HUDContainer (viewport 12-col bento)', () => {
	it('HUDContainer.svelte exists in src/lib/components/hud/', () => {
		expect(existsSync(HUD_CONTAINER)).toBe(true);
	});

	it('HUDContainer applies bento-grid--12col class', () => {
		expect(containerSrc).toMatch(/bento-grid--12col/);
	});

	it('HUDContainer enforces 12-col bento structure (rigid grid + liquid sizing)', () => {
		expect(containerSrc).toMatch(/bento-grid--liquid/);
	});
});
