/**
 * playerHudSprint314.test.ts — QA-142 Train handoff: do not clear armed mission before Firestore loads
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const ACTIVE_BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const bountiesSrc = existsSync(ACTIVE_BOUNTIES) ? readFileSync(ACTIVE_BOUNTIES, 'utf-8') : '';

describe('QA-142 — coach mission Train handoff', () => {
	it('workout page waits for team_assignments snapshot before clearing armed handoff', () => {
		expect(workoutSrc).toMatch(/incomingMissionsReady/);
		expect(workoutSrc).toMatch(/if \(!incomingMissionsReady\) return;/);
		expect(workoutSrc).toMatch(/incomingMissionsReady = true;/);
	});

	it('ActiveBounties falls back to quest targetAttributeId when intent row cache is empty', () => {
		expect(bountiesSrc).toMatch(/quest\.targetAttributeId/);
	});
});
