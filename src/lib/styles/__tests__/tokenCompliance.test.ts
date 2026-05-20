/**
 * tokenCompliance.test.ts — Sprint 1.1 bento interior spacing guard.
 *
 * Migrated 12-col routes must not use hardcoded Tailwind scale spacing
 * (tw-mb-4, tw-gap-4, etc.) — use .bento-* utilities or var(--bento-gap-*).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..', '..', 'routes', '(app)');

const MIGRATED_PAGES = [
	'coach/+page.svelte',
	'coach/forge/+page.svelte',
	'coach/scouting/+page.svelte',
	'admin/overview/+page.svelte',
	'parent/dashboard/+page.svelte',
	'parent/household/+page.svelte',
	'player/dashboard/+page.svelte',
	'player/workout/+page.svelte',
	'player/armory/+page.svelte',
];

/** Hardcoded spacing classes banned inside Sprint 1.1 bento surfaces. */
const BANNED = [
	/\btw-mb-4\b/,
	/\btw-mt-4\b/,
	/\btw-gap-4\b/,
	/\btw-mb-6\b/,
	/\btw-mt-6\b/,
	/\btw-gap-6\b/,
	/\btw-space-y-3\b/,
	/\btw-space-y-4\b/,
];

describe('Sprint 1.1 — token compliance (bento interior spacing)', () => {
	for (const rel of MIGRATED_PAGES) {
		it(`${rel} avoids hardcoded tw-*-4/6 spacing scale`, () => {
			const src = readFileSync(join(ROOT, rel), 'utf-8');
			for (const re of BANNED) {
				expect(src, `Found ${re} in ${rel}`).not.toMatch(re);
			}
		});
	}
});
