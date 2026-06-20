/**
 * launchP0Fixes.test.ts — Agent 02 launch P0 copy + QA tenant provision guards
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const HOUSEHOLD = join(ROOT, 'src/routes/(app)/parent/household/+page.svelte');
const VPC_PENDING = join(ROOT, 'src/routes/(app)/vpc-pending/+page.svelte');
const TENANT_RESET = join(ROOT, 'scripts/dev-tenant-reset.mjs');

describe('LAUNCH-p0 — household + vpc-pending copy', () => {
	it('waiver button renders ampersand (not HTML entity in text expression)', () => {
		const src = readFileSync(HOUSEHOLD, 'utf8');
		expect(src).toMatch(/Sign waiver & authorize/);
		expect(src).not.toMatch(/Sign waiver &amp; authorize/);
	});

	it('dispatch code help text matches coach team code format (not 6-digit)', () => {
		const src = readFileSync(HOUSEHOLD, 'utf8');
		expect(src).toMatch(/team dispatch code/i);
		expect(src).toMatch(/AB-1K2M/);
		expect(src).not.toMatch(/6-digit team code/i);
	});

	it('vpc-pending self-signup path does not require club director linking', () => {
		const src = readFileSync(VPC_PENDING, 'utf8');
		expect(src).toMatch(/Sign the household waiver/);
		expect(src).toMatch(/Parent dashboard → Household/);
		expect(src).not.toMatch(/club director will link your household/i);
		expect(src).not.toMatch(/contact your club director for help linking/i);
	});
});

describe('LAUNCH-p0 — dev tenant reset provision', () => {
	it('provision stamps QA householdId on parent and inviteCode on team', () => {
		expect(existsSync(TENANT_RESET)).toBe(true);
		const src = readFileSync(TENANT_RESET, 'utf8');
		expect(src).toMatch(/DEFAULT_QA_HOUSEHOLD_ID/);
		expect(src).toMatch(/DEFAULT_QA_INVITE_CODE/);
		expect(src).toMatch(/householdId:\s*DEFAULT_QA_HOUSEHOLD_ID/);
		expect(src).toMatch(/inviteCode:\s*DEFAULT_QA_INVITE_CODE/);
		expect(src).toMatch(/collection\('households'\)/);
	});
});

describe('LAUNCH-qa-reset-operatives — purge + QA dispatch code', () => {
	it('dev-tenant-reset documents purge-operatives and preserves three keep emails', () => {
		const src = readFileSync(TENANT_RESET, 'utf8');
		expect(src).toMatch(/--purge-operatives/);
		expect(src).toMatch(/purgeOperatives/);
		expect(src).toMatch(/@operative\.local/);
		expect(src).toMatch(
			/ecwaechtler@gmail\.com,ecwaechtler\+parent@gmail\.com,ecwaechtler\+coach@gmail\.com/,
		);
		expect(src).toMatch(/approved execute/);
	});

	it('QA invite code is QA-PP26', () => {
		const src = readFileSync(TENANT_RESET, 'utf8');
		expect(src).toMatch(/DEFAULT_QA_INVITE_CODE\s*=\s*'QA-PP26'/);
	});

	it('DEMO_SCRIPT documents QA-PP26 team dispatch code', () => {
		const demo = readFileSync(join(ROOT, 'docs/acquisition/DEMO_SCRIPT.md'), 'utf8');
		expect(demo).toMatch(/QA-PP26/);
		expect(demo).toMatch(/qa_launch_2026_ppc/);
	});
});

describe('SETUP-UNBLOCK — parent setup gate callables', () => {
	it('adminOps exports listJoinableClubs and resolveDispatchCode', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/adminOps.js'), 'utf8');
		expect(ops).toMatch(/exports\.listJoinableClubs/);
		expect(ops).toMatch(/exports\.resolveDispatchCode/);
		expect(ops).toMatch(/sports-skill-tracker-dev/);
	});

	it('functions-platform wires listJoinableClubs + resolveDispatchCode', () => {
		const idx = readFileSync(join(ROOT, 'functions-platform/index.js'), 'utf8');
		expect(idx).toMatch(/listJoinableClubs/);
		expect(idx).toMatch(/resolveDispatchCode/);
	});

	it('profile.js parent complete with householdId', () => {
		const profile = readFileSync(join(ROOT, 'src/lib/auth/profile.js'), 'utf8');
		expect(profile).toMatch(/isParentProfileComplete/);
		expect(profile).toMatch(/householdId/);
		expect(profile).toMatch(/households', hid\)/);
	});
});
describe('LAUNCH-parent-link-team — parentLinkOperativeToTeam + household UI', () => {
	it('operativeOps exports parentLinkOperativeToTeam callable', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/operativeOps.js'), 'utf8');
		expect(ops).toMatch(/exports\.parentLinkOperativeToTeam/);
		expect(ops).toMatch(/teamInviteCode/);
		expect(ops).toMatch(/resolveTeamByInviteCodeForClub/);
	});

	it('functions-compliance wires parentLinkOperativeToTeam', () => {
		const idx = readFileSync(join(ROOT, 'functions-compliance/index.js'), 'utf8');
		expect(idx).toMatch(/parentLinkOperativeToTeam/);
	});

	it('household page calls parentLinkOperativeToTeam with dispatch code', () => {
		const src = readFileSync(HOUSEHOLD, 'utf8');
		expect(src).toMatch(/parentLinkOperativeToTeam/);
		expect(src).toMatch(/linkOperativeTeam/);
		expect(src).toMatch(/QA-PP26/);
	});

	it('parentLinkOperativeToTeam stamps JWT teamId + clubId immediately after link', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/operativeOps.js'), 'utf8');
		expect(ops).toMatch(/stampOperativeTeamClaims/);
		expect(ops).toMatch(/buildBaseCustomClaims/);
		expect(ops).toMatch(/setCustomUserClaims\(childUid/);
		expect(ops).toMatch(/await stampOperativeTeamClaims\(childUid, u, teamIdForUser, clubId, hid\)/);
	});

	it('parentLinkOperativeToTeam sets role player on users merge', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/operativeOps.js'), 'utf8');
		const fnBlock = ops.slice(ops.indexOf('exports.parentLinkOperativeToTeam'));
		expect(fnBlock).toMatch(/batch\.set\(\s*\n?\s*uRef,/);
		expect(fnBlock).toMatch(/role:\s*'player'/);
	});
});
