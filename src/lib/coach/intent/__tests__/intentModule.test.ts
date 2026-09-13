/**
 * Coach intent module layout — Epic 8 lives under $lib/coach/intent (not routes).
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { IntentEngine } from '../IntentEngine.svelte.js';
import {
	computeIntentEarnedXp,
	computeIntentProgressPct,
	intentXpFulfilled,
	resolveIntentBaselineXp,
	buildXpBaselineSnapshot,
} from '../intentProgress.js';

const ROOT = join(process.cwd(), 'src/lib/coach/intent');

describe('$lib/coach/intent module layout', () => {
	it('exports IntentEngine, UI shells, and Forge view from index', () => {
		const index = readFileSync(join(ROOT, 'index.ts'), 'utf-8');
		expect(index).toMatch(/IntentEngine/);
		expect(index).toMatch(/IntentArena/);
		expect(index).toMatch(/ForgeDeployPanel/);
		expect(index).toMatch(/CoachIntentEngineView/);
	});

	it('does not keep intent implementation under routes/assignments', () => {
		expect(existsSync(join(process.cwd(), 'src/routes/(app)/coach/assignments/IntentEngine.svelte.ts'))).toBe(
			false,
		);
		expect(existsSync(join(ROOT, 'IntentEngine.svelte.ts'))).toBe(true);
		expect(existsSync(join(ROOT, 'CoachIntentEngineView.svelte'))).toBe(true);
		expect(existsSync(join(ROOT, 'ForgeDeployPanel.svelte'))).toBe(true);
	});

	it('legacy assignments route only redirects to forge', () => {
		const redirect = readFileSync(
			join(process.cwd(), 'src/routes/(app)/coach/assignments/+page.js'),
			'utf-8',
		);
		expect(redirect).toMatch(/redirect\(308,\s*'\/coach\/forge'\)/);
		expect(existsSync(join(process.cwd(), 'src/routes/(app)/coach/assignments/+page.svelte'))).toBe(
			false,
		);
	});
});

describe('LAUNCH-forge-nameonly — Intent Engine roster hints', () => {
	const ENGINE = join(ROOT, 'IntentEngine.svelte.ts');
	const PANEL = join(ROOT, 'ForgeDeployPanel.svelte');

	it('IntentEngine merges rosters/{teamId} name-only players via mergeAdminRoster', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/mergeAdminRoster/);
		expect(src).toMatch(/rosters',\s*this\._teamId/);
		expect(src).toMatch(/assignable:\s*false/);
	});

	it('IntentEngine selectAllRosterUids skips non-assignable rows', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/filter\(\(r\)\s*=>\s*r\.assignable\)/);
	});

	it('ForgeDeployPanel shows disabled name-only rows with add email hint', () => {
		const src = readFileSync(PANEL, 'utf-8');
		expect(src).toMatch(/Add email to assign/);
		expect(src).toMatch(/assignable !== false/);
	});

	it('IntentEngine canDeploy requires assignable roster (D9 — no silent empty deploy)', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/assignableRosterCount/);
		expect(src).toMatch(/draftScope === 'team'\s*\?\s*\n?\s*this\.assignableRosterCount > 0/);
		expect(src).toMatch(/selectedAssignableCount/);
		expect(src).toMatch(/nameOnlyRosterCount/);
	});

	it('canReadUsersDocument lets coach staff read players on staffed teams', () => {
		const src = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf-8');
		expect(src).toMatch(
			/isCoach\(\)[\s\S]*?coachStaffCanAccessTeam\(resource\.data\.get\('teamId', null\)\)/,
		);
		expect(src).toMatch(
			/match \/rosters\/\{teamId\}[\s\S]*?coachStaffCanAccessTeam\(teamId\)/,
		);
	});

	it('CoachIntentEngineView resolves tenant from team club scope', () => {
		const src = readFileSync(join(ROOT, 'CoachIntentEngineView.svelte'), 'utf-8');
		expect(src).toMatch(/teamScope\.teamClubId/);
	});
});

describe('LAUNCH-HOTFIX-P5 — roster dedupe at IntentEngine merge boundary', () => {
	const ENGINE = join(ROOT, 'IntentEngine.svelte.ts');
	const TELEMETRY = join(process.cwd(), 'src/lib/components/hud/SquadTelemetryView.svelte');

	it('IntentEngine dedupes roster rows via rosterDisplayDedupe', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/dedupeRosterEntries/);
		expect(src).toMatch(/rosterDisplayDedupe/);
	});

	it('SquadTelemetryView builds roster via buildCoachRosterDisplayNames', () => {
		const src = readFileSync(TELEMETRY, 'utf-8');
		expect(src).toMatch(/buildCoachRosterDisplayNames/);
		expect(src).toMatch(/where\('teamId',\s*'==',\s*tid\)/);
	});
});

describe('VS-3-Forge — full-page workbench (QA-142)', () => {
	const ENGINE = join(ROOT, 'IntentEngine.svelte.ts');
	const PANEL = join(ROOT, 'ForgeDeployPanel.svelte');
	const VIEW = join(ROOT, 'CoachIntentEngineView.svelte');
	const CSS = join(process.cwd(), 'src/lib/styles/coach-forge-workbench.css');

	it('IntentEngine uses boolean priority mission toggle', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/draftPriorityMission\s*=\s*\$state\(false\)/);
		expect(src).toMatch(/draftPriorityMission \? 10 : 100/);
		expect(src).not.toMatch(/draftPriority\s*=\s*\$state/);
	});

	it('IntentEngine queries users by teamId only and filters role client-side', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/where\('teamId',\s*'==',\s*this\._teamId\)/);
		expect(src).toMatch(/d\.data\(\)\.role === 'player'/);
		expect(src).not.toMatch(/where\('role',\s*'==',\s*'player'\)/);
	});

	it('IntentEngine exposes rosterError and refreshRoster with player_lookup fallback', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/rosterError\s*=\s*\$state\(''\)/);
		expect(src).toMatch(/async refreshRoster\(\)/);
		expect(src).toMatch(/_resolveRosterFallback/);
		expect(src).toMatch(/player_lookup/);
	});

	it('CoachIntentEngineView mounts ForgeDeployPanel inline — no fixed IntentHUD', () => {
		const src = readFileSync(VIEW, 'utf-8');
		expect(src).toMatch(/ForgeDeployPanel/);
		expect(src).toMatch(/coach-forge-workbench__grid/);
		expect(src).toMatch(/rosterError=\{engine\.rosterError\}/);
		expect(src).toMatch(/refreshRoster\(\)/);
		expect(src).not.toMatch(/IntentHUD/);
		expect(src).not.toMatch(/tw-pb-52/);
	});

	it('ForgeDeployPanel is document-flow workbench — no fixed overlay', () => {
		const src = readFileSync(PANEL, 'utf-8');
		expect(src).toMatch(/coach-forge-deploy-panel/);
		expect(src).toMatch(/draftPriorityMission/);
		expect(src).toMatch(/role="switch"/);
		expect(src).toMatch(/Squad roster/);
		expect(src).toMatch(/deployBlockReason/);
		expect(src).toMatch(/tw-min-h-\[44px\]/);
		expect(src).not.toMatch(/tw-fixed/);
		expect(src).not.toMatch(/tw-bottom-4/);
		expect(src).not.toMatch(/backdrop-blur-xl/);
	});

	it('coach-forge-workbench.css defines mobile-first column order', () => {
		const src = readFileSync(CSS, 'utf-8');
		expect(src).toMatch(/coach-forge-workbench__deploy/);
		expect(src).toMatch(/768px/);
	});
});

describe('FORGE-INTENT-XP-BASELINE — delta progress helpers', () => {
	it('300 current, 300 baseline, 150 required → 0% progress, not fulfilled', () => {
		const earned = computeIntentEarnedXp(300, 300);
		expect(earned).toBe(0);
		expect(computeIntentProgressPct(earned, 150)).toBe(0);
		expect(intentXpFulfilled(earned, 150)).toBe(false);
	});

	it('resolveIntentBaselineXp matches uid, email, or rosterKey', () => {
		const baseline = { 'auth-1': 300, 'player@example.com': 300 };
		expect(
			resolveIntentBaselineXp(baseline, {
				uid: 'auth-1',
				email: 'player@example.com',
				rosterKey: 'auth-1',
			}),
		).toBe(300);
		expect(
			resolveIntentBaselineXp(baseline, {
				uid: '',
				email: 'player@example.com',
				rosterKey: 'player@example.com',
			}),
		).toBe(300);
	});

	it('buildXpBaselineSnapshot keys uid and email for Forge roster rows', () => {
		const snap = buildXpBaselineSnapshot(
			[
				{
					uid: 'auth-1',
					email: 'player@example.com',
					rosterKey: 'auth-1',
					xpByAttribute: { pace: 300 },
				},
			],
			'pace',
		);
		expect(snap['auth-1']).toBe(300);
		expect(snap['player@example.com']).toBe(300);
	});

	it('IntentEngine uses xpBaselineByUid delta via intentProgress helpers', () => {
		const src = readFileSync(join(ROOT, 'IntentEngine.svelte.ts'), 'utf-8');
		expect(src).toMatch(/resolveIntentBaselineXp/);
		expect(src).toMatch(/buildXpBaselineSnapshot/);
		expect(src).toMatch(/_deployBaselineByIntentId/);
		expect(src).not.toMatch(/currentXp \/ intent\.requiredXp/);
	});

	it('IntentArena labels progress since deploy', () => {
		const src = readFileSync(join(ROOT, 'IntentArena.svelte'), 'utf-8');
		expect(src).toMatch(/Progress since deploy/);
	});
});

describe('FORGE-CADENCE-DEFAULT — smart cadence in buildDeployPrescription', () => {
	const ENGINE = join(ROOT, 'IntentEngine.svelte.ts');
	const PANEL = join(ROOT, 'ForgeDeployPanel.svelte');

	it('buildDeployPrescription emits cadence 5/7 when requiredXp >= 300 and slider 0', () => {
		const engine = new IntentEngine();
		engine.draftRequiredXp = 500;
		engine.draftCadenceSessionsPerWindow = 0;
		expect(engine.buildDeployPrescription().cadence).toEqual({
			sessionsPerWindow: 5,
			windowDays: 7,
		});
	});

	it('explicit slider 3 wins over multi-day default', () => {
		const engine = new IntentEngine();
		engine.draftRequiredXp = 500;
		engine.draftCadenceSessionsPerWindow = 3;
		expect(engine.buildDeployPrescription().cadence).toEqual({
			sessionsPerWindow: 3,
			windowDays: 7,
		});
	});

	it('requiredXp < 300 → no cadence when slider 0', () => {
		const engine = new IntentEngine();
		engine.draftRequiredXp = 150;
		engine.draftCadenceSessionsPerWindow = 0;
		expect(engine.buildDeployPrescription().cadence).toBeUndefined();
	});

	it('ForgeDeployPanel explains cadence for multi-day goals and default hint', () => {
		const src = readFileSync(PANEL, 'utf-8');
		expect(src).toMatch(/Recommended for multi-day XP goals/);
		expect(src).toMatch(/One credited session per UTC day/);
		expect(src).toMatch(/Deploy will default to 5×\/week/);
	});

	it('IntentEngine buildDeployPrescription applies 5\/7 default at requiredXp >= 300', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/draftRequiredXp >= 300/);
		expect(src).toMatch(/sessionsPerWindow: 5, windowDays: 7/);
	});
});

describe('FORGE-DEDUP-DEPLOY — single-flight deploy + clientDeployId', () => {
	const ENGINE = join(ROOT, 'IntentEngine.svelte.ts');
	const PANEL = join(ROOT, 'ForgeDeployPanel.svelte');

	it('IntentEngine deployIntent uses synchronous in-flight guard before await', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/_deployInFlight/);
		expect(src).toMatch(/if \(this\._deployInFlight \|\| this\.deployPhase !== 'idle'\) return;/);
		expect(src).toMatch(/this\._deployInFlight = true;/);
		expect(src).toMatch(/this\._deployInFlight = false;/);
	});

	it('IntentEngine deployIntent passes clientDeployId from crypto.randomUUID()', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/const clientDeployId = crypto\.randomUUID\(\)/);
		expect(src).toMatch(/clientDeployId,/);
	});

	it('ForgeDeployPanel deploy button is type=button and disabled while saving', () => {
		const src = readFileSync(PANEL, 'utf-8');
		expect(src).toMatch(/type="button"[\s\S]*disabled=\{!canDeploy \|\| deployPhase === 'saving'\}/);
	});
});
