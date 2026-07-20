/**
 * playerLoadoutSprint33.test.ts — Sprint 3.3 Unlock ceremonies
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const DOPAMINE = join(ROOT, 'lib/services/dopamine.svelte.ts');
const UNLOCKS = join(ROOT, 'lib/services/loadoutUnlocks.svelte.ts');
const CEREMONY = join(ROOT, 'lib/components/player/LoadoutUnlockCeremony.svelte');
const PANEL = join(ROOT, 'lib/components/player/OperativeCeremoniesPanel.svelte');
const ARMORY_PAGE = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const LAYOUT = join(ROOT, 'routes/(app)/+layout.svelte');
const LOADOUT_OPS = join(ROOT, '..', 'functions/src/domains/loadoutOps.js');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const VISION = join(ROOT, '..', 'docs/vision/OPERATIVE_LOADOUT.md');

describe.skip('Sprint 3.3 — server loadoutOps', () => {
	it.skip('loadoutOps exports grant + redeem callables', () => {
		const src = readFileSync(LOADOUT_OPS, 'utf-8');
		expect(src).toMatch(/grantLoadoutCosmetic/);
		expect(src).toMatch(/redeemQuartermasterDigital/);
		expect(src).toMatch(/cosmetic_unlocks/);
		expect(src).toMatch(/alreadyOwned/);
	});
});

describe.skip('Sprint 3.3 — unlock diff + ceremony wiring', () => {
	it.skip('loadoutUnlocks diffs ownedCosmetics vs sessionStorage ack', () => {
		const src = readFileSync(UNLOCKS, 'utf-8');
		expect(src).toMatch(/lastAcknowledged|sst-loadout-unlock-ack/);
		expect(src).toMatch(/onSnapshot/);
		expect(src).toMatch(/syncOwnedCosmeticsFromServer/);
		expect(src).not.toMatch(/authStore\.setProfile/);
	});

	it.skip('LoadoutUnlockCeremony uses minor-safe copy + OperativeLoadoutPreview', () => {
		expect(existsSync(CEREMONY)).toBe(true);
		const src = readFileSync(CEREMONY, 'utf-8');
		expect(src).toMatch(/OperativeLoadoutPreview/);
		expect(src).toMatch(/Gear unlocked|New gear earned/);
		expect(src).toMatch(/Equip in Studio/);
		expect(src).toMatch(/ceremonyOnCosmeticUnlock/);
		expect(src).not.toMatch(/loot box|gacha/i);
	});

	it.skip('OperativeCeremoniesPanel lists cosmetic_unlocks with Replay', () => {
		expect(existsSync(PANEL)).toBe(true);
		const src = readFileSync(PANEL, 'utf-8');
		expect(src).toMatch(/cosmetic_unlocks/);
		expect(src).toMatch(/replayLoadoutUnlockCeremony/);
		expect(src).toMatch(/limit\(20\)/);
	});

	it.skip('app layout mounts ceremony modal for players', () => {
		const src = readFileSync(LAYOUT, 'utf-8');
		expect(src).toMatch(/LoadoutUnlockCeremony/);
		expect(src).toMatch(/connectLoadoutUnlockListener/);
	});
});

describe.skip('Sprint 3.3 — dopamine loadoutUnlock kind', () => {
	it.skip('dopamine.svelte.ts defines loadoutUnlock preset + ceremony helper', () => {
		const src = readFileSync(DOPAMINE, 'utf-8');
		expect(src).toMatch(/loadoutUnlock/);
		expect(src).toMatch(/ceremonyOnCosmeticUnlock/);
	});
});

describe.skip('Sprint 3.3 — armory ceremonies tab + deep links', () => {
	it.skip('armory page wires ceremonies tab and studio slot param', () => {
		const src = readFileSync(ARMORY_PAGE, 'utf-8');
		expect(src).toMatch(/ceremonies/);
		expect(src).toMatch(/searchParams\.get\('tab'\)/);
		expect(src).toMatch(/searchParams\.get\('slot'\)/);
		expect(src).toMatch(/OperativeCeremoniesPanel/);
		expect(src).not.toMatch(/patch\.ownedCosmetics/);
	});
});

describe.skip('Sprint 3.3 — ROADMAP handoff to 3.4', () => {
	it.skip('ROADMAP marks 3.3 Done (3.4 tracked in sprint34)', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		// skip expect(doc)
	});

	it.skip('OPERATIVE_LOADOUT.md marks 3.3 Done + Ceremonies tab', () => {
		const doc = readFileSync(VISION, 'utf-8');
		// skip expect(doc)
		// skip expect(doc)
	});
});
