/**
 * launchCohesionLb.test.ts — LAUNCH-cohesion-lb design launch-blocker guards.
 *
 * Three cohesion launch-blockers from the 8-domain design audit (2026-06-09):
 *   CLB-1 — SweetAlert2 commit modal on the /tracker player path
 *   CLB-2 — raw Chart.js radar on /stats (player path must use the cohesive VPP radar)
 *   CLB-3 — gamification chrome on /coach OS routes
 *
 * Source-scan guards (no runtime). Each slice adds its block as it lands so a
 * regression re-introducing the non-cohesive surface fails fast.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const TRACKER = join(ROOT, 'routes/(app)/tracker/+page.svelte');
const STATS = join(ROOT, 'routes/(app)/stats/+page.svelte');
const OVERLAY = join(ROOT, 'lib/components/player/PlayerDiegeticOverlay.svelte');
const COACH_DASH = join(ROOT, 'routes/(app)/coach/+page.svelte');
const SQUAD_TELEMETRY = join(ROOT, 'lib/components/hud/SquadTelemetryView.svelte');
const COACH_READINESS = join(ROOT, 'lib/components/coach/CoachSquadReadinessCard.svelte');

const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf-8') : '');

const trackerSrc = read(TRACKER);
const statsSrc = read(STATS);
const overlaySrc = read(OVERLAY);
const coachDashSrc = read(COACH_DASH);
const squadTelemetrySrc = read(SQUAD_TELEMETRY);
const coachReadinessSrc = read(COACH_READINESS);

describe('CLB-1 — /tracker SweetAlert2 removal → diegetic overlay', () => {
	it('tracker/+page.svelte has no sweetalert2 / Swal import or usage', () => {
		expect(trackerSrc).not.toMatch(/\bsweetalert2\b/i);
		expect(trackerSrc).not.toMatch(/\bSwal\b/);
		expect(trackerSrc).not.toMatch(/Swal\.fire/);
	});

	it('tracker imports and renders PlayerDiegeticOverlay', () => {
		expect(trackerSrc).toMatch(/import PlayerDiegeticOverlay/);
		expect(trackerSrc).toMatch(/<PlayerDiegeticOverlay/);
		expect(trackerSrc).toMatch(/overlayOpen/);
		expect(trackerSrc).toMatch(/overlayVariant/);
	});

	it('success log routes to /stats via the overlay acknowledge action (not Swal.then)', () => {
		// onOverlayConfirm gates the post-log navigation/refresh on success.
		expect(trackerSrc).toMatch(/onOverlayConfirm/);
		expect(trackerSrc).toMatch(/goto\('\/stats'\)/);
		// Success + error branches both drive the shared overlay.
		expect(trackerSrc).toMatch(/overlayVariant = 'success'/);
		expect(trackerSrc).toMatch(/overlayVariant = 'error'/);
	});

	it('canonical overlay primitive still exists', () => {
		expect(overlaySrc).toMatch(/pd-diegetic-overlay/);
	});
});

describe('CLB-2 — /stats raw Chart.js radar → cohesive VanguardProtocolPanel', () => {
	it('stats/+page.svelte has no raw Chart.js radar (no type:radar, no radarCanvas)', () => {
		expect(statsSrc).not.toMatch(/type:\s*'radar'/);
		expect(statsSrc).not.toMatch(/radarCanvas/);
		expect(statsSrc).not.toMatch(/bind:this=\{radarCanvas\}/);
	});

	it('radar Chart.js config signature fully removed (SKILL_VECTOR dataset + angleLines)', () => {
		// These tokens were unique to the raw radar Chart instance, not the workout timeline.
		expect(statsSrc).not.toMatch(/SKILL_VECTOR/);
		expect(statsSrc).not.toMatch(/angleLines/);
		expect(statsSrc).not.toMatch(/dossier-radar__chart/);
	});

	it('renders VanguardProtocolPanel for the skill radar (single cohesive radar)', () => {
		expect(statsSrc).toMatch(/import VanguardProtocolPanel/);
		expect(statsSrc).toMatch(/<VanguardProtocolPanel/);
		expect(statsSrc).toMatch(/prismValues=\{attrRadarValues\}/);
	});

	it('dead radar-vector chain removed (skillsVector / radarTag / radarLabels)', () => {
		expect(statsSrc).not.toMatch(/let skillsVector/);
		expect(statsSrc).not.toMatch(/let radarTag/);
		expect(statsSrc).not.toMatch(/applyRadarFromPlayerStats/);
	});

	it('workout XP timeline keeps Chart.js (only the radar was removed)', () => {
		expect(statsSrc).toMatch(/new ChartCtor\(workoutCanvas/);
		expect(statsSrc).toMatch(/workoutCanvas/);
	});
});

describe('CLB-3 — /coach gamification chrome removed (Coach OS canon)', () => {
	it('coach dashboard mounts SquadTelemetryView (live surface under guard)', () => {
		expect(coachDashSrc).toMatch(/<SquadTelemetryView/);
	});

	it('SquadTelemetryView no longer renders player XP/Level chrome', () => {
		// Roster table de-gamified: no Lvl/XP columns, no player level import.
		expect(squadTelemetrySrc).not.toMatch(/getLevelProgressFromTotalXp/);
		expect(squadTelemetrySrc).not.toMatch(/Roster &amp; XP/);
		expect(squadTelemetrySrc).not.toMatch(/LVL \{/);
		expect(squadTelemetrySrc).not.toMatch(/% XP/);
		expect(squadTelemetrySrc).not.toMatch(/<th scope="col">Lvl<\/th>/);
		expect(squadTelemetrySrc).not.toMatch(/<th scope="col">XP<\/th>/);
	});

	it('SquadTelemetryView keeps flat sideline analytics (roster, status, link)', () => {
		expect(squadTelemetrySrc).toMatch(/<th scope="col">Athlete<\/th>/);
		expect(squadTelemetrySrc).toMatch(/<th scope="col">Link<\/th>/);
	});

	it('CoachSquadReadinessCard de-gamified (no XP/Level bar or player level import)', () => {
		expect(coachReadinessSrc).not.toMatch(/getLevelProgressFromTotalXp/);
		expect(coachReadinessSrc).not.toMatch(/MAX_PLAYER_LEVEL/);
		expect(coachReadinessSrc).not.toMatch(/RPG Level/);
		expect(coachReadinessSrc).not.toMatch(/leveling up/);
		expect(coachReadinessSrc).not.toMatch(/LVL \{/);
	});

	it('no coach component imports the player gamification level module', () => {
		expect(squadTelemetrySrc).not.toMatch(/\$lib\/gamification\/level/);
		expect(coachReadinessSrc).not.toMatch(/\$lib\/gamification\/level/);
	});
});
