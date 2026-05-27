/**
 * playerHudSprint239.test.ts — Coach mission HQ → Train handoff
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const WORKOUT = join(ROOT, 'routes/(app)/player/workout/+page.svelte');
const FLOW = join(ROOT, 'lib/player/workout/coachMissionFlow.ts');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const MISSIONS_CSS = join(ROOT, 'lib/styles/player-missions.css');
const ACTIVE_BOUNTIES_TS = join(ROOT, 'lib/player/dashboard/activeBounties.ts');

const bountiesSrc = existsSync(BOUNTIES) ? readFileSync(BOUNTIES, 'utf-8') : '';
const workoutSrc = existsSync(WORKOUT) ? readFileSync(WORKOUT, 'utf-8') : '';
const flowSrc = existsSync(FLOW) ? readFileSync(FLOW, 'utf-8') : '';
const hudCss = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const missionsCss = existsSync(MISSIONS_CSS) ? readFileSync(MISSIONS_CSS, 'utf-8') : '';
const activeBountiesTsSrc = existsSync(ACTIVE_BOUNTIES_TS) ? readFileSync(ACTIVE_BOUNTIES_TS, 'utf-8') : '';

describe('Sprint 2.22 — coach mission HQ → Train handoff', () => {
	it('exports shared coach mission flow module', () => {
		expect(flowSrc).toMatch(/export const MISSION_HANDOFF_KEY/);
		expect(flowSrc).toMatch(/export function readMissionHandoff/);
		expect(flowSrc).toMatch(/export const COACH_INTENT_HINT/);
	});

	it('ActiveBounties stashes mission handoff and shows drill preview on coach intents', () => {
		expect(bountiesSrc).toMatch(/stashMissionHandoff/);
		expect(bountiesSrc).toMatch(/resolveHeuristicDrill/);
		expect(bountiesSrc).toMatch(/COACH_INTENT_HINT/);
		expect(bountiesSrc).toMatch(/quest-row__drill/);
		expect(bountiesSrc).toMatch(/questHudCtaFor/);
		expect(bountiesSrc).not.toMatch(/player_active_mission_id/);
	});

	it('activeBounties exports questHudCtaFor with Start session label', () => {
		expect(activeBountiesTsSrc).toMatch(/export function questHudCtaFor/);
		expect(activeBountiesTsSrc).toMatch(/Start session →/);
	});

	it('workout page reads handoff and shows armed banner instead of duplicate intent sidebar', () => {
		expect(workoutSrc).toMatch(/readMissionHandoff/);
		expect(workoutSrc).toMatch(/applyMissionHandoff/);
		expect(workoutSrc).toMatch(/pw-mission-armed/);
		expect(workoutSrc).toMatch(/Coach missions on HQ/);
		expect(workoutSrc).not.toMatch(/pw-panel--threat/);
		expect(workoutSrc).not.toMatch(/Active tactical intents/);
	});

	it('workout page markup closes all wrapper divs (pd-page-root + pd-content-wrap)', () => {
		const opens = (workoutSrc.match(/<div[\s>]/g) ?? []).length;
		const closes = (workoutSrc.match(/<\/div>/g) ?? []).length;
		expect(opens).toBe(closes);
	});

	it('CSS includes armed mission banner and mission rail drill preview styles', () => {
		expect(hudCss).toMatch(/\.pw-mission-armed/);
		expect(hudCss).toMatch(/\.pw-hq-link/);
		expect(missionsCss).toMatch(/\.quest-row__drill/);
		expect(missionsCss).toMatch(/\.quest-row__hint/);
	});
});
