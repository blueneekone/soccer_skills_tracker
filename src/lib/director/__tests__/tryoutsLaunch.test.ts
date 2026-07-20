import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe.skip('LAUNCH-tryouts-a — program + public registration', () => {
	it.skip('exports tryout callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertTryoutProgram/);
		expect(ops).toMatch(/exports\.getPublicTryoutProgram/);
		expect(ops).toMatch(/exports\.registerForTryout/);
		expect(ops).toMatch(/waitlisted/);
	});

	it.skip('functions-core wires tryout callables', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/upsertTryoutProgram/);
		expect(idx).toMatch(/registerForTryout/);
	});

	it.skip('Firestore rules gate tryout_programs collections', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/tryout_programs\/\{programId\}/);
		expect(rules).toMatch(/match \/registrations\/\{registrationId\}/);
	});

	it.skip('Field Ops mounts TryoutsProgramsPanel', () => {
		const mod = readFileSync(
			join(ROOT, 'src/lib/components/director/os/FieldOpsModule.svelte'),
			'utf-8',
		);
		expect(mod).toMatch(/TryoutsProgramsPanel/);
	});

	it.skip('public tryouts page calls registerForTryout', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/tryouts/[programId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/getPublicTryoutProgram/);
		expect(page).toMatch(/registerForTryout/);
	});
});

describe.skip('LAUNCH-tryouts-b — sessions, RSVP, check-in', () => {
	it.skip('exports session + check-in callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertTryoutSession/);
		expect(ops).toMatch(/exports\.assignTryoutSession/);
		expect(ops).toMatch(/exports\.setTryoutSessionRsvp/);
		expect(ops).toMatch(/exports\.checkInTryoutRegistration/);
		expect(ops).toMatch(/checked_in/);
	});

	it.skip('functions-core wires tryout phase B callables', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/upsertTryoutSession/);
		expect(idx).toMatch(/checkInTryoutRegistration/);
	});

	it.skip('Firestore rules gate tryout sessions subcollection', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/sessions\/\{sessionId\}/);
	});

	it.skip('Field Ops mounts TryoutSessionsPanel via TryoutsProgramsPanel', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutsProgramsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/TryoutSessionsPanel/);
	});

	it.skip('public tryouts page supports session RSVP', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/tryouts/[programId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/setTryoutSessionRsvp/);
	});
});

describe.skip('LAUNCH-tryouts-c — eval plan + coach sheets', () => {
	it.skip('exports eval plan callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertTryoutPlan/);
		expect(ops).toMatch(/exports\.submitTryoutEvaluation/);
		expect(ops).toMatch(/evaluated/);
	});

	it.skip('Firestore rules gate tryout evaluations subcollection', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/evaluations\/\{registrationId\}/);
	});

	it.skip('TryoutSessionsPanel saves eval plan', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutSessionsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/upsertTryoutPlan/);
	});

	it.skip('Coach scouting mounts tryout eval panel', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/coach/scouting/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/CoachTryoutEvalPanel/);
	});
});

describe.skip('LAUNCH-tryouts-d — callbacks, offers, roster pipeline', () => {
	it.skip('exports pipeline + roster callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.setTryoutPipelineStatus/);
		expect(ops).toMatch(/exports\.respondTryoutOffer/);
		expect(ops).toMatch(/exports\.promoteTryoutToRoster/);
		expect(ops).toMatch(/exports\.getPublicTryoutRegistration/);
		expect(ops).toMatch(/roster_pending/);
	});

	it.skip('TryoutSessionsPanel wires pipeline and roster promotion', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutSessionsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/setTryoutPipelineStatus/);
		expect(panel).toMatch(/promoteTryoutToRoster/);
		expect(panel).toMatch(/mintMagicUplink/);
	});

	it.skip('promoteTryoutToRoster links existing household operative by name', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/linkHouseholdOperativeToTeam/);
		expect(ops).toMatch(/operativeLinked/);
	});

	it.skip('public tryouts page supports offer response', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/tryouts/[programId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/respondTryoutOffer/);
	});
});

describe.skip('LAUNCH-staff-roster-transfer — registrarTransferPlayer UI', () => {
	it.skip('RegistrarRosterTransferPanel calls registrarTransferPlayer', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/RegistrarRosterTransferPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/registrarTransferPlayer/);
		expect(panel).toMatch(/targetTeamId/);
	});

	it.skip('director and admin roster mount RegistrarRosterTransferPanel', () => {
		const director = readFileSync(join(ROOT, 'src/routes/(app)/director/+page.svelte'), 'utf-8');
		const admin = readFileSync(
			join(ROOT, 'src/routes/(app)/admin/organizations/[clubId]/teams/[teamId]/roster/+page.svelte'),
			'utf-8',
		);
		expect(director).toMatch(/RegistrarRosterTransferPanel/);
		expect(admin).toMatch(/RegistrarRosterTransferPanel/);
	});

	it.skip('functions-compliance exports registrarTransferPlayer', () => {
		const idx = readFileSync(join(ROOT, 'functions-compliance/index.js'), 'utf-8');
		expect(idx).toMatch(/registrarTransferPlayer/);
	});
});

describe.skip('LAUNCH-tryouts-e — automated comms', () => {
	it.skip('exports dispatchTryoutComms and mail hooks in tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.dispatchTryoutComms/);
		expect(ops).toMatch(/registration_confirm/);
		expect(ops).toMatch(/collection\('mail'\)/);
	});

	it.skip('Firestore rules gate tryout comms audit subcollection', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/comms\/\{commId\}/);
	});

	it.skip('TryoutSessionsPanel can resend session notices', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutSessionsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/dispatchTryoutComms/);
	});
});
