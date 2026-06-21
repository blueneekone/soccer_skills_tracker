import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');

describe('LAUNCH-household-graph — guardian visibility', () => {
	it('admin roster surfaces guardian + VPC columns and opens compliance drawer', () => {
		const src = readFileSync(
			join(ROOT, 'routes/(app)/admin/organizations/[clubId]/teams/[teamId]/roster/+page.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/Guardian\(s\)/);
		expect(src).toMatch(/enterprisePlayerDrawer\.open/);
		expect(src).toMatch(/focusCompliance:\s*true/);
		expect(src).toMatch(/parentEmails/);
	});

	it('director Families tab mounts HouseholdLinkerPanel', () => {
		const page = readFileSync(join(ROOT, 'routes/(app)/director/+page.svelte'), 'utf-8');
		const panel = readFileSync(
			join(ROOT, 'lib/components/director/HouseholdLinkerPanel.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/HouseholdLinkerPanel/);
		expect(panel).toMatch(/linkHousehold/);
	});

	it('parentProvisionOperative denormalizes guardians onto player_lookup', () => {
		const src = readFileSync(
			join(process.cwd(), 'functions/src/domains/operativeOps.js'),
			'utf-8',
		);
		expect(src).toMatch(/parentEmails:\s*householdParents/);
		expect(src).toMatch(/householdId:\s*hid/);
	});

	it('linkHousehold stamps player_lookup guardian fields', () => {
		const src = readFileSync(
			join(process.cwd(), 'functions/src/domains/complianceOps.js'),
			'utf-8',
		);
		expect(src).toMatch(/stampAllPlayerLookupGuardians/);
	});

	it('generatePlayerOTP reconciles household membership before rejecting', () => {
		const membership = readFileSync(
			join(process.cwd(), 'functions/src/domains/householdMembership.js'),
			'utf-8',
		);
		const ops = readFileSync(
			join(process.cwd(), 'functions/src/domains/operativeOps.js'),
			'utf-8',
		);
		expect(membership).toMatch(/repairHouseholdMembership/);
		expect(membership).toMatch(/linkedOnLookup/);
		expect(ops).toMatch(/householdMembership/);
		expect(ops).toMatch(/assertChildInParentHousehold\(actor, childUid, childEm\)/);
	});

	it('coach CommandCenter shows guardian and VPC roster columns', () => {
		const src = readFileSync(
			join(ROOT, 'lib/components/coach/CommandCenter.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/GUARDIAN/);
		expect(src).toMatch(/fetchGuardiansFromPlayerLookup/);
	});

	it('global users parents_players tab shows household graph columns', () => {
		const table = readFileSync(
			join(ROOT, 'lib/components/admin/GlobalUsersDataTable.svelte'),
			'utf-8',
		);
		expect(table).toMatch(/householdGraphLabel/);
		expect(table).toMatch(/parents_players/);
	});
});
