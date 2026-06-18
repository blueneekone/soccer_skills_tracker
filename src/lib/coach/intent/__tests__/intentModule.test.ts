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
		expect(index).toMatch(/IntentHUD/);
		expect(index).toMatch(/CoachIntentEngineView/);
	});

	it('does not keep intent implementation under routes/assignments', () => {
		expect(existsSync(join(process.cwd(), 'src/routes/(app)/coach/assignments/IntentEngine.svelte.ts'))).toBe(
			false,
		);
		expect(existsSync(join(ROOT, 'IntentEngine.svelte.ts'))).toBe(true);
		expect(existsSync(join(ROOT, 'CoachIntentEngineView.svelte'))).toBe(true);
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
	const HUD = join(ROOT, 'IntentHUD.svelte');

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

	it('IntentHUD shows disabled name-only rows with add email hint', () => {
		const src = readFileSync(HUD, 'utf-8');
		expect(src).toMatch(/Add email to assign/);
		expect(src).toMatch(/assignable !== false/);
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

	it('IntentEngine canDeploy requires assignable roster (D9 — no silent empty deploy)', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/assignableRosterCount/);
		expect(src).toMatch(/draftScope === 'team'\s*\?\s*\n?\s*this\.assignableRosterCount > 0/);
		expect(src).toMatch(/selectedAssignableCount/);
		expect(src).toMatch(/nameOnlyRosterCount/);
	});
});
