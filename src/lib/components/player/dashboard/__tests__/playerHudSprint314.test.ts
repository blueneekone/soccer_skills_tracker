/**
 * playerHudSprint314.test.ts — QA-142 coach mission → Train handoff
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const ACTIVE_BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const ADAPTIVE_HW = join(ROOT, 'routes/(app)/player/dashboard/AdaptiveHomework.svelte');
const FLOW = join(ROOT, 'lib/player/workout/coachMissionFlow.ts');

const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const bountiesSrc = existsSync(ACTIVE_BOUNTIES) ? readFileSync(ACTIVE_BOUNTIES, 'utf-8') : '';
const adaptiveSrc = existsSync(ADAPTIVE_HW) ? readFileSync(ADAPTIVE_HW, 'utf-8') : '';
const flowSrc = existsSync(FLOW) ? readFileSync(FLOW, 'utf-8') : '';

describe('QA-142 — coach mission Train handoff', () => {
	it('workout page waits for team_assignments snapshot before clearing armed handoff', () => {
		expect(workoutSrc).toMatch(/incomingMissionsReady/);
		expect(workoutSrc).toMatch(/if \(!incomingMissionsReady\) return;/);
	});

	it('coach missions skip MissionHeroModal and stash via stashCoachIntentHandoffForAssignment', () => {
		expect(bountiesSrc).toMatch(/coach_intent.*coach_homework/s);
		expect(bountiesSrc).toMatch(/return false/);
		expect(bountiesSrc).toMatch(/stashCoachIntentHandoffForAssignment/);
		expect(bountiesSrc).toMatch(/quest\.targetAttributeId/);
	});

	it('Morning Readiness defers when a coach Train handoff is pending', () => {
		expect(adaptiveSrc).toMatch(/coachTrainHandoffPending/);
		expect(adaptiveSrc).toMatch(/readMissionHandoff/);
		expect(adaptiveSrc).toMatch(/showReadinessCard && !coachTrainHandoffPending/);
	});

	it('buildCoachIntentHandoff always carries a drillId fallback for execution panel', () => {
		expect(flowSrc).toMatch(/input\.missionId/);
	});
});
