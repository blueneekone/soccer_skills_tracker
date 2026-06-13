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
