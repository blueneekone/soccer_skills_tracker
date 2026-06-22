/**
 * Coach intent module layout — Epic 8 lives under $lib/coach/intent (not routes).
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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
