/**
 * playerHudSprint14.test.ts — Sprint 1.4 baseline guards (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_RING = join(ROOT, 'lib/components/player/HudAvatarRing.svelte');
const HUD_HEADER = join(ROOT, 'lib/components/player/dashboard/PlayerHudHeader.svelte');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');

const ringSrc = readFileSync(HUD_RING, 'utf-8');
const headerSrc = readFileSync(HUD_HEADER, 'utf-8');
const pageSrc = readFileSync(PAGE, 'utf-8');
const hudCssSrc = readFileSync(HUD_CSS, 'utf-8');

describe('Sprint 1.4 — PlayerHudHeader & HudAvatarRing', () => {
	it('HudAvatarRing uses 24px avatar radius and overflow hidden', () => {
		expect(ringSrc).toMatch(/border-radius:\s*24px/);
		expect(ringSrc).toMatch(/overflow:\s*hidden/);
	});

	it('HudAvatarRing binds hud-avatar-ring--embedded class', () => {
		expect(ringSrc).toMatch(/hud-avatar-ring--embedded=\{embedded\}/);
	});

	it('PlayerHudHeader uses fluid avatar size token', () => {
		expect(headerSrc).toMatch(/--player-hud-avatar-size/);
	});

	it('PlayerHudHeader avoids hardcoded 14px and 8px gaps', () => {
		expect(headerSrc).not.toMatch(/gap:\s*14px/);
		expect(headerSrc).not.toMatch(/gap:\s*8px/);
	});

	it('PlayerHudHeader avoids hardcoded XP cyan #22d3ee', () => {
		expect(headerSrc).not.toMatch(/#22d3ee/i);
	});

	it('PlayerHudHeader wires streak ring via HudSeededRingCanvas and streakRingFill', () => {
		expect(headerSrc).toMatch(/HudSeededRingCanvas/);
		expect(headerSrc).toMatch(/streakRingFill/);
	});
});

describe('Sprint 1.4 — Dashboard page & dead CSS', () => {
	it('dashboard does not mount PlayerCommandCenter overlay (shell nav only)', () => {
		expect(pageSrc).not.toMatch(/PlayerCommandCenter/);
		expect(pageSrc).not.toMatch(/commandCenterOpen/);
		expect(headerSrc).toMatch(/cmd-center-trigger/);
		expect(headerSrc).toMatch(/onOpenCommandCenter/);
	});

	it('dashboard scoped styles omit legacy operative-casefile blocks', () => {
		expect(pageSrc).not.toMatch(/\.operative-casefile/);
		expect(pageSrc).not.toMatch(/\.lobby-glass/);
		expect(pageSrc).not.toMatch(/\.combat-hud-shell/);
	});

	it('player-dashboard-hud.css omits dead casefile/tile selectors', () => {
		expect(hudCssSrc).not.toMatch(/\.player-hud-casefile/);
		expect(hudCssSrc).not.toMatch(/\.player-hud-tile/);
	});
});
