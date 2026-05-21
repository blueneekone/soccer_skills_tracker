/**
 * playerHudSprint15.test.ts — Sprint 1.5 baseline guards (source-scan)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const HUD_RING = join(ROOT, 'lib/components/player/HudAvatarRing.svelte');
const HUD_HEADER = join(ROOT, 'lib/components/player/dashboard/PlayerHudHeader.svelte');
const VPP = join(ROOT, 'lib/components/player/dashboard/VanguardProtocolPanel.svelte');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const DEDUP_UTIL = join(ROOT, 'lib/utils/deduplicateMissions.ts');

const ringSrc = readFileSync(HUD_RING, 'utf-8');
const headerSrc = readFileSync(HUD_HEADER, 'utf-8');
const vppSrc = readFileSync(VPP, 'utf-8');
const bountiesSrc = readFileSync(BOUNTIES, 'utf-8');

describe('Sprint 1.5 — HudAvatarRing precision', () => {
	it('has no z-index on badge (stacking via DOM order only)', () => {
		expect(ringSrc).not.toMatch(/z-index:\s*[0-9]/);
	});

	it('ring container uses aspect-ratio 1/1 via bento wrapper in PlayerHudHeader', () => {
		expect(headerSrc).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
	});

	it('ring wrapper has padding: 0', () => {
		expect(headerSrc).toMatch(/player-hud-avatar-bento[\s\S]*?padding:\s*0/);
	});

	it('XP ring uses var(--color-accent) not var(--color-structural)', () => {
		expect(headerSrc).toMatch(/strokeColor.*--color-accent/);
	});
});

describe('Sprint 1.5 — VanguardProtocolPanel advanced toggle removal', () => {
	it('does not contain showAdvanced state', () => {
		expect(vppSrc).not.toMatch(/showAdvanced/);
	});

	it('does not render vpp-advanced-toggle button', () => {
		expect(vppSrc).not.toMatch(/vpp-advanced-toggle/);
	});

	it('does not contain vpp-advanced CSS block', () => {
		expect(vppSrc).not.toMatch(/\.vpp-advanced/);
	});
});

describe('Sprint 1.5 — Mission deduplication', () => {
	it('deduplicateMissions utility exists', () => {
		expect(existsSync(DEDUP_UTIL)).toBe(true);
	});

	it('ActiveBounties imports deduplicateById', () => {
		expect(bountiesSrc).toMatch(/deduplicateById/);
	});

	it('ActiveBounties applies deduplication in derived pipeline', () => {
		expect(bountiesSrc).toMatch(/\$derived.*deduplicateById|deduplicateById.*\$derived/s);
	});
});
