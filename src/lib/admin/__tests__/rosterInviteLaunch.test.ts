import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe.skip('LAUNCH-roster-invite — name-only guardian invite', () => {
	it.skip('exports claimRosterSpot from rosterOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/rosterOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.claimRosterSpot/);
		expect(ops).toMatch(/pendingRosterPlayerName/);
	});

	it.skip('mintMagicUplink stores pendingRosterPlayerName on uplink', () => {
		const src = readFileSync(join(ROOT, 'functions/magicUplinks.js'), 'utf-8');
		expect(src).toMatch(/pendingRosterPlayerName/);
	});

	it.skip('admin roster mounts guardian invite modal for name-only rows', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/admin/organizations/[clubId]/teams/[teamId]/roster/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/RosterGuardianInviteModal/);
		expect(page).toMatch(/Invite guardian/);
		const modal = readFileSync(
			join(ROOT, 'src/lib/components/admin/RosterGuardianInviteModal.svelte'),
			'utf-8',
		);
		expect(modal).toMatch(/pendingRosterPlayerName/);
	});

	it.skip('parent dashboard mounts ClaimRosterSpot', () => {
		const page = readFileSync(join(ROOT, 'src/routes/(app)/parent/dashboard/+page.svelte'), 'utf-8');
		expect(page).toMatch(/ClaimRosterSpot/);
	});
});
