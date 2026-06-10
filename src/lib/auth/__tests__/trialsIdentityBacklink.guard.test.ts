/**
 * trialsIdentityBacklink.guard.test.ts — Tier-2 Item 2 source-scan guards
 *
 * Verifies that challenges/+page.svelte writes `playerId` and `playerEmail`
 * into the trials addDoc payload alongside the retained legacy `player` field.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE_SRC = readFileSync(
	resolve('src/routes/(app)/challenges/+page.svelte'),
	'utf8',
);

describe('Tier-2 Item 2 — challenges/+page.svelte trials addDoc identity backlink', () => {
	it('still writes the legacy player: profile.playerName field (backward compat)', () => {
		expect(PAGE_SRC).toMatch(/player:\s*profile\.playerName/);
	});

	it('writes playerId from authStore.user.uid', () => {
		expect(PAGE_SRC).toMatch(/playerId:\s*authStore\.user\?\.uid/);
	});

	it('writes playerEmail from authStore.user.email (lowercased)', () => {
		expect(PAGE_SRC).toMatch(/playerEmail:\s*\(authStore\.user\?\.email.*\)\.toLowerCase\(\)/);
	});

	it('playerId and playerEmail appear inside the addDoc(collection(db, trials)) call', () => {
		const addDocBlock = PAGE_SRC.match(
			/addDoc\(collection\(db,\s*['"]trials['"]\)[^)]*\{[\s\S]*?\}\s*\)/,
		)?.[0] ?? '';
		// The regex above may not capture the full block; fall back to surrounding context.
		const trialsPayloadBlock = PAGE_SRC.match(
			/addDoc\(collection\(db,\s*['"]trials['"]\),[\s\S]*?timestamp:/,
		)?.[0] ?? '';
		expect(trialsPayloadBlock).toMatch(/playerId/);
		expect(trialsPayloadBlock).toMatch(/playerEmail/);
	});
});
